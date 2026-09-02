/**
 * PO Print Service
 * Generates a formatted PDF printout for an approved purchase order.
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Builds and downloads a PDF for an approved purchase order.
 * @param {Object} po - Purchase order record from the data source
 */
export function printPOAsPdf(po) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = doc.internal.pageSize.getWidth()
  const margin = 20

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(30, 30, 30)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('VOLTRAAK', margin, 17)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(200, 200, 200)
  doc.text('Inventory Management System', margin, 23)

  // PO title (right-aligned in header)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text('PURCHASE ORDER', pageW - margin, 17, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(200, 200, 200)
  doc.text(po.po_number, pageW - margin, 23, { align: 'right' })

  // ── Approved stamp ────────────────────────────────────────────────────────
  const stampY = 35
  doc.setFillColor(220, 252, 231)      // light green bg
  doc.setDrawColor(34, 197, 94)        // green border
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, stampY, 55, 10, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(21, 128, 61)
  doc.text('✓  APPROVED', margin + 4, stampY + 6.5)

  // Print date (right side of stamp row)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(`Printed: ${new Date().toLocaleString()}`, pageW - margin, stampY + 6.5, { align: 'right' })

  // ── Section: PO Details ───────────────────────────────────────────────────
  const detailsY = 55

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text('Purchase Order Details', margin, detailsY)

  // Divider line under section title
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, detailsY + 2, pageW - margin, detailsY + 2)

  // Two-column info grid
  const col1X = margin
  const col2X = pageW / 2 + 5
  const rowH = 7
  let infoY = detailsY + 9

  const leftFields = [
    ['PO Number', po.po_number],
    ['Supplier', po.supplier],
    ['Requested By', po.requested_by],
    ['Date Requested', new Date(po.requested_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })],
  ]

  const rightFields = [
    ['Status', 'Approved'],
    ['Priority', po.priority.charAt(0).toUpperCase() + po.priority.slice(1)],
    ['Total Items', `${po.items_count} item${po.items_count !== 1 ? 's' : ''}`],
    ['Total Amount', `₱${po.total_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
  ]

  leftFields.forEach(([label, value], i) => {
    const y = infoY + i * rowH

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(label, col1X, y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(String(value), col1X, y + 4)
  })

  rightFields.forEach(([label, value], i) => {
    const y = infoY + i * rowH

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(label, col2X, y)

    // Highlight Total Amount value
    if (label === 'Total Amount') {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 30, 30)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(30, 30, 30)
    }
    doc.text(String(value), col2X, y + 4)
  })

  // ── Notes section ─────────────────────────────────────────────────────────
  const notesY = infoY + leftFields.length * rowH + 6

  if (po.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text('Notes', margin, notesY)

    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(margin, notesY + 2, pageW - margin, notesY + 2)

    doc.setFillColor(248, 249, 250)
    doc.roundedRect(margin, notesY + 4, pageW - margin * 2, 12, 2, 2, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.text(po.notes, margin + 4, notesY + 11, {
      maxWidth: pageW - margin * 2 - 8,
    })
  }

  // ── Items summary table ───────────────────────────────────────────────────
  const tableStartY = po.notes ? notesY + 22 : notesY

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text('Order Summary', margin, tableStartY)

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, tableStartY + 2, pageW - margin, tableStartY + 2)

  // Summary table row
  autoTable(doc, {
    startY: tableStartY + 6,
    margin: { left: margin, right: margin },
    head: [['Field', 'Value']],
    body: [
      ['PO Number', po.po_number],
      ['Supplier', po.supplier],
      ['Total Items', `${po.items_count} item${po.items_count !== 1 ? 's' : ''}`],
      ['Unit Price (avg)', `₱${(po.total_amount / po.items_count).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Total Amount', `₱${po.total_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ],
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 'auto' },
    },
    // Bold the total row
    didParseCell(data) {
      if (data.row.index === 4 && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fontSize = 10
      }
    },
  })

  // ── Approval signatures section ───────────────────────────────────────────
  const sigY = doc.lastAutoTable.finalY + 16

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text('Approvals & Signatures', margin, sigY)

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, sigY + 2, pageW - margin, sigY + 2)

  const sigBoxW = (pageW - margin * 2 - 10) / 2
  const sigBoxH = 24
  const sigBoxY = sigY + 8

  // Left box: Requested By
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.rect(margin, sigBoxY, sigBoxW, sigBoxH)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Requested By', margin + 4, sigBoxY + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  doc.text(po.requested_by, margin + 4, sigBoxY + 13)

  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.3)
  doc.line(margin + 4, sigBoxY + sigBoxH - 4, margin + sigBoxW - 4, sigBoxY + sigBoxH - 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(130, 130, 130)
  doc.text('Signature / Date', margin + 4, sigBoxY + sigBoxH - 1)

  // Right box: Approved By
  const rightBoxX = margin + sigBoxW + 10
  doc.setDrawColor(34, 197, 94)
  doc.setLineWidth(0.5)
  doc.rect(rightBoxX, sigBoxY, sigBoxW, sigBoxH)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(21, 128, 61)
  doc.text('Approved By (Manager)', rightBoxX + 4, sigBoxY + 5)

  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.3)
  doc.line(rightBoxX + 4, sigBoxY + sigBoxH - 4, rightBoxX + sigBoxW - 4, sigBoxY + sigBoxH - 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(130, 130, 130)
  doc.text('Signature / Date', rightBoxX + 4, sigBoxY + sigBoxH - 1)

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 12

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 3, pageW - margin, footerY - 3)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(130, 130, 130)
  doc.text('This is a system-generated purchase order printout from Voltraak IMS.', margin, footerY)
  doc.text(`Page 1 of 1  ·  ${po.po_number}`, pageW - margin, footerY, { align: 'right' })

  // ── Save ──────────────────────────────────────────────────────────────────
  doc.save(`${po.po_number}-approved.pdf`)
}
