/**
 * Shared MoonSale assistant logic used by both polling and webhook runtimes.
 */

import { SearchEngine } from "./searchEngine.js";

export const WELCOME = `
🌙 *Welcome to the MoonSale Assistant\\!*

Hi 👋 I can help with MoonSale presales, fair launches, fees, vesting, token locks, KYC, and audits\\.

You will get clear answers based on official MoonSale information\\.
*Try asking:*
• 🤔 What is MoonSale\\?
• ➕ How do I create a presale\\?
• 💰 What are the platform fees\\?
• 🔒 Are LP tokens locked\\?
• ✅ How does a fair launch work\\?
• 🌙 What happens if softcap fails\\?

Type /help to see all commands, or send your question directly\\.
`.trim();

export const HELP = `
*🤖 MoonSale Assistant — Command Menu*

/start — 👋 Show the welcome message
/help  — 📚 Show this help menu
/links — 🔗 Open useful MoonSale links
/about — ℹ️ Learn what this bot does
/stopAiBot — ⏸️ Pause AI replies for 12h
/startAiBot — ▶️ Resume AI replies

*You can also ask directly:* 💬
• 💡 How does vesting work?
• ⏪ Can I withdraw my tokens early?
• 🌍 Which blockchains are supported?
• 🔐 How do I lock my tokens?
• ⚖️ What's a fair launch?
• 💸 What are the fees?
• 🎯 How's KYC handled?

I will reply with concise answers from MoonSale documentation\\.
`.trim();

export const LINKS = `
*🔗 MoonSale Links — Quick Access Guide*

*🎯 Main Actions:*
🚀 [Browse Presales](https://www.moonsale.app/presale) — Explore live & upcoming presales
➕ [Create a Presale](https://www.moonsale.app/create) — Launch your token
⚖️ [Create Fair Launch](https://www.moonsale.app/create-fair-launch) — No fixed price needed

*🛠️ Token Tools:*
🪙 [Token Generator](https://www.moonsale.app/create-token) — Deploy your ERC20
🔍 [Token Scanner](https://www.moonsale.app/token-scanner) — Check contract safety
📊 [Tokenomics Creator](https://www.moonsale.app/tokenomics-creator) — Plan your economics

*💰 Investor & Builder Tools:*
🔒 [Token Lock](https://www.moonsale.app/lock) — Lock your liquidity safe
📅 [Token Vesting](https://www.moonsale.app/vesting) — Set up release schedules
✅ [KYC & Audit](https://www.moonsale.app/kyc-audit) — Verify legitimacy

*📖 Documentation:*
💎 [Investor Docs](https://www.moonsale.app/investor-docs) — Everything for investors
👨\\-💻 [Developer Docs](https://www.moonsale.app/developer-docs) — Technical integration
💰 [Platform Fees Info](https://www.moonsale.app/fees) — See all costs

*Need more details* 🌙 Visit *[MoonSale Website](https://moonsale.app)*
`.trim();

export const ABOUT = `
*🤖 About the MoonSale Assistant*

Built for the MoonSale community, this bot provides fast and reliable launchpad guidance\\.

*Why this bot is useful:*
✅ *Zero AI hallucinations* — Answers are grounded in MoonSale docs
⚡ *Fast replies* — Built for instant support
🎯 *Focused accuracy* — Answers stay on MoonSale topics
🔍 *Smart search* — TF\\-IDF + fuzzy matching improves relevance

*Quick facts:*
🏗️ Built on Node\\.js with a custom search engine
🌍 Supports both Ethereum & BNB Chain
💬 Works in DMs, groups, and channels

*Need more\\?*
📖 Check /links for all resources
🔗 Visit [moonsale\\.app](https://moonsale.app) for full platform details

Happy launching 🚀
`.trim();

export const FALLBACK = `
I could not find a confident answer for that yet 🤖

For the most accurate help, please wait for the admin team to reply in chat\\.

*Useful options:*
📝 Rephrase your question and I will try again
📖 [Investor Docs](https://www.moonsale.app/investor-docs)
👨\\-💻 [Developer Docs](https://www.moonsale.app/developer-docs)
🚀 [Browse Presales](https://www.moonsale.app/presale)
🏠 [Visit moonsale\\.app](https://moonsale.app)

I am here if you want to try another MoonSale question 💬
`.trim();

export const OFF_TOPIC_REPLY =
  "I can only help with MoonSale topics 🌙\n\n" +
  "I cannot assist with general crypto markets, sports, or weather\\. Ask me about presales, fair launches, token vesting, KYC, fees, token locks, or MoonSale tools\\.\n\n" +
  "What MoonSale topic would you like help with\\?";

export const MEDIA_UNSUPPORTED_REPLY =
  "📎 I currently support text messages only\\. I cannot process images or other media yet\\. An admin will assist you shortly\\.";

const SPECIFIC_PRESALE_REPLY = [
  "🔍 Looking for a specific presale\\?",
  "",
  "I do not provide direct project\\-by\\-project investment calls here, but MoonSale listings show the latest details\\.",
  "",
  "👉 [Browse all presales on moonsale\\.app/presale](https://moonsale.app/presale)",
  "",
  "Search by token name, contract, or project\\. You can check status, hardcap, softcap, and team information there\\.",
  "",
  "⚠️ *Always DYOR* \\- Do your own research before investing\\. Review audits, team information, and community signals\\.",
  "",
  "Need platform guidance instead\\? Ask me: 'What is a presale\\?' and I will explain clearly\\.",
].join("\n");

export const OPTS_MD = {
  parse_mode: "MarkdownV2",
  disable_web_page_preview: true,
};

const GREETINGS = new Set([
  "hi", "hello", "hey", "sup", "yo", "hola", "greetings",
  "good morning", "good evening", "good afternoon", "howdy",
]);

const OFF_TOPIC_PATTERNS = [
  /\b(bitcoin|btc(?!\s*chain)|solana|sol|cardano|ada|xrp|ripple)\b/i,
  /\b(binance(?!.*moonsale)|coinbase|kraken|okx|bybit)\b/i,
  /\bweather\b/i,
  /\b(football|cricket|sports|basketball)\b/i,
];

const TELEGRAM_MEDIA_KEYS = [
  "photo",
  "video",
  "animation",
  "document",
  "audio",
  "voice",
  "video_note",
  "sticker",
  "contact",
  "location",
  "venue",
  "poll",
];

const EXPLICIT_LINK_TOPIC_PATTERNS = [
  /\bpresale\b/i,
  /\bfair\s*launch\b/i,
  /\bwhitepaper\b/i,
  /\binvestor\s*docs\b/i,
  /\bdeveloper\s*docs\b/i,
  /\bfees?\b/i,
  /\btokenomics\b/i,
  /\btoken\s*scanner\b/i,
  /\bvesting\b/i,
  /\block\b/i,
  /\bkyc\b/i,
  /\baudit\b/i,
];

