/**
 * Mock data for Warehouse Receiving page
 */

export const mockPurchaseOrders = [
  {
    id: 1,
    po_number: 'PO-2024-001',
    supplier: { id: 1, name: 'ABC Electronics', contact_person: 'John Doe' },
    total_amount: 15000,
    status: 'approved',
    expected_delivery: '2024-08-15',
    items: [
      { id: 1, product_name: 'Washing Machine WM-100', quantity_ordered: 5, quantity_received: 0, unit_price: 25000 },
      { id: 2, product_name: 'Refrigerator RF-200', quantity_ordered: 3, quantity_received: 0, unit_price: 35000 },
    ],
    created_at: '2024-08-10T10:00:00Z',
    updated_at: '2024-08-10T10:00:00Z',
  },
  {
    id: 2,
    po_number: 'PO-2024-002',
    supplier: { id: 2, name: 'XYZ Supplies', contact_person: 'Jane Smith' },
    total_amount: 8500,
    status: 'shipped',
    expected_delivery: '2024-08-12',
    items: [
      { id: 3, product_name: 'Air Conditioner AC-300', quantity_ordered: 2, quantity_received: 0, unit_price: 42500 },
    ],
    created_at: '2024-08-08T14:30:00Z',
    updated_at: '2024-08-11T09:15:00Z',
  },
]
