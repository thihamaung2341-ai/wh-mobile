const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = defineSecret("TELEGRAM_CHAT_ID");
const TELEGRAM_WEBHOOK_SECRET = defineSecret("TELEGRAM_WEBHOOK_SECRET");
const ADMIN_UID = "SpebSv19yPPE92rdn75zL4fG8sm2";

function clean(value, maxLength = 700) {
  const text = String(value ?? "").trim();
  return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
}

const botApi = (method, token, payload) => fetch(
  "https://api.telegram.org/bot" + token + "/" + method,
  { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) }
).then(async response => {
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error("Telegram " + method + " failed: " + (result.description || response.status));
  return result.result;
});

function requireTelegramAdmin(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to the admin workspace first.");
  if (request.auth.uid !== ADMIN_UID) throw new HttpsError("permission-denied", "Only the WH Mobile administrator can edit the bot profile.");
}

exports.getTelegramBotProfile = onCall({
  region: "us-central1",
  secrets: [TELEGRAM_BOT_TOKEN]
}, async request => {
  requireTelegramAdmin(request);
  const token = TELEGRAM_BOT_TOKEN.value().trim();
  const [name, description, shortDescription] = await Promise.all([
    botApi("getMyName", token, {}),
    botApi("getMyDescription", token, {}),
    botApi("getMyShortDescription", token, {})
  ]);
  return {
    name: name.name || "",
    description: description.description || "",
    shortDescription: shortDescription.short_description || ""
  };
});

exports.updateTelegramBotProfile = onCall({
  region: "us-central1",
  secrets: [TELEGRAM_BOT_TOKEN]
}, async request => {
  requireTelegramAdmin(request);
  const data = request.data || {};
  if (typeof data.name !== "string" || typeof data.description !== "string" || typeof data.shortDescription !== "string") {
    throw new HttpsError("invalid-argument", "Provide a bot name, description, and short bio as text.");
  }
  const profile = {
    name: data.name.trim(),
    description: data.description.trim(),
    shortDescription: data.shortDescription.trim()
  };
  if (!profile.name || profile.name.length > 64) throw new HttpsError("invalid-argument", "Bot name must be between 1 and 64 characters.");
  if (profile.description.length > 512) throw new HttpsError("invalid-argument", "Description must be 512 characters or fewer.");
  if (profile.shortDescription.length > 120) throw new HttpsError("invalid-argument", "Short bio must be 120 characters or fewer.");

  const token = TELEGRAM_BOT_TOKEN.value().trim();
  await botApi("setMyName", token, { name: profile.name });
  await botApi("setMyDescription", token, { description: profile.description });
  await botApi("setMyShortDescription", token, { short_description: profile.shortDescription });
  return { ok: true };
});

const mainKeyboard = { inline_keyboard: [
  [{ text: "📱 Live products", callback_data: "products" }],
  [{ text: "🎧 Accessories", callback_data: "accessories" }],
  [{ text: "🧑‍💼 Talk to manager", callback_data: "service" }]
] };

function money(value) {
  return value == null ? "Ask for price" : "Ks " + Number(value).toLocaleString("en-US");
}

async function sendCatalog(chatId, kind, token) {
  const snap = await db.collection("products").where("active", "==", true).get();
  let products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(product => kind !== "accessories" || /accessor(y|ies|e|ies)/i.test(String(product.category || "")));
  products.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  if (!products.length) {
    await botApi("sendMessage", token, { chat_id: chatId, text: kind === "accessories" ? "No accessories are listed right now. Please ask the manager." : "No live products are listed right now.", reply_markup: mainKeyboard });
    return;
  }
  const label = kind === "accessories" ? "Accessories" : "Live products";
  await botApi("sendMessage", token, { chat_id: chatId, text: "🛍 " + label + " (" + products.length + ")" });
  for (const product of products.slice(0, 30)) {
    const caption = [product.name || "Product", product.brand, product.category,
      money(product.price), "Stock: " + (Number(product.stock || 0) > 0 ? product.stock : "Out of stock"), product.description]
      .filter(Boolean).map(value => clean(value, 800)).join("\n").slice(0, 1000);
    if (product.imageUrl && /^https:\/\//i.test(product.imageUrl)) {
      await botApi("sendPhoto", token, { chat_id: chatId, photo: product.imageUrl, caption });
    } else {
      await botApi("sendMessage", token, { chat_id: chatId, text: caption });
    }
  }
  await botApi("sendMessage", token, { chat_id: chatId, text: "Choose an option:", reply_markup: mainKeyboard });
}

