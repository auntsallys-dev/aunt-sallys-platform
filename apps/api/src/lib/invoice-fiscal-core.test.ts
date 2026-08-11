/**
 * Contract test for the BIR fiscal core. A tenant reskin that drops any
 * mandatory field must fail here (and therefore in CI) rather than silently
 * issue a non-compliant invoice.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FISCAL_INVOICE_MARKERS,
  assertFiscalCoreIntact,
  FiscalCoreViolation,
} from "./invoice-fiscal-core.ts";

// Minimal invoice stub carrying only the fields the fiscal contract reads.
const inv = {
  sellerRegisteredName: "J.M. BONNEVIE LABS COMPUTER PROGRAMMING SOLUTIONS OPC",
  sellerTin: "805-847-865-00000",
  sellerAddress: "18 Moonlight Loop, Blue Ridge B, Quezon City",
  invoiceNumber: "LM-BR00003-00000042",
  customerName: "JUAN DELA CRUZ",
} as any;

/** A reference-compliant rendering: every mandatory token present. */
const compliantHtml = `
  <h1>${inv.sellerRegisteredName}</h1>
  <div>TIN: ${inv.sellerTin} VAT-REGISTERED</div>
  <div>${inv.sellerAddress}</div>
  <h3>SALES INVOICE</h3>
  <div>Invoice No. ${inv.invoiceNumber}</div>
  <div>Date/Time Aug 10, 2026, 3:41 PM</div>
  <div>Sold To: ${inv.customerName}</div>
  <div>VATable Sales 100.00</div>
  <div>VAT-Exempt Sales 0.00</div>
  <div>Zero-Rated Sales 0.00</div>
  <div>VAT Amount (12%) 12.00</div>
  <div>TOTAL AMOUNT DUE 112.00</div>
  <div>BIR Permit No.: [PTU NO. — pending]</div>
  <div>"THIS INVOICE SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF THE PERMIT"</div>
`;

test("a compliant rendering satisfies every fiscal marker", () => {
  assert.doesNotThrow(() => assertFiscalCoreIntact(compliantHtml, inv));
  for (const m of FISCAL_INVOICE_MARKERS) {
    assert.ok(m.present(compliantHtml, inv), `marker '${m.id}' should be present`);
  }
});

test("dropping any single mandatory field throws FiscalCoreViolation", () => {
  const drops: Array<[string, RegExp]> = [
    ["doc_title", /SALES INVOICE/],
    ["vat_amount", /VAT Amount \(12%\) 12\.00/],
    ["total_due", /TOTAL AMOUNT DUE 112\.00/],
    ["permit_line", /BIR Permit No\.: \[PTU NO\. — pending\]/],
    ["validity_notice", /"THIS INVOICE SHALL BE VALID FOR FIVE \(5\) YEARS FROM THE DATE OF THE PERMIT"/],
    ["seller_tin", new RegExp(inv.sellerTin)],
  ];
  for (const [id, re] of drops) {
    const tampered = compliantHtml.replace(re, "");
    let caught: unknown;
    try {
      assertFiscalCoreIntact(tampered, inv);
    } catch (e) {
      caught = e;
    }
    assert.ok(caught instanceof FiscalCoreViolation, `removing '${id}' should throw FiscalCoreViolation`);
    assert.ok(
      (caught as FiscalCoreViolation).missing.some((m) => m.id === id),
      `violation should name the missing marker '${id}'`
    );
  }
});