const TONE_PRO_PATTERNS = [
  /\bplease\b/i,
  /\bkindly\b/i,
  /\bofficial\b/i,
  /\bdocumentation\b/i,
  /\bexplain in detail\b/i,
  /\bfull details\b/i,
  /\bpolicy\b/i,
  /\baudit report\b/i,
];

const TONE_CASUAL_PATTERNS = [
  /\bhey\b/i,
  /\byo\b/i,
  /\bsup\b/i,
  /\bpls\b/i,
  /\blol\b/i,
  /\bquick\b/i,
  /\btldr\b/i,
];

const SMALL_TALK_PATTERNS = [
  /^how\s*(are|r)\s*you\??$/i,
  /^how\s*(are|r)\s*(you|u)\??$/i,
  /^how\s*ru\??$/i,
  /^kya\s+haal\s+hai\??$/i,
  /^kaise\s+ho\??$/i,
  /^gimana\s+kabar\??$/i,
  /^apa\s+kabar\??$/i,
];

const CONTEXT_CARRY_PREFIX_RE = /^(and|also|then|plus|so|now|ok|okay|alright|and if|if so|what about|how about|and what about)\b[,:]?\s*/i;
const CONTEXT_CARRY_HINT_RE = /\b(withdraw|penalty|refund|deadline|claim|fee|fees|rate|price|softcap|hardcap|liquidity|lock|live|vesting|eligibility|scanner|deploy|finalize|failed|fail|whitelist|min|max)\b/i;



const PROJECT_TERM_STOPWORDS = new Set([
  "presale", "fair", "launch", "status", "listed", "moon", "moonsale",
  "live", "upcoming", "filled", "failed", "cancelled", "canceled", "ended",
  "current", "official", "listing", "source", "project", "projects", "token",
  "tokens", "app", "www", "https", "http", "details", "detail",
]);

const GENERIC_QUERY_STOPWORDS = new Set([
  "what", "is", "this", "thi", "that", "about", "tell", "me", "please",
  "can", "you", "i", "it", "we", "do", "how", "why", "when", "where",
  "which", "who", "are", "am", "to", "for", "of", "on", "in", "a", "an",
  "the", "group", "grp", "chat", "channel", "chanel", "community", "purpose", "topic",
  "info", "details", "detail", "latest", "update", "updates",
]);

const RESERVED_GENERIC_SINGLE_TERMS = new Set([
  "moonsale", "presale", "fairlaunch", "fair", "launch", "tokenomics",
  "fees", "refund", "refunds", "liquidity", "vesting", "audit", "kyc",
  "wallet", "metamask", "support", "help", "docs", "whitepaper", "link",
]);

const DOMAIN_TOPIC_TERMS = new Set([
  "sale", "presale", "launch", "fair", "rate", "price", "softcap", "hardcap",
  "refund", "refunds", "deadline", "claim", "claims", "withdraw", "penalty",
  "liquidity", "lock", "vesting", "token", "tokens", "scanner", "eligibility",
  "failed", "fails", "failure", "difference", "vs", "min", "max", "fee", "fees",
]);

const PROJECT_LOOKUP_TEMPLATE_TERMS = new Set([
  "status", "current", "official", "listing", "listed", "project", "projects",
  "token", "tokens", "presale", "launch", "fair", "check", "show", "find",
  "about", "link", "url", "website", "source", "name", "symbol",
]);

const GENERIC_PRESALE_BROWSE_RESPONSE = `
🚀 *Browse Live Presales on MoonSale*

Instead of listing specific projects, I'm pointing you to the official marketplace where you can explore all presales yourself:

👉 [Browse All Presales](https://www.moonsale.app/presale) — Live & upcoming launches
👉 [Browse Fair Launches](https://www.moonsale.app) — No fixed price launches

*What you'll find there:*
✅ Real-time status (live, upcoming, ended)
✅ Hard & soft caps for each project
✅ Team info & audit status
✅ Community links & tokenomics
✅ One-click investment interface

💡 *Pro tip:* Always DYOR before investing. Check audits, team credentials, and community sentiment!

🔍 *Want specific presale info?* Give me a project name and I'll help you find details!
`.trim();

const GROUP_INFO_REPLY = [
  "Welcome\\! 👋 This group is for the *MoonSale Community*\\.",
  "",
  "🚀 *What is MoonSale\\?*",
  "MoonSale is a launchpad for presales, fair launches, token lock, vesting, and token tools\\.",
  "",
  "*Quick links:*",
  "🏠 [moonsale\\.app](https://moonsale.app)",
  "📖 [Investor Docs](https://www.moonsale.app/investor-docs)",
  "",
  "Ask me anything about MoonSale features and I will help\\! 💬",
].join("\n");

const MOONSALE_OVERVIEW_REPLY = [
  "MoonSale is a crypto launchpad for presales and fair launches\\.",
  "",
  "It also includes token lock, token vesting, token generator, token scanner, and KYC\\/audit resources\\.",
  "",
  "🔗 Start here: [moonsale\\.app](https://moonsale.app)",
].join("\n");

const SMALL_TALK_REPLY = [
  "I'm doing great and ready to help with MoonSale\\!",
  "",
  "Ask me anything about:",
  "• Creating a presale",
  "• Creating a fair launch",
  "• Token generator",
  "• Vesting, lock, and fees",
].join("\n");

const CREATE_FAIR_LAUNCH_GUIDE_REPLY = [
  "To create a fair launch:",
  "",
  "1\\) Open [moonsale\\.app/create\\-fair\\-launch](https://www.moonsale.app/create-fair-launch)",
  "2\\) Connect wallet and select token",
  "3\\) Set token pool, softcap, min\\/max buy, liquidity, and timeline",
  "4\\) Deploy contract and pay listing fee",
  "5\\) Share listing and finalize after sale end",
].join("\n");

const CREATE_TOKEN_GUIDE_REPLY = [
  "To create a token on MoonSale:",
  "",
  "1\\) Open [moonsale\\.app/create\\-token](https://www.moonsale.app/create-token)",
  "2\\) Set token name, symbol, supply, and decimals",
  "3\\) Deploy token contract from your wallet",
  "4\\) Then create a presale at [moonsale\\.app/create](https://www.moonsale.app/create)",
].join("\n");

const LOCK_EXTENSION_LIVE_MODE_REPLY = [
  "In live mode, lock extension cannot be changed after finalization\.",
  "",
  "The sale uses the lock settings configured before finalization\. If you need different lock duration, create a new sale with updated settings\.",
  "",
  "🔗 [Lock Tool](https://www.moonsale.app/lock)",
].join("\n");

