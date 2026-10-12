/**
 * Mock data for Warehouse Picking page
 * Shape must match the fields read by PickingPage.jsx columns/filters:
 * task: id, order_number, customer_name, route, priority, status, due_time,
 *       items: [{ id, product_name, batch_number, quantity, bin_location, expiry_date, picked }]
 */

import { validateMockData } from '../validate'

export const mockPickingTasks = [
  {
    id: 1,
    order_number: 'ORD-2024-0112',
    customer_name: 'Juan Dela Cruz',
    route: 'Route A',
    priority: 'high',
    status: 'pending',
    due_time: '2024-08-16T14:00:00Z',
    items: [
      { id: 101, product_name: 'Samsung Refrigerator 21cu', batch_number: 'BATCH-2024-001', quantity: 1, bin_location: 'A-01-03', expiry_date: '2025-01-10', picked: false },
    ],
  },
  {
    id: 2,
    order_number: 'ORD-2024-0113',
    customer_name: 'Maria Santos',
    route: 'Route B',
    priority: 'medium',
    status: 'in_progress',
    due_time: '2024-08-16T15:30:00Z',
    items: [
      { id: 102, product_name: 'LG Washing Machine 8kg', batch_number: 'BATCH-2024-003', quantity: 2, bin_location: 'B-02-01', expiry_date: '2024-10-15', picked: true },
      { id: 103, product_name: 'Whirlpool Microwave 25L', batch_number: 'BATCH-2024-007', quantity: 1, bin_location: 'D-03-01', expiry_date: '2024-08-25', picked: false },
    ],
  },
  {
    id: 3,
    order_number: 'ORD-2024-0110',
    customer_name: 'Pedro Reyes',
    route: 'Route A',
    priority: 'low',
    status: 'in_progress',
    due_time: '2024-08-16T16:00:00Z',
    items: [
      { id: 104, product_name: 'Panasonic Air Conditioner 1.5HP', batch_number: 'BATCH-2024-005', quantity: 1, bin_location: 'C-01-02', expiry_date: '2024-09-20', picked: false },
    ],
  },
  {
    id: 4,
    order_number: 'ORD-2024-0108',
    customer_name: 'Ana Garcia',
    route: 'Route C',
    priority: 'medium',
    status: 'completed',
    due_time: '2024-08-15T12:00:00Z',
    items: [
      { id: 105, product_name: 'Whirlpool Microwave 25L', batch_number: 'BATCH-2024-007', quantity: 3, bin_location: 'D-03-01', expiry_date: '2024-08-25', picked: true },
    ],
  },
  {
    id: 5,
    order_number: 'ORD-2024-0115',
    customer_name: 'Jose Rizal',
    route: 'Route A',
    priority: 'high',
    status: 'pending',
    due_time: '2024-08-16T17:00:00Z',
    items: [
      { id: 106, product_name: 'Sharp Rice Cooker 1.8L', batch_number: 'BATCH-2024-002', quantity: 2, bin_location: 'A-02-04', expiry_date: '2024-08-20', picked: false },
    ],
  },
]

validateMockData('warehouse/picking', mockPickingTasks)
