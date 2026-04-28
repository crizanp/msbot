# MoonSale Telegram Bot

MoonSale support bot with smart retrieval from MoonSale data.

This project now supports two runtimes:
- Long polling runtime (local machine or VPS): bot.js
- Webhook runtime for Vercel: api/telegram.js

## 1. Local setup

### Install
```bash
npm install
```

### Build data
```bash
npm run scrape
npm run build
```

### Add your own Q&A (including very large AI-generated sets)
You now have two custom sources:

- `moonsale_data/custom_qa.json`
: Best for hand-edited lists (JSON array).
- `moonsale_data/custom_qa_priority.jsonl`
: Best for bulk imports (one JSON object per line), intended for very large datasets.

Example JSONL line:

```json
{"question":"if i change token after filling info will values reset","answer":"Changing token can alter dependent values. Re-check config, info, and deposit calculations before deploying.","tags":["fair_launch","creator","token","support"]}
```

Priority behavior:

- Entries from `custom_qa_priority.jsonl` are ranked above normal custom/manual/website entries when matching.
- Re-run `npm run build` after editing either custom file.

Tags guidance:

- Yes, you can add many tags per row. There is no strict hard limit in code.
- Use focused tags for better retrieval quality (recommended around 3-12 meaningful tags per row).
- Keep tags lowercase and consistent (example: `fair_launch`, `creator`, `refund`, `support`).

Step-by-step activation flow:

1. Prepare your AI-generated file as JSON or JSONL with `question`, `answer`, `tags`.
2. Import into priority store:
   `npm run qa:priority:import -- ./your-ai-qa-file.json`
3. Build the knowledge base:
   `npm run build`
4. Run tests (recommended):
   `npm run test`
5. Activate runtime changes:
   Local polling bot: restart `npm run bot`.
   Direct API polling mode: restart `npm run bot:api`.
   Vercel webhook mode: redeploy project (or push commit and let Vercel deploy).

Optional import modes:

- Merge mode (default): adds new rows and keeps old rows.
   `npm run qa:priority:import -- ./your-ai-qa-file.json`
- Replace mode: rewrites priority store from input.
   `npm run qa:priority:import -- ./your-ai-qa-file.json replace`
- Dry run: preview import stats without writing file.
   `npm run qa:priority:import -- ./your-ai-qa-file.json dry-run`

Direct node command (supports named flags):

- `node scripts/importPriorityQA.js --input ./your-ai-qa-file.json --dry-run`

### Test answers locally
```bash
npm run search
```

### Run long polling bot locally
Windows:
```powershell
$env:TELEGRAM_TOKEN="your_token_here"
npm run bot
```

Mac/Linux:
```bash
export TELEGRAM_TOKEN=your_token_here
npm run bot
```

### Run no-webhook mode (direct Telegram API polling)
This mode uses `getUpdates` and `sendMessage` directly.

Windows PowerShell:
```powershell
$env:TELEGRAM_TOKEN="your_token_here"
npm run bot:api
```

Mac/Linux:
```bash
export TELEGRAM_TOKEN=your_token_here
npm run bot:api
```

Notes:
- This mode auto-disables webhook on startup (`deleteWebhook`) so polling can work.
- Keep the process running continuously (local machine/VPS).
- If Telegram is blocked on your network, run this on an unblocked VPS or different network.
- Optional: set `TELEGRAM_API_BASE_URL` if you use a reachable Telegram API proxy endpoint.

## 2. Deploy on Vercel (recommended)

Important: Vercel should use webhook mode, not long polling.

### Step A: Push code to GitHub
Commit and push your repository, including:
- api/telegram.js
- assistantCore.js
- moonsale_data/knowledge_base.json
- vercel.json

### Step B: Create Vercel project
1. Open Vercel dashboard.
2. Import your GitHub repository.
3. Framework preset: Other.
4. Build Command: leave empty (or npm install).
5. Output Directory: leave empty.
6. Deploy.

### Step C: Add environment variables in Vercel
Project Settings -> Environment Variables:
- TELEGRAM_TOKEN = your BotFather token
- TELEGRAM_WEBHOOK_SECRET = any strong random string (recommended)
- ADMIN_TELEGRAM_ID = Telegram user ID to always ignore (optional)
- ADMIN_TELEGRAM_IDS = comma-separated admin IDs (optional)
- COMMUNITY_ENGAGEMENT_TELEGRAM_IDS = comma-separated community manager IDs to ignore (optional)
- AI_BOT_STOP_HOURS = pause duration for `/stopAiBot` (default: 12)

Optional for persistent per-user controls across serverless instances:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_BOT_USER_TABLE (default: `bot_user_controls`)

Redeploy after adding variables.

### Step D: Register Telegram webhook
Use your Vercel production domain.

Windows PowerShell:
```powershell
$env:TELEGRAM_TOKEN="your_token_here"
$env:PUBLIC_WEBHOOK_BASE_URL="https://your-project.vercel.app"
$env:TELEGRAM_WEBHOOK_SECRET="your_secret_here"
npm run webhook:set
npm run webhook:info
```

Windows CMD:
```bat
set TELEGRAM_TOKEN=your_token_here
set PUBLIC_WEBHOOK_BASE_URL=https://your-project.vercel.app
set TELEGRAM_WEBHOOK_SECRET=your_secret_here
npm run webhook:set
npm run webhook:info
```

