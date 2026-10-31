const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");

const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = defineSecret("TELEGRAM_CHAT_ID");

function clean(value, maxLength = 700) {
  const text = String(value ?? "").trim();
  return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
}

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
      "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN.value() + "/sendMessage",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID.value(),
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