const TOKEN_SCANNER_ELIGIBILITY_FAIL_REPLY = [
  "If Token Scanner shows eligibility failed, a blocking rule was triggered\.",
  "",
  "Common causes include existing liquidity pairs, risky token parameters, or restricted contract behavior\. Fix the blocking issue and scan again\.",
  "",
  "🔗 [Scanner](https://www.moonsale.app/token-scanner)",
  "📖 [Dev Reference](https://www.moonsale.app/developer-docs)",
].join("\n");

const CLARIFY_TOKEN_LAUNCH_REPLY = [
  "I want to make sure I understood your request\.",
  "",
  "Are you asking about:",
  "1\) creating a token contract",
  "2\) launching a presale or fair launch for that token",
  "",
  "Reply with 1 or 2 and I will give exact steps\.",
].join("\n");

const CLARIFY_WORKFLOW_REPLY = [
  "I want to make sure I understood your workflow question\.",
  "",
  "Is this about token creation, presale\/fair launch setup, or claim\/refund flow\?",
  "Share one target flow and I will give step\-by\-step guidance\.",
].join("\n");

const CLARIFY_GENERIC_REPLY = [
  "I want to make sure I understood before giving a wrong answer\.",
  "",
  "Please rephrase with one clear topic, for example:",
  "• token creation",
  "• presale setup",
  "• fair launch setup",
  "• claim or refund",
].join("\n");

const PLATFORM_LINKS = {
  home: "https://www.moonsale.app",
  presale: "https://www.moonsale.app/presale",
  create: "https://www.moonsale.app/create",
  fairLaunch: "https://www.moonsale.app/create-fair-launch",
  investorDocs: "https://www.moonsale.app/investor-docs",
  developerDocs: "https://www.moonsale.app/developer-docs",
  fees: "https://www.moonsale.app/fees",
  vesting: "https://www.moonsale.app/vesting",
  lock: "https://www.moonsale.app/lock",
  tokenGenerator: "https://www.moonsale.app/create-token",
  tokenScanner: "https://www.moonsale.app/token-scanner",
  tokenomics: "https://www.moonsale.app/tokenomics-creator",
};

const FAILED_SALE_REFUND_PLATFORM_REPLY = [
  "If a presale fails \(for example, softcap is not reached\), contributors can request refunds from the MoonSale platform sale page using the same wallet\.",
  "",
  "Steps:",
  "1\\) Open [Browse Presales](https://www.moonsale.app/presale)",
  "2\\) Open the failed or cancelled sale page",
  "3\\) Connect the contributing wallet and use Refund",
  "",
  "📖 [Refund Guide](https://www.moonsale.app/investor-docs)",
].join("\n");

const RECEIPT_EXTRACTION_ERROR_REPLY = [
  "If you see *Could not extract presale address from receipt*:",
  "",
  "1\\) Ensure both wallet confirmations were completed",
  "2\\) Wait for final transaction confirmation on chain",
  "3\\) Check explorer logs for presale creation event",
  "4\\) Refresh My Launches and try again",
  "5\\) If still missing, share tx hash + token address with support",
  "",
  "Helpful pages:",
  "• [Create Presale](https://www.moonsale.app/create)",
  "• [Developer Docs](https://www.moonsale.app/developer-docs)",
].join("\n");

const CHAT_CONTEXT = new Map();
const MAX_CHAT_CONTEXTS = 2000;
const FOLLOW_UP_CONTEXT_TTL_MS = 30 * 60 * 1000;
const GROUP_MENTION_ONLY = String(process.env.GROUP_MENTION_ONLY || "false").toLowerCase() === "true";

let engineSingleton;
let projectLookupTermsCache;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function getEngine() {
  if (!engineSingleton) {
    engineSingleton = new SearchEngine();
  }
  return engineSingleton;
}

function tokenizeSimple(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeLoose(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIncomingQuery(text) {
  return String(text || "")
    .replace(/@[a-zA-Z0-9_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isFailedSaleRefundQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  if (/\b(softcap|presale|sale|launch)\b.*\b(fail|fails|failed|not met|not reached|cancelled|canceled)\b/.test(q)) return true;
  if (/\b(what\s+happens|what\s+if|if)\b.*\b(presale|sale|launch)\b.*\b(fail|fails|failed)\b/.test(q)) return true;
  if (/\brefund\b.*\b(softcap|failed|cancelled|canceled|sale|presale)\b/.test(q)) return true;

  return false;
}

function inferPlatformLinkFromText(text) {
  const q = normalizeLoose(text);
  if (!q) return PLATFORM_LINKS.home;

  if (/\b(create)\b.*\b(token)\b|\btoken\s+generator\b/.test(q)) return PLATFORM_LINKS.tokenGenerator;
  if (/\b(token\s*scanner|scanner)\b/.test(q)) return PLATFORM_LINKS.tokenScanner;
  if (/\btokenomics\b/.test(q)) return PLATFORM_LINKS.tokenomics;
  if (/\b(fair\s*launch|fairlaunch)\b.*\b(create|start|launch|setup)?\b|\bcreate\b.*\bfair\s*launch\b/.test(q)) return PLATFORM_LINKS.fairLaunch;
  if (/\b(create|start|setup|launch)\b.*\bpresale\b|\bpresale\b.*\bcreate\b/.test(q)) return PLATFORM_LINKS.create;
  if (/\b(refund|refunds|failed|fail|fails|softcap|cancelled|canceled|claim)\b/.test(q)) return PLATFORM_LINKS.investorDocs;
  if (/\b(vesting)\b/.test(q)) return PLATFORM_LINKS.vesting;
  if (/\b(lock|liquidity)\b/.test(q)) return PLATFORM_LINKS.lock;
  if (/\b(fee|fees|cost|price)\b/.test(q)) return PLATFORM_LINKS.fees;
  if (/\b(dev|developer|integration|api|contract)\b/.test(q)) return PLATFORM_LINKS.developerDocs;
  if (/\b(presale|launch|project|invest)\b/.test(q)) return PLATFORM_LINKS.presale;

  return PLATFORM_LINKS.home;
}

function platformizeFailedSaleAnswer(answer, query) {
  if (!isFailedSaleRefundQuery(query)) return String(answer || "");

  let out = String(answer || "");
  out = out.replace(/directly\s+from\s+the\s+smart\s+contract/gi, "from the MoonSale sale page");
  out = out.replace(/refund\s+is\s+enforced\s+on-?chain\s+automatically/gi, "refund is available through MoonSale platform flow");
  out = out.replace(/no\s+admin\s+needed,?\s*no\s+delays/gi, "using the same contributing wallet");
  return out;
}

function getGuaranteedLinkTip(query, textSoFar) {
  if (/https?:\/\//i.test(String(textSoFar || ""))) return "";
  const url = inferPlatformLinkFromText(query);
  return `\n\n🔗 [Open Link](${url})`;
}

function isSmallTalkQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;
  return SMALL_TALK_PATTERNS.some(p => p.test(q));
}

function isContextCarryForwardQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;
  if (/^\/[a-z0-9_]+/.test(q)) return false;
  if (isFollowUpLinkRequest(q)) return false;
  if (CONTEXT_CARRY_PREFIX_RE.test(q)) return true;

  if (/\b(can\s+extend\s+in\s+live\s+mode|eligibility\s+fail(?:ed)?|existing\s+liquidity)\b/.test(q)) return true;

  const tokens = tokenizeSimple(q);
  if (tokens.length <= 6 && CONTEXT_CARRY_HINT_RE.test(q)) return true;
  if (tokens.length <= 3 && /\b(it|that|this|same)\b/.test(q)) return true;

  return false;
}

function isLockExtensionInLiveModeQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  if (/\bcan\s+extend\s+in\s+live\s+mode\b/.test(q) && /\b(lock|liquidity)\b/.test(q)) return true;
  if (/\b(live\s+mode)\b/.test(q) && /\b(extend|extension)\b/.test(q) && /\b(lock|liquidity)\b/.test(q)) return true;

  return false;
}

function isTokenScannerEligibilityFailQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  if (!/\btoken\s*scanner\b/.test(q)) return false;
  if (!/\beligibility\b/.test(q)) return false;

  return /\b(fail|failed|failing|blocked|blocking)\b/.test(q);
}


function buildContextualizedQuery(query, context) {
  const q = normalizeIncomingQuery(query);
  const topic = normalizeIncomingQuery(context?.lastTopic || "");
  if (!q || !topic) return q;

  const tail = q.replace(CONTEXT_CARRY_PREFIX_RE, "").trim() || q;
  return `${topic} ${tail}`.replace(/\s+/g, " ").trim();
}

function isCreateFairLaunchQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  if (/\bhow\s+do\s+i\s+create\s+fair\s*launch\b/.test(q)) return true;
  if (/\bcreate\s+fair\s*launch\b/.test(q)) return true;
  if (/\bfair\s*launch\s+kaise\s+(banau|banao|banaye|create)\b/.test(q)) return true;
  if (/\b(gimana|cara)\b.*\b(bikin|buat|create)\b.*\bfair\s*launch\b/.test(q)) return true;

  return false;
}

function isCreateTokenQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  if (/\bhwo\s+to\s+create\s+token\b/.test(q)) return true;
  if (/\bhow\s+to\s+launch\s+(a\s+)?token\b/.test(q)) return true;
  if (/\bhow\s+do\s+i\s+launch\s+(a\s+)?token\b/.test(q)) return true;
  if (/\blaunch\s+(my\s+|a\s+)?token\b/.test(q)) return true;
  if (/\bhow\s+do\s+i\s+create\s+token\b/.test(q)) return true;
  if (/\bcreate\s+token\b/.test(q)) return true;
  if (/\btoken\s+generator\b/.test(q)) return true;
  if (/\btoken\s+kaise\s+(banau|banao|banaye|create)\b/.test(q)) return true;
  if (/\b(gimana|cara)\b.*\b(bikin|buat|create)\b.*\btoken\b/.test(q)) return true;

  return false;
}

function isReceiptExtractionErrorQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  return /could\s+not\s+extract\s+presale\s+address\s+from\s+receipt/.test(q)
    || /extract\s+presale\s+address/.test(q)
    || /presale\s+address\s+from\s+receipt/.test(q);
}

function isGroupAboutQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  if (/^(group|grp|chat|channel|chanel|community)\s+about\??$/.test(q)) return true;
  if (/^(this|thi|dis)?\s*(group|grp|chat|channel|chanel|community)\??$/.test(q)) return true;
  if (/^(group|grp|chat|channel|chanel|community)\s+info\b/.test(q)) return true;
  if (/^tell\s+me\s+about\s+(this\s+)?(group|grp|chat|channel|chanel|community)\??$/.test(q)) return true;
  if (/^what\s+(is\s+)?(this|thi|dis)?\s*(group|grp|chat|channel|chanel|community)\s+about\??$/.test(q)) return true;
  if (/^(what|wht|wat|whats|wats)\s+(is\s+)?(this|thi|dis)?\s*(group|grp|chat|channel|chanel|community)\??$/.test(q)) return true;
  if (/^what\s+(is\s+)?this\s+about\??$/.test(q)) return true;

  const tokens = q.split(" ");
  const hasGroupWord = tokens.some(t => ["group", "grp", "chat", "channel", "chanel", "community"].includes(t));
  const hasAboutWord = tokens.some(t => ["about", "purpose", "topic", "abt"].includes(t));
  const hasQuestionCue = tokens.some(t => [
    "what", "wht", "wat", "whats", "wats", "this", "thi", "dis",
    "about", "abt", "info", "purpose", "topic", "intro", "pls", "please",
  ].includes(t));

  if (hasGroupWord && hasQuestionCue && tokens.length <= 6) return true;

  return hasGroupWord && hasAboutWord;
}

function isMoonSaleOverviewQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  if (
    /^what\s+is\s+moonsale(\s+about)?\??$/.test(q)
    || /^tell\s+me\s+about\s+moonsale\??$/.test(q)
    || /^what\s+is\s+moon\s+sale(\s+about)?\??$/.test(q)
  ) {
    return true;
  }

  const tokens = q.split(" ");
  const hasMoonSale = tokens.includes("moonsale") || (tokens.includes("moon") && tokens.includes("sale"));
  const hasOverviewCue = tokens.some(t => [
    "about", "abt", "info", "intro", "overview", "what", "tell", "pls", "please",
  ].includes(t));

  if (hasMoonSale && hasOverviewCue) return true;
  if (hasMoonSale && tokens.length <= 2) return true;

  return false;
}

function isLikelyProjectLookupTerm(token) {
  if (token.length < 3) return false;
  if (!/[a-z]/.test(token)) return false;
  if (PROJECT_TERM_STOPWORDS.has(token)) return false;
  if (GENERIC_QUERY_STOPWORDS.has(token)) return false;
  if (DOMAIN_TOPIC_TERMS.has(token)) return false;
  if (PROJECT_LOOKUP_TEMPLATE_TERMS.has(token)) return false;
  return true;
}