Mac/Linux:
```bash
export TELEGRAM_TOKEN=your_token_here
export PUBLIC_WEBHOOK_BASE_URL=https://your-project.vercel.app
export TELEGRAM_WEBHOOK_SECRET=your_secret_here
npm run webhook:set
npm run webhook:info
```

Expected result:
- webhook URL ends with /api/telegram
- getWebhookInfo shows no recent errors

## 3. Telegram bot integration checklist

1. Open @BotFather
2. /newbot (if not created yet)
3. Copy bot token
4. Optional: /setcommands and add:
   - start - Welcome
   - help - Help
   - links - Useful links
   - about - About bot
    - stopAiBot - Pause AI replies for your user
    - startAiBot - Resume AI replies for your user

## 4A. Admin Ignore + Per-User AI Pause

Behavior implemented:
- In private chats, sender IDs in admin/community env IDs are ignored.
- In groups/supergroups, admin activity starts a quiet window for that chat.
- During the admin quiet window (default 30 minutes), the bot skips non-mentioned queries from everyone.
- If a message explicitly mentions `@MoonsaleAssistantBot`, the bot can reply during the quiet window (for non-admins and admins).
- Group admins can get replies only when they explicitly mention the bot.
- From the 2nd AI reply onward (same Telegram user ID), bot appends:
   - `/stopAiBot` to pause replies
   - `/startAiBot` to resume replies
- `/stopAiBot` pauses AI replies for that user for 12h (or `AI_BOT_STOP_HOURS`).
- `/startAiBot` resumes replies immediately.
- If a sender posts image/media, bot sends a text-only notice and asks users to wait for admin assistance.

Optional env settings:
- `GROUP_ADMIN_ACTIVITY_WINDOW_MS=1800000` (30 minutes default)

If using Supabase persistence, create this table once:

```sql
create table if not exists public.bot_user_controls (
   user_id text primary key,
   reply_count bigint not null default 0,
   ai_stopped_until timestamptz null,
   updated_at timestamptz not null default now()
);
```

## 4. Add bot to community group and make it answer messages

### Step A: Add bot to group
- Open your group
- Add the bot as a member

### Step B: Disable privacy mode (critical)
If privacy mode is ON, the bot only sees commands/mentions.

In @BotFather:
- /setprivacy
- Select your bot
- Choose Disable

### Step C: Ensure message permission
- Group settings -> bot permissions
- Allow sending messages/replies

### Step D: Test in group
Send normal text messages like:
- What is MoonSale?
- tokenomics
- QUANTIFI
- link of that please

Bot will reply in group threads/messages when it receives text updates.

### Optional: Mention-only mode in groups
If you want less spam in large groups, enable mention-only mode.

Add in `.env`:
```env
GROUP_MENTION_ONLY=true
BOT_USERNAME=MoonsaleAssistantBot
```

Behavior:
- Private chat: replies normally
- Group chat: replies only when tagged (`@MoonsaleAssistantBot`) or when users reply directly to a bot message

## 5. Useful scripts

```bash
npm run scrape
npm run build
npm run search
npm run bot
npm run bot:api
npm run webhook:set
npm run webhook:info
```

## 6. Web AI Modal Endpoint (Plain Text)

Use this route for website or dashboard chat modals so replies are returned in plain text (no Telegram escaping).

- Route: `POST /api/assistant`
- Default output format: `plain`
- Optional body fields:
   - `query` (required)
   - `chatId` (optional, defaults to `web-modal`)
   - `format` (optional: `plain` or `telegram`)

Example:
```bash
curl -X POST https://your-project.vercel.app/api/assistant \
   -H "content-type: application/json" \
   -d '{"query":"fair launch steps token config info deploy"}'
```

Sample response:
```json
{
   "ok": true,
   "kind": "answer",
   "text": "Flow is Token selection, Config setup, Project Info, then Review and Deploy.",
   "format": "plain"
}
```

## 7. How replies are generated

- searchEngine.js: retrieval and intent logic
- assistantCore.js: shared chat behavior, tone, follow-up link memory
- bot.js: polling runtime
- api/telegram.js: Vercel webhook runtime

## 8. Troubleshooting

### npm run bot exits with code 1
Usually TELEGRAM_TOKEN is missing.

### Webhook set works but bot does not answer
Check:
1. TELEGRAM_TOKEN in Vercel env
2. TELEGRAM_WEBHOOK_SECRET matches webhook requests
3. Bot privacy mode disabled
4. Group permissions allow bot messages
5. npm run webhook:info for last_error_message

### Bot replies in private chat but not group
Most common reason: privacy mode is still enabled.

### Telegram is blocked on local network
If `api.telegram.org` resolves to `127.0.0.1` or `::1`, Telegram API is blocked on your network.

Use one of these:
1. Run bot on an unblocked VPS (recommended)
2. Use a different network/hotspot
3. Use a reachable Telegram API proxy endpoint and set `TELEGRAM_API_BASE_URL`

## 9. Updating knowledge base later

Add future custom Q/A in:
- moonsale_data/custom_qa.json

Then rebuild and redeploy:
```bash
npm run build
```
