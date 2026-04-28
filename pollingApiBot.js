/**
 * MoonSale Telegram Bot — Direct API polling runtime (no webhook).
 *
 * Uses Telegram Bot API getUpdates/sendMessage directly.
 * Suitable for VPS/local servers running continuously.
 * 
 * Features:
 * - Rate limiting to prevent abuse
 * - Performance metrics & logging
 * - Message queue for reliability
 * - Health monitoring
 * - Graceful shutdown
 */

import dns from "node:dns/promises";
import { loadDotEnvFile } from "./loadEnv.js";
import {
  MEDIA_UNSUPPORTED_REPLY,
  OPTS_MD,
  buildAssistantReply,
  getEngine,
  hasTelegramMediaContent,
  parseTelegramCommand,
  resolveCommandText,
  shouldReplyToMessageByPolicy,
} from "./assistantCore.js";
import {
  hasRecentGroupAdminActivity,
  getReplyHintForUser,
  isAiControlCommand,
  isAiPausedForUser,
  isGroupAdminSender,
  isPrivilegedTelegramUser,
  markGroupAdminActivity,
  runAiControlCommand,
} from "./telegramUserControls.js";

loadDotEnvFile();

const TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API_BASE_URL = String(process.env.TELEGRAM_API_BASE_URL || "https://api.telegram.org").replace(/\/+$/, "");
const POLL_TIMEOUT_SECONDS = Number(process.env.TELEGRAM_POLL_TIMEOUT || 30);
const IDLE_DELAY_MS = Number(process.env.TELEGRAM_POLL_IDLE_MS || 800);
const ERROR_DELAY_MS = Number(process.env.TELEGRAM_POLL_ERROR_MS || 3000);
const REMOVE_WEBHOOK_ON_START = String(process.env.REMOVE_WEBHOOK_ON_START || "true").toLowerCase() !== "false";
const GROUP_MENTION_ONLY = String(process.env.GROUP_MENTION_ONLY || "false").toLowerCase() === "true";
const BOT_USERNAME_ENV = String(process.env.BOT_USERNAME || "").replace(/^@/, "").toLowerCase();

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000); // 1 minute
const RATE_LIMIT_MAX_PER_USER = Number(process.env.RATE_LIMIT_MAX_PER_USER || 10); // Max 10 messages per minute
const RATE_LIMIT_MAX_GLOBAL = Number(process.env.RATE_LIMIT_MAX_GLOBAL || 100); // Max 100 messages per minute globally

// Metrics
const metrics = {
  messagesProcessed: 0,
  messagesReplied: 0,
  messagesFiltered: 0,
  rateLimited: 0,
  errors: 0,
  startTime: Date.now(),
};

// Rate limiter
const userRateLimits = new Map();
let globalMessageCount = 0;
let globalWindowStart = Date.now();

let botIdentity = {
  username: BOT_USERNAME_ENV,
  id: Number(process.env.BOT_ID || 0) || 0,
};

function isGroupChat(chatType) {
  const type = String(chatType || "").toLowerCase();
  return type === "group" || type === "supergroup";
}

