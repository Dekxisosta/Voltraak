/**
 * Adapters between the inventory-staff pages (damage reports, discrepancies,
 * expiry alerts) and the Inventory API.
 *
 * The pages work with flat, display-oriented records (the same shape as their
 * mock datasets). The backend answers with the Laravel envelope
 * { success, message, data } and uses its own field names, enum values and
 * ids, so everything is translated here, in one place, in both directions.
 */

import { inventoryApi } from './inventory'
import { ApiError } from './client'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Pull the list out of { success, data: [...] } (or a bare array). */
export function unwrapList(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.data)) return response.data.data
  return []
}

/** Pull the record out of { success, data: {...} }. */
export function unwrapItem(response) {
  return response?.data ?? response
}

/** Best human-readable message for a failed request. */
export function describeError(error, fallback) {
  const errors = error?.errors
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat().find(Boolean)
    if (first) return String(first)
  }
  return error?.message || fallback
}

function validationError(field, message) {
  return new ApiError(422, message, { [field]: [message] })
}

/**
 * The pages identify a product by free text (SKU or name); the API needs ids.
 * Exact SKU wins, then exact name, then a single unambiguous search hit.
 */
async function resolveProduct(term, field = 'product') {
  const text = String(term || '').trim()
  if (!text) throw validationError(field, 'A product SKU or name is required')

  const products = unwrapList(await inventoryApi.getProducts({ search: text, per_page: 25 }))
  const needle = text.toLowerCase()

  const match =
    products.find(p => String(p.sku || '').toLowerCase() === needle) ||
    products.find(p => String(p.name || '').toLowerCase() === needle) ||
    (products.length === 1 ? products[0] : null)

  if (!match) {
    throw validationError(
      field,
      products.length > 1
        ? `"${text}" matches several products - enter the exact SKU`
        : `No product matches "${text}" - enter an existing SKU or product name`
    )
  }
  return match
}

function resolveBatch(product, batchNumber) {
  const text = String(batchNumber || '').trim()
  if (!text) return null

  const batch = (product.batches || []).find(
    b => String(b.batch_number || '').toLowerCase() === text.toLowerCase()
  )
  if (!batch) {
    throw validationError('batch_number', `Batch "${text}" was not found for ${product.name}`)
  }
  return batch
}

// ---------------------------------------------------------------------------
// Damage reports
// ---------------------------------------------------------------------------

export const DAMAGE_TYPE_OPTIONS = [
  { label: 'Physical Damage', value: 'physical' },
  { label: 'Water Damage', value: 'water' },
  { label: 'Expired', value: 'expired' },
  { label: 'Theft/Missing', value: 'theft' },
  { label: 'Other', value: 'other' },
]

const damageLabelToValue = Object.fromEntries(DAMAGE_TYPE_OPTIONS.map(o => [o.label, o.value]))
const damageValueToLabel = Object.fromEntries(DAMAGE_TYPE_OPTIONS.map(o => [o.value, o.label]))

/**
 * Backend statuses: reported -> investigated -> approved / written_off.
 * Page statuses:    pending_review -> under_investigation -> investigated
 *                   -> written_off | rejected.
 * (A rejection leaves the backend status at "investigated"; is_rejected says so.)
 */
function damageStatus(r) {
  switch (r.status) {
    case 'reported':
      return r.investigated_by ? 'under_investigation' : 'pending_review'
    case 'investigated':
      return r.is_rejected ? 'rejected' : 'investigated'
    case 'approved':
    case 'written_off':
      return 'written_off'
    default:
      return r.status
  }
}

export function mapDamageReport(r) {
  return {
    id: r.id,
    product_id: r.product_id,
    product_name: r.product_name || '—',
    sku: r.product_sku || '',
    batch_id: r.batch_id,
    batch_number: r.batch_number || '—',
    damage_type: r.damage_type_display || damageValueToLabel[r.damage_type] || r.damage_type,
    severity: r.severity || 'minor',
    quantity_affected: Number(r.quantity_damaged) || 0,
    reported_by: r.reporter?.name || '',
    reported_at: r.reported_at,
    status: damageStatus(r),
    notes: r.description || '',
    investigation_notes: r.investigation_notes || '',
    action_taken: r.action_taken || '',
    investigated_by: r.investigated_by ?? null,
  }
}