async function startManagerChat(message, token, managerChatId) {
  const customerChatId = String(message.chat.id);
  const customerName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") || "Telegram customer";
  await db.collection("telegramManagerSessions").doc(customerChatId).set({
    customerName, username: message.from?.username || "", active: true, updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  const forwarded = await botApi("sendMessage", token, {
    chat_id: managerChatId,
    text: "🧑‍💼 WH Mobile manager request\nCustomer: " + clean(customerName, 100) +
      (message.from?.username ? " (@" + clean(message.from.username, 80) + ")" : "") +
      "\nChat ID: " + customerChatId + "\n\nReply to this message to chat with the customer.\n\n" + clean(message.text || "Customer asked to speak with the manager.", 2500)
  });
  await db.collection("telegramManagerReplies").doc(String(forwarded.message_id)).set({ customerChatId, createdAt: FieldValue.serverTimestamp() });
  await botApi("sendMessage", token, { chat_id: message.chat.id, text: "I’ve connected you with the WH Mobile manager. Send your message here and we’ll reply in this chat." });
}

async function handleManagerReply(message, token, managerChatId) {
  if (String(message.chat.id) !== String(managerChatId) || !message.reply_to_message || !message.text) return false;
  const ref = db.collection("telegramManagerReplies").doc(String(message.reply_to_message.message_id));
  const snap = await ref.get();
  if (!snap.exists) return false;
  await botApi("sendMessage", token, { chat_id: snap.data().customerChatId, text: "🧑‍💼 WH Mobile manager:\n" + clean(message.text, 3500) });
  return true;
}

exports.telegramBot = onRequest({
  secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_WEBHOOK_SECRET],
  timeoutSeconds: 60,
  memory: "256MiB"
}, async (req, res) => {
  if (req.method !== "POST" || req.get("x-telegram-bot-api-secret-token") !== TELEGRAM_WEBHOOK_SECRET.value().trim()) {
    res.sendStatus(401); return;
  }
  res.sendStatus(200);
  const token = TELEGRAM_BOT_TOKEN.value().trim();
  const managerChatId = TELEGRAM_CHAT_ID.value().trim();
  try {
    const update = req.body || {};
    if (update.callback_query) {
      const query = update.callback_query;
      await botApi("answerCallbackQuery", token, { callback_query_id: query.id });
      const action = query.data;
      if (action === "products" || action === "accessories") await sendCatalog(query.message.chat.id, action, token);
      else if (action === "service") await startManagerChat({ chat: query.message.chat, from: query.from, text: "Customer requested a live manager." }, token, managerChatId);
      else if (action === "menu") await botApi("sendMessage", token, { chat_id: query.message.chat.id, text: "Welcome to WH Mobile. Choose an option:", reply_markup: mainKeyboard });
      return;
    }
    const message = update.message;
    if (!message) return;
    if (await handleManagerReply(message, token, managerChatId)) return;
    const isManager = String(message.chat.id) === String(managerChatId);
    const command = String(message.text || "").trim().toLowerCase();
    if (command.startsWith("/start") || command.startsWith("/help")) {
      await botApi("sendMessage", token, { chat_id: message.chat.id, text: "Welcome to WH Mobile! Browse current products and accessories, or connect directly with our manager.", reply_markup: mainKeyboard });
    } else if (command.startsWith("/products")) await sendCatalog(message.chat.id, "products", token);
    else if (command.startsWith("/accessories")) await sendCatalog(message.chat.id, "accessories", token);
    else if (command.startsWith("/service") || command.startsWith("/manager")) {
      if (isManager) {
        await botApi("sendMessage", token, { chat_id: message.chat.id, text: "You’re using the manager account. Customers can use this option to contact you directly." });
      } else await startManagerChat(message, token, managerChatId);
    }
    else if (isManager) return;
    else if (message.text) {
      const session = await db.collection("telegramManagerSessions").doc(String(message.chat.id)).get();
      if (session.exists && session.data().active) {
        const forwarded = await botApi("sendMessage", token, { chat_id: managerChatId, text: "💬 " + clean(session.data().customerName || "Customer", 100) + " (" + message.chat.id + "):\n" + clean(message.text, 3000) });
        await db.collection("telegramManagerReplies").doc(String(forwarded.message_id)).set({ customerChatId: String(message.chat.id), createdAt: FieldValue.serverTimestamp() });
      } else await botApi("sendMessage", token, { chat_id: message.chat.id, text: "Choose a menu option or send /help.", reply_markup: mainKeyboard });
    }
  } catch (error) {
    logger.error("Telegram bot update failed", { error: error.message });
  }
});

exports.notifyBooking = onDocumentCreated(
  {
    document: "bookings/{bookingId}",
    secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID],
    retry: true,
    timeoutSeconds: 30
  },
  async event => {
    const booking = event.data?.data();
    if (!booking) return;

    const isRepair = booking.type === "repair";
    const message = [
      isRepair ? "🔧 WH Mobile — New repair request" : "📱 WH Mobile — New phone reservation",
      "",
      "Customer: " + clean(booking.customerName, 160),
      "Phone: " + clean(booking.phone, 80),
      (isRepair ? "Request: " : "Phone: ") + clean(booking.item, 180),
      "Preferred time: " + clean(booking.preferredAt || "Not specified", 120),
      "Notes: " + clean(booking.notes || "None", 900),
      "",
      "Status: " + clean(booking.status || "pending", 40),
      "Booking ID: " + clean(event.params.bookingId, 100)
    ].join("\n").slice(0, 3900);

    const response = await fetch(
      "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN.value().trim() + "/sendMessage",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID.value().trim(),
          text: message,
          link_preview_options: { is_disabled: true }
        }),
        signal: AbortSignal.timeout(10000)
      }
    );

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("Telegram returned an unreadable response.");
    }
    if (!response.ok || !result.ok) {
      logger.error("Telegram rejected a booking notification.", {
        bookingId: event.params.bookingId,
        status: response.status
      });
      throw new Error("Telegram booking notification failed.");
    }

    logger.info("Telegram booking notification sent.", {
      bookingId: event.params.bookingId,
      type: booking.type
    });
  }
);

