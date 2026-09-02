/**
 * PO Print Service
 * Opens a styled print window for an approved purchase order.
 * Uses window.print() — no third-party PDF library required.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount) {
  return `PHP ${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ── HTML template ─────────────────────────────────────────────────────────────

function buildPrintHTML(po) {
  const printedAt = new Date().toLocaleString('en-PH', {
    dateStyle: 'long', timeStyle: 'short',
  })
  const avgUnit = fmt(po.total_amount / po.items_count)
  const total   = fmt(po.total_amount)

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${po.po_number} – Purchase Order</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #111;
      background: #fff;
      padding: 36px 44px;
    }

    /* ── Header ─────────────────────────────────────────────── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-top: 2px solid #111;
      border-bottom: 1px solid #111;
      padding: 12px 0;
      margin-bottom: 18px;
    }
    .header-left .company {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 1px;
      line-height: 1;
    }
    .header-left .tagline {
      font-size: 9px;
      color: #555;
      margin-top: 3px;
    }
    .header-right {
      text-align: right;
    }
    .header-right .doc-type {
      font-size: 18px;
      font-weight: 700;
    }
    .header-right .po-number {
      font-size: 11px;
      color: #555;
      margin-top: 2px;
    }

    /* ── Meta row (badge + print date) ─────────────────────── */
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .badge-approved {
      display: inline-block;
      border: 1.5px solid #111;
      padding: 3px 14px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .print-date {
      font-size: 9px;
      color: #555;
    }

    /* ── Section titles ─────────────────────────────────────── */
    .section-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-bottom: 1px solid #111;
      padding-bottom: 3px;
      margin-bottom: 10px;
    }

    /* ── Two-column details grid ────────────────────────────── */
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 24px;
      margin-bottom: 20px;
    }
    .detail-item .label {
      font-size: 8px;
      color: #666;
      margin-bottom: 2px;
    }
    .detail-item .value {
      font-size: 11px;
      font-weight: 500;
      color: #111;
    }
    .detail-item .value.bold {
      font-weight: 700;
    }

    /* ── Notes box ──────────────────────────────────────────── */
    .notes-box {
      border: 1px solid #ccc;
      padding: 8px 10px;
      font-size: 10px;
      color: #111;
      margin-bottom: 20px;
      min-height: 32px;
    }

    /* ── Summary table ──────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 10px;
    }
    thead tr {
      background: #111;
      color: #fff;
    }
    thead th {
      padding: 7px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 9.5px;
    }
    tbody tr:nth-child(even) {
      background: #f5f5f5;
    }
    tbody td {
      padding: 7px 10px;
      border-bottom: 1px solid #ddd;
    }
    .total-row td {
      font-weight: 700;
      font-size: 11px;
      border-top: 1.5px solid #111;
    }
    .td-label {
      font-weight: 600;
      width: 52%;
    }

    /* ── Signatures ─────────────────────────────────────────── */
    .sig-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .sig-box {
      border: 1px solid #111;
      padding: 10px 12px 8px;
      min-height: 72px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .sig-box .sig-role {
      font-size: 7.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #555;
    }
    .sig-box .sig-name {
      font-size: 11px;
      font-weight: 500;
      margin-top: 6px;
    }
    .sig-line {
      border-top: 1px solid #aaa;
      margin-top: auto;
      padding-top: 4px;
      font-size: 7.5px;
      color: #aaa;
    }

    /* ── Footer ─────────────────────────────────────────────── */
    .footer {
      border-top: 1px solid #111;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer .footer-label {
      font-size: 8px;
      color: #888;
      font-style: italic;
    }
    .footer .footer-po {
      font-size: 8px;
      color: #555;
      font-weight: 600;
    }

    @media print {
      body { padding: 20px 28px; }
      @page { margin: 0; size: A4 portrait; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="company">VOLTRAAK</div>
      <div class="tagline">Inventory Management System</div>
    </div>
    <div class="header-right">
      <div class="doc-type">PURCHASE ORDER</div>
      <div class="po-number">${po.po_number}</div>
    </div>
  </div>

  <!-- Meta row -->
  <div class="meta-row">
    <span class="badge-approved">Approved</span>
    <span class="print-date">Printed: ${printedAt}</span>
  </div>

  <!-- PO Details -->
  <div class="section-title">Purchase Order Details</div>
  <div class="details-grid">
    <div class="detail-item">
      <div class="label">PO Number</div>
      <div class="value">${po.po_number}</div>
    </div>
    <div class="detail-item">
      <div class="label">Status</div>
      <div class="value">Approved</div>
    </div>
    <div class="detail-item">
      <div class="label">Supplier</div>
      <div class="value">${po.supplier}</div>
    </div>
    <div class="detail-item">
      <div class="label">Priority</div>
      <div class="value">${capitalize(po.priority)}</div>
    </div>
    <div class="detail-item">
      <div class="label">Requested By</div>
      <div class="value">${po.requested_by}</div>
    </div>
    <div class="detail-item">
      <div class="label">Total Items</div>
      <div class="value">${po.items_count} item${po.items_count !== 1 ? 's' : ''}</div>
    </div>
    <div class="detail-item">
      <div class="label">Date Requested</div>
      <div class="value">${fmtDate(po.requested_at)}</div>
    </div>
    <div class="detail-item">
      <div class="label">Total Amount</div>
      <div class="value bold">${total}</div>
    </div>
  </div>

  ${po.notes ? /* html */`
  <!-- Notes -->
  <div class="section-title">Notes</div>
  <div class="notes-box">${po.notes}</div>
  ` : ''}

  <!-- Order Summary -->
  <div class="section-title">Order Summary</div>
  <table>
    <thead>
      <tr>
        <th class="td-label">Description</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="td-label">PO Number</td>
        <td>${po.po_number}</td>
      </tr>
      <tr>
        <td class="td-label">Supplier</td>
        <td>${po.supplier}</td>
      </tr>
      <tr>
        <td class="td-label">Total Items</td>
        <td>${po.items_count} item${po.items_count !== 1 ? 's' : ''}</td>
      </tr>
      <tr>
        <td class="td-label">Avg. Unit Price</td>
        <td>${avgUnit}</td>
      </tr>
      <tr class="total-row">
        <td class="td-label">Total Amount</td>
        <td>${total}</td>
      </tr>
    </tbody>
  </table>

  <!-- Signatures -->
  <div class="section-title">Authorisation &amp; Signatures</div>
  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-role">Requested By</div>
      <div class="sig-name">${po.requested_by}</div>
      <div class="sig-line">Signature / Date</div>
    </div>
    <div class="sig-box">
      <div class="sig-role">Approved By (Manager)</div>
      <div class="sig-name">&nbsp;</div>
      <div class="sig-line">Signature / Date</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span class="footer-label">System-generated document — Voltraak IMS</span>
    <span class="footer-po">${po.po_number}</span>
  </div>

</body>
</html>`
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Opens a dedicated print window for the given purchase order and triggers
 * the browser's print dialog. Falls back gracefully if the popup is blocked.
 *
 * @param {Object} po - Purchase order object from the PO Approvals data source
 */
export function printPOAsPdf(po) {
  const win = window.open('', '_blank', 'width=850,height=1100')

  if (!win) {
    throw new Error('Print window was blocked. Please allow pop-ups for this site and try again.')
  }

  win.document.write(buildPrintHTML(po))
  win.document.close()

  // Wait for resources (fonts, etc.) to load before triggering print
  win.onload = () => {
    win.focus()
    win.print()
    // Close the helper window after the user dismisses the print dialog
    win.onafterprint = () => win.close()
  }
}