function damageDescription(form) {
  return (form.notes || '').trim() || `${form.damage_type} (${form.severity || 'minor'})`
}

/** createResourceDataSource() client for the damage report page. */
export const damageReportApi = {
  async list() {
    const res = await inventoryApi.getDamageReports({ per_page: 100 })
    return unwrapList(res).map(mapDamageReport)
  },

  async create(form) {
    const product = await resolveProduct(form.sku || form.product_name)
    const batch = resolveBatch(product, form.batch_number)

    const res = await inventoryApi.createDamageReport({
      product_id: product.id,
      batch_id: batch?.id ?? null,
      quantity_damaged: Number(form.quantity_affected),
      damage_type: damageLabelToValue[form.damage_type] || 'other',
      severity: form.severity || 'minor',
      description: damageDescription(form),
    })
    return mapDamageReport(unwrapItem(res))
  },

  // Product and batch cannot be changed on an existing report.
  async update(id, patch) {
    const body = {}
    if (patch.quantity_affected !== undefined) body.quantity_damaged = Number(patch.quantity_affected)
    if (patch.damage_type !== undefined) body.damage_type = damageLabelToValue[patch.damage_type] || 'other'
    if (patch.severity !== undefined) body.severity = patch.severity
    if (patch.notes !== undefined) body.description = damageDescription(patch)

    return inventoryApi.updateDamageReport(id, body)
  },

  remove: (id) => inventoryApi.deleteDamageReport(id),
}

// ---------------------------------------------------------------------------
// Discrepancy reports
// ---------------------------------------------------------------------------

export function mapDiscrepancy(r) {
  return {
    ...r,
    report_number: r.report_number || `DISC-${r.id}`,
    product_name: r.product_name || '—',
    product_sku: r.product_sku || '',
    expected_quantity: Number(r.expected_quantity) || 0,
    actual_quantity: Number(r.actual_quantity) || 0,
    variance: Number(r.variance) || 0,
    variance_percentage: Number(r.variance_percentage) || 0,
    write_off_amount: r.write_off_amount == null ? null : Number(r.write_off_amount),
    location: r.location || '—',
    reported_by: r.reported_by || '',
    // "closed" is a finished report as far as the page's lanes go
    status: r.status === 'closed' ? 'resolved' : r.status,
  }
}

/** createResourceDataSource() client for the inventory discrepancies page. */
export const discrepancyApi = {
  async list() {
    const res = await inventoryApi.getDiscrepancyReports({ per_page: 100 })
    return unwrapList(res).map(mapDiscrepancy)
  },

  async create(record) {
    const product = await resolveProduct(record.product_sku || record.product_name)

    const res = await inventoryApi.createDiscrepancyReport({
      product_id: product.id,
      expected_quantity: Number(record.expected_quantity),
      actual_quantity: Number(record.actual_quantity),
      discrepancy_type: record.discrepancy_type,
      location: record.location || null,
      notes: (record.notes || '').trim() || null,
    })
    return mapDiscrepancy(unwrapItem(res))
  },

  async update(id, patch) {
    if (patch.status) {
      return inventoryApi.updateDiscrepancyStatus(id, { status: patch.status })
    }
    if (patch.approval_status === 'pending') {
      return inventoryApi.sendDiscrepancyForApproval(id)
    }
    throw new Error('Unsupported discrepancy update')
  },
}

// ---------------------------------------------------------------------------
// Products (item update page)
// ---------------------------------------------------------------------------

/**
 * Backend product -> page row. The page was built around the mock dataset
 * (current_stock / available_stock / reorder_point / last_updated); the API
 * uses quantity / available_quantity / reorder_level / updated_at, and sends
 * unit_price as a decimal string.
 */
export function mapProduct(p) {
  const stock = Number(p.quantity) || 0
  return {
    id: p.id,
    name: p.name || '',
    sku: p.sku || '',
    category: p.category || '',
    unit_price: Number(p.unit_price) || 0,
    current_stock: stock,
    available_stock: p.available_quantity == null ? stock : Number(p.available_quantity) || 0,
    reorder_point: Number(p.reorder_level) || 0,
    is_active: Boolean(p.is_active),
    last_updated: p.updated_at ? String(p.updated_at).slice(0, 10) : '',
  }
}

