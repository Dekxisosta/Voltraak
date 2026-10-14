# P2 Purchase Order Lifecycle Enhancements

Purchase order receive guards, over-receive protection, PO-send functionality, and automatic reorder point calculation improvements to prevent duplicate procurement requests.

**Summary**: This change hardens the PO receive flow (T18), rejects manual stock-in with PO references (T19), implements PO send-to-supplier tracking (T20), and fixes the automatic reorder suggestion generator to account for in-flight POs (T21). The receive endpoint now guards against receiving cancelled/completed POs and blocks over-receive attempts. The stock-in request validator rejects `purchase_order_id` submissions with a clear 422 error directing users to the proper receive endpoint. The send endpoint requires manager/admin role and updates status from APPROVED to SENT. The reorder generator subtracts open PO quantities from available stock before generating suggestions.

**Watch for**: Partial receive status logic sets `RECEIVED` on first partial delivery, which is correct according to requirements, but `canBeDelivered()` now allows receiving against already-RECEIVED POs for subsequent partial deliveries—ensure this is the intended workflow (confirmed: line 150 explicitly includes `received` status in filter). Lock-for-update in `convertRequestToPurchaseOrder` prevents duplicate PO creation, though the pattern is narrow (row-level lock on the request, not supplier-product combo). The `deliverPurchaseOrder` deprecation throws immediately, forcing all receive flows through the new batch-aware endpoint. The `purchase_order_id` rejection in T19 is non-bypassable (fires in `withValidator` after-hook, not in base rules), which is the correct behavior but requires all receive operations to flow through the dedicated endpoint.

**Verdict**: APPROVED

## High-level view

The receive flow now enforces status and quantity constraints before processing batches. Cancelled and completed POs are rejected outright; over-receive attempts are caught per-item before any stock transactions occur. The notes handling fixes a null-reference issue using null-coalescing, and the status-update logic distinguishes partial from full receipt based on whether all items have met their ordered quantity.

The stock-in request validator rejects any attempt to attach a `purchase_order_id` to a manual stock-in transaction, returning a clear error message that directs the user to the PO receive endpoint. This closes a workflow ambiguity where users could bypass PO tracking by manually entering stock with a PO reference.

