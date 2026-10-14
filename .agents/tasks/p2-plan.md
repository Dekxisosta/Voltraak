# Implementation Plan: P2 - Purchase Order Workflow Completion (T18–T21)

This plan addresses four critical issues in the PO workflow: missing guards in the receive endpoint, duplicate stock-in entry points, incomplete PO lifecycle, and duplicate reorder suggestions.

## Task T18: PO receive has no guards

- [ ] 1. Add status validation to PurchaseOrderService::receive method
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Procurement\Services\PurchaseOrderService.php`
      - At the beginning of the receive() method (line ~48), add status validation: if status is not in ['approved', 'sent', 'received'], throw new \InvalidArgumentException with a 422-appropriate message "Purchase order cannot be received in current status: {$status}. Must be approved, sent, or partially received."
      - The controller (PurchaseOrderController::receive) will catch this and return errorResponse with 422
      Verify: Run PHPUnit tests for PurchaseOrderService if they exist: `php artisan test --filter PurchaseOrderService`, or manually test via API: POST /api/v1/procurement/purchase-orders/{id}/receive with a cancelled PO should return 422

- [ ] 2. Add quantity cap validation to prevent over-receiving
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Procurement\Services\PurchaseOrderService.php`
      - In the receive() method, inside the foreach loop at line ~52 (after `$poItem = $po->items()->findOrFail(...)`), before updating received_quantity:
        * Calculate `$newReceivedQty = ($poItem->received_quantity ?? 0) + $receivedQty`
        * If `$newReceivedQty > $poItem->quantity`, throw new \InvalidArgumentException: "Cannot receive {$receivedQty} units of {$poItem->product->name}. This would exceed ordered quantity ({$poItem->quantity} ordered, {$poItem->received_quantity ?? 0} already received)."
      Verify: Run PHPUnit tests or manually test: attempt to receive more than ordered quantity via API, should return 422

- [ ] 3. Validate batch quantities match quantity_received
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Procurement\Services\PurchaseOrderService.php`
      - In the receive() method, after line ~51 where `$receivedQty = $itemData['quantity_received']` is set:
        * Calculate `$batchTotalQty = array_sum(array_column($itemData['batches'], 'quantity'))`
        * If `$batchTotalQty !== $receivedQty`, throw new \InvalidArgumentException: "Batch quantities ({$batchTotalQty}) do not match received quantity ({$receivedQty}) for item {$poItem->product->name}."
      Verify: Run PHPUnit tests or manually test: send mismatched batch totals via API, should return 422

- [ ] 4. Handle missing 'notes' key safely
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Procurement\Services\PurchaseOrderService.php`
      - At line ~68, the notes construction is: `'notes' => "Received from PO {$po->po_number}" . (isset($data['notes']) && $data['notes'] ? ": {$data['notes']}" : '')`
      - This is already safe (uses isset). Verify no other references to $data['notes'] exist without null coalescing.
      Verify: Code review only; no additional test needed if already safe

- [ ] 5. Fix partial vs full receipt status logic
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Procurement\Services\PurchaseOrderService.php`
      - The logic at lines ~78-93 already sets COMPLETED when all items are fully received, and RECEIVED for partial receipt. Verify this is consistent:
        * Line ~79: `$allItemsFullyReceived = $po->items()->whereColumn('received_quantity', '>=', 'quantity')->count() === $po->items()->count();`
        * If true → COMPLETED (line ~81-84), else → RECEIVED (line ~87-90)
      - This logic is correct. No change needed unless edge cases are found during testing.
      Verify: Run integration test: receive partial quantity, verify status = RECEIVED; receive remaining quantity, verify status = COMPLETED

- [ ] 6. Update frontend ReceivingPage to show receive button for 'received' status
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\resources\js\pages\warehouse\receiving\ReceivingPage.jsx`
      - Line 28: change filter from `status: 'sent,approved'` to `status: 'sent,approved,received'`
      - Line 116: change condition from `{(row.status === 'sent' || row.status === 'approved') &&` to `{(row.status === 'sent' || row.status === 'approved' || row.status === 'received') &&`
      Verify: Run frontend: `npm run dev`, navigate to Receiving page, verify that POs with status 'received' (partial receipt) show the "Confirm Receipt" button

## Task T19: Two entry points for one delivery

