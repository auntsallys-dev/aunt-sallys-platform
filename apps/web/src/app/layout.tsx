import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aunt Sally's Laundry",
  description: "Professional laundry services in Cebu — Wash & Fold, Dry Clean, Delivery",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
