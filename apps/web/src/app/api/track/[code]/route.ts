import { NextResponse } from "next/server";

const STEPS = [
  {
    label:       "Booking Confirmed",
    description: "Your booking has been received and confirmed.",
  },
  {
    label:       "Picked Up",
    description: "Our rider has collected your laundry.",
  },
  {
    label:       "Being Washed",
    description: "Your items are being washed and processed.",
  },
  {
    label:       "Ready for Delivery",
    description: "Your laundry is clean, folded, and ready to be delivered.",
  },
  {
    label:       "Delivered",
    description: "Your order has been delivered. Thank you for choosing Aunt Sally's!",
  },
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // Validate format AS-XXXXXX (basic check)
  if (!code || !/^AS-[A-Z0-9]{6}$/i.test(code)) {
    return NextResponse.json({ error: "Invalid tracking code" }, { status: 404 });
  }

  // Mock data: first 2 steps completed
  const now = new Date();
  const steps = STEPS.map((step, i) => ({
    ...step,
    completedAt:
      i === 0
        ? new Date(now.getTime() - 2 * 60 * 60 * 1000).toLocaleString("en-PH", {
            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
          })
        : i === 1
          ? new Date(now.getTime() - 45 * 60 * 1000).toLocaleString("en-PH", {
              month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
            })
          : null,
  }));

  return NextResponse.json({
    trackingCode: code.toUpperCase(),
    customerName: "Maria Santos",
    status:       "Being Washed",
    steps,
  });
}
