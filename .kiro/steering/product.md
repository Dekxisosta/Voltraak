# Product Overview

## Voltraak - Inventory Management System (IMS)

**Client:** WalangBrownout Appliances  
**Domain:** Real-time inventory management and FEFO-enforced batch tracking

### Problem Statement

WalangBrownout Appliances experienced 35% sales growth but declining profitability due to manual spreadsheet-based inventory management. The system addresses three critical problems:

1. **Summer Crunch** - No real-time sales velocity data causing reactive, panic-driven purchasing
2. **Mystery Shrinkage** - 73.33% shrinkage rate between recorded and physical stock
3. **Expiry Trap** - LIFO picking without batch tracking causing ₱15,000+ write-offs

### Core Features

- **Real-time Stock Tracking** - Every movement recorded, daily cycle counts, variance alerting
- **FEFO Enforcement** - First-Expired, First-Out picking with batch state machine
- **Demand Forecasting** - Automated Reorder Point calculation with seasonal adjustments
- **Role-Based Access** - Warehouse Staff, Inventory Staff, Manager with scoped permissions

### Success Metrics

- Inventory accuracy: 26.67% → ≥98%
- Shrinkage rate: 73.33% → <5%
- Expiry write-offs: ₱15,000/incident → Near-zero
- Stockout panic orders: Frequent → Eliminated

### Business Rules

- All stock movements must be transactional (no partial writes)
- FEFO picking is mandatory (system-enforced)
- Physical counts trigger automatic variance alerts at >5% discrepancy
- Batch expiry states: Safe → Warning (≤60 days) → Expired (locked from sale)
- Manager approval required for purchase orders generated from ROP calculations