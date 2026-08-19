/**
 * BIR fiscal core — the "set in stone" contract for Sales Invoices.
 *
 * Tenants may reskin the invoice presentation freely (fonts, layout, colours,
 * logo, extra cosmetic lines), but the fields BIR mandates under EOPT / RR
 * 7-2024 Sec. 237 MUST survive every reskin. This module encodes that contract
 * so it is enforced by code + CI, not by convention.
 *
 * How it is enforced:
 *   - renderSalesInvoiceHtml() calls assertFiscalCoreIntact() on its own output
 *     before returning. A theme that drops a mandatory field throws at render
 *     time instead of silently issuing a non-compliant invoice.
 *   - invoice-fiscal-core.test.ts renders a reference invoice and asserts every
 *     marker is present, so a reskin that removes one fails the build.
 *
 * Do NOT relax a marker to make a theme pass. If BIR's mandatory set changes,
 * change it here deliberately — this file is the single source of truth for
 * what a compliant invoice must contain.
 */

import type { SalesInvoice } from "@aunt-sallys/db";

export interface FiscalMarker {
  id: string;
  /** Human label for the compliance requirement. */
  label: string;
  /**
   * Given the rendered HTML and the invoice, returns true if the mandatory
   * element is present. Kept presentation-agnostic (token/value presence, not
   * exact markup) so themes stay free to restyle.
   */
  present: (html: string, inv: SalesInvoice) => boolean;
}

/** Case-insensitive "does the rendered doc contain this literal value" check. */
function has(html: string, value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const v = String(value).trim();
  if (v === "") return false;
  return html.toLowerCase().includes(v.toLowerCase());
}

/**
 * The BIR-mandatory element set for a Sales Invoice. Every entry must render.
 * Themeable presentation lives OUTSIDE this list.
 */
export const FISCAL_INVOICE_MARKERS: FiscalMarker[] = [
  { id: "doc_title", label: "Document title 'Sales Invoice'", present: (h) => /sales\s*invoice/i.test(h) },
  { id: "seller_name", label: "Seller registered name", present: (h, i) => has(h, i.sellerRegisteredName) },
  { id: "seller_tin", label: "Seller TIN (incl. branch code)", present: (h, i) => has(h, i.sellerTin) },
  { id: "seller_vat_status", label: "Seller VAT status", present: (h) => /vat-registered|non-vat/i.test(h) },
  { id: "seller_address", label: "Seller business address", present: (h, i) => has(h, i.sellerAddress) },
  { id: "invoice_number", label: "Sequential invoice number", present: (h, i) => has(h, i.invoiceNumber) },
  { id: "issued_at", label: "Date/time of transaction", present: (h) => /\d{4}|\d{1,2}:\d{2}|\bAM\b|\bPM\b/i.test(h) },
  { id: "buyer_name", label: "Buyer / 'Sold To' name", present: (h, i) => has(h, i.customerName) },
  { id: "vatable_sales", label: "VATable Sales breakdown", present: (h) => /vatable\s*sales/i.test(h) },
  { id: "vat_exempt_sales", label: "VAT-Exempt Sales breakdown", present: (h) => /vat-?exempt\s*sales/i.test(h) },
  { id: "zero_rated_sales", label: "Zero-Rated Sales breakdown", present: (h) => /zero-?rated\s*sales/i.test(h) },
  { id: "vat_amount", label: "VAT Amount line", present: (h) => /vat\s*amount/i.test(h) },
  { id: "total_due", label: "Total Amount Due", present: (h) => /total\s*amount\s*due/i.test(h) },
  { id: "permit_line", label: "BIR Acknowledgement Certificate / Permit number line", present: (h) => /(acknowledgement\s*certificate\s*no|bir\s*permit|ptu\s*no)/i.test(h) },
  {
    id: "validity_notice",
    label: "5-year validity notice",
    present: (h) => /valid\s*for[\s\S]{0,40}five\s*\(?5\)?\s*years/i.test(h),
  },
];

export class FiscalCoreViolation extends Error {
  readonly missing: FiscalMarker[];
  constructor(missing: FiscalMarker[]) {
    super(
      `BIR fiscal core violation — rendered invoice is missing mandatory field(s): ` +
        missing.map((m) => `${m.id} (${m.label})`).join("; ")
    );
    this.name = "FiscalCoreViolation";
    this.missing = missing;
  }
}

/**
 * Throws FiscalCoreViolation if any BIR-mandatory field is absent from the
 * rendered invoice. Called by the renderer so a non-compliant theme can never
 * produce an issued invoice.
 */
export function assertFiscalCoreIntact(html: string, inv: SalesInvoice): void {
  const missing = FISCAL_INVOICE_MARKERS.filter((m) => !m.present(html, inv));
  if (missing.length > 0) throw new FiscalCoreViolation(missing);
}