- [ ] 7. Add purchase_order_id to StoreStockInRequest validation rules
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Inventory\Requests\StoreStockInRequest.php`
      - At line ~29 in rules() method, add: `'purchase_order_id' => 'nullable|exists:purchase_orders,id',`
      Verify: Code review; validation rule is in place

- [ ] 8. Reject stock-in requests with purchase_order_id in withValidator hook
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Inventory\Requests\StoreStockInRequest.php`
      - In withValidator() method (starts at line ~105), add a new validation block after the first `if ($this->product_id)` block (around line ~108):
        ```php
        // Reject stock-in with purchase_order_id - must use PO receive endpoint
        if ($this->purchase_order_id) {
            $validator->errors()->add(
                'purchase_order_id',
                'Stock-in with a purchase order reference must be processed through the PO receive endpoint (POST /api/v1/procurement/purchase-orders/{po}/receive).'
            );
        }
        ```
      Verify: Run PHPUnit tests or manually test: POST /api/v1/inventory/stock-transactions/in with `purchase_order_id` should return 422 with error message directing to PO receive endpoint

## Task T20: PO lifecycle is incomplete

- [ ] 9. Add POST /purchase-orders/{po}/send route
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Procurement\Routes\api.php`
      - After line ~27 (the approve route), add:
        ```php
        Route::post('/{purchaseOrder}/send', [PurchaseOrderController::class, 'send'])
            ->middleware('role:manager,admin')
            ->name('send');
        ```
      Verify: Run `php artisan route:list | grep "purchase-orders"` and confirm the send route is registered

- [ ] 10. Add send method to PurchaseOrderController
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Procurement\Controllers\PurchaseOrderController.php`
      - After the approve() method (around line ~90), add:
        ```php
        public function send(Request $request, PurchaseOrder $purchaseOrder)
        {
            $this->authorize('purchase_order.send');

            if ($purchaseOrder->status->value !== 'approved') {
                return $this->errorResponse('Can only send approved purchase orders', 409);
            }

            $this->poService->send($purchaseOrder);

            $this->logActivity('purchase_order.sent', null, ['po_id' => $purchaseOrder->id, 'po_number' => $purchaseOrder->po_number]);

            return $this->successResponse(
                new PurchaseOrderResource($purchaseOrder->refresh()->load(['supplier', 'items.product'])),
                'Purchase order sent to supplier successfully'
            );
        }
        ```
      Verify: Run PHPUnit tests or manually test: POST /api/v1/procurement/purchase-orders/{id}/send with approved PO should return 200 and status should be 'sent'

- [ ] 11. Add send method to PurchaseOrderService
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Procurement\Services\PurchaseOrderService.php`
      - After the approve() method (around line ~50), add:
        ```php
        public function send(PurchaseOrder $po): void
        {
            $this->procurementService->sendPurchaseOrderToSupplier($po);
        }
        ```
      Verify: Unit test or integration test that calling send() delegates to ProcurementService::sendPurchaseOrderToSupplier()

- [ ] 12. Replace stub stock processing in ProcurementService::deliverPurchaseOrder
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Procurement\Services\ProcurementService.php`
      - Note: This method (lines ~159-203) is likely deprecated now that PurchaseOrderService::receive exists. Assess whether deliverPurchaseOrder is still called anywhere.
      - If it's still used: replace the stub at lines ~171-180 (the `foreach` that builds `$stockTransactions` array) with actual InventoryService::receiveStock calls, following the pattern in PurchaseOrderService::receive (lines ~64-76). Each item needs batch data; if batches aren't tracked here, create a single default batch per item.
      - If it's NOT used: add a deprecation comment or remove the method entirely (removal requires confirming no callers exist via grep).
      Verify: Grep for `deliverPurchaseOrder` in the codebase to find callers: `grep -r "deliverPurchaseOrder" app/ resources/` — if none, mark deprecated or remove