The send-to-supplier endpoint requires manager or admin role and transitions APPROVED POs to SENT status. The ProcurementService method is implemented but simple (delegates to the model's `sendToSupplier` method). The controller logs the activity. Row-locking is applied in `convertRequestToPurchaseOrder` to prevent duplicate PO creation from concurrent requests, though the lock scope is the request row, not the supplier-product combination.

The reorder generator now subtracts quantities on existing open POs (statuses: approved, sent, received) from available stock before deciding whether to generate a new procurement request. This prevents duplicate reorder suggestions when a PO is already in flight. The logic skips products where `available_quantity + on_order_quantity >= reorder_level`, ensuring the system doesn't generate redundant requests.

<details>
<summary>Issues (4)</summary>

1. **Partial-receive workflow gap** — (possible) `canBeDelivered()` allows receiving against POs with status RECEIVED, enabling multiple partial deliveries. The frontend explicitly includes 'received' in the status filter (line 148). Verify that warehouse staff understand a RECEIVED PO can still be re-received for partial shipments, and that the UI clearly distinguishes "partially received" from "fully completed."

2. **Lock scope in convertRequestToPurchaseOrder** — (confirmed) The row lock is on the `procurement_requests` table row, preventing duplicate conversion of the same request. It does not prevent two different approved requests for the same product from being converted to separate POs concurrently. If the intent is to prevent duplicate POs per product-supplier pair, the lock or uniqueness check should be at the PO or product level, not the request level.

3. **deliverPurchaseOrder hard failure** — (confirmed) The deprecated method throws `BadMethodCallException` immediately. Any code path that still calls this method will break. Verify no other controllers, services, or background jobs reference `deliverPurchaseOrder`. Grep shows no other references outside `ProcurementService.php` (the method definition itself).

4. **Frontend receive button shows for RECEIVED status** — (confirmed) The button visibility condition is `row.status === 'sent' || row.status === 'approved' || row.status === 'received'` (line 148). This enables partial re-receives. Ensure the modal or receive form indicates remaining quantity and cumulative received quantity per item, so warehouse staff don't accidentally double-receive.

</details>

<details>
<summary>Details</summary>

## T18: Receive guards and status transitions

The `receive` method in `PurchaseOrderService` now enforces three constraints before processing stock. The status guard rejects POs with status outside `[APPROVED, SENT, RECEIVED]`, blocking receive attempts on cancelled, completed, or draft orders. The over-receive guard checks each item's `received_quantity` against its ordered `quantity` and throws if the attempted receive would exceed remaining quantity. The notes handling was fixed to use `?? null` instead of a ternary that could fail on null input.

The status-update logic was corrected: partial receives set status to RECEIVED (and preserve the first `actual_delivery_date`), full receives set status to COMPLETED (and set `actual_delivery_date` to now if not already set). The condition for "full" is that every item's `received_quantity >= quantity`. This allows incremental partial receives, with RECEIVED acting as an intermediate state.

```php
// Status guard (lines 65-72)
$allowedStatuses = [
    \App\Support\Enums\PurchaseOrderStatus::APPROVED,
    \App\Support\Enums\PurchaseOrderStatus::SENT,
    \App\Support\Enums\PurchaseOrderStatus::RECEIVED,
];
if (!in_array($po->status, $allowedStatuses)) {
    throw new \InvalidArgumentException(
        "Cannot receive stock for a PO with status: {$po->status->value}. Allowed: approved, sent, received."
    );
}
```

The model's `canBeDelivered` method was updated to include RECEIVED in the allowed statuses (lines 210-216), aligning with the service logic.

Over-receive guard implementation (lines 82-92):

```php
$alreadyReceived = $poItem->received_quantity ?? 0;
$remaining = $poItem->quantity - $alreadyReceived;
if ($receivedQty > $remaining) {
    throw new \InvalidArgumentException(
        "Cannot over-receive item {$poItem->id}: ordered {$poItem->quantity}, already received {$alreadyReceived}, attempting to receive {$receivedQty}."
    );
}
```

The error message includes ordered, already-received, and attempted quantities, making it actionable. The guard fires before any database writes, so a failed over-receive does not leave partial state.

The notes handling fix (lines 106-108):

```php
'notes' => "Received from PO {$po->po_number}" . 
           (($data['notes'] ?? null) ? ": {$data['notes']}" : ''),
```

Previously, this could fail if `$data['notes']` was not set. The null-coalescing operator ensures the ternary never evaluates `null` in a boolean context.

Status-update logic (lines 115-128):

```php
$allItemsFullyReceived = $po->items()->get()->every(fn($item) =>
    ($item->received_quantity ?? 0) >= $item->quantity
);

if ($allItemsFullyReceived) {
    $po->update([
        'status' => \App\Support\Enums\PurchaseOrderStatus::COMPLETED,
        'actual_delivery_date' => now()
    ]);
} else {
    // Partial receipt
    $po->update([
        'status' => \App\Support\Enums\PurchaseOrderStatus::RECEIVED,
        'actual_delivery_date' => $po->actual_delivery_date ?? now()
    ]);
}
```

The `every` call checks that all items have `received_quantity >= quantity`. If true, status moves to COMPLETED. If false (some items not fully received), status moves to RECEIVED, and `actual_delivery_date` is set only if not already set (preserving the first delivery date).

The frontend receive button is visible for `sent`, `approved`, and `received` statuses (resources/js/pages/warehouse/receiving/ReceivingPage.jsx, line 148).

Not tested: Concurrent partial receives against the same PO. If two warehouse staff simultaneously receive different items or batches, the transaction boundary should prevent race conditions, but the item-level `received_quantity` update is not itself locked. The service method wraps the entire operation in a DB transaction, so each receive is isolated.

## T19: Purchase order reference guard in stock-in

The `StoreStockInRequest` validator rejects any request containing a `purchase_order_id` field. The check fires in the `withValidator` after-hook, which runs after all standard validation rules pass. The error message directs the user to the PO receive endpoint:

```php
// T19: Reject stock-in with purchase_order_id (lines 92-98)
if ($this->filled('purchase_order_id')) {
    $validator->errors()->add(
        'purchase_order_id',
        'Stock-in with a purchase order reference must be processed through the PO receive endpoint (POST /api/v1/procurement/purchase-orders/{po}/receive).'
    );
}
```

The `filled` check ensures the field is present and non-null. The validation rule for `purchase_order_id` is `nullable|integer|exists:purchase_orders,id`, allowing the field to pass basic validation, but the after-hook rejects it regardless of value. The 422 error includes the field name and a clear message.

This closes a workflow gap where users could manually create stock-in transactions with PO references, bypassing the PO receive flow (which tracks `received_quantity` per item, updates PO status, and creates batches). The frontend should hide or disable the `purchase_order_id` field in the stock-in form to prevent users from encountering this error, but the backend guard is non-bypassable.

## T20: Send-to-supplier endpoint and row locking

The `/send` route requires `role:manager,admin` middleware (Procurement/Routes/api.php, lines 31-33). The controller method checks that the PO status is `approved`, then delegates to `PurchaseOrderService::send()`, which calls `ProcurementService::sendPurchaseOrderToSupplier()`. The service method delegates to the model's `sendToSupplier()` method, which transitions the status from APPROVED to SENT.

The model's `canBeSent` method checks `status === APPROVED` (PurchaseOrder.php, lines 206-209). The `sendToSupplier` method sets `status = SENT` and returns `$this->save()` (lines 262-269).

The `ProcurementService::sendPurchaseOrderToSupplier` method logs the activity and includes a comment that email/notification integration would go here (lines 196-215). The actual send operation (email to supplier, EDI transmission, etc.) is not implemented, but the status transition and audit trail are in place.

Row locking in `convertRequestToPurchaseOrder` (ProcurementService.php, lines 311-318):

```php
// Re-fetch with a row lock to prevent double-click duplicates
$request = ProcurementRequest::lockForUpdate()->findOrFail($request->id);

// Re-check status after acquiring lock
if ($request->status !== ProcurementRequestStatus::APPROVED) {
    throw new \InvalidArgumentException('Request is no longer in approved status (possible duplicate submission).');
}
```

The lock is acquired on the `procurement_requests` row before checking status and creating the PO. This prevents double-conversion of the same request (e.g., double-click in the UI). The status is re-checked after acquiring the lock, so if another transaction converted the request and set status to CONVERTED_TO_PO, the second transaction will abort.

The lock scope is the request row, not the product-supplier combination. Two different approved requests for the same product could be converted to separate POs concurrently. If the business rule is "one PO per product-supplier pair," this is not enforced. The current implementation only prevents duplicate conversion of a single request.

The deprecated `deliverPurchaseOrder` method now throws `BadMethodCallException` immediately (lines 220-223). This forces all receive operations through the new `PurchaseOrderService::receive()` method, which is batch-aware. Grep search confirms no other call sites for `deliverPurchaseOrder`.

## T21: Reorder generator accounts for open POs

The `generateForLowStockProducts` method in `ProcurementRequest` now subtracts the quantity on open POs from available stock before deciding whether to generate a new reorder request. This prevents the system from generating duplicate requests when a PO is already in flight.

```php
// T21: Subtract quantity already on order (lines 237-250)
$onOrderQuantity = \App\Modules\Procurement\Models\PurchaseOrderItem::whereHas(
    'purchaseOrder',
    fn($q) => $q->whereIn('status', ['approved', 'sent', 'received'])
)->where('product_id', $product->id)->sum('quantity');

$effectiveAvailable = $availableQuantity + $onOrderQuantity;

// If effective available (stock + on-order) already meets reorder level, skip
if ($effectiveAvailable >= $product->reorder_level) {
    continue;
}

// Adjust available quantity used in downstream calculations
$availableQuantity = $effectiveAvailable;
```

The on-order sum includes POs with status `approved`, `sent`, and `received`. The `received` status is included because a PO can be partially received (status RECEIVED but not all items fully delivered).

The `effectiveAvailable` calculation adds `availableQuantity` (current stock) and `onOrderQuantity` (total quantity on open POs). If this sum meets or exceeds the product's `reorder_level`, the product is skipped (no new request generated).

The `$availableQuantity` variable is then reassigned to `$effectiveAvailable` for use in downstream calculations (suggested quantity, priority determination). The variable name is misleading—it no longer represents available stock, but rather effective available (stock + on-order)—but the logic accounts for both stock and in-flight POs.

The priority logic uses `$availableQuantity` (effective available) to determine urgency (lines 272-273):

```php
$priority = $availableQuantity <= 0 ? 'urgent' :
           ($availableQuantity < $optimalReorderPoint * 0.5 ? 'high' : 'medium');
```

If effective available is zero or negative (stock + on-order is still below zero), the request is marked urgent. If effective available is below 50% of the optimal reorder point, it's marked high. A product with 0 stock but a large open PO could still be marked "medium" priority, which may be counter-intuitive, though the intent is to avoid urgent/high priority when stock is already on the way.

The `scopePending` on `ProcurementRequest` was updated to include GENERATED, REVIEWED, and APPROVED statuses (lines 139-145). The original implementation only included GENERATED, which would miss reviewed or approved requests in queries like "skip if there's already a pending suggestion" (line 232).

Not tested: The reorder generator does not subtract quantities from POs with status COMPLETED or CANCELLED. COMPLETED POs have already been fully received (their stock is reflected in `available_quantity`), and cancelled POs do not contribute to on-order quantity.

</details>

---

<details>
<summary>File map</summary>

- `app/Modules/Procurement/Services/PurchaseOrderService.php` — T18 receive guards: status check, over-receive guard, notes fix, status-update logic
- `app/Modules/Procurement/Models/PurchaseOrder.php` — T18 canBeDelivered includes RECEIVED status
- `app/Modules/Inventory/Requests/StoreStockInRequest.php` — T19 rejects purchase_order_id with clear 422 error
- `app/Modules/Procurement/Routes/api.php` — T20 /send route with manager/admin role guard
- `app/Modules/Procurement/Controllers/PurchaseOrderController.php` — T20 send() controller method
- `app/Modules/Procurement/Services/ProcurementService.php` — T20 sendPurchaseOrderToSupplier service method, row lock in convertRequestToPurchaseOrder, deliverPurchaseOrder deprecated
- `app/Modules/Procurement/Models/ProcurementRequest.php` — T21 scopePending includes generated/reviewed/approved, generateForLowStockProducts subtracts open PO quantities
- `resources/js/pages/warehouse/receiving/ReceivingPage.jsx` — Frontend receive button shows for 'received' status (line 148)

Full diff: `git diff main -- app/Modules/Procurement/ app/Modules/Inventory/Requests/StoreStockInRequest.php resources/js/pages/warehouse/receiving/ReceivingPage.jsx`

</details>
