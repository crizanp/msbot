/**
 * Vercel serverless webhook endpoint for Telegram updates.
 * Route: /api/telegram
 */

import {
  MEDIA_UNSUPPORTED_REPLY,
  OPTS_MD,
  buildAssistantReply,
  hasTelegramMediaContent,
  parseTelegramCommand,
  resolveCommandText,
  shouldReplyToMessageByPolicy,
} from "../assistantCore.js";
import {
  hasRecentGroupAdminActivity,
  getReplyHintForUser,
  isAiControlCommand,
  isAiPausedForUser,
  isGroupAdminSender,
  isPrivilegedTelegramUser,
  markGroupAdminActivity,
  runAiControlCommand,
} from "../telegramUserControls.js";

const TOKEN = process.env.TELEGRAM_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const GROUP_MENTION_ONLY = String(process.env.GROUP_MENTION_ONLY || "false").toLowerCase() === "true";
const BOT_USERNAME_ENV = String(process.env.BOT_USERNAME || "").replace(/^@/, "").toLowerCase();

let botIdentityPromise;

function isGroupChat(chatType) {
  const type = String(chatType || "").toLowerCase();
  return type === "group" || type === "supergroup";
}

function getHeader(req, name) {
  if (!req?.headers) return "";
  const key = String(name || "").toLowerCase();
  const raw = req.headers[key] ?? req.headers[name];
  if (Array.isArray(raw)) return String(raw[0] || "");
  return String(raw || "");
}

