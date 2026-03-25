import { NextResponse } from "next/server";

function randomCode(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST() {
  const trackingCode = "AS-" + randomCode(6);
  return NextResponse.json({ success: true, trackingCode });
}