function getProjectLookupTerms() {
  if (projectLookupTermsCache) return projectLookupTermsCache;

  const allTerms = new Set();
  const slugTerms = new Set();
  const engine = getEngine();

  for (const entry of (engine.entries || [])) {
    const tags = new Set(entry?.tags || []);
    if (!tags.has("project_lookup")) continue;

    const combined = `${entry?.title || ""} ${entry?.question || ""}`;
    for (const token of tokenizeSimple(combined)) {
      if (!isLikelyProjectLookupTerm(token)) continue;
      allTerms.add(token);
    }

    const source = String(entry?.source || "").toLowerCase();
    const slugMatch = source.match(/\/(presale|fair-launch)\/([^/?#]+)/i);
    if (!slugMatch) continue;

    for (const rawToken of slugMatch[2].split("-")) {
      const token = rawToken.toLowerCase();
      if (!isLikelyProjectLookupTerm(token)) continue;
      slugTerms.add(token);
      allTerms.add(token);
    }
  }

  projectLookupTermsCache = { allTerms, slugTerms };
  return projectLookupTermsCache;
}

function isSpecificPresaleQuery(query, topResult) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return false;

  const queryTokens = tokenizeSimple(q);
  if (!queryTokens.length) return false;

  // Allow core platform-level questions.
  if (/^what\s+is\s+moonsale\??$|^tell\s+me\s+about\s+moonsale\??$/.test(q)) {
    return false;
  }

  // Don't treat generic presale/launch terms as specific queries
  // These should go to browse page instead
  const isGenericBrowseQuery = /^(launch|presale|fair\s*launch?|fair|browse|show|list)$/i.test(q);
  if (isGenericBrowseQuery) return false;

  // Don't match queries that are clearly community/about context.
  if (isGroupAboutQuery(query)) return false;
  if (isMoonSaleOverviewQuery(query)) return false;

  const { allTerms, slugTerms } = getProjectLookupTerms();
  const meaningfulTokens = queryTokens.filter(t => (
    t.length >= 3
    && !PROJECT_TERM_STOPWORDS.has(t)
    && !RESERVED_GENERIC_SINGLE_TERMS.has(t)
    && !GENERIC_QUERY_STOPWORDS.has(t)
  ));
  if (!meaningfulTokens.length) return false;

  const projectCandidateTokens = meaningfulTokens.filter(t => !DOMAIN_TOPIC_TERMS.has(t));
  if (!projectCandidateTokens.length) return false;

  const hasSlugProjectToken = projectCandidateTokens.some(t => slugTerms.has(t));
  const hasGeneralProjectToken = projectCandidateTokens.some(t => allTerms.has(t));
  const topIsProjectLookup = !!topResult && Array.isArray(topResult.tags) && topResult.tags.includes("project_lookup");

  const singleToken = queryTokens.length === 1;
  const singleTokenProjectLike =
    singleToken
    && !RESERVED_GENERIC_SINGLE_TERMS.has(queryTokens[0])
    && !DOMAIN_TOPIC_TERMS.has(queryTokens[0]);
  const asksSpecificDetail = /\b(status|details?|price|hardcap|softcap|buy|invest|claim|live|cancelled|canceled|upcoming|filled|failed)\b/.test(q);

  if (hasSlugProjectToken) return true;
  if (hasGeneralProjectToken && asksSpecificDetail) return true;
  if (singleTokenProjectLike && (slugTerms.has(queryTokens[0]) || allTerms.has(queryTokens[0]))) return true;
  if (singleTokenProjectLike && topIsProjectLookup) return true;
  if (topIsProjectLookup && asksSpecificDetail) return true;

  return false;
}

export function isGreeting(text) {
  return GREETINGS.has(String(text || "").toLowerCase().trim().replace(/[!?]+$/, ""));
}

export function isOffTopic(text) {
  return OFF_TOPIC_PATTERNS.some(p => p.test(String(text || "")));
}

export function isFollowUpLinkRequest(text) {
  const q = String(text || "").toLowerCase().trim();
  if (!q) return false;

  const asksLink =
    /\b(link|url|source|website)\b/.test(q)
    || /^link\??$/.test(q)
    || /^send\s+link\??$/.test(q)
    || /^source\??$/.test(q)
    || /^is\s+there\s+(any\s+)?(a\s+)?(link|url|source)\b.*\??$/.test(q)
    || /^can\s+i\s+(get|have)\s+(the\s+)?(link|url|source)\b.*\??$/.test(q)
    || /^give\s+me\s+(the\s+)?(link|url|source)\b.*\??$/.test(q)
    || /^where\s+is\s+(the\s+)?(link|url|source)\b.*\??$/.test(q);

  if (!asksLink) return false;

  const referencesPrevious =
    /\b(that|it|this|above|previous|last|earlier|same)\b/.test(q)
    || /^link\??$/.test(q)
    || /^send\s+link\??$/.test(q)
    || /^source\??$/.test(q)
    || /^link\s+of\s+that(\s+please)?\??$/.test(q)
    || /^is\s+there\s+(any\s+)?(a\s+)?(link|url|source)\b.*\??$/.test(q)
    || /^can\s+i\s+(get|have)\s+(the\s+)?(link|url|source)\b.*\??$/.test(q)
    || /^give\s+me\s+(the\s+)?(link|url|source)\b.*\??$/.test(q)
    || /^where\s+is\s+(the\s+)?(link|url|source)\b.*\??$/.test(q);

  if (!referencesPrevious) return false;

  return !EXPLICIT_LINK_TOPIC_PATTERNS.some(p => p.test(q));
}

function getChatContext(chatId) {
  if (!CHAT_CONTEXT.has(chatId)) {
    if (CHAT_CONTEXT.size >= MAX_CHAT_CONTEXTS) {
      const oldestChatId = CHAT_CONTEXT.keys().next().value;
      if (oldestChatId !== undefined) CHAT_CONTEXT.delete(oldestChatId);
    }
    CHAT_CONTEXT.set(chatId, {
      lastQuery: "",
      lastTopic: "",
      lastLink: "",
      lastEffectiveQuery: "",
      updatedAt: 0,
    });
  }
  return CHAT_CONTEXT.get(chatId);
}

function extractUrls(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s)]+/gi) || [];
  const cleaned = matches.map(u => u.replace(/[).,!?]+$/g, ""));
  return [...new Set(cleaned)];
}

function rememberChatContext(chatId, query, answer, topResult, effectiveQuery = "") {
  const ctx = getChatContext(chatId);

  const links = [];
  if (topResult?.source && /^https?:\/\//i.test(topResult.source)) {
    links.push(topResult.source);
  }
  links.push(...extractUrls(answer));

  const uniqueLinks = [...new Set(links)];

  const normalizedQuery = normalizeLoose(query);
  const topTags = new Set(topResult?.tags || []);
  const topIsProjectLookup = topTags.has("project_lookup");
  const queryLooksProjectToken = /^[a-z0-9_-]{3,20}$/.test(normalizedQuery);
  const useTopTitle = !!topResult?.title && (!topIsProjectLookup || queryLooksProjectToken);
  const inferredLink = inferPlatformLinkFromText(`${effectiveQuery || query || ""} ${answer || ""}`);

  ctx.lastQuery = query;
  ctx.lastEffectiveQuery = effectiveQuery || query;
  ctx.lastTopic = (useTopTitle ? topResult.title : query || "").trim();
  if (uniqueLinks.length > 0) {
    ctx.lastLink = uniqueLinks[0];
  } else if (inferredLink) {
    ctx.lastLink = inferredLink;
  }
  ctx.updatedAt = Date.now();
}

