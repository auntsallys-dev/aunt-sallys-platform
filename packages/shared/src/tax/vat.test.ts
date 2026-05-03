/**
 * Unit tests for the VAT / Percentage-Tax computation library.
 * Run with: pnpm --filter @aunt-sallys/shared test
 *
 * Uses Node's built-in test runner (node:test) so we don't add a new test
 * dependency to the monorepo. tsx is already a dev dep elsewhere; here we
 * use node's experimental TS strip mode (Node >= 22.6).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTax, formatPhp } from "./vat.ts";

const APPROX_EPS = 0.005;
const approx = (a: number, b: number, eps = APPROX_EPS) =>
  Math.abs(a - b) < eps;

// ---------------------------------------------------------------------------
// Baseline: a typical VAT-registered laundry sale
// ---------------------------------------------------------------------------
test("VAT-reg simple sale — 8 kg wash & fold + 1 dry-clean barong + delivery", () => {
  const out = computeTax({
    sellerVatStatus: "vat",
    lines: [
      { description: "Wash & Fold", unit: "kg", quantity: 8, unitPrice: 70, taxClass: "vatable" },
      { description: "Dry Clean — Barong", unit: "pc", quantity: 1, unitPrice: 250, taxClass: "vatable" },
    ],
    deliveryFee: 80,
  });

  assert.equal(out.subtotal, 890);            // 560 + 250 + 80
  assert.equal(out.deliveryFee, 80);
  assert.equal(out.discountAmount, 0);
  assert.equal(out.total, 890);
  // VAT-inclusive 890 → net 794.64, vat 95.36
  assert.ok(approx(out.vatableSales, 794.64), `got ${out.vatableSales}`);
  assert.ok(approx(out.vatAmount, 95.36), `got ${out.vatAmount}`);
  assert.equal(out.vatExemptSales, 0);
  assert.equal(out.zeroRatedSales, 0);
  assert.equal(out.percentageTaxAmount, 0);
  assert.equal(out.lines.length, 2);
});

// ---------------------------------------------------------------------------
// Senior Citizen discount — 20% off + VAT-exempt
// ---------------------------------------------------------------------------
test("SC discount — VATable line becomes VAT-exempt with 20% off", () => {
  const out = computeTax({
    sellerVatStatus: "vat",
    lines: [
      { description: "Wash & Fold", unit: "kg", quantity: 8, unitPrice: 70, taxClass: "vatable" },
    ],
    discountType: "sc",
  });

  // 8 * 70 = 560 (VAT-inclusive). Net = 500, VAT = 60.
  // SC: drop VAT (-60), 20% off net (500 → 400). discount = 100.
  // exempt portion = 400, vatable = 0, vatAmount = 0
  assert.ok(approx(out.discountAmount, 100), `got ${out.discountAmount}`);
  assert.equal(out.vatableSales, 0);
  assert.ok(approx(out.vatExemptSales, 400), `got ${out.vatExemptSales}`);
  assert.equal(out.vatAmount, 0);
  // Total payable = subtotal (560) - discount (100) = 460
  assert.ok(approx(out.total, 460), `got ${out.total}`);
});

test("PWD discount — same treatment as SC", () => {
  const out = computeTax({
    sellerVatStatus: "vat",
    lines: [
      { description: "Dry Clean", quantity: 1, unitPrice: 1120, taxClass: "vatable" },
    ],
    discountType: "pwd",
  });
  // 1120 inc → net 1000, vat 120. PWD: -vat, -200 from net = 800.
  assert.ok(approx(out.discountAmount, 200), `got ${out.discountAmount}`);
  assert.ok(approx(out.vatExemptSales, 800), `got ${out.vatExemptSales}`);
  assert.equal(out.vatableSales, 0);
  assert.equal(out.vatAmount, 0);
  assert.ok(approx(out.total, 920), `got ${out.total}`);
});

// ---------------------------------------------------------------------------
// Mixed VAT + zero-rated
// ---------------------------------------------------------------------------
test("Mixed sale — VATable + zero-rated", () => {
  const out = computeTax({
    sellerVatStatus: "vat",
    lines: [
      { description: "Wash & Fold", unit: "kg", quantity: 5, unitPrice: 70, taxClass: "vatable" }, // 350 inc
      { description: "Export Order", quantity: 1, unitPrice: 1000, taxClass: "zero_rated" },
    ],
  });
  // 350 inc → net 312.50, vat 37.50
  assert.ok(approx(out.vatableSales, 312.5), `got ${out.vatableSales}`);
  assert.ok(approx(out.vatAmount, 37.5), `got ${out.vatAmount}`);
  assert.equal(out.zeroRatedSales, 1000);
  assert.equal(out.vatExemptSales, 0);
  assert.equal(out.total, 1350);
});

// ---------------------------------------------------------------------------
// Promo (flat) discount
// ---------------------------------------------------------------------------
test("Promo flat discount reduces total directly", () => {
  const out = computeTax({
    sellerVatStatus: "vat",
    lines: [
      { description: "Wash & Fold", quantity: 10, unitPrice: 70, taxClass: "vatable" }, // 700 inc
    ],
    discountType: "promo",
    discountAmount: 100,
  });
  assert.equal(out.discountAmount, 100);
  assert.equal(out.subtotal, 700);
  assert.equal(out.total, 600);
  // VAT recomputed proportionally on what's left
  // Pre-discount: vatable_net 625, vat 75
  // Discount 100 was VAT-inclusive on the vatable portion → net delta ≈ 89.29, vat delta ≈ 10.71
  // Post: vatable_net ≈ 535.71, vat ≈ 64.29
  assert.ok(approx(out.vatableSales, 535.71, 0.02), `got ${out.vatableSales}`);
  assert.ok(approx(out.vatAmount, 64.29, 0.02), `got ${out.vatAmount}`);
});

test("Promo discount cannot exceed subtotal", () => {
  assert.throws(() =>
    computeTax({
      sellerVatStatus: "vat",
      lines: [{ description: "x", quantity: 1, unitPrice: 100, taxClass: "vatable" }],
      discountType: "promo",
      discountAmount: 500,
    })
  );
});

// ---------------------------------------------------------------------------
// Non-VAT seller (Percentage Tax)
// ---------------------------------------------------------------------------
test("Non-VAT seller — no VAT on lines, percentage tax computed", () => {
  const out = computeTax({
    sellerVatStatus: "non-vat",
    lines: [
      { description: "Wash & Fold", quantity: 8, unitPrice: 70, taxClass: "vatable" },
    ],
    deliveryFee: 80,
  });
  assert.equal(out.vatAmount, 0);
  assert.equal(out.vatableSales, 640);    // 560 + 80, all pass-through
  assert.equal(out.total, 640);
  // 3% percentage tax on gross sales (informational)
  assert.ok(approx(out.percentageTaxAmount, 19.20), `got ${out.percentageTaxAmount}`);
});

test("Non-VAT seller with SC discount — flat 20% off the previously vatable lines", () => {
  const out = computeTax({
    sellerVatStatus: "non-vat",
    lines: [
      { description: "Wash & Fold", quantity: 10, unitPrice: 100, taxClass: "vatable" }, // 1000
    ],
    discountType: "sc",
  });
  assert.ok(approx(out.discountAmount, 200), `got ${out.discountAmount}`);
  assert.ok(approx(out.vatableSales, 800), `got ${out.vatableSales}`);
  assert.ok(approx(out.total, 800), `got ${out.total}`);
});

// ---------------------------------------------------------------------------
// Edge cases / defensive tests
// ---------------------------------------------------------------------------
test("Zero-quantity line is allowed and contributes nothing", () => {
  const out = computeTax({
    sellerVatStatus: "vat",
    lines: [
      { description: "Wash & Fold", quantity: 0, unitPrice: 70, taxClass: "vatable" },
      { description: "Iron", quantity: 1, unitPrice: 112, taxClass: "vatable" },
    ],
  });
  assert.equal(out.subtotal, 112);
  assert.equal(out.total, 112);
  assert.equal(out.lines[0].lineSubtotal, 0);
});

test("Negative quantity is rejected", () => {
  assert.throws(() =>
    computeTax({
      sellerVatStatus: "vat",
      lines: [{ description: "x", quantity: -1, unitPrice: 100, taxClass: "vatable" }],
    })
  );
});

test("Negative unit price is rejected", () => {
  assert.throws(() =>
    computeTax({
      sellerVatStatus: "vat",
      lines: [{ description: "x", quantity: 1, unitPrice: -1, taxClass: "vatable" }],
    })
  );
});

test("Negative delivery fee is rejected", () => {
  assert.throws(() =>
    computeTax({
      sellerVatStatus: "vat",
      lines: [{ description: "x", quantity: 1, unitPrice: 100, taxClass: "vatable" }],
      deliveryFee: -10,
    })
  );
});

test("Sum of vatable + exempt + zero-rated + vat ≈ total + discount (VAT-reg)", () => {
  // Property test: aggregates reconcile to the total payable
  const cases = [
    { lines: [{ description: "a", quantity: 3.5, unitPrice: 70, taxClass: "vatable" as const }], deliveryFee: 0, discountType: "none" as const },
    { lines: [{ description: "a", quantity: 1, unitPrice: 999, taxClass: "vatable" as const }], deliveryFee: 50, discountType: "none" as const },
    { lines: [{ description: "a", quantity: 7.25, unitPrice: 80, taxClass: "vatable" as const }], deliveryFee: 75, discountType: "promo" as const, discountAmount: 50 },
  ];
  for (const c of cases) {
    const out = computeTax({ sellerVatStatus: "vat", ...c });
    const reconstructed =
      out.vatableSales + out.vatAmount + out.vatExemptSales + out.zeroRatedSales;
    assert.ok(
      approx(reconstructed, out.total, 0.02),
      `reconstructed ${reconstructed} != total ${out.total} for ${JSON.stringify(c)}`
    );
  }
});

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
test("formatPhp produces standard PHP money format", () => {
  assert.equal(formatPhp(0), "PHP 0.00");
  assert.equal(formatPhp(1234.5), "PHP 1,234.50");
  assert.equal(formatPhp(1234567.89), "PHP 1,234,567.89");
});
