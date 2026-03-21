import React from "react";
import { Badge } from "./Badge.js";
import { cn } from "../lib/cn.js";

// Inlined from shared to keep the UI package dependency-free
const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  picked_up: "Picked Up",
  processing: "Processing",
  ready: "Ready for Pickup",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "neutral";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: "warning",
  confirmed: "info",
  picked_up: "default",
  processing: "warning",
  ready: "success",
  out_for_delivery: "info",
  delivered: "success",
  completed: "success",
  cancelled: "error",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = STATUS_VARIANTS[status] ?? "neutral";
  const label = ORDER_STATUS_LABELS[status] ?? status;
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
