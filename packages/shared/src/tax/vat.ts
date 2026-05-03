/**
 * BIR-compliant VAT and Percentage-Tax computation.
 *
 * All amounts are PHP, two decimals. Computations are done in cents (integer)
 * internally to avoid IEEE-754 rounding traps — `0.1 + 0.2 !== 0.3` in
 * float-land — and converted back to PHP at the boundaries.
 *
 * Reference: NIRC Sec. 106-110, RR 7-2024, RR 11-2024 (EOPT).
 */

export const VAT_RATE = 0.12; // 12% VAT, current statutory rate
export const SC_PWD_DISCOUNT_RATE = 0.20; // 20% off — Senior Citizen / PWD
export const PERCENTAGE_TAX_RATE = 0.03; // 3% percentage tax — non-VAT taxpayers

export type TaxClass = "vatable" | "vat_exempt" | "zero_rated";
export type DiscountType = "none" | "sc" | "pwd" | "promo" | "manager";
export type VatStatus = "vat" | "non-vat";

export interface TaxLineInput {
  description: string;
  unit?: string;
  quantity: number;        // positive number; e.g., 8 (kg) or 1 (piece)
  unitPrice: number;       // PHP per unit, VAT-inclusive when seller is VAT-registered
  taxClass: TaxClass;      // per-line classification
}

export interface TaxComputeInput {
  sellerVatStatus: VatStatus;
  lines: TaxLineInput[];
  deliveryFee?: number;    // VAT-inclusive when applicable
  discountType?: DiscountType;
  discountAmount?: number; // for "promo" or "manager" — flat PHP off
  // For sc / pwd we ignore discountAmount and apply the statutory 20% off
  // to the VATable subset of the bill, then mark that subset as VAT-exempt.
}

export interface TaxLineOutput {
  description: string;
  unit?: string;
  quantity: number;
  unitPrice: number;       // input echoed back
  taxClass: TaxClass;
  lineSubtotal: number;    // qty * unitPrice (rounded)
  lineVat: number;         // VAT portion of the line, 0 for non-VAT, exempt, zero-rated
  lineTotal: number;       // VAT-inclusive line total
}

export interface TaxComputeOutput {
  lines: TaxLineOutput[];
  // Aggregate breakdown that lands on the printed invoice:
  vatableSales: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  vatAmount: number;
  // Percentage-tax taxpayers don't print VAT but DO show a small note;
  // we expose the computed PT for reporting (it's not added to total).
  percentageTaxAmount: number;

  subtotal: number;        // sum of line subtotals (VAT-inclusive for VAT-reg)
  deliveryFee: number;
  discountAmount: number;  // amount actually applied (flat or computed)
  total: number;           // amount payable by the customer
}

// ---------- internal helpers ----------

const toCents = (n: number): number => Math.round(n * 100);
const fromCents = (c: number): number => Math.round(c) / 100;

/**
 * Round a peso amount to 2 decimals using banker's rounding (round half to even),
 * which is what BIR examiners typically use to avoid systematic bias. We keep the
 * half-up variant available too for places where that's specified instead.
 */
function round2(n: number): number {
  // Round-half-up, matching how Philippine receipt printers display peso amounts.
  return Math.round(n * 100 + Number.EPSILON) / 100;
}

/**
 * Strip VAT from a VAT-inclusive amount: VAT_inc / 1.12 = VAT_exc;
 * VAT = VAT_inc - VAT_exc.
 */
function splitVatInclusive(amount: number): { net: number; vat: number } {
  const cents = toCents(amount);
  const net = Math.round(cents / (1 + VAT_RATE));
  const vat = cents - net;
  return { net: fromCents(net), vat: fromCents(vat) };
}

// ---------- main API ----------