function detectTone(query) {
  const q = query || "";
  if (TONE_PRO_PATTERNS.some(p => p.test(q)) || q.length > 140) return "professional";
  if (TONE_CASUAL_PATTERNS.some(p => p.test(q))) return "casual";
  return "friendly";
}

function styleAnswer(answer, tone) {
  // Keep answers direct and polite without synthetic lead-in labels.
  let out = String(answer || "").trim();
  out = out.replace(/^(?:✅\s*Answer:|💡\s*Key point:|📌\s*Summary:|ℹ️\s*Details:|🤝\s*Guidance:|Quick answer:|Short version:|Here you go:|In brief:)\s*/i, "");
  return out;
}

function sanitizeReplyText(text) {
  return String(text || "").replace(/[—–]/g, ",");
}

const GREETING_RESPONSES = [
  "Hello\\! 👋 I'm the MoonSale Assistant\\. Ask me anything about MoonSale\\.\\n\\nTry: What is MoonSale\\? or How do I create a presale\\?",
  "Welcome\\! 🌙 I can help with MoonSale presales, fair launches, vesting, fees, and token tools\\.",
  "Hello\\! 🚀 Need help with MoonSale launches or investor information\\?",
  "Greetings\\! 💬 Ask me about MoonSale token locks, KYC, audits, or launch setup\\.",
  "Welcome\\! ✅ MoonSale Assistant is ready\\. What would you like to know\\?",
];

export function getRandomGreeting() {
  return GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];
}

function getContextualTip(query, answerKind) {
  const q = String(query || "").toLowerCase();
  
  // Only add tips for answer/presale_guard responses, not greetings, off-topic, etc.
  if (!["answer", "presale_guard"].includes(answerKind)) return "";
  
  // Check what the user is asking about to determine relevant tip
  const isAskingAboutCreating = /\b(create|how\s+to\s+make|how\s+do\s+i|start|launch)\b/.test(q);
  const isAskingAboutPresale = /\bpresale\b/i.test(q);
  const isAskingAboutFairLaunch = /\b(fair\s*launch|fairaunch)\b/i.test(q);
  const isAskingAboutFees = /\b(fee|cost|price)\b/i.test(q);
  const isAskingAboutVesting = /\bvesting\b/i.test(q);
  const isAskingAboutLock = /\b(lock|liquidity)\b/i.test(q);
  const isAskingAboutToken = /\b(token|create.*token)\b/i.test(q) && !isAskingAboutCreating;
  const isAskingAboutRefund = /\b(refund|refunds|money\s*back)\b/i.test(q);
  const isAskingAboutFailedSale = (
    /\b(fail|fails|failed|softcap|cancelled|canceled)\b/i.test(q)
    && /\b(sale|presale|launch)\b/i.test(q)
  );
  
  if (isAskingAboutCreating && isAskingAboutPresale) {
    return "\n\n💡 Ready to create\\? Go to [moonsale\\.app/create](https://www.moonsale.app/create)";
  }
  if (isAskingAboutCreating && isAskingAboutFairLaunch) {
    return "\n\n💡 Ready to launch\\? Check [moonsale\\.app/create\\-fair\\-launch](https://www.moonsale.app/create-fair-launch)";
  }
  if (isAskingAboutFees) {
    return "\n\n💡 See the full [fee breakdown](https://www.moonsale.app/fees)";
  }
  if (isAskingAboutVesting) {
    return "\n\n💡 Set up vesting with the [Token Vesting tool](https://www.moonsale.app/vesting)";
  }
  if (isAskingAboutLock) {
    return "\n\n💡 Use the [Token Lock tool](https://www.moonsale.app/lock)";
  }
  if (isAskingAboutToken) {
    return "\n\n💡 Create tokens with the [Token Generator](https://www.moonsale.app/create-token)";
  }
  if (isAskingAboutRefund || isAskingAboutFailedSale) {
    return "\n\n💡 Refund flow details: [Investor Docs](https://www.moonsale.app/investor-docs)\n🔗 [Sale Page](https://www.moonsale.app/presale)";
  }
  
  return "";
}