function parseBody(body) {
  if (!body) return null;
  if (typeof body === "object") return body;
  if (typeof body !== "string") return null;

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function pickMessage(update) {
  return update?.message || update?.edited_message || null;
}

function markdownV2ToPlainText(text) {
  let out = String(text || "");

  out = out.replace(/\\([_*\[\]()~`>#+\-=|{}.!\\])/g, "$1");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1: $2");
  out = out.replace(/[*_~`]/g, "");
  out = out.replace(/\r/g, "");
  out = out.replace(/[ \t]+\n/g, "\n");
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

async function sendTelegramMessage(chatId, text, replyToMessageId, options = {}) {
  const plain = !!options?.plain;

  const payload = {
    chat_id: chatId,
    text,
    allow_sending_without_reply: true,
  };

  if (!plain) {
    Object.assign(payload, OPTS_MD);
  }

  if (replyToMessageId) {
    payload.reply_to_message_id = replyToMessageId;
  }

  return fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function sendTelegramMessageWithFallback(chatId, text, replyToMessageId) {
  const primary = await sendTelegramMessage(chatId, text, replyToMessageId);
  if (primary.ok) {
    return { ok: true, status: primary.status, usedFallback: false };
  }

  const primaryBody = await primary.text();
  const primaryDesc = (() => {
    try {
      return JSON.parse(primaryBody)?.description || "";
    } catch {
      return primaryBody;
    }
  })();

  const isMarkdownEntityError =
    primary.status === 400
    && /can't parse entities|reserved and must be escaped/i.test(String(primaryDesc || ""));

  if (!isMarkdownEntityError) {
    return {
      ok: false,
      status: primary.status,
      errorBody: primaryBody,
      usedFallback: false,
    };
  }

  const plainText = markdownV2ToPlainText(text);
  const fallback = await sendTelegramMessage(chatId, plainText, replyToMessageId, { plain: true });
  if (fallback.ok) {
    return {
      ok: true,
      status: fallback.status,
      usedFallback: true,
      primaryErrorBody: primaryBody,
    };
  }

  const fallbackBody = await fallback.text();
  return {
    ok: false,
    status: fallback.status,
    errorBody: fallbackBody,
    usedFallback: true,
    primaryErrorBody: primaryBody,
  };
}

async function resolveChatMemberStatus(chatId, userId) {
  const response = await fetch(`https://api.telegram.org/bot${TOKEN}/getChatMember`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
    }),
  });

  if (!response.ok) return "";

  const data = await response.json();
  if (!data?.ok) return "";

  return String(data.result?.status || "");
}

async function getBotIdentity() {
  if (BOT_USERNAME_ENV) {
    return { username: BOT_USERNAME_ENV, id: 0 };
  }

  if (!botIdentityPromise) {
    botIdentityPromise = (async () => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`);
        const data = await res.json();

        if (!data?.ok || !data?.result) return { username: "", id: 0 };

        return {
          username: String(data.result.username || "").toLowerCase(),
          id: Number(data.result.id || 0) || 0,
        };
      } catch {
        return { username: "", id: 0 };
      }
    })();
  }

  return botIdentityPromise;
}

export default async function handler(req, res) {
  console.log(`[WEBHOOK] ${req.method} /api/telegram`);

  if (req.method === "GET") {
    res.status(200).json({ ok: true, endpoint: "/api/telegram" });
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  if (!TOKEN) {
    console.error("[WEBHOOK] TELEGRAM_TOKEN not set");
    res.status(500).json({ ok: false, error: "missing_TELEGRAM_TOKEN" });
    return;
  }

  if (WEBHOOK_SECRET) {
    const headerSecret = getHeader(req, "x-telegram-bot-api-secret-token");
    if (!headerSecret || headerSecret !== WEBHOOK_SECRET) {
      console.warn("[WEBHOOK] Secret mismatch — rejected");
      res.status(401).json({ ok: false, error: "invalid_webhook_secret" });
      return;
    }
  }

  const update = parseBody(req.body);
  const message = pickMessage(update);

  if (!message || !message.chat) {
    console.log("[WEBHOOK] Skipped — no message in update");
    res.status(200).json({ ok: true, skipped: "no_message" });
    return;
  }

  if (message.from?.is_bot) {
    res.status(200).json({ ok: true, skipped: "bot_message" });
    return;
  }

  const text = String(message.text || message.caption || "").trim();
  const chatType = message.chat?.type || "unknown";
  const userId = message.from?.id;
  const fromUser = message.from?.username || message.from?.first_name || "unknown";
  console.log(`[WEBHOOK] Message from @${fromUser} in ${chatType}: ${text.slice(0, 80)}`);

  const inGroup = isGroupChat(chatType);
  if (isPrivilegedTelegramUser(userId) && !inGroup) {
    console.log("[WEBHOOK] Skipped — privileged sender");
    res.status(200).json({ ok: true, skipped: "privileged_sender" });
    return;
  }

  const isGroupAdmin = await isGroupAdminSender({
    chatType,
    chatId: message.chat?.id,
    userId,
    resolveMemberStatus: ({ chatId, userId }) => resolveChatMemberStatus(chatId, userId),
  });

  if (isGroupAdmin) {
    markGroupAdminActivity({
      chatType,
      chatId: message.chat?.id,
    });
  }

  const command = parseTelegramCommand(text);
  const botIdentity = await getBotIdentity();
  const replyFrom = message.reply_to_message?.from;
  const replyToBot = !!replyFrom && (
    (botIdentity.id && Number(replyFrom.id) === botIdentity.id)
    || (botIdentity.username && String(replyFrom.username || "").toLowerCase() === botIdentity.username)
  );

  const hasRecentAdminActivity = hasRecentGroupAdminActivity({
    chatType,
    chatId: message.chat?.id,
  });

  const shouldReply = shouldReplyToMessageByPolicy({
    chatType: message.chat?.type,
    text,
    command,
    botUsername: botIdentity.username,
    isReplyToBot: replyToBot,
    groupMentionOnly: GROUP_MENTION_ONLY,
    isGroupAdminSender: isGroupAdmin,
    hasRecentGroupAdminActivity: hasRecentAdminActivity,
  });

  if (!shouldReply) {
    const reason = isGroupAdmin
      ? "group_admin_sender"
      : hasRecentAdminActivity
        ? "recent_group_admin_activity"
        : "mention_policy";

    console.log(`[WEBHOOK] Skipped — ${reason}`);
    res.status(200).json({ ok: true, skipped: reason });
    return;
  }

  try {
    if (hasTelegramMediaContent(message)) {
      if (await isAiPausedForUser(userId)) {
        console.log("[WEBHOOK] Skipped media — AI paused for sender");
        res.status(200).json({ ok: true, skipped: "sender_ai_paused" });
        return;
      }

      console.log(`[WEBHOOK] Sending media fallback reply to chat ${message.chat.id}`);
      const sendRes = await sendTelegramMessageWithFallback(
        message.chat.id,
        MEDIA_UNSUPPORTED_REPLY,
        message.message_id
      );
      if (!sendRes.ok) {
        console.error(`[WEBHOOK SEND ERROR] ${sendRes.status} ${sendRes.errorBody}`);
        res.status(502).json({ ok: false, error: "telegram_send_failed" });
        return;
      }

      if (sendRes.usedFallback) {
        console.warn(`[WEBHOOK] Markdown parse failed, sent plain fallback: ${sendRes.primaryErrorBody || "unknown"}`);
      }

      res.status(200).json({ ok: true, handled: "media_fallback" });
      return;
    }

    if (!text) {
      console.log("[WEBHOOK] Skipped — empty text");
      res.status(200).json({ ok: true, skipped: "empty_text" });
      return;
    }

    if (isAiControlCommand(command)) {
      const replyText = await runAiControlCommand(command, userId);
      if (!replyText) {
        res.status(200).json({ ok: true, skipped: "no_reply" });
        return;
      }

      console.log(`[WEBHOOK] Sending AI control reply to chat ${message.chat.id}`);
      const sendRes = await sendTelegramMessageWithFallback(
        message.chat.id,
        replyText,
        message.message_id
      );
      if (!sendRes.ok) {
        console.error(`[WEBHOOK SEND ERROR] ${sendRes.status} ${sendRes.errorBody}`);
        res.status(502).json({ ok: false, error: "telegram_send_failed" });
        return;
      }

      if (sendRes.usedFallback) {
        console.warn(`[WEBHOOK] Markdown parse failed, sent plain fallback: ${sendRes.primaryErrorBody || "unknown"}`);
      }

      res.status(200).json({ ok: true });
      return;
    }

    if (await isAiPausedForUser(userId)) {
      console.log("[WEBHOOK] Skipped — AI paused for sender");
      res.status(200).json({ ok: true, skipped: "sender_ai_paused" });
      return;
    }

    let replyText = "";

    if (command) {
      replyText = resolveCommandText(command);
    } else {
      const reply = buildAssistantReply(message.chat.id, text);
      const hint = await getReplyHintForUser(userId);
      replyText = reply.text + hint;
    }

    if (!replyText) {
      res.status(200).json({ ok: true, skipped: "no_reply" });
      return;
    }

    console.log(`[WEBHOOK] Sending reply to chat ${message.chat.id} (${replyText.length} chars)`);
    const sendRes = await sendTelegramMessageWithFallback(
      message.chat.id,
      replyText,
      message.message_id
    );
    if (!sendRes.ok) {
      console.error(`[WEBHOOK SEND ERROR] ${sendRes.status} ${sendRes.errorBody}`);
      res.status(502).json({ ok: false, error: "telegram_send_failed" });
      return;
    }

    if (sendRes.usedFallback) {
      console.warn(`[WEBHOOK] Markdown parse failed, sent plain fallback: ${sendRes.primaryErrorBody || "unknown"}`);
    }

    console.log(`[WEBHOOK] Reply sent OK to @${fromUser}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`[WEBHOOK ERROR] ${err.message}`);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
}