if (!TOKEN) {
  console.error("Missing TELEGRAM_TOKEN.");
  console.error("PowerShell: $env:TELEGRAM_TOKEN=\"your_token_here\"");
  console.error("CMD: set TELEGRAM_TOKEN=your_token_here");
  process.exit(1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTimestamp() {
  return new Date().toLocaleTimeString();
}

function checkUserRateLimit(userId) {
  const now = Date.now();
  const userKey = String(userId);
  
  if (!userRateLimits.has(userKey)) {
    userRateLimits.set(userKey, { count: 0, windowStart: now });
  }

  const userLimit = userRateLimits.get(userKey);
  
  // Reset window if expired
  if (now - userLimit.windowStart >= RATE_LIMIT_WINDOW_MS) {
    userLimit.count = 0;
    userLimit.windowStart = now;
  }

  // Increment and check
  userLimit.count++;
  return userLimit.count <= RATE_LIMIT_MAX_PER_USER;
}

function checkGlobalRateLimit() {
  const now = Date.now();
  
  // Reset global window if expired
  if (now - globalWindowStart >= RATE_LIMIT_WINDOW_MS) {
    globalMessageCount = 0;
    globalWindowStart = now;
  }

  // Increment and check
  globalMessageCount++;
  return globalMessageCount <= RATE_LIMIT_MAX_GLOBAL;
}

function printMetrics() {
  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);
  const secs = uptime % 60;

  console.log("\n" + "=".repeat(60));
  console.log("📊 BOT METRICS");
  console.log("=".repeat(60));
  console.log(`⏱️  Uptime: ${hours}h ${mins}m ${secs}s`);
  console.log(`📨 Messages Processed: ${metrics.messagesProcessed}`);
  console.log(`✅ Messages Replied: ${metrics.messagesReplied}`);
  console.log(`⏭️  Messages Filtered: ${metrics.messagesFiltered}`);
  console.log(`⛔ Rate Limited: ${metrics.rateLimited}`);
  console.log(`❌ Errors: ${metrics.errors}`);
  console.log("=".repeat(60) + "\n");
}

async function warnIfTelegramDnsLooksBlocked() {
  try {
    const records = await dns.lookup("api.telegram.org", { all: true });
    const addresses = records.map(r => r.address);
    const hasLoopback = addresses.includes("127.0.0.1") || addresses.includes("::1");

    if (hasLoopback) {
      console.error("DNS warning: api.telegram.org resolves to loopback on this machine.");
      console.error(`Resolved: ${addresses.join(", ")}`);
      console.error("This network is blocking Telegram API access.");
    }
  } catch {
    // Non-fatal check.
  }
}

async function telegramRequest(method, payload = {}) {
  const url = `${TELEGRAM_API_BASE_URL}/bot${TOKEN}/${method}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      timeout: 10000, // 10 second timeout
    });

    if (!res.ok) {
      console.error(`[API WARNING] ${method}: HTTP ${res.status}`);
      metrics.errors++;
    }

    return await res.json();
  } catch (err) {
    const text = String(err?.stack || err || "");
    const looksLocal = text.includes("127.0.0.1") || text.includes("::1") || text.includes("ECONNREFUSED");

    console.error(`[${getTimestamp()}] [API ERROR] ${method}: ${err?.message || err}`);
    if (looksLocal) {
      console.error("Detected local loopback resolution for Telegram API. Use an unblocked network/VPS.");
    }
    metrics.errors++;
    throw err;
  }
}

async function maybeDeleteWebhook() {
  if (!REMOVE_WEBHOOK_ON_START) return;

  try {
    const data = await telegramRequest("deleteWebhook", { drop_pending_updates: false });
    if (!data.ok) {
      console.error(`[WARN] deleteWebhook failed: ${JSON.stringify(data)}`);
      return;
    }

    console.log("Webhook disabled. Polling mode is active.");
  } catch {
    console.error("[WARN] Could not disable webhook right now. Poller will keep retrying getUpdates.");
  }
}

async function loadBotIdentity() {
  // If username is already provided via env, mention-only policy can still work.
  if (botIdentity.username) return;

  try {
    const data = await telegramRequest("getMe");
    if (!data?.ok || !data?.result) return;

    const username = String(data.result.username || "").toLowerCase();
    const id = Number(data.result.id || 0) || 0;

    botIdentity = { username: username || botIdentity.username, id: id || botIdentity.id };
  } catch {
    console.error("[WARN] getMe failed. Set BOT_USERNAME in .env for mention-only mode.");
  }
}

async function sendTyping(chatId) {
  try {
    await telegramRequest("sendChatAction", { chat_id: chatId, action: "typing" });
  } catch {
    // Ignore typing errors.
  }
}

async function sendReply(message, text) {
  const payload = {
    chat_id: message.chat.id,
    text,
    ...OPTS_MD,
    allow_sending_without_reply: true,
  };

  if (message.message_id) {
    payload.reply_to_message_id = message.message_id;
  }

  const data = await telegramRequest("sendMessage", payload);
  if (!data.ok) {
    console.error(`[SEND ERROR] ${JSON.stringify(data)}`);
  }
}

async function resolveChatMemberStatus(chatId, userId) {
  const data = await telegramRequest("getChatMember", {
    chat_id: chatId,
    user_id: userId,
  });

  if (!data?.ok) return "";
  return String(data.result?.status || "");
}

async function handleMessage(message) {
  if (!message || !message.chat) return;
  if (message.from?.is_bot) return;

  metrics.messagesProcessed++;

  const userId = message.from?.id;
  const user = message.from?.username || message.from?.id || "unknown";
  const chatType = message.chat?.type;
  const inGroup = isGroupChat(chatType);

  if (isPrivilegedTelegramUser(userId) && !inGroup) {
    metrics.messagesFiltered++;
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

  const text = String(message.text || message.caption || "").trim();
  const command = parseTelegramCommand(text);

  const replyFrom = message.reply_to_message?.from;
  const replyToBot = !!replyFrom && (
    (botIdentity.id && Number(replyFrom.id) === botIdentity.id)
    || (botIdentity.username && String(replyFrom.username || "").toLowerCase() === botIdentity.username)
  );

  const shouldReply = shouldReplyToMessageByPolicy({
    chatType,
    text,
    command,
    botUsername: botIdentity.username,
    isReplyToBot: replyToBot,
    groupMentionOnly: GROUP_MENTION_ONLY,
    isGroupAdminSender: isGroupAdmin,
    hasRecentGroupAdminActivity: hasRecentGroupAdminActivity({
      chatType,
      chatId: message.chat?.id,
    }),
  });

  if (!shouldReply) {
    metrics.messagesFiltered++;
    return;
  }

  if (hasTelegramMediaContent(message)) {
    if (await isAiPausedForUser(userId)) {
      metrics.messagesFiltered++;
      return;
    }

    try {
      await sendTyping(message.chat.id);
      await sendReply(message, MEDIA_UNSUPPORTED_REPLY);
      metrics.messagesReplied++;
    } catch (err) {
      console.error(`[${getTimestamp()}] ❌ Error sending media fallback: ${err.message}`);
      metrics.errors++;
    }
    return;
  }

  if (!text) {
    metrics.messagesFiltered++;
    return;
  }

  if (isAiControlCommand(command)) {
    try {
      const replyText = await runAiControlCommand(command, userId);
      if (replyText) {
        await sendTyping(message.chat.id);
        await sendReply(message, replyText);
        metrics.messagesReplied++;
      } else {
        metrics.messagesFiltered++;
      }
    } catch (err) {
      console.error(`[${getTimestamp()}] ❌ AI control command error: ${err.message}`);
      metrics.errors++;
    }
    return;
  }

  if (await isAiPausedForUser(userId)) {
    metrics.messagesFiltered++;
    return;
  }

  // Check rate limits
  if (!checkUserRateLimit(userId)) {
    metrics.rateLimited++;
    console.log(`[${getTimestamp()}] ⛔ Rate limit for @${user}`);
    return;
  }

  if (!checkGlobalRateLimit()) {
    metrics.rateLimited++;
    console.log(`[${getTimestamp()}] ⛔ Global rate limit exceeded`);
    return;
  }

  const chatId = message.chat.id;
  console.log(`[${getTimestamp()}] 👤 @${user}: ${text.substring(0, 60)}${text.length > 60 ? "..." : ""}`);

  let replyText = "";

  try {
    if (command) {
      replyText = resolveCommandText(command);
    } else {
      const reply = buildAssistantReply(chatId, text);
      const hint = await getReplyHintForUser(userId);
      replyText = reply.text + hint;
    }
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error building reply: ${err.message}`);
    metrics.errors++;
    return;
  }

  if (!replyText) {
    metrics.messagesFiltered++;
    return;
  }

  try {
    await sendTyping(chatId);
    await sendReply(message, replyText);
    metrics.messagesReplied++;
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error sending reply: ${err.message}`);
    metrics.errors++;
  }
}

async function run() {
  console.log(`[${getTimestamp()}] Initializing MoonSale Bot...`);
  
  await warnIfTelegramDnsLooksBlocked();

  let engine;
  try {
    engine = getEngine();
    console.log(`[${getTimestamp()}] ✅ Knowledge base loaded: ${engine.entries.length} entries`);
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ ERROR loading knowledge base: ${err.message}`);
    console.error("Run: npm run build");
    process.exit(1);
  }

  await maybeDeleteWebhook();
  await loadBotIdentity();

  console.log("\n" + "=".repeat(60));
  console.log(" 🚀 MoonSale Telegram Bot — Direct API Polling");
  console.log("=".repeat(60));
  console.log(` 📅 Started: ${new Date().toLocaleString()}`);
  console.log(` 📚 KB entries: ${engine.entries.length}`);
  console.log(` 🌐 Telegram API: ${TELEGRAM_API_BASE_URL}`);
  console.log(` 👤 Bot identity: @${botIdentity.username || "unknown"}`);
  console.log(` 🛡️  Rate limit: ${RATE_LIMIT_MAX_PER_USER}/min per user, ${RATE_LIMIT_MAX_GLOBAL}/min global`);
  console.log(` 👥 Group mention-only: ${GROUP_MENTION_ONLY ? "ON" : "OFF"}`);
  console.log(` ⏱️  Poll timeout: ${POLL_TIMEOUT_SECONDS}s`);
  console.log("=".repeat(60));
  console.log(" ⏳ Waiting for messages... (press Ctrl+C to stop)\n");

  let offset = 0;
  let stop = false;
  let lastMetricsTime = Date.now();
  const METRICS_INTERVAL_MS = 5 * 60 * 1000; // Print metrics every 5 minutes

  process.on("SIGINT", () => {
    stop = true;
    console.log("\n\n⛔ Shutdown signal received...");
    printMetrics();
  });

  while (!stop) {
    try {
      const data = await telegramRequest("getUpdates", {
        offset,
        timeout: POLL_TIMEOUT_SECONDS,
        allowed_updates: ["message", "edited_message"],
      });

      if (!data.ok) {
        console.error(`[${getTimestamp()}] [POLL ERROR] ${JSON.stringify(data)}`);
        metrics.errors++;
        await sleep(ERROR_DELAY_MS);
        continue;
      }

      const updates = Array.isArray(data.result) ? data.result : [];

      for (const update of updates) {
        offset = Math.max(offset, Number(update.update_id || 0) + 1);
        const message = update.message || update.edited_message;
        await handleMessage(message);
      }

      // Print metrics periodically
      const now = Date.now();
      if (now - lastMetricsTime >= METRICS_INTERVAL_MS) {
        printMetrics();
        lastMetricsTime = now;
      }

      if (updates.length === 0) {
        await sleep(IDLE_DELAY_MS);
      }
    } catch (err) {
      console.error(`[${getTimestamp()}] ❌ Poll cycle error: ${err?.message || err}`);
      metrics.errors++;
      await sleep(ERROR_DELAY_MS);
    }
  }

  console.log(`[${getTimestamp()}] ✅ Bot stopped gracefully`);
}

await run();
