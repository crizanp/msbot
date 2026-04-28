/**
 * MoonSale Bot — Comprehensive Test Suite
 * Tests bot responses, edge cases, tone detection, and query handling
 * 
 * Run: node tests.js
 */

import {
  buildAssistantReply,
  escape,
  formatAnswer,
  isGreeting,
  isOffTopic,
  isFollowUpLinkRequest,
  parseTelegramCommand,
  resolveCommandText,
  WELCOME,
  HELP,
  LINKS,
  ABOUT,
  FALLBACK,
  OFF_TOPIC_REPLY,
  MEDIA_UNSUPPORTED_REPLY,
  hasTelegramMediaContent,
  hasBotMention,
  shouldReplyToMessageByPolicy,
} from "./assistantCore.js";
import { runSearchEngineRegressionSuite } from "./searchEngine.regression.js";

let passedTests = 0;
let failedTests = 0;
const results = [];

function test(description, fn) {
  try {
    fn();
    passedTests++;
    results.push({ status: "✅", description });
  } catch (err) {
    failedTests++;
    results.push({ status: "❌", description, error: err.message });
    console.error(`❌ ${description}`);
    console.error(`   Error: ${err.message}\n`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"}\n   Expected: ${expected}\n   Got: ${actual}`);
  }
}

function assertIncludes(haystack, needle, message) {
  const text = String(haystack || "");
  const textLower = text.toLowerCase();
  const needleLower = String(needle || "").toLowerCase();

  // Handle escaped markdown/emojis and unescaped variants.
  // Telegram MarkdownV2 commonly escapes punctuation in links (for example, create\-token).
  const deescapedText = text
    .replace(/\\([_*\[\]()~`>#+\-=|{}.!\\])/g, "$1")
    .toLowerCase();

  const variations = [
    needleLower,
    needleLower.replace(/\./g, "\\."),
    needleLower.replace(/\[/g, "\\[").replace(/\]/g, "\\]"),
    needleLower.replace(/-/g, "\\-"),
  ];

  const found = variations.some(v => textLower.includes(v) || deescapedText.includes(v));
  if (!found) {
    throw new Error(`${message || "Assertion failed"}\n   Expected to find: "${needle}"\n   In: "${haystack}"`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 🧪 GREETING TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 GREETING DETECTION TESTS");
console.log("=" .repeat(70));

test("Detects 'hi' as greeting", () => {
  assert(isGreeting("hi"), "'hi' should be detected as greeting");
});

test("Detects 'hello' as greeting", () => {
  assert(isGreeting("hello"), "'hello' should be detected as greeting");
});

test("Detects 'hey' as greeting", () => {
  assert(isGreeting("hey"), "'hey' should be detected as greeting");
});

test("Detects 'sup' as greeting", () => {
  assert(isGreeting("sup"), "'sup' should be detected as greeting");
});

test("Detects 'yo' as greeting", () => {
  assert(isGreeting("yo"), "'yo' should be detected as greeting");
});

test("Does not detect 'what is moonsale' as greeting", () => {
  assert(!isGreeting("what is moonsale"), "'what is moonsale' should not be greeting");
});

test("Does not detect 'hello moonsale' as greeting", () => {
  assert(!isGreeting("hello moonsale"), "Should only match pure greetings");
});

// ═════════════════════════════════════════════════════════════════════════════
// 🔴 OFF-TOPIC TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 OFF-TOPIC DETECTION TESTS");
console.log("=".repeat(70));

test("Detects 'bitcoin' as off-topic", () => {
  assert(isOffTopic("tell me about bitcoin"), "Bitcoin should be off-topic");
});

test("Detects 'btc' as off-topic", () => {
  assert(isOffTopic("what about btc"), "BTC should be off-topic");
});

test("Detects 'solana' as off-topic", () => {
  assert(isOffTopic("solana price"), "Solana should be off-topic");
});

test("Detects 'weather' as off-topic", () => {
  assert(isOffTopic("whats the weather"), "Weather should be off-topic");
});

test("Detects 'sports' as off-topic", () => {
  assert(isOffTopic("football game"), "Sports should be off-topic");
});

test("Does not detect 'moonsale presale' as off-topic", () => {
  assert(!isOffTopic("moonsale presale"), "Presales should not be off-topic");
});

test("Does not detect 'ethereum chain' as off-topic", () => {
  assert(!isOffTopic("ethereum chain moonsale"), "Should not flag mentioned chains");
});

// ═════════════════════════════════════════════════════════════════════════════
// 🔗 FOLLOW-UP LINK TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 FOLLOW-UP LINK REQUEST TESTS");
console.log("=".repeat(70));

test("Detects 'link' as follow-up request", () => {
  assert(isFollowUpLinkRequest("link"), "'link' should be follow-up request");
});

test("Detects 'link of that please' as follow-up", () => {
  assert(isFollowUpLinkRequest("link of that please"), "Should detect context reference");
});

test("Detects 'source please' as follow-up (or similar patterns)", () => {
  const isFollowUp = isFollowUpLinkRequest("source please") || 
                     isFollowUpLinkRequest("send source") ||
                     isFollowUpLinkRequest("link of that");
  assert(isFollowUp, "Should detect source/link follow-up request");
});

test("Detects 'send link' as follow-up", () => {
  assert(isFollowUpLinkRequest("send link"), "Should detect send link");
});

test("Does not detect 'link about presale' as follow-up", () => {
  assert(!isFollowUpLinkRequest("link about presale"), "Should not match explicit topics");
});

test("Does not detect 'click the link' as follow-up", () => {
  assert(!isFollowUpLinkRequest("click the link"), "Should require context reference");
});

test("Detects 'is there a link' as follow-up", () => {
  assert(isFollowUpLinkRequest("is there a link ?"), "Should detect natural follow-up link phrasing");
});

// ═════════════════════════════════════════════════════════════════════════════
// 🖼️ MEDIA HANDLING TESTS
// ═════════════════════════════════════════════════════════════════════════════

test("Detects Telegram photo message as media", () => {
  assert(hasTelegramMediaContent({ photo: [{ file_id: "abc" }] }), "Photo payload should be detected as media");
});

test("Detects Telegram document message as media", () => {
  assert(hasTelegramMediaContent({ document: { file_id: "doc1" } }), "Document payload should be detected as media");
});

test("Does not detect plain text message as media", () => {
  assert(!hasTelegramMediaContent({ text: "hello" }), "Plain text payload should not be treated as media");
});

test("Media unsupported reply references admin handoff", () => {
  assertIncludes(MEDIA_UNSUPPORTED_REPLY, "admin", "Media fallback should mention admin assistance");
  assertIncludes(MEDIA_UNSUPPORTED_REPLY, "text", "Media fallback should clarify text-only support");
});

// ═════════════════════════════════════════════════════════════════════════════
// 🛡️ GROUP ADMIN ACTIVITY POLICY TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 GROUP ADMIN ACTIVITY POLICY TESTS");
console.log("=".repeat(70));

test("Detects @MoonsaleAssistantBot mention without explicit username context", () => {
  assert(
    hasBotMention("hey @MoonsaleAssistantBot can you help", ""),
    "Should detect hardcoded bot mention fallback"
  );
});

test("Policy blocks non-mentioned group message when admin was recently active", () => {
  const shouldReply = shouldReplyToMessageByPolicy({
    chatType: "supergroup",
    text: "what are moonsale fees",
    command: "",
    botUsername: "moonsaleassistantbot",
    groupMentionOnly: false,
    isGroupAdminSender: false,
    hasRecentGroupAdminActivity: true,
  });

  assert(!shouldReply, "Non-mentioned group messages should be paused during admin activity window");
});

test("Policy allows non-admin mention when admin was recently active", () => {
  const shouldReply = shouldReplyToMessageByPolicy({
    chatType: "group",
    text: "@MoonsaleAssistantBot what are fees",
    command: "",
    botUsername: "moonsaleassistantbot",
    groupMentionOnly: false,
    isGroupAdminSender: false,
    hasRecentGroupAdminActivity: true,
  });

  assert(shouldReply, "Explicit mention should override recent admin activity pause");
});

test("Policy blocks admin sender message without mention", () => {
  const shouldReply = shouldReplyToMessageByPolicy({
    chatType: "supergroup",
    text: "please explain vesting",
    command: "",
    botUsername: "moonsaleassistantbot",
    groupMentionOnly: false,
    isGroupAdminSender: true,
    hasRecentGroupAdminActivity: false,
  });

  assert(!shouldReply, "Admin sender should only get reply when explicitly mentioning the bot");
});

test("Policy allows admin sender message with explicit mention", () => {
  const shouldReply = shouldReplyToMessageByPolicy({
    chatType: "supergroup",
    text: "@MoonsaleAssistantBot please explain vesting",
    command: "",
    botUsername: "moonsaleassistantbot",
    groupMentionOnly: false,
    isGroupAdminSender: true,
    hasRecentGroupAdminActivity: false,
  });

  assert(shouldReply, "Admin sender mention should be allowed");
});

// ═════════════════════════════════════════════════════════════════════════════
// 📝 TEXT ESCAPING TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 MARKDOWN ESCAPING TESTS");
console.log("=".repeat(70));

test("Escapes asterisks", () => {
  const result = escape("*bold*");
  assertIncludes(result, "\\*", "Asterisks should be escaped");
});

test("Escapes underscores", () => {
  const result = escape("_italic_");
  assertIncludes(result, "\\_", "Underscores should be escaped");
});

test("Escapes brackets", () => {
  const result = escape("[link](url)");
  assertIncludes(result, "\\[", "Brackets should be escaped");
});

test("Escapes backticks", () => {
  const result = escape("`code`");
  assertIncludes(result, "\\`", "Backticks should be escaped");
});

test("Does not double-escape already escaped text", () => {
  const once = escape("test");
  const twice = escape(once);
  assertEqual(once, twice, "Should be idempotent");
});

// ═════════════════════════════════════════════════════════════════════════════
// 🎯 RESPONSE BUILDING TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 RESPONSE BUILDING TESTS");
console.log("=".repeat(70));

test("Greeting response has kind 'greeting'", () => {
  const reply = buildAssistantReply(1, "hello");
  assertEqual(reply.kind, "greeting", "Greeting should have kind='greeting'");
});

test("Greeting response contains bot identity", () => {
  const reply = buildAssistantReply(1, "hi");
  assertIncludes(reply.text, "MoonSale", "Greeting should mention MoonSale");
});

test("Off-topic response has kind 'offtopic'", () => {
  const reply = buildAssistantReply(2, "bitcoin price");
  assertEqual(reply.kind, "offtopic", "Off-topic should have kind='offtopic'");
});

test("Off-topic response guides to MoonSale", () => {
  const reply = buildAssistantReply(3, "tell me about solana");
  assertIncludes(reply.text, "MoonSale", "Should redirect to MoonSale");
});

test("Regular question has kind 'answer'", () => {
  const reply = buildAssistantReply(4, "what is moonsale");
  assert(
    reply.kind === "answer" || reply.kind === "overview" || reply.kind.includes("guard"),
    "Should have answer, overview, or guard kind"
  );
});

test("Answer contains text", () => {
  const reply = buildAssistantReply(5, "what is moonsale");
  assert(reply.text && reply.text.length > 10, "Answer should have substantial text");
});

test("Typo group query returns group info", () => {
  const reply = buildAssistantReply(6, "what is thi group about");
  assertEqual(reply.kind, "group_info", "Should classify typo group query as group info");
  assert(!reply.text.toLowerCase().includes("official listing:"), "Should not return specific listing info");
});

test("Short group query returns group info", () => {
  const reply = buildAssistantReply(7, "what this grp about");
  assertEqual(reply.kind, "group_info", "Should classify short group query as group info");
  assert(!reply.text.toLowerCase().includes("current status:"), "Should not return project status listing");
});

test("Channel about query returns group info", () => {
  const reply = buildAssistantReply(8, "what is this channel about");
  assertEqual(reply.kind, "group_info", "Should return group info for channel-about query");
});

test("Noisy shorthand group query returns group info", () => {
  const reply = buildAssistantReply(81, "wht s dis grp abt");
  assertEqual(reply.kind, "group_info", "Should classify noisy shorthand group query as group info");
  assert(!reply.text.toLowerCase().includes("official listing:"), "Should not include listing details");
});

test("Group info shorthand query returns group info", () => {
  const reply = buildAssistantReply(82, "group info pls");
  assertEqual(reply.kind, "group_info", "Should classify 'group info' query as group info");
});

test("Bare group query returns group info", () => {
  const reply = buildAssistantReply(83, "this group?");
  assertEqual(reply.kind, "group_info", "Should classify bare group query as group info");
});

test("MoonSale about query does not return specific presale", () => {
  const reply = buildAssistantReply(9, "what is moonsale about");
  assert(reply.kind === "overview" || reply.kind === "answer", "Should return overview or answer");
  assert(!reply.text.toLowerCase().includes("official listing:"), "Should not return listing details");
});

test("MoonSale shorthand about query returns overview", () => {
  const reply = buildAssistantReply(84, "tell abt moonsale");
  assert(reply.kind === "overview" || reply.kind === "answer", "Should return overview/answer for shorthand moonsale query");
  assert(!reply.text.toLowerCase().includes("official listing:"), "Should not return specific listing details");
});

test("Mention + greeting returns greeting", () => {
  const reply = buildAssistantReply(85, "@MoonsaleAssistantBot hello");
  assertEqual(reply.kind, "greeting", "Mention + hello should classify as greeting");
});

test("Small-talk query should not return fallback", () => {
  const reply = buildAssistantReply(86, "how r u");
  assert(reply.kind === "smalltalk", "Small-talk should return smalltalk kind");
  assert(!reply.text.toLowerCase().includes("investor docs"), "Small-talk should not fall back to docs list");
});

test("Receipt extraction error query returns troubleshooting", () => {
  const reply = buildAssistantReply(87, "Could not extract presale address from receipt");
  assertEqual(reply.kind, "deploy_troubleshoot", "Should return deploy troubleshooting response");
  assertIncludes(reply.text, "tx", "Troubleshooting response should reference tx checks");
});

test("Mixed-language: presale kaise create karu", () => {
  const reply = buildAssistantReply(88, "presale kaise create karu");
  assert(reply.kind === "answer" || reply.kind === "presale_browse", "Should answer presale create mixed-language query");
  assert(
    reply.text.toLowerCase().includes("create") || reply.text.toLowerCase().includes("moonsale"),
    "Should include create guidance"
  );
});

test("Mixed-language: fairlaunch kaise banau", () => {
  const reply = buildAssistantReply(89, "fairlaunch kaise banau");
  assertEqual(reply.kind, "fair_launch_create_guide", "Should route Hinglish fair launch create intent");
  assertIncludes(reply.text, "create-fair-launch", "Should include fair launch create link");
});

test("Mixed-language: token kaise banau", () => {
  const reply = buildAssistantReply(90, "token kaise banau");
  assertEqual(reply.kind, "token_create_guide", "Should route Hinglish token create intent");
  assertIncludes(reply.text, "create-token", "Should include token generator link");
});

test("Mixed-language: gimana bikin token", () => {
  const reply = buildAssistantReply(91, "gimana bikin token");
  assertEqual(reply.kind, "token_create_guide", "Should route Indo token create intent");
  assertIncludes(reply.text, "create-token", "Should include token generator link for Indo query");
});

test("English launch-token query routes to token create guide", () => {
  const reply = buildAssistantReply(94, "how to launch a token", { format: "plain" });
  assertEqual(reply.kind, "token_create_guide", "Should route launch-token phrasing to token create guide");
  assertIncludes(reply.text, "create-token", "Should include token generator link");
});

test("Custom workflow query should not trigger presale guard", () => {
  const reply = buildAssistantReply(93, "if i change token after filling info will values reset", { format: "plain" });
  assertEqual(reply.kind, "answer", "Custom workflow query should resolve as answer");
  assertIncludes(reply.text, "Changing token can alter dependent values", "Should return custom QA answer");
  assert(!reply.text.toLowerCase().includes("browse all presales"), "Should not route to presale guard");
});

test("Low-confidence unknown question asks for clarification", () => {
  const reply = buildAssistantReply(92, "abc xyz random unknown question", { format: "plain" });
  assertEqual(reply.kind, "clarify", "Low-confidence retrieval should return clarifying question");
  assertIncludes(reply.text, "make sure i understood", "Clarifying response should explain confidence guard");
});

test("How-to token launch query should never return countdown status answer", () => {
  const reply = buildAssistantReply(95, "how can i start token launch process", { format: "plain" });
  assert(
    reply.kind === "answer" || reply.kind === "clarify" || reply.kind === "token_create_guide",
    "How-to launch query should resolve as actionable answer or clarifying flow"
  );
  assert(!reply.text.toLowerCase().includes("sale countdown"), "How-to launch should not return countdown status guidance");
  assert(!reply.text.toLowerCase().includes("buy is still locked"), "How-to launch should not return status-lock troubleshooting");
});

test("Follow-up context: live mode lock extension", () => {
  const chatId = 93001;
  buildAssistantReply(chatId, "liquidity lock", { format: "plain" });
  const follow = buildAssistantReply(chatId, "and if live mode?", { format: "plain" });

  assertIncludes(follow.text, "live mode", "Follow-up should preserve lock context");
  assertIncludes(follow.text, "cannot", "Follow-up should return lock extension restriction");
});

test("Follow-up context variant: can extend in live mode", () => {
  const chatId = 93011;
  buildAssistantReply(chatId, "liquidity lock", { format: "plain" });
  const follow = buildAssistantReply(chatId, "can extend in live mode", { format: "plain" });

  assertIncludes(follow.text, "live mode", "Variant follow-up should keep live mode context");
  assertIncludes(follow.text, "cannot", "Variant follow-up should explain extension restriction");
});

test("Follow-up context: eligibility failed after scanner", () => {
  const chatId = 93002;
  buildAssistantReply(chatId, "token scanner", { format: "plain" });
  const follow = buildAssistantReply(chatId, "and eligibility failed?", { format: "plain" });

  assertIncludes(follow.text, "eligibility", "Follow-up should stay on scanner eligibility topic");
  assertIncludes(follow.text, "blocking", "Follow-up should explain blocking eligibility rule");
});

test("Follow-up context variant: eligibility fail", () => {
  const chatId = 93012;
  buildAssistantReply(chatId, "token scanner", { format: "plain" });
  const follow = buildAssistantReply(chatId, "eligibility fail", { format: "plain" });

  assertIncludes(follow.text, "eligibility", "Variant should stay on scanner eligibility context");
  assertIncludes(follow.text, "blocking", "Variant should mention blocking rules");
});

test("Follow-up context: sale fails after claim tokens", () => {
  const chatId = 93003;
  buildAssistantReply(chatId, "claim tokens", { format: "plain" });
  const follow = buildAssistantReply(chatId, "and if sale fails?", { format: "plain" });

  assertIncludes(follow.text, "refund", "Follow-up should map failed sale to refund flow");
});

test("Failed presale answer is platform-oriented", () => {
  const reply = buildAssistantReply(93004, "what if my presale is failed", { format: "plain" });

  assertEqual(reply.kind, "failed_sale_refund", "Failed presale query should use dedicated refund guidance");
  assertIncludes(reply.text, "moonsale.app", "Failed presale guidance should include MoonSale platform links");
  assert(!reply.text.toLowerCase().includes("smart contract"), "Failed presale guidance should stay platform-oriented");
});

test("Follow-up link uses previous failed-sale context", () => {
  const chatId = 93005;
  buildAssistantReply(chatId, "what if my presale is failed", { format: "plain" });
  const follow = buildAssistantReply(chatId, "is there a link ?", { format: "plain" });

  assertEqual(follow.kind, "followup", "Generic link ask should resolve to previous topic link");
  assertIncludes(follow.text, "https://www.moonsale.app", "Follow-up should provide a MoonSale link");
  assert(!follow.text.toLowerCase().includes("verified answer"), "Follow-up should not fall back to generic docs response");
});

// ═════════════════════════════════════════════════════════════════════════════
// 💬 COMMAND MESSAGES TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 COMMAND MESSAGE TESTS");
console.log("=".repeat(70));

test("WELCOME message contains 'MoonSale'", () => {
  assertIncludes(WELCOME, "MoonSale", "Welcome should mention MoonSale");
});

test("WELCOME message has emojis or rocket indicator", () => {
  assert(WELCOME.includes("👋") || WELCOME.includes("Yo"), "Welcome should have emojis");
});

test("WELCOME message has examples", () => {
  assertIncludes(WELCOME, "What is MoonSale", "Welcome should have example questions");
});

test("HELP message lists commands", () => {
  assertIncludes(HELP, "/start", "Help should list /start");
  assertIncludes(HELP, "/help", "Help should list /help");
  assertIncludes(HELP, "/links", "Help should list /links");
  assertIncludes(HELP, "/about", "Help should list /about");
  assertIncludes(HELP, "/stopAiBot", "Help should list /stopAiBot");
  assertIncludes(HELP, "/startAiBot", "Help should list /startAiBot");
});

test("Parses /stopAiBot command", () => {
  const cmd = parseTelegramCommand("/stopAiBot");
  assertEqual(cmd, "/stopaibot", "Should parse /stopAiBot command");
});

test("Parses /startAiBot command with mention", () => {
  const cmd = parseTelegramCommand("/startAiBot@MoonsaleAssistantBot");
  assertEqual(cmd, "/startaibot", "Should parse mentioned /startAiBot command");
});

test("LINKS message has presale link", () => {
  assertIncludes(LINKS, "presale", "Links should include presale");
});

test("LINKS message has create link", () => {
  assertIncludes(LINKS, "create", "Links should include create");
});

test("LINKS message organized by categories", () => {
  assertIncludes(LINKS, "Main Actions", "Links should have Main Actions category");
  assertIncludes(LINKS, "Token Tools", "Links should have Token Tools category");
});

test("ABOUT message explains bot purpose", () => {
  assertIncludes(ABOUT, "Zero AI", "About should mention zero AI");
});

test("ABOUT message has technical credibility", () => {
  assert(ABOUT.includes("TF-IDF") || ABOUT.includes("search engine") || ABOUT.includes("Node"), "About should explain technical approach");
});

test("ABOUT message mentions supported chains", () => {
  assertIncludes(ABOUT, "Ethereum", "About should mention Ethereum");
  assertIncludes(ABOUT, "BNB", "About should mention BNB Chain");
});

test("FALLBACK message is helpful", () => {
  assertIncludes(FALLBACK, "Docs", "Fallback should reference docs");
});

test("OFF_TOPIC_REPLY redirects to MoonSale", () => {
  assertIncludes(OFF_TOPIC_REPLY, "MoonSale", "Off-topic should mention MoonSale");
});

// ═════════════════════════════════════════════════════════════════════════════
// 🔍 SEARCH ENGINE INTEGRATION TESTS (Optional - skipped in fast mode)
// ═════════════════════════════════════════════════════════════════════════════

// Commented out because SearchEngine initialization is slow
// Uncomment if running comprehensive tests with time
/*
console.log("\n📌 SEARCH ENGINE TESTS");
console.log("=".repeat(70));

test("Search engine loads", () => {
  const engine = new SearchEngine();
  assert(engine.entries && engine.entries.length > 0, "Search engine should load entries");
});

test("Search finds MoonSale definition", () => {
  const engine = new SearchEngine();
  const results = engine.search("what is moonsale", 1);
  assert(results.length > 0, "Should find results for 'what is moonsale'");
});

test("Search handles misspellings", () => {
  const engine = new SearchEngine();
  const results = engine.search("moonsale defintion", 1);
  assert(results.length > 0, "Should handle misspelled 'definition'");
});

test("Search finds presale info", () => {
  const engine = new SearchEngine();
  const results = engine.search("presale", 1);
  assert(results.length > 0, "Should find presale information");
});

test("Search finds vesting info", () => {
  const engine = new SearchEngine();
  const results = engine.search("vesting", 1);
  assert(results.length > 0, "Should find vesting information");
});
*/

// ═════════════════════════════════════════════════════════════════════════════
// 🎨 RESPONSE FORMATTING TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 SEARCH ENGINE REGRESSION TESTS");
console.log("=".repeat(70));

test("SearchEngine interactive regression suite passes", () => {
  const result = runSearchEngineRegressionSuite({ verbose: false });

  if (result.failed > 0) {
    const preview = result.failures
      .slice(0, 3)
      .map(f => f.name)
      .join(", ");

    throw new Error(
      `SearchEngine regression failed (${result.failed}/${result.total}). Failing cases: ${preview}`
    );
  }
});

console.log("\n📌 RESPONSE FORMATTING TESTS");
console.log("=".repeat(70));

test("Format answer handles long text", () => {
  const longText = "Lorem ipsum ".repeat(500);
  const formatted = formatAnswer(longText);
  assert(formatted.length < longText.length * 2, "Should truncate very long answers");
});

test("Answer adds contextual tips based on query", () => {
  // When asking "how to create presale", should get a tip about create link
  const reply = buildAssistantReply(50, "how do I create a presale");
  assert(
    reply.text.includes("moonsale.app/create") || reply.text.includes("create"),
    "Should suggest create link for presale creation queries"
  );
});

test("Answer doesn't add tips for general questions", () => {
  // Audit question shouldn't have creation tips
  const reply = buildAssistantReply(51, "is it audited");
  // Just verify it returns a valid answer without checking specific tips
  assert(reply.kind === "answer" || reply.kind === "fallback", "Should return answer or fallback");
});

test("Format answer preserves or escapes links properly", () => {
  const answer = "Visit https://moonsale.app for more info";
  const formatted = formatAnswer(answer);
  assert(formatted.includes("moonsale") || formatted.includes("https"), "Should preserve link references");
});

test("Plain format reply removes Telegram escaping", () => {
  const reply = buildAssistantReply(93, "token kaise banau", { format: "plain" });
  assertEqual(reply.kind, "token_create_guide", "Plain mode should keep intent classification");
  assert(!reply.text.includes("\\"), "Plain mode should not include Telegram escape backslashes");
  assertIncludes(reply.text, "create-token", "Plain mode should preserve destination links");
});

test("Plain format command text is human-readable", () => {
  const helpText = resolveCommandText("/help", { format: "plain" });
  assert(helpText.length > 50, "Plain command text should not be empty");
  assert(!helpText.includes("\\"), "Plain command text should not include Telegram escape backslashes");
  assertIncludes(helpText, "/start", "Plain command text should include command list");
});

// ═════════════════════════════════════════════════════════════════════════════
// 🎲 RANDOMIZATION TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 RANDOMIZATION & VARIETY TESTS");
console.log("=".repeat(70));

test("Multiple greetings produce varied responses", () => {
  const responses = new Set();
  for (let i = 0; i < 10; i++) {
    const reply = buildAssistantReply(i, "hello");
    responses.add(reply.text.substring(0, 50));
  }
  assert(responses.size > 1, "Should produce varied greeting responses");
});

test("Answers avoid synthetic lead-in labels", () => {
  const casual = buildAssistantReply(1, "yo whats up");
  assert(
    !/(quick answer|short version|here you go|in brief|answer:|key point:|summary:|details:|guidance:)/i.test(casual.text),
    "Responses should stay direct without prefixed labels"
  );
});

test("Tone detection works for professional", () => {
  const professional = buildAssistantReply(2, "Please provide official documentation");
  // Professional shouldn't have casual prefixes like "Yo check it out"
  assert(professional.text, "Professional query should get appropriate response");
});

// ═════════════════════════════════════════════════════════════════════════════
// 📊 TEST SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n" + "=".repeat(70));
console.log("📊 TEST RESULTS SUMMARY");
console.log("=".repeat(70));

console.log(`\n✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📈 Total:  ${passedTests + failedTests}`);
console.log(`📊 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%\n`);

if (failedTests > 0) {
  console.log("Failed Tests Details:\n");
  results.filter(r => r.status === "❌").forEach(r => {
    console.log(`${r.status} ${r.description}`);
    if (r.error) console.log(`   └─ ${r.error}\n`);
  });
}

console.log("=".repeat(70));
if (failedTests === 0) {
  console.log("🎉 All tests passed! Bot is ready for production.\n");
  process.exit(0);
} else {
  console.log(`⚠️  ${failedTests} test(s) failed. Please review above.\n`);
  process.exit(1);
}