export function computeTax(input: TaxComputeInput): TaxComputeOutput {
  const {
    sellerVatStatus,
    lines,
    deliveryFee: deliveryFeeIn = 0,
    discountType = "none",
    discountAmount: explicitDiscount = 0,
  } = input;

  if (deliveryFeeIn < 0) throw new Error("deliveryFee cannot be negative");
  for (const l of lines) {
    if (l.quantity < 0) throw new Error(`line quantity negative: ${l.description}`);
    if (l.unitPrice < 0) throw new Error(`line unit price negative: ${l.description}`);
  }

  // Step 1: per-line subtotals.
  const lineSubtotals = lines.map((l) => round2(l.quantity * l.unitPrice));

  // Step 2: per-line VAT classification.
  // For VAT-registered sellers, line totals are VAT-INCLUSIVE on entry.
  // We compute the VAT and net per line.
  const perLine: TaxLineOutput[] = lines.map((l, i) => {
    const subtotal = lineSubtotals[i];
    if (sellerVatStatus === "non-vat") {
      // No VAT line for non-VAT; tax class is informational
      return {
        description: l.description,
        unit: l.unit,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxClass: l.taxClass,
        lineSubtotal: subtotal,
        lineVat: 0,
        lineTotal: subtotal,
      };
    }

    if (l.taxClass === "vatable") {
      const { vat } = splitVatInclusive(subtotal);
      return {
        description: l.description,
        unit: l.unit,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxClass: l.taxClass,
        lineSubtotal: subtotal,
        lineVat: vat,
        lineTotal: subtotal,
      };
    }
    // vat_exempt and zero_rated: no VAT
    return {
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxClass: l.taxClass,
      lineSubtotal: subtotal,
      lineVat: 0,
      lineTotal: subtotal,
    };
  });

  // Step 3: classify delivery fee. Delivery fee follows the seller's VAT status:
  //   - VAT-registered: fee is VAT-inclusive, treated as 'vatable'.
  //   - Non-VAT: fee passes through unchanged.
  // SC/PWD discount also applies to delivery fee if classed vatable (BIR
  // ruling: services for SC/PWD personal use are exempt). We compute that
  // by treating delivery as a virtual line with class 'vatable'.
  const deliveryFee = round2(deliveryFeeIn);
  let deliveryVat = 0;
  if (sellerVatStatus === "vat" && deliveryFee > 0) {
    deliveryVat = splitVatInclusive(deliveryFee).vat;
  }

  // Step 4: compute aggregates BEFORE discount application.
  let vatableSales = 0;
  let vatExemptSales = 0;
  let zeroRatedSales = 0;
  let vatAmount = 0;

  if (sellerVatStatus === "vat") {
    for (const l of perLine) {
      if (l.taxClass === "vatable") {
        // VAT-exclusive (net) goes to vatableSales
        vatableSales += l.lineSubtotal - l.lineVat;
        vatAmount += l.lineVat;
      } else if (l.taxClass === "vat_exempt") {
        vatExemptSales += l.lineSubtotal;
      } else {
        zeroRatedSales += l.lineSubtotal;
      }
    }
    if (deliveryFee > 0) {
      vatableSales += deliveryFee - deliveryVat;
      vatAmount += deliveryVat;
    }
  } else {
    // non-VAT: classes are still tracked but VAT amount is 0
    for (const l of perLine) {
      if (l.taxClass === "vat_exempt") vatExemptSales += l.lineSubtotal;
      else if (l.taxClass === "zero_rated") zeroRatedSales += l.lineSubtotal;
      else vatableSales += l.lineSubtotal; // 'vatable' shown as net for non-VAT
    }
    if (deliveryFee > 0) vatableSales += deliveryFee;
  }

  vatableSales = round2(vatableSales);
  vatExemptSales = round2(vatExemptSales);
  zeroRatedSales = round2(zeroRatedSales);
  vatAmount = round2(vatAmount);

  // Step 5: subtotal (printed on invoice as the gross billable line BEFORE discount).
  const subtotal = round2(perLine.reduce((s, l) => s + l.lineSubtotal, 0) + deliveryFee);

  // Step 6: apply discount.
  // - "none": no change.
  // - "promo" / "manager": flat PHP amount, applied to the gross total. For VAT-reg
  //   taxpayers the discount is VAT-inclusive (i.e., reduces gross total directly).
  // - "sc" / "pwd": 20% off the VATable portion (lines + delivery), AND that portion
  //   becomes VAT-EXEMPT. Recompute aggregates accordingly.
  let discountAmount = 0;

  if (discountType === "sc" || discountType === "pwd") {
    if (sellerVatStatus === "vat") {
      // The vatable portion (net) becomes vat-exempt; VAT on it is dropped;
      // 20% off the *net vatable* amount is the discount.
      const vatableNet = vatableSales; // net
      const exempted = vatableNet; // moves to exempt
      const discount = round2(vatableNet * SC_PWD_DISCOUNT_RATE);

      vatExemptSales = round2(vatExemptSales + exempted - discount);
      vatableSales = 0;
      vatAmount = 0;
      discountAmount = discount;
    } else {
      // Non-VAT: just take 20% off the previously-vatable portion.
      const discount = round2(vatableSales * SC_PWD_DISCOUNT_RATE);
      vatableSales = round2(vatableSales - discount);
      discountAmount = discount;
    }
  } else if (discountType === "promo" || discountType === "manager") {
    discountAmount = round2(Math.max(0, explicitDiscount));
    if (discountAmount > subtotal) {
      throw new Error("discount cannot exceed subtotal");
    }
    // Reduce VATable proportionally (the simplest defensible policy).
    if (sellerVatStatus === "vat" && vatableSales + vatAmount > 0) {
      const vatableGross = vatableSales + vatAmount; // VAT-inclusive
      const proportion = vatableGross / subtotal;
      const vatablePortion = round2(discountAmount * proportion);
      const { net: dNet, vat: dVat } = splitVatInclusive(vatablePortion);
      vatableSales = round2(vatableSales - dNet);
      vatAmount = round2(vatAmount - dVat);
      // remaining discount applied to non-vatable portion (exempt + zero-rated)
      const remainder = round2(discountAmount - vatablePortion);
      // Bias to vat_exempt first, then zero_rated
      if (vatExemptSales >= remainder) {
        vatExemptSales = round2(vatExemptSales - remainder);
      } else {
        const fromExempt = vatExemptSales;
        vatExemptSales = 0;
        zeroRatedSales = round2(zeroRatedSales - (remainder - fromExempt));
      }
    } else if (sellerVatStatus === "non-vat") {
      vatableSales = round2(Math.max(0, vatableSales - discountAmount));
    }
  }

  // Step 7: compute total payable.
  const total = round2(subtotal - discountAmount);

  // Step 8: percentage tax (information only — not added to bill).
  const percentageTaxAmount =
    sellerVatStatus === "non-vat"
      ? round2((vatableSales + vatExemptSales + zeroRatedSales) * PERCENTAGE_TAX_RATE)
      : 0;

  return {
    lines: perLine,
    vatableSales,
    vatExemptSales,
    zeroRatedSales,
    vatAmount,
    percentageTaxAmount,
    subtotal,
    deliveryFee,
    discountAmount,
    total,
  };
}

/**
 * Convenience: format a peso amount the way it should be printed on an invoice.
 * Used by both the POS thermal printer and the A5 PDF.
 */
export function formatPhp(n: number): string {
  return `PHP ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