/** Page form values -> API body. Stock is deliberately left out: it is read-only here. */
function productBody(form) {
  const body = {}
  if (form.name !== undefined) body.name = form.name
  if (form.sku !== undefined) body.sku = form.sku
  if (form.category !== undefined) body.category = form.category
  if (form.unit_price !== undefined) body.unit_price = Number(form.unit_price)
  if (form.reorder_point !== undefined) body.reorder_level = Number(form.reorder_point)
  if (form.is_active !== undefined) body.is_active = Boolean(form.is_active)
  return body
}

/**
 * Field names the API reports in validation errors -> the page's form fields.
 * Used by the page to show server-side errors next to the right input.
 */
export const PRODUCT_ERROR_FIELDS = { reorder_level: 'reorder_point' }

/** createResourceDataSource() client for the item update page. */
export const productApi = {
  async list() {
    const res = await inventoryApi.getProducts({ per_page: 500 })
    return unwrapList(res).map(mapProduct)
  },

  async create(form) {
    const res = await inventoryApi.createProduct(productBody(form))
    return mapProduct(unwrapItem(res))
  },

  async update(id, patch) {
    const res = await inventoryApi.updateProduct(id, productBody(patch))
    return mapProduct(unwrapItem(res))
  },

  remove: (id) => inventoryApi.deleteProduct(id),
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

/**
 * Backend reservation -> page row. Stored statuses are
 * pending / confirmed / allocated / fulfilled / cancelled; the page shows a
 * still-held reservation as "active", or "expired" once past its expiry.
 */
export function mapReservation(r) {
  let status = r.status
  if (['pending', 'confirmed', 'allocated'].includes(r.status)) {
    status = r.is_expired ? 'expired' : 'active'
  }

  return {
    id: r.id,
    customer_order_id: r.customer_order_id,
    order_status: r.order_status || '',
    order_number: r.order_number || `#${r.customer_order_id}`,
    customer_name: r.customer_name || '—',
    product_id: r.product_id,
    product_name: r.product_name || '—',
    batch_number: r.batch_number || '',
    quantity: Number(r.quantity) || 0,
    reserved_at: r.reserved_at || null,
    expires_at: r.expires_at || null,
    status,
    can_fulfill: Boolean(r.can_fulfill),
    can_cancel: Boolean(r.can_cancel),
  }
}

/** createResourceDataSource() client for the reservations page. */
export const reservationApi = {
  async list() {
    const res = await inventoryApi.getReservations({ per_page: 500 })
    return unwrapList(res).map(mapReservation)
  },

  /**
   * - { status: 'cancelled' } releases this reservation.
   * - { status: 'fulfilled', customer_order_id } fulfils the reservation's
   *   customer order: stock is issued for every allocated reservation on it
   *   (the backend fulfils whole orders, never a single line).
   */
  async update(id, patch) {
    if (patch.status === 'cancelled') {
      const res = await inventoryApi.cancelReservation(id)
      return mapReservation(unwrapItem(res))
    }
    if (patch.status === 'fulfilled') {
      if (!patch.customer_order_id) {
        throw validationError('customer_order_id', 'The reservation has no customer order to fulfil')
      }
      return inventoryApi.fulfillCustomerOrder(patch.customer_order_id, {})
    }
    throw new Error('Unsupported reservation update')
  },
}

// ---------------------------------------------------------------------------
// Expiry alerts (batches)
// ---------------------------------------------------------------------------

/**
 * Backend batch -> page row. The page buckets batches as
 * expired / warning (<= 60 days) / safe, and shows an expired batch whose
 * stock has been written off as "written_off".
 */
export function mapExpiryBatch(b) {
  const info = b.expiry_info || {}
  const quantity = Number(b.quantity) || 0

  let status
  switch (info.expiry_status) {
    case 'expired':
      status = quantity > 0 ? 'expired' : 'written_off'
      break
    case 'critical':
    case 'warning':
      status = 'warning'
      break
    default:
      status = 'safe'
  }

  return {
    id: b.id,
    product_id: b.product_id,
    product_name: b.product?.name || '—',
    batch_number: b.batch_number,
    quantity,
    expiry_date: b.expiry_date ? String(b.expiry_date).slice(0, 10) : '',
    days_to_expiry: info.days_to_expire == null ? 0 : Math.trunc(Number(info.days_to_expire)),
    status,
    prioritized: Boolean(b.is_prioritized),
  }
}

/** createResourceDataSource() client for the expiry alerts page. */
export const expiryAlertsApi = {
  async list() {
    const res = await inventoryApi.getBatches({ per_page: 500 })
    return unwrapList(res)
      // Only batches that can raise an alert: they have an expiry date, and
      // either still hold stock or were expired and written off.
      .filter(b => b.expiry_date && b.expiry_info?.expiry_status !== 'no_expiry')
      .map(mapExpiryBatch)
      .filter(b => b.quantity > 0 || b.status === 'written_off')
  },

  // Flagging a batch for priority picking. Writing a batch off is a separate
  // action (inventoryApi.markBatchExpired) and must never be triggered here.
  async update(id, patch) {
    if (patch.prioritized) return inventoryApi.prioritizeBatch(id)
    throw new Error('Unsupported expiry alert update')
  },
}

// ---------------------------------------------------------------------------
// Paging
// ---------------------------------------------------------------------------

/**
 * The list endpoints return a plain array for the requested page (the
 * pagination meta is not part of the payload), so keep asking for the next
 * page until one comes back short.
 */
async function fetchAllPages(fetchPage, pageSize = 100, maxPages = 20) {
  const rows = []
  for (let page = 1; page <= maxPages; page++) {
    const chunk = unwrapList(await fetchPage({ per_page: pageSize, page }))
    rows.push(...chunk)
    if (chunk.length < pageSize) break
  }
  return rows
}

// ---------------------------------------------------------------------------
// Stock In / Out (stock transactions)
// ---------------------------------------------------------------------------

/**
 * The ledger stores in / out / return / adjustment / transfer. The page only
 * knows stock_in and stock_out, so each row is shown by the direction it moved
 * stock: returns add, adjustments follow their sign, transfers move nothing
 * (null -> not listed).
 */
function movementDirection(t) {
  switch (t.type) {
    case 'in':
    case 'return':
      return 'stock_in'
    case 'out':
      return 'stock_out'
    case 'adjustment':
      return Number(t.quantity) < 0 ? 'stock_out' : 'stock_in'
    default:
      return null
  }
}

// Receipts/issues made by other screens carry a typed reference, not a reason.
const REFERENCE_REASONS = {
  purchase_order: 'Purchase Order Receipt',
  customer_order: 'Customer Order',
  damage_report: 'Damage Adjustment',
  physical_count: 'Physical Count Adjustment',
}

/** Backend stock transaction -> row of the Stock In/Out table. */
export function mapStockTransaction(t) {
  const type = movementDirection(t)
  const code = type === 'stock_out' ? 'OUT' : 'IN'

  return {
    id: t.id,
    transaction_number: `TXN-${code}-${String(t.id).padStart(5, '0')}`,
    type,
    product_id: t.product_id,
    product_name: t.product?.name || '—',
    product_sku: t.product?.sku || '',
    batch_number: t.batch?.batch_number || '',
    // The table prints the sign itself from `type`, so keep the magnitude.
    quantity: Math.abs(Number(t.quantity)) || 0,
    reference_number: t.reference_number || t.reference_info?.display_reference || '',
    reason: t.reason || t.context?.adjustment_reason || REFERENCE_REASONS[t.reference_type] || '',
    performed_by: t.user?.name || '',
    notes: t.notes || '',
    created_at: t.created_at,
  }
}

/** Active products shaped for the product / batch pickers of the Stock In/Out form. */
export function mapProductOption(p) {
  return {
    id: p.id,
    name: p.name || '—',
    sku: p.sku || '',
    unit_price: Number(p.unit_price) || 0,
    quantity: Number(p.quantity) || 0,
    available_quantity: Number(p.available_quantity) || 0,
    is_active: p.is_active !== false,
    // Stock cannot be received into an expired batch (the API refuses it).
    batches: (p.batches || [])
      .filter(b => b.status !== 'expired')
      .map(b => ({
        id: b.id,
        batch_number: b.batch_number,
        expiry_date: b.expiry_date ? String(b.expiry_date).slice(0, 10) : '',
        quantity: Number(b.quantity) || 0,
      }))
      .sort((a, b) => (a.expiry_date || '9999').localeCompare(b.expiry_date || '9999')),
  }
}

/** createResourceDataSource() client for the Stock In/Out page. */
export const stockTransactionsApi = {
  async list() {
    const res = await inventoryApi.getStockTransactions({ per_page: 100 })
    return unwrapList(res).map(mapStockTransaction).filter(row => row.type)
  },

  /**
   * @param {Object} form - the page's form state:
   *   { type, product_id, quantity, unit_cost, batch_choice ('new' | batch id),
   *     batch_number, manufacture_date, expiry_date, reference_number, reason, notes }
   * @returns {Promise<Array>} the rows that were created (a stock-out can span batches)
   */
  async create(form) {
    if (!form.product_id) throw validationError('product_id', 'Select a product')

    const quantity = Number(form.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw validationError('quantity', 'Quantity must be a whole number of at least 1')
    }

    const base = {
      product_id: Number(form.product_id),
      quantity,
      reference_number: String(form.reference_number || '').trim() || null,
      reason: form.reason || null,
      notes: String(form.notes || '').trim() || null,
    }

    if (form.type === 'stock_out') {
      const res = await inventoryApi.stockOut(base)
      return unwrapList(res).map(mapStockTransaction)
    }

    const unitCost = Number(form.unit_cost)
    if (form.unit_cost === '' || form.unit_cost == null || !Number.isFinite(unitCost) || unitCost < 0) {
      throw validationError('unit_cost', 'Enter the unit cost (0 or more)')
    }

    const payload = { ...base, unit_cost: unitCost }

    if (form.batch_choice === 'new') {
      Object.assign(payload, {
        create_batch: true,
        batch_number: String(form.batch_number || '').trim(),
        manufacture_date: form.manufacture_date,
        expiry_date: form.expiry_date || null,
      })
    } else if (form.batch_choice) {
      Object.assign(payload, { create_batch: false, batch_id: Number(form.batch_choice) })
    } else {
      throw validationError('batch_id', 'Select a batch or create a new one')
    }

    const res = await inventoryApi.stockIn(payload)
    return [mapStockTransaction(unwrapItem(res))]
  },
}

/** Product + batch options for the Stock In/Out form. */
export const stockProductsApi = {
  async list() {
    const rows = await fetchAllPages(params => inventoryApi.getProducts(params))
    return rows
      .map(mapProductOption)
      .filter(p => p.is_active)
      .sort((a, b) => a.name.localeCompare(b.name))
  },
}

// ---------------------------------------------------------------------------
// Stock levels (products)
// ---------------------------------------------------------------------------

const TURNOVER_WINDOW_DAYS = 90

/** Signed effect of one ledger row on the product's quantity. */
function ledgerImpact(t) {
  const q = Number(t.quantity) || 0
  switch (t.type) {
    case 'in':
    case 'return':
      return q
    case 'out':
      return -q
    case 'adjustment': // already signed
      return q
    default: // transfers move nothing
      return 0
  }
}

/**
 * Annualised turnover: units issued over the trailing window, scaled to a
 * year, over the average stock held in that window (opening stock is worked
 * back from today's quantity and the window's net movement).
 */
function turnoverRate(product, current) {
  const since = Date.now() - TURNOVER_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const recent = (product.stock_transactions || []).filter(t => {
    const at = new Date(t.created_at).getTime()
    return Number.isFinite(at) && at >= since
  })

  const unitsOut = recent
    .filter(t => t.type === 'out')
    .reduce((sum, t) => sum + (Number(t.quantity) || 0), 0)
  if (unitsOut <= 0) return 0

  const net = recent.reduce((sum, t) => sum + ledgerImpact(t), 0)
  const opening = Math.max(0, current - net)
  const average = (opening + current) / 2
  if (average <= 0) return 0

  const annualUnits = unitsOut * (365 / TURNOVER_WINDOW_DAYS)
  return Math.round((annualUnits / average) * 10) / 10
}

function lastRestockDate(product) {
  const received = (product.stock_transactions || [])
    .filter(t => t.type === 'in' && t.created_at)
    .map(t => t.created_at)
    .sort()
  if (received.length) return received[received.length - 1]

  // Never received through the ledger (e.g. seeded): fall back to the newest batch.
  const batches = (product.batches || []).filter(b => b.created_at).map(b => b.created_at).sort()
  return batches.length ? batches[batches.length - 1] : null
}

/**
 * Backend product -> row of the Stock Levels table.
 *
 * The API has no minimum-stock or maximum-stock-when-unset values, so the
 * same rules as the low-stock report are used: minimum is half the reorder
 * point, and the ceiling falls back to twice the reorder point.
 */
export function mapStockLevel(p) {
  const current = Math.max(0, Number(p.quantity) || 0)
  const reorder = Math.max(0, Number(p.reorder_level) || 0)
  const minimum = Math.floor(reorder / 2)
  const maximum = Number(p.max_stock_level) > 0
    ? Number(p.max_stock_level)
    : Math.max(reorder * 2, current, 1)

  // available_quantity is quantity less active reservations
  const available = Math.min(current, Math.max(0, Number(p.available_quantity) || 0))

  let status = 'ok'
  if (current <= 0) status = 'out_of_stock'
  else if (current <= minimum) status = 'critical'
  else if (current <= reorder) status = 'warning'

  const totalValue = Number(p.total_value)

  return {
    id: p.id,
    product_id: p.id,
    product_name: p.name || '—',
    product_sku: p.sku || '',
    category: p.category || 'Uncategorized',
    location: p.storage_bin || '—',
    current_stock: current,
    available_stock: available,
    reserved_stock: current - available,
    minimum_stock: minimum,
    reorder_point: reorder,
    maximum_stock: maximum,
    status,
    total_value: Number.isFinite(totalValue) ? totalValue : current * (Number(p.unit_price) || 0),
    turnover_rate: turnoverRate(p, current),
    last_restock_date: lastRestockDate(p),
  }
}

/** Fetch function for the Stock Levels page (one row per active product). */
export const stockLevelsApi = {
  async list() {
    const rows = await fetchAllPages(params => inventoryApi.getProducts(params))
    return rows
      .filter(p => p.is_active !== false)
      .map(mapStockLevel)
      .sort((a, b) => a.product_name.localeCompare(b.product_name))
  },
}

// ---------------------------------------------------------------------------
// FEFO recommendations (warehouse FEFO page)
// ---------------------------------------------------------------------------

const FEFO_URGENCY = ['critical', 'warning', 'safe']
const FEFO_ACTIONS = ['immediate_sale', 'priority_sale', 'normal_rotation']

/** Backend FEFO row -> page row (numbers coerced, enums kept to the page's set). */
export function mapFefoRecommendation(r) {
  const urgency = FEFO_URGENCY.includes(r.urgency_level) ? r.urgency_level : 'safe'
  return {
    id: r.id ?? r.batch_id,
    product_id: r.product_id,
    batch_number: r.batch_number || '—',
    product_name: r.product_name || '—',
    product_sku: r.product_sku || '',
    quantity_available: Number(r.quantity_available) || 0,
    bin_location: r.bin_location || '',
    expiry_date: r.expiry_date ? String(r.expiry_date).slice(0, 10) : '',
    urgency_level: urgency,
    days_until_expiry: Math.trunc(Number(r.days_until_expiry)) || 0,
    total_value: Number(r.total_value) || 0,
    recommended_action: FEFO_ACTIONS.includes(r.recommended_action) ? r.recommended_action : 'normal_rotation',
    notes: r.notes || '',
  }
}

/** API client for the warehouse FEFO page. */
export const fefoApi = {
  async list() {
    const res = await inventoryApi.getFEFORecommendations({ limit: 500 })
    return unwrapList(res).map(mapFefoRecommendation)
  },

  /**
   * Warehouse staff cannot write stock off, so "mark for disposal" raises an
   * expired-stock damage report for the batch. Inventory / the manager review
   * it, and stock only moves once the manager approves.
   */
  async flagForDisposal(row) {
    const res = await inventoryApi.createDamageReport({
      product_id: row.product_id,
      batch_id: row.id,
      quantity_damaged: Math.max(1, Number(row.quantity_available) || 1),
      damage_type: 'expired',
      severity: row.urgency_level === 'critical' ? 'moderate' : 'minor',
      description: `Flagged for disposal review from FEFO: batch ${row.batch_number} expires ${row.expiry_date} (${row.days_until_expiry} days)`,
    })
    return unwrapItem(res)
  },
}
