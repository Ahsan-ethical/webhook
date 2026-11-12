// Place this file at: app/api/tg/manager/route.ts
// (Do NOT add `export const runtime = ...` here: Next.js 16 with cacheComponents rejects it.)
import { timingSafeEqual } from "node:crypto";
import { waitUntil } from "@vercel/functions";

export const maxDuration = 30;

const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
const TOKEN = process.env.MANAGER_BOT_TOKEN ?? "";

// Never let the bot token end up in logs.
function redact(text: string): string {
  return TOKEN ? text.split(TOKEN).join("<redacted>") : text;
}

function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

async function tg(method: string, body: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  return res.json();
}

async function handleUpdate(update: any) {
  // Basic reply so you can confirm the webhook works end to end.
  const text: string | undefined = update?.message?.text;
  if (text && text.startsWith("/start")) {
    await tg("sendMessage", {
      chat_id: update.message.chat.id,
      text: "Manager bot is connected and receiving updates.",
    });
    return;
  }

  // Sent when a user finishes creating a bot through your onboarding link.
  // For now, just log it so you can see the real field names.
  if (update?.managed_bot) {
    console.log("managed_bot update:", JSON.stringify(update.managed_bot));
    // Next step later: fetch the child bot token, encrypt it, store it.
  }
}

export async function POST(req: Request) {
  if (!SECRET || !TOKEN) {
    return new Response("server misconfigured", { status: 500 });
  }

  const header = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(header, SECRET)) {
    return new Response("forbidden", { status: 403 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  // Answer Telegram immediately; do the work in the background.
  // (waitUntil is best-effort. Durable processing comes in a later step.)
  waitUntil(
    handleUpdate(update).catch((err) =>
      console.error("update failed", update?.update_id, redact(String(err?.message ?? err)))
    )
  );

  return new Response("ok");
}