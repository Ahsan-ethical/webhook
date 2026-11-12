// Usage: node set-webhook.mjs
// Required environment variables: MANAGER_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, WEBHOOK_URL
const { MANAGER_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, WEBHOOK_URL } = process.env;

if (!MANAGER_BOT_TOKEN || !TELEGRAM_WEBHOOK_SECRET || !WEBHOOK_URL) {
  console.error("Set MANAGER_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and WEBHOOK_URL first.");
  process.exit(1);
}
if (!WEBHOOK_URL.startsWith("https://")) {
  console.error("WEBHOOK_URL must start with https://");
  process.exit(1);
}

const api = (method, body = {}) =>
  fetch(`https://api.telegram.org/bot${MANAGER_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

const set = await api("setWebhook", {
  url: WEBHOOK_URL,
  secret_token: TELEGRAM_WEBHOOK_SECRET,
  // List managed_bot explicitly: if omitted, Telegram reuses your previous setting.
  allowed_updates: ["message", "callback_query", "managed_bot", "my_chat_member"],
  max_connections: 10,
});
console.log("setWebhook:", set);

const info = await api("getWebhookInfo");
console.log("getWebhookInfo:", info.result);
