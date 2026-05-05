/**
 * Server-side renderer for BIR-compliant Sales Invoices and Collection Receipts.
 *
 * Returns an HTML document that the POS opens in a print-friendly window.
 * Layout is 80 mm thermal; same dimensions used to render to A5 PDF for
 * email delivery (a separate path can pipe this through a PDF renderer).
 *
 * Why HTML and not PDF? IBMS already prints HTML via window.print(); keeping
 * the server output as HTML lets us swap the client to fetch-and-print without
 * adding a heavyweight PDF dependency for the MVP. Switching to PDF later is
 * a single substitution at this boundary.
 */

import { formatPhp } from "@aunt-sallys/shared/tax";
import type { SalesInvoice, SalesInvoiceItem, CollectionReceipt } from "@aunt-sallys/db";

const COMMON_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 8px; color: #000; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .small { font-size: 10px; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .double-divider { border-top: 1px solid #000; margin: 6px 0; }
  h1 { font-size: 15px; text-align: center; margin-bottom: 2px; }
  h2 { font-size: 11px; text-align: center; font-weight: normal; margin-bottom: 6px; }
  h3 { font-size: 13px; text-align: center; font-weight: bold; margin: 6px 0; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  td.amt { text-align: right; }
  .total-row td { font-weight: bold; font-size: 13px; padding-top: 4px; border-top: 1px solid #000; }
  .footer { text-align: center; margin-top: 10px; font-size: 10px; }
  .void-banner { background: #000; color: #fff; text-align: center; padding: 4px 0; margin: 6px 0; font-weight: bold; }
  @media print { @page { margin: 0; size: 80mm auto; } body { width: 80mm; } }
`;

function esc(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(ts: Date | string): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return d.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

export interface InvoiceRenderInput {
  invoice: SalesInvoice;
  items: SalesInvoiceItem[];
  branchName: string;
  cashierName: string;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  amountTendered?: number | null;
}

export function renderSalesInvoiceHtml(input: InvoiceRenderInput): string {
  const inv = input.invoice;
  const isVoid = !!inv.voidedAt;
  const voidBanner = isVoid
    ? `<div class="void-banner">VOIDED ${esc(inv.voidedAt && fmtDate(inv.voidedAt))}</div>`
    : "";
  const reversalBanner = inv.voidsInvoiceId
    ? `<div class="void-banner">REVERSAL OF INVOICE</div>`
    : "";

  const itemRows = input.items
    .map(
      (i) => `
        <tr>
          <td>${esc(i.description)}</td>
          <td class="amt">${esc(i.quantity)}${i.unit ? " " + esc(i.unit) : ""}</td>
          <td class="amt">${formatPhp(parseFloat(i.lineTotal))}</td>
        </tr>`
    )
    .join("");

  const change =
    input.amountTendered != null
      ? Math.max(0, input.amountTendered - parseFloat(inv.total))
      : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Sales Invoice ${esc(inv.invoiceNumber)}</title>
  <style>${COMMON_CSS}</style>
</head>
<body>
  ${reversalBanner}${voidBanner}
  <h1>${esc(inv.sellerRegisteredName)}</h1>
  <h2>Trading as ${esc(inv.sellerTradeName)}</h2>
  <div class="center small">${esc(inv.sellerAddress)}</div>
  <div class="center small">TIN: ${esc(inv.sellerTin)} ${inv.sellerVatStatus === "vat" ? "VAT-REGISTERED" : "NON-VAT"}</div>
  <div class="divider"></div>
  <h3>SALES INVOICE</h3>
  <div class="divider"></div>
  <table>
    <tr><td><b>Invoice No.</b></td><td class="amt">${esc(inv.invoiceNumber)}</td></tr>
    <tr><td><b>Date/Time</b></td><td class="amt">${esc(fmtDate(inv.issuedAt))}</td></tr>
    <tr><td><b>Branch</b></td><td class="amt">${esc(input.branchName)} (${esc(inv.sellerBranchCode)})</td></tr>
    <tr><td><b>Cashier</b></td><td class="amt">${esc(input.cashierName)}</td></tr>
  </table>
  <div class="divider"></div>
  <table>
    <tr><td><b>Sold To:</b></td><td class="amt">${esc(inv.customerName)}</td></tr>
    ${inv.customerAddress ? `<tr><td colspan="2" class="small">${esc(inv.customerAddress)}</td></tr>` : ""}
    ${inv.customerTin ? `<tr><td><b>TIN</b></td><td class="amt">${esc(inv.customerTin)}</td></tr>` : ""}
    ${inv.customerBusinessStyle ? `<tr><td><b>Business Style</b></td><td class="amt">${esc(inv.customerBusinessStyle)}</td></tr>` : ""}
  </table>
  <div class="divider"></div>
  <table>
    <tr class="bold"><td>Item</td><td class="amt">Qty</td><td class="amt">Amount</td></tr>
    ${itemRows}
  </table>
  <div class="divider"></div>
  <table>
    <tr><td>VATable Sales</td><td class="amt">${formatPhp(parseFloat(inv.vatableSales))}</td></tr>
    <tr><td>VAT-Exempt Sales</td><td class="amt">${formatPhp(parseFloat(inv.vatExemptSales))}</td></tr>
    <tr><td>Zero-Rated Sales</td><td class="amt">${formatPhp(parseFloat(inv.zeroRatedSales))}</td></tr>
    <tr><td>VAT Amount (12%)</td><td class="amt">${formatPhp(parseFloat(inv.vatAmount))}</td></tr>
    ${parseFloat(inv.discountAmount) > 0 ? `<tr><td>Discount${inv.discountType !== "none" ? ` (${esc(inv.discountType.toUpperCase())})` : ""}</td><td class="amt">- ${formatPhp(parseFloat(inv.discountAmount))}</td></tr>` : ""}
    ${parseFloat(inv.deliveryFee) > 0 ? `<tr><td>Delivery Fee</td><td class="amt">${formatPhp(parseFloat(inv.deliveryFee))}</td></tr>` : ""}
    <tr class="total-row"><td>TOTAL AMOUNT DUE</td><td class="amt">${formatPhp(parseFloat(inv.total))}</td></tr>
  </table>
  ${input.paymentMethod ? `
  <div class="divider"></div>
  <table>
    <tr><td>Payment</td><td class="amt">${esc(input.paymentMethod.toUpperCase())}${input.paymentReference ? " — " + esc(input.paymentReference) : ""}</td></tr>
    ${input.amountTendered != null ? `<tr><td>Tendered</td><td class="amt">${formatPhp(input.amountTendered)}</td></tr>` : ""}
    ${change != null ? `<tr><td>Change</td><td class="amt">${formatPhp(change)}</td></tr>` : ""}
  </table>` : ""}
  <div class="divider"></div>
  <div class="footer">
    <div>Generated by: IBMS v1.0.0 (POS)</div>
    <div>BIR Permit No.: ${inv.casAcNumber ? esc(inv.casAcNumber) : "[PTU NO. — pending]"}</div>
    ${inv.casAcIssuedOn ? `<div>Date of Issuance: ${esc(new Date(inv.casAcIssuedOn).toLocaleDateString("en-PH"))}</div>` : ""}
    <div class="bold" style="margin-top:6px">"THIS INVOICE SHALL BE VALID FOR<br>FIVE (5) YEARS FROM THE DATE OF THE PERMIT"</div>
    <div style="margin-top:6px">Thank you!</div>
  </div>
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
</body>
</html>`;
}

export interface CrRenderInput {
  cr: CollectionReceipt;
  branchName: string;
  cashierName: string;
  invoiceNumber: string;
  invoiceIssuedAt: Date | string;
}

export function renderCollectionReceiptHtml(input: CrRenderInput): string {
  const cr = input.cr;
  const isVoid = !!cr.voidedAt;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Collection Receipt ${esc(cr.crNumber)}</title>
  <style>${COMMON_CSS}</style>
</head>
<body>
  ${isVoid ? `<div class="void-banner">VOIDED</div>` : ""}
  <h1>${esc(cr.sellerRegisteredName)}</h1>
  <h2>Trading as ${esc(cr.sellerTradeName)}</h2>
  <div class="center small">TIN: ${esc(cr.sellerTin)}</div>
  <div class="divider"></div>
  <h3>COLLECTION RECEIPT</h3>
  <div class="center small">(Supplementary — not valid as an invoice)</div>
  <div class="divider"></div>
  <table>
    <tr><td><b>CR No.</b></td><td class="amt">${esc(cr.crNumber)}</td></tr>
    <tr><td><b>Date</b></td><td class="amt">${esc(fmtDate(cr.issuedAt))}</td></tr>
    <tr><td><b>Branch</b></td><td class="amt">${esc(input.branchName)} (${esc(cr.sellerBranchCode)})</td></tr>
    <tr><td><b>Cashier</b></td><td class="amt">${esc(input.cashierName)}</td></tr>
  </table>
  <div class="divider"></div>
  <table>
    <tr><td><b>Received from:</b></td><td class="amt">${esc(cr.receivedFromName)}</td></tr>
    ${cr.receivedFromTin ? `<tr><td><b>TIN</b></td><td class="amt">${esc(cr.receivedFromTin)}</td></tr>` : ""}
    <tr><td colspan="2" class="small">In payment of: Invoice ${esc(input.invoiceNumber)} dated ${esc(fmtDate(input.invoiceIssuedAt))}</td></tr>
    <tr><td><b>Amount</b></td><td class="amt">${formatPhp(parseFloat(cr.amount))}</td></tr>
    <tr><td><b>Mode</b></td><td class="amt">${esc(cr.paymentMethod.toUpperCase())}${cr.paymentReference ? " — " + esc(cr.paymentReference) : ""}</td></tr>
  </table>
  <div class="divider"></div>
  <div class="bold center">"THIS DOCUMENT IS NOT VALID AS A PROOF OF SALE."</div>
  <div class="divider"></div>
  <div class="footer">
    <div>Generated by: IBMS v1.0.0</div>
  </div>
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
</body>
</html>`;
}
