import { Resend } from "resend";

// Gracefully handle missing API key — emails simply won't send
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = "Aunt Sally's Laundry <noreply@auntsallyslaundry.com>";
const REPLY_TO = "admin@auntsallyslaundry.com";
const TEAL = "#0ABAB5";
const TRACKING_BASE = "https://auntsallyslaundry.com/track";

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width: 560px; margin: 32px auto; background: #fff; border: 1px solid #e5e7eb; }
  .header { background: ${TEAL}; padding: 24px 32px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; }
  .body { padding: 32px; }
  .status-badge { display: inline-block; background: ${TEAL}; color: #fff; padding: 6px 16px; font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; border-radius: 999px; margin-bottom: 20px; }
  .order-box { background: #f0fdfc; border: 1px solid #99f6e4; padding: 16px 20px; margin: 20px 0; }
  .order-box p { margin: 4px 0; font-size: 14px; color: #374151; }
  .order-box .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .track-btn { display: block; text-align: center; background: ${TEAL}; color: #fff; text-decoration: none; padding: 14px 24px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; margin: 24px 0; }
  .footer { padding: 20px 32px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>Aunt Sally's Laundry</h1></div>
    <div class="body">${content}</div>
    <div class="footer">© 2026 Aunt Sally's Laundry · Metro Manila · <a href="mailto:admin@auntsallyslaundry.com" style="color:#0ABAB5">admin@auntsallyslaundry.com</a></div>
  </div>
</body>
</html>`;
}

export interface SendOrderEmailParams {
  to: string;
  customerName: string;
  orderNumber: string;
  trackingCode: string;
  status: string;
  branchName?: string;
  total?: string;
}

const STATUS_CONTENT: Record<string, { subject: string; badge: string; headline: string; body: string }> = {
  booking_received: {
    subject: "Booking received — we'll confirm shortly 📋",
    badge: "Booking Received",
    headline: "We've received your booking!",
    body: "Thank you for booking with Aunt Sally's Laundry. Our team will confirm your order shortly.",
  },
  confirmed: {
    subject: "Your order is confirmed ✅",
    badge: "Order Confirmed",
    headline: "We've got your order!",
    body: "Your booking has been confirmed. We'll be in touch shortly to arrange pickup.",
  },
  out_for_pickup: {
    subject: "Our driver is on the way 🚗",
    badge: "Driver En Route",
    headline: "We're picking up your laundry",
    body: "Our driver is heading to you now. Please have your laundry ready for pickup.",
  },
  processing: {
    subject: "We're washing your laundry 🫧",
    badge: "In Processing",
    headline: "Your laundry is being washed",
    body: "Your clothes are in great hands. We'll let you know when they're ready.",
  },
  ready: {
    subject: "Your laundry is ready! ✨",
    badge: "Ready",
    headline: "Fresh and clean!",
    body: "Your laundry is done and ready. We'll have it delivered to you soon.",
  },
  ready_self_pickup: {
    subject: "Your laundry is ready for pickup! 🏪",
    badge: "Ready for Pickup",
    headline: "Your laundry is clean and waiting!",
    body: "Your laundry is done! Please come by our branch to pick it up at your convenience.",
  },
  out_for_delivery: {
    subject: "Your laundry is on the way 🚚",
    badge: "Out for Delivery",
    headline: "Your laundry is on its way!",
    body: "Our driver is heading your way with your fresh laundry. Please be available to receive it.",
  },
  delivered: {
    subject: "Delivered! Thank you 💚",
    badge: "Delivered",
    headline: "Order complete!",
    body: "Your laundry has been delivered. Thank you for choosing Aunt Sally's Laundry!",
  },
  cancelled: {
    subject: "Your order has been cancelled",
    badge: "Cancelled",
    headline: "Order cancelled",
    body: "Your order has been cancelled. If you have questions, please reach out to us.",
  },
};

export async function sendOrderStatusEmail(params: SendOrderEmailParams) {
  const { to, customerName, orderNumber, trackingCode, status, branchName, total } = params;
  const content = STATUS_CONTENT[status];
  if (!content) return; // No email for this status

  const trackingUrl = `${TRACKING_BASE}?code=${trackingCode}`;

  const html = baseTemplate(`
    <div class="status-badge">${content.badge}</div>
    <h2 style="margin: 0 0 8px; font-size: 22px; color: #111827;">${content.headline}</h2>
    <p style="color: #6b7280; margin: 0 0 20px; font-size: 15px;">Hi ${customerName},</p>
    <p style="color: #374151; font-size: 15px; line-height: 1.6;">${content.body}</p>
    <div class="order-box">
      <p class="label">Order Number</p>
      <p style="font-weight: 700; font-size: 18px; color: #111827; letter-spacing: 1px;">${orderNumber}</p>
      ${branchName ? `<p class="label" style="margin-top:10px;">Branch</p><p>${branchName}</p>` : ""}
      ${total ? `<p class="label" style="margin-top:10px;">Total</p><p style="font-weight:600;">₱${parseFloat(total).toLocaleString()}</p>` : ""}
    </div>
    <a href="${trackingUrl}" class="track-btn">Track My Order →</a>
    <p style="font-size: 13px; color: #9ca3af;">Questions? Reply to this email or call any of our branches.</p>
  `);

  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to: [to],
      subject: content.subject,
      html,
    });
  } catch (err) {
    // Log but don't throw — email failure should never break the order flow
    console.error("[email] Failed to send status email:", err);
  }
}
