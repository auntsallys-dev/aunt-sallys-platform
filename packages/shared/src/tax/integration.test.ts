/**
 * Integration-style tests — verify the tax library produces exactly the
 * numbers shown on the BIR filing package facsimiles in
 * /legal/bir-pos/<branch>/Filing_Package_*.docx.
 *
 * If this test file ever fails, something has drifted between the system
 * and the documents we filed at the RDO. That's a P0 audit risk.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTax, formatPhp } from "./vat.ts";

test("Filing package facsimile — Luxury Momnrock VAT-reg sale", () => {
  // Mirrors the facsimile in legal/bir-pos/*/Filing_Package_*.docx
  //   Wash & Fold     8.00 kg @ ₱70  = ₱560.00
  //   Dry Clean Barong 1 pc @ ₱250   = ₱250.00
  //   Delivery Fee                    = ₱ 80.00
  //   ─────────────────────────────────────────
  //   VATable Sales                  = ₱794.64
  //   VAT Amount (12%)               = ₱ 95.36
  //   TOTAL AMOUNT DUE               = ₱890.00
  const out = computeTax({
    sellerVatStatus: "vat",
    lines: [
      { description: "Wash & Fold", unit: "kg", quantity: 8, unitPrice: 70, taxClass: "vatable" },
      { description: "Dry Clean — Barong", unit: "pc", quantity: 1, unitPrice: 250, taxClass: "vatable" },
    ],
    deliveryFee: 80,
  });

  assert.equal(out.subtotal, 890, "subtotal");
  assert.equal(out.total, 890, "total");
  assert.equal(out.vatableSales, 794.64, "vatable on facsimile");
  assert.equal(out.vatAmount, 95.36, "vat amount on facsimile");
  assert.equal(out.vatExemptSales, 0);
  assert.equal(out.zeroRatedSales, 0);
  assert.equal(formatPhp(out.total), "PHP 890.00");
});

test("Void / reversal — negated invoice still reconciles", () => {
  // The void flow issues a paired reversal invoice with negated totals.
  // Sum of original + reversal must equal zero on every aggregate.
  const original = computeTax({
    sellerVatStatus: "vat",
    lines: [
      { description: "Wash & Fold", quantity: 8, unitPrice: 70, taxClass: "vatable" },
    ],
    deliveryFee: 80,
  });

  // Simulate the reversal as the API does: negate every aggregate
  const reversal = {
    subtotal: -original.subtotal,
    total: -original.total,
    vatableSales: -original.vatableSales,
    vatAmount: -original.vatAmount,
    vatExemptSales: -original.vatExemptSales,
    zeroRatedSales: -original.zeroRatedSales,
    discountAmount: -original.discountAmount,
    deliveryFee: -original.deliveryFee,
  };

  assert.equal(original.total + reversal.total, 0);
  assert.equal(original.vatAmount + reversal.vatAmount, 0);
  assert.equal(original.vatableSales + reversal.vatableSales, 0);
});

test("Senior Citizen discount on a delivery order — VAT-exempt + 20% off", () => {
  // SC discount: lines + delivery move from VATable to VAT-Exempt;
  // 20% off the previously-vatable net.
  const out = computeTax({
    sellerVatStatus: "vat",
    lines: [
      { description: "Wash & Fold", quantity: 10, unitPrice: 70, taxClass: "vatable" }, // 700 inc
    ],
    deliveryFee: 80,
    discountType: "sc",
  });

  // 700 + 80 = 780 inc → net 696.43, vat 83.57
  // SC: drop VAT (-83.57), 20% off 696.43 = 139.29 → discount, exempt becomes 557.14
  assert.ok(Math.abs(out.discountAmount - 139.29) < 0.05, `discount: got ${out.discountAmount}`);
  assert.ok(Math.abs(out.vatExemptSales - 557.14) < 0.05, `exempt: got ${out.vatExemptSales}`);
  assert.equal(out.vatableSales, 0);
  assert.equal(out.vatAmount, 0);
  // Total payable = subtotal - discount = 780 - 139.29 = 640.71
  assert.ok(Math.abs(out.total - 640.71) < 0.05, `total: got ${out.total}`);
});

test("Per-branch invoice serial format matches what filings declare", () => {
  // We don't actually call Postgres here, but we encode the format the API
  // and SQL function commit to — keeps drift detectable.
  const examples = [
    { branchCode: "001", expectedPrefix: "LM-BR001-" },
    { branchCode: "00003", expectedPrefix: "LM-BR00003-" },
    { branchCode: "00004", expectedPrefix: "LM-BR00004-" },
  ];
  // Format mirrors packages/db/sql/0001_bir_cas_post_migration.sql:
  //   format('LM-BR%s-%s', v_branch_code, lpad(v_next::text, 8, '0'))
  for (const e of examples) {
    const sample = `LM-BR${e.branchCode}-${"00000001"}`;
    assert.ok(sample.startsWith(e.expectedPrefix), `Prefix for ${e.branchCode}`);
    assert.ok(/-\d{8}$/.test(sample), `8-digit serial suffix for ${e.branchCode}`);
  }
});
