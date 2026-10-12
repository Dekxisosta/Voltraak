/**
 * Mock data for Manager PO Approvals page
 */

import { validateMockData } from '../validate'

export const mockPurchaseOrders = [
  { id: 1, po_number: 'PO-2024-0045', supplier: 'Samsung Philippines', total_amount: 519800, items_count: 5, requested_by: 'Inventory Staff', requested_at: '2024-08-14T09:00:00Z', status: 'pending', priority: 'high', notes: 'Urgent restock - 3 items out of stock' },
  { id: 2, po_number: 'PO-2024-0046', supplier: 'LG Electronics Manila', total_amount: 379800, items_count: 3, requested_by: 'Inventory Staff', requested_at: '2024-08-14T10:30:00Z', status: 'pending', priority: 'medium', notes: 'Regular restock cycle' },
  { id: 3, po_number: 'PO-2024-0044', supplier: 'Panasonic Distributor', total_amount: 650000, items_count: 8, requested_by: 'System (Auto-ROP)', requested_at: '2024-08-13T06:00:00Z', status: 'pending', priority: 'high', notes: 'Auto-generated from ROP calculation' },
  { id: 4, po_number: 'PO-2024-0043', supplier: 'Whirlpool Corp PH', total_amount: 120000, items_count: 4, requested_by: 'Inventory Staff', requested_at: '2024-08-12T14:00:00Z', status: 'approved', priority: 'low', notes: 'Standard restocking' },
  { id: 5, po_number: 'PO-2024-0042', supplier: 'Sharp Philippines', total_amount: 89000, items_count: 2, requested_by: 'Inventory Staff', requested_at: '2024-08-11T11:00:00Z', status: 'rejected', priority: 'low', notes: 'Duplicate order - already covered in PO-0040' },
  { id: 6, po_number: 'PO-2024-0041', supplier: 'Electrolux Asia', total_amount: 245000, items_count: 6, requested_by: 'System (Auto-ROP)', requested_at: '2024-08-10T06:00:00Z', status: 'approved', priority: 'medium', notes: 'Seasonal stock build-up' },
]

validateMockData('manager/po-approvals', mockPurchaseOrders)