- [ ] 13. Add row lock to convertRequestToPurchaseOrder to prevent duplicate POs
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Procurement\Services\ProcurementService.php`
      - At line ~219, immediately after `DB::beginTransaction();`, add:
        ```php
        // Lock the request row to prevent duplicate PO creation from concurrent requests
        $request = ProcurementRequest::lockForUpdate()->findOrFail($request->id);
        ```
      - The existing `$request` parameter is passed by reference, so re-fetching with lock is safe and necessary.
      Verify: Integration test: simulate concurrent calls to convertRequestToPurchaseOrder with the same request ID — only one should succeed, others should block and then find status already changed

## Task T21: Reorder suggestions duplicate

- [ ] 14. Update scopePending to include 'reviewed' and 'approved' statuses
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Procurement\Models\ProcurementRequest.php`
      - At line ~77, the scopePending() method currently filters: `return $query->where('status', ProcurementRequestStatus::GENERATED);`
      - Change to: `return $query->whereIn('status', [ProcurementRequestStatus::GENERATED, ProcurementRequestStatus::REVIEWED, ProcurementRequestStatus::APPROVED]);`
      - Note: Verify that ProcurementRequestStatus enum has REVIEWED case; if not, adjust to only GENERATED and APPROVED.
      Verify: Run PHPUnit tests for ProcurementRequest model or integration test: create a request with status 'approved', verify pending() scope includes it

- [ ] 15. Subtract open PO quantities from available quantity in generateForLowStockProducts
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\app\Modules\Procurement\Models\ProcurementRequest.php`
      - In generateForLowStockProducts() method (starts at line ~175), after line ~190 where `$availableQuantity = $product->available_quantity ?? $product->quantity;` is set:
        * Add query to sum open PO quantities:
          ```php
          // Subtract quantities already on open POs for this product
          $openPoQuantity = \App\Modules\Procurement\Models\PurchaseOrderItem::whereHas('purchaseOrder', function($q) {
              $q->whereIn('status', [
                  \App\Support\Enums\PurchaseOrderStatus::APPROVED,
                  \App\Support\Enums\PurchaseOrderStatus::SENT,
                  \App\Support\Enums\PurchaseOrderStatus::RECEIVED
              ]);
          })->where('product_id', $product->id)->sum('quantity');

          $availableQuantity -= $openPoQuantity;
          ```
        * Update the skip logic: after subtracting open PO qty, if `$availableQuantity >= $product->reorder_level`, continue (skip this product, no suggestion needed).
        * Adjust `$suggestedQuantity` calculation to account for open PO qty: the suggested quantity should bring available stock (including open POs) to the target level, not over-order.
      Verify: Integration test: create a product below reorder level, create an open PO for that product with sufficient quantity to cover the gap, run generateForLowStockProducts(), verify no duplicate suggestion is created

---

## Verification Strategy

After implementing all changes:

1. **Run PHP unit tests**: `php artisan test` (or `./vendor/bin/phpunit`) — confirm existing tests still pass
2. **Run frontend tests**: `npm run test` — confirm existing tests still pass
3. **Manual API testing**:
   - T18: Test PO receive with various invalid statuses, over-receiving, mismatched batches
   - T19: Test stock-in with purchase_order_id, verify 422 rejection
   - T20: Test send route, verify row lock prevents duplicate POs
   - T21: Test reorder generation with open POs, verify no duplicates
4. **Frontend verification**: Navigate to Receiving page, verify partial receipts show receive button

## Dependencies

- All changes are independent except:
  - T20 item 11 depends on item 10 (send method in controller calls service method)
  - T18 item 6 (frontend) can be done in parallel with backend changes
- No database migrations required (all fields already exist)
- No new dependencies required

## Edge Cases & Notes

- **T18**: The status logic for partial vs full receipt is already correct. The enum does NOT have PARTIALLY_RECEIVED; RECEIVED is used for partial, COMPLETED for full.
- **T19**: The request class approach is preferred for validation, as it centralizes validation logic.
- **T20**: The deliverPurchaseOrder method may be deprecated now that PurchaseOrderService::receive exists. Assess usage before deciding to update or remove.
- **T21**: The scopePending fix is critical — without it, approved/reviewed requests are missed in the duplicate check, causing duplicate suggestions.
- **T21**: Subtracting open PO quantities prevents over-ordering. The calculation needs to account for: current stock - open PO qty already ordered + new suggestion = target level.

## Testing Notes

- For PHPUnit tests: ensure test database is seeded with necessary data (users, products, suppliers, POs)
- For frontend tests: use mock data or run against local API
- For integration tests: use transactions to avoid polluting test data
- Key test scenarios:
  - Receive PO partially → status = RECEIVED, can receive again
  - Receive PO fully → status = COMPLETED, cannot receive again
  - Try to receive cancelled PO → 422 error
  - Try to over-receive → 422 error with clear message
  - Create request with open PO → no duplicate suggestion generated