export function escape(text) {
  return String(text || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

export function formatAnswer(text) {
  let out = String(text || "");

  // Normalize typographic dashes so Telegram output looks cleaner.
  out = out.replace(/[—–]/g, ",");

  out = out.replace(
    /📄 (Source|More info): (https?:\/\/\S+)/g,
    "📄 [More info]($2)"
  );

  out = escape(out);

  out = out.replace(/📄 \[More info\]\((https?[^)]+)\)/g,
    (_, url) => `📄 [More info](${url})`
  );

  // Note: Pro tips are now added in buildAssistantReply instead, 
  // so formatAnswer doesn't add them automatically

  if (out.length > 3800) {
    out = out.slice(0, 3800) + "\\.\\.\\.\n\n📄 [Read more](https://www.moonsale.app)";
  }

  return out;
}

function markdownToPlainText(text) {
  let out = String(text || "");

  out = out.replace(/\\([_*[\]()~`>#+\-=|{}.!\\])/g, "$1");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1: $2");
  out = out.replace(/[*_~`]/g, "");
  out = out.replace(/\r/g, "");
  out = out.replace(/[ \t]+\n/g, "\n");
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

function renderReplyText(text, outputFormat = "telegram") {
  const safe = sanitizeReplyText(text);
  if (outputFormat === "plain") {
    return markdownToPlainText(safe);
  }
  return safe;
}

const OVERLAP_IGNORE_TOKENS = new Set([
  "how", "what", "when", "where", "why", "which", "who", "is", "are", "to", "for", "the", "a", "an",
  "on", "in", "of", "with", "can", "you", "me", "please", "help", "i", "we", "it", "do", "does",
  "steps", "step", "workflow", "process", "guide", "tell", "about", "info", "details",
]);

function extractCandidateAnswerText(entry) {
  let answer = String(entry?.answer || entry?.text || "").trim();
  if (answer.startsWith("Q:")) {
    const parts = answer.split(/\nA:\s*/i);
    answer = parts.length > 1 ? parts.slice(1).join("\nA:") : answer;
  }
  return answer.trim();
}

function candidateTextBlob(entry) {
  const answer = extractCandidateAnswerText(entry);
  return `${entry?.title || ""} ${entry?.question || ""} ${answer}`.toLowerCase();
}

function isStatusCountdownCandidate(entry) {
  if (!entry) return false;
  const tags = new Set(entry.tags || []);
  const blob = candidateTextBlob(entry);
  const hasStatusSignal =
    tags.has("status")
    || /\b(status|live|upcoming|ended|failed|filled|cancelled|canceled|finalized|pending)\b/.test(blob);
  const hasCountdownSignal = /\b(countdown|timezone|buy is still locked|past start time|start time|starts? when)\b/.test(blob);
  return hasStatusSignal && hasCountdownSignal;
}

function hasLooseLexicalOverlap(query, entry) {
  const queryTokens = tokenizeSimple(query).filter(t => t.length >= 3 && !OVERLAP_IGNORE_TOKENS.has(t));
  if (!queryTokens.length) return false;

  const entryTokens = new Set(tokenizeSimple(candidateTextBlob(entry)).filter(t => t.length >= 3));
  return queryTokens.some(t => entryTokens.has(t));
}

function isHowToWorkflowQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;
  return /\b(how|workflow|steps?|process)\b/.test(q);
}

function runTop3CandidateSanityCheck(query, candidates) {
  const topCandidates = Array.isArray(candidates) ? candidates.slice(0, 3) : [];
  const top = topCandidates[0] || null;
  if (!top) {
    return { candidate: null, replacedTop: false, shouldClarify: false, reason: "empty" };
  }

  const q = normalizeLoose(query);
  const asksHow = isHowToWorkflowQuery(q);
  const asksTokenLaunch = /\btoken\b/.test(q) && /\b(create|launch|deploy|generator)\b/.test(q);

  if (asksHow && isStatusCountdownCandidate(top)) {
    const alt = topCandidates.find(c => !isStatusCountdownCandidate(c) && hasLooseLexicalOverlap(q, c));
    if (alt) {
      return { candidate: alt, replacedTop: true, shouldClarify: false, reason: "howto_status_replaced" };
    }
    return { candidate: top, replacedTop: false, shouldClarify: true, reason: "howto_status_no_alt" };
  }

  if (asksHow && asksTokenLaunch) {
    const preferred = topCandidates.find(c => {
      const tags = new Set(c?.tags || []);
      const blob = candidateTextBlob(c);
      if (isStatusCountdownCandidate(c)) return false;
      return tags.has("token_create")
        || tags.has("creator")
        || /\b(create\s+token|token\s+generator|deploy\s+token|token\s+contract)\b/.test(blob);
    });

    if (preferred && preferred !== top && Number(preferred?._score || 0) >= Number(top?._score || 0) - 0.45) {
      return { candidate: preferred, replacedTop: true, shouldClarify: false, reason: "token_launch_preferred" };
    }
  }

  return { candidate: top, replacedTop: false, shouldClarify: false, reason: "ok" };
}

function evaluateAnswerConfidence(query, candidates, selectedCandidate) {
  const topCandidates = Array.isArray(candidates) ? candidates.slice(0, 3) : [];
  const q = normalizeLoose(query);
  const singleTokenLookup = /^[a-z0-9_-]{3,20}$/.test(q) && !RESERVED_GENERIC_SINGLE_TERMS.has(q);

  if (singleTokenLookup) {
    return { shouldClarify: false, reason: "single_token_lookup" };
  }

  if (!selectedCandidate) {
    return { shouldClarify: true, reason: "no_candidate" };
  }

  const topScore = Number(selectedCandidate._score || 0);
  const secondScore = Number(topCandidates[1]?._score || 0);
  const thirdScore = Number(topCandidates[2]?._score || 0);
  const margin = topScore - secondScore;
  const spread = topScore - thirdScore;
  const hasOverlap = hasLooseLexicalOverlap(q, selectedCandidate);

  if (isHowToWorkflowQuery(q) && isStatusCountdownCandidate(selectedCandidate)) {
    return { shouldClarify: true, reason: "howto_status_mismatch" };
  }

  if (!hasOverlap && topScore < 2.0) {
    return { shouldClarify: true, reason: "low_overlap_low_score" };
  }

  if (!hasOverlap && margin <= 0.06) {
    return { shouldClarify: true, reason: "low_overlap_small_margin" };
  }

  if (!hasOverlap && topCandidates.length >= 3 && spread <= 0.05) {
    return { shouldClarify: true, reason: "top3_ambiguous_low_overlap" };
  }

  if (topScore < 0.35) {
    return { shouldClarify: true, reason: "very_low_score" };
  }

  return { shouldClarify: false, reason: "confident" };
}

function buildClarifyReply(query) {
  const q = normalizeLoose(query);
  const asksTokenLaunch = /\btoken\b/.test(q) && /\b(create|launch|deploy|generator)\b/.test(q);
  if (asksTokenLaunch) return CLARIFY_TOKEN_LAUNCH_REPLY;
  if (isHowToWorkflowQuery(q)) return CLARIFY_WORKFLOW_REPLY;
  return CLARIFY_GENERIC_REPLY;
}

export function buildAssistantReply(chatId, query, options = {}) {
  const outputFormat = String(options?.format || "telegram").toLowerCase() === "plain"
    ? "plain"
    : "telegram";
  const respond = (kind, text) => ({ kind, text: renderReplyText(text, outputFormat) });

  const q = normalizeIncomingQuery(query);
  const context = getChatContext(chatId);
  const hasFreshContext = context.updatedAt && (Date.now() - context.updatedAt <= FOLLOW_UP_CONTEXT_TTL_MS);

  const shouldCarryContext = hasFreshContext && context.lastTopic && isContextCarryForwardQuery(q);
  const effectiveQuery = shouldCarryContext
    ? buildContextualizedQuery(q, context)
    : q;
  const lastTopicLooksProjectToken = /^[a-z0-9_-]{3,20}$/.test(normalizeLoose(context.lastTopic || ""));
  const shouldBypassPresaleGuard = shouldCarryContext && !lastTopicLooksProjectToken;
  const isGenericWorkflowQuestion = /\b(if|when)\b.*\b(sale|presale|launch)\b.*\b(fail|fails|failed)\b|\b(sale|presale|launch)\b.*\bfailed\b.*\bwhat\s+happens\b|\btokens\s+for\s+sale\b.*\btokens\s+for\s+liquidity\b|\bsale\s+vs\s+liquidity\s+tokens?\s+difference\b/.test(normalizeLoose(effectiveQuery));

  if (!q) {
    return respond("greeting", getRandomGreeting());
  }

  if (isGreeting(q)) {
    return respond("greeting", getRandomGreeting());
  }

  if (isSmallTalkQuery(q)) {
    return respond("smalltalk", escape(SMALL_TALK_REPLY));
  }

  if (isReceiptExtractionErrorQuery(q)) {
    return respond("deploy_troubleshoot", RECEIPT_EXTRACTION_ERROR_REPLY);
  }

  if (isCreateTokenQuery(q)) {
    return respond("token_create_guide", CREATE_TOKEN_GUIDE_REPLY);
  }

  if (isCreateFairLaunchQuery(q)) {
    return respond("fair_launch_create_guide", CREATE_FAIR_LAUNCH_GUIDE_REPLY);
  }

  if (isLockExtensionInLiveModeQuery(effectiveQuery)) {
    return respond("lock_live_mode_extension", LOCK_EXTENSION_LIVE_MODE_REPLY);
  }

  if (isTokenScannerEligibilityFailQuery(effectiveQuery)) {
    return respond("token_scanner_eligibility", TOKEN_SCANNER_ELIGIBILITY_FAIL_REPLY);
  }

  if (isOffTopic(q)) {
    return respond("offtopic", OFF_TOPIC_REPLY);
  }

  if (isGroupAboutQuery(q)) {
    return respond("group_info", GROUP_INFO_REPLY);
  }

  if (isMoonSaleOverviewQuery(q)) {
    return respond("overview", MOONSALE_OVERVIEW_REPLY);
  }

  if (isFailedSaleRefundQuery(q)) {
    rememberChatContext(
      chatId,
      q,
      FAILED_SALE_REFUND_PLATFORM_REPLY,
      { title: "Failed sale refund flow", source: PLATFORM_LINKS.investorDocs },
      effectiveQuery
    );
    return respond("failed_sale_refund", FAILED_SALE_REFUND_PLATFORM_REPLY);
  }

  if (isFollowUpLinkRequest(q) && hasFreshContext) {
    const contextLink = context.lastLink || inferPlatformLinkFromText(
      `${context.lastEffectiveQuery || ""} ${context.lastTopic || ""} ${context.lastQuery || ""}`
    );
    if (!contextLink) {
      return respond("fallback", FALLBACK);
    }

    const topicText = context.lastTopic ? ` (${context.lastTopic})` : "";
    const raw = `Here is the exact link from your previous topic${topicText}:\n📄 Source: ${contextLink}`;
    const tone = detectTone(q);
    return respond("followup", formatAnswer(styleAnswer(raw, tone)));
  }

  // Check for generic presale/launch browse queries
  const isGenericBrowseQuery = /^(launch|presale|fair\s*launch?|fair|browse|show|list)$/i.test(q);
  if (isGenericBrowseQuery) {
    rememberChatContext(
      chatId,
      q,
      GENERIC_PRESALE_BROWSE_RESPONSE,
      { title: "Browse presales", source: "https://moonsale.app/presale" },
      effectiveQuery
    );
    return respond("presale_browse", GENERIC_PRESALE_BROWSE_RESPONSE);
  }

  if (!shouldBypassPresaleGuard && !isGenericWorkflowQuestion && isSpecificPresaleQuery(effectiveQuery, null)) {
    rememberChatContext(
      chatId,
      q,
      SPECIFIC_PRESALE_REPLY,
      { title: "Presale listings", source: "https://moonsale.app/presale" },
      effectiveQuery
    );

    return respond("presale_guard", SPECIFIC_PRESALE_REPLY);
  }

  const engine = getEngine();
  const topCandidates = engine.search(effectiveQuery, 3);
  const sanityCheck = runTop3CandidateSanityCheck(effectiveQuery, topCandidates);
  const selectedCandidate = sanityCheck.candidate || topCandidates[0] || null;
  const confidence = evaluateAnswerConfidence(effectiveQuery, topCandidates, selectedCandidate);

  if (sanityCheck.shouldClarify || confidence.shouldClarify) {
    const clarifyReply = buildClarifyReply(effectiveQuery);
    rememberChatContext(chatId, q, clarifyReply, selectedCandidate, effectiveQuery);
    return respond("clarify", formatAnswer(clarifyReply));
  }

  const raw = sanityCheck.replacedTop && selectedCandidate
    ? extractCandidateAnswerText(selectedCandidate)
    : engine.answer(effectiveQuery);
  const tunedRaw = platformizeFailedSaleAnswer(raw, effectiveQuery);

  // Final safety net: never expose specific listing details directly.
  const leaksSpecificListing = /\bis listed on moonsale as\b|\bcurrent status:\b|\bofficial listing:\b/i.test(tunedRaw);
  if (leaksSpecificListing) {
    rememberChatContext(
      chatId,
      q,
      SPECIFIC_PRESALE_REPLY,
      { title: "Presale listings", source: "https://moonsale.app/presale" }
    );
    return respond("presale_guard", SPECIFIC_PRESALE_REPLY);
  }

  if (tunedRaw.includes("don't have specific info")) {
    const clarifyReply = buildClarifyReply(effectiveQuery);
    rememberChatContext(chatId, q, clarifyReply, selectedCandidate, effectiveQuery);
    return respond("clarify", formatAnswer(clarifyReply));
  }

  const tone = detectTone(q);
  const styled = styleAnswer(tunedRaw, tone);
  const formattedText = formatAnswer(styled);
  const tip = getContextualTip(effectiveQuery, "answer");
  const baseOutput = formattedText + tip;
  const guaranteedLinkTip = getGuaranteedLinkTip(effectiveQuery, baseOutput);
  const finalOutput = baseOutput + guaranteedLinkTip;

  rememberChatContext(chatId, q, tunedRaw + tip + guaranteedLinkTip, selectedCandidate, effectiveQuery);

  return respond("answer", finalOutput);
}

export function resolveCommandText(command, options = {}) {
  const outputFormat = String(options?.format || "telegram").toLowerCase() === "plain"
    ? "plain"
    : "telegram";

  const cmd = String(command || "").toLowerCase();
  if (cmd === "/start") return renderReplyText(WELCOME, outputFormat);
  if (cmd === "/help") return renderReplyText(HELP, outputFormat);
  if (cmd === "/links") return renderReplyText(LINKS, outputFormat);
  if (cmd === "/about") return renderReplyText(ABOUT, outputFormat);
  return "";
}

export function parseTelegramCommand(text) {
  const m = String(text || "").trim().match(/^\/(start|help|links|about|stopaibot|startaibot)(?:@[a-zA-Z0-9_]+)?\b/i);
  if (!m) return "";
  return `/${m[1].toLowerCase()}`;
}

export function hasTelegramMediaContent(message) {
  if (!message || typeof message !== "object") return false;

  return TELEGRAM_MEDIA_KEYS.some(key => {
    const value = message[key];
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.length > 0;
    return true;
  });
}

function normalizeUsername(username) {
  return String(username || "").trim().replace(/^@/, "").toLowerCase();
}

function hasMention(text, username) {
  const u = normalizeUsername(username);
  if (!u) return false;

  const escaped = u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`@${escaped}\\b`, "i");
  return re.test(String(text || ""));
}

export function shouldReplyToMessageByPolicy({
  chatType,
  text,
  command,
  botUsername,
  isReplyToBot = false,
  groupMentionOnly,
}) {
  const mentionOnly = typeof groupMentionOnly === "boolean" ? groupMentionOnly : GROUP_MENTION_ONLY;

  if (!mentionOnly) return true;

  const type = String(chatType || "").toLowerCase();
  const isGroup = type === "group" || type === "supergroup";
  if (!isGroup) return true;

  // Always allow explicit bot commands.
  if (command) return true;

  // In mention-only mode, replying to the bot is also allowed.
  if (isReplyToBot) return true;

  return hasMention(text, botUsername);
}
