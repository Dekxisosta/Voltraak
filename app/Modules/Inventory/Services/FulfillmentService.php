<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Models\CustomerOrder;
use App\Modules\Inventory\Models\Reservation;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockTransaction;
use App\Models\User;
use App\Support\Enums\OrderStatus;
use App\Core\Logging\ActivityLogger;
use App\Core\Exceptions\ConflictException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Handles customer order fulfillment and picking workflows
 */
class FulfillmentService
{
    public function __construct(
        private InventoryService $inventoryService,
        private FEFOService $fefoService,
        private ActivityLogger $activityLogger
    ) {}

    /**
     * Confirm a customer order and allocate stock.
     */
    public function confirmOrder(CustomerOrder $order, User $user): CustomerOrder
    {
        return DB::transaction(function () use ($order, $user) {
            // Lock the order for update
            $order->lockForUpdate();
            
            // Guard: order must be 'pending'
            if ($order->status !== OrderStatus::PENDING) {
                throw new ConflictException(
                    "Only pending orders can be confirmed. Current status: {$order->status->value}"
                );
            }

            // Set order status to 'confirmed'
            $order->update(['status' => OrderStatus::CONFIRMED]);

            // Confirm all 'pending' reservations for this order
            $pendingReservations = $order->reservations()->where('status', 'pending')->get();
            
            foreach ($pendingReservations as $reservation) {
                $reservation->update(['status' => 'confirmed']);
                
                // Call autoAllocate() on each confirmed reservation (FEFO batch assignment)
                $reservation->autoAllocate();
            }

            $this->activityLogger->logInventoryOperation(
                'order_confirmed',
                $order->order_number,
                $pendingReservations->count(),
                $user,
                [
                    'order_id' => $order->id,
                    'reservations_confirmed' => $pendingReservations->count(),
                ]
            );

            return $order->refresh();
        });
    }

    /**
     * Create a customer order with reservations.
     */
    public function createCustomerOrder(array $data): CustomerOrder
    {
        return DB::transaction(function () use ($data) {
            $order = CustomerOrder::create([
                'customer_name' => $data['customer_name'],
                'customer_email' => $data['customer_email'] ?? null,
                'customer_phone' => $data['customer_phone'] ?? null,
                'customer_address' => $data['customer_address'] ?? null,
                'required_date' => $data['required_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            // Create reservations for each line item
            if (!empty($data['items'])) {
                foreach ($data['items'] as $item) {
                    $product = Product::findOrFail($item['product_id']);
                    
                    $reservation = Reservation::create([
                        'product_id' => $product->id,
                        'customer_order_id' => $order->id,
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'] ?? $product->unit_price,
                        'reserved_by' => auth()->id(),
                        'notes' => $item['notes'] ?? null,
                    ]);

                    // Auto-allocate batch using FEFO if product has batches
                    $reservation->autoAllocate();
                }
            }

            // Recalculate totals
            $order->calculateTotalAmount();
            $order->save();

            return $order;
        });
    }

    /**
     * Fulfill a customer order by issuing stock for all reservations.
     * 
     * This properly creates stock-out transactions via InventoryService
     * with FEFO compliance and audit trail.
     */
    public function fulfillOrder(
        CustomerOrder $order,
        User $user,
        ?string $fulfilledDate = null,
        ?string $notes = null
    ): array {
        if ($order->status !== OrderStatus::CONFIRMED) {
            throw new ConflictException(
                "Only confirmed orders can be fulfilled. Current status: {$order->status->value}"
            );
        }

        return DB::transaction(function () use ($order, $user, $fulfilledDate, $notes) {
            $transactions = [];
            $reservations = $order->reservations()
                ->where('status', 'allocated')
                ->with(['product', 'batch'])
                ->get();

            if ($reservations->isEmpty()) {
                throw new ConflictException(
                    'Order has no allocated reservations to fulfill'
                );
            }

            // Process each reservation and create stock-out transaction
            foreach ($reservations as $reservation) {
                if (!$reservation->canBeFulfilled()) {
                    throw new ConflictException(
                        "Reservation #{$reservation->id} cannot be fulfilled. " .
                        "Status: {$reservation->status}, Expired: " . 
                        ($reservation->isExpired() ? 'yes' : 'no')
                    );
                }

                // Issue stock via InventoryService (enforces FEFO, creates proper transaction)
                $transaction = $this->inventoryService->issueStock([
                    'product_id' => $reservation->product_id,
                    'batch_id' => $reservation->batch_id,
                    'quantity' => $reservation->quantity,
                    'reference_type' => 'customer_order',
                    'reference_id' => $order->id,
                    'reference_number' => $order->order_number,
                    'notes' => "Fulfilled customer order {$order->order_number}" . 
                              ($notes ? ": {$notes}" : ''),
                ], $user, $order->id);

                // Mark reservation as fulfilled
                $reservation->update([
                    'status' => 'fulfilled',
                    'fulfilled_at' => $fulfilledDate ? \Carbon\Carbon::parse($fulfilledDate) : now(),
                ]);

                $transactions[] = $transaction;
            }

            // Mark order as fulfilled
            $order->fulfill();

            $this->activityLogger->logInventoryOperation(
                'order_fulfilled',
                $order->order_number,
                $order->total_items,
                $user,
                [
                    'order_id' => $order->id,
                    'reservations_count' => $reservations->count(),
                    'transactions_count' => count($transactions),
                ]
            );

            return [
                'order' => $order,
                'transactions' => $transactions,
                'reservations' => $reservations,
            ];
        });
    }

    /**
     * Generate picking list for warehouse staff.
     * 
     * Groups items by location with FEFO order and expiry warnings.
     */
    public function generatePickingList(Collection $orders): array
    {
        $pickingItems = [];

        foreach ($orders as $order) {
            foreach ($order->reservations as $reservation) {
                if ($reservation->status !== 'allocated' || !$reservation->batch) {
                    continue;
                }

                $product = $reservation->product;
                $batch = $reservation->batch;

                $pickingItems[] = [
                    'reservation_id' => $reservation->id,
                    'order_number' => $order->order_number,
                    'order_id' => $order->id,
                    'customer_name' => $order->customer_name,
                    'required_date' => $order->required_date?->toDateString(),
                    'priority' => $this->calculateOrderPriority($order),
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'sku' => $product->sku,
                    'quantity' => $reservation->quantity,
                    'batch_id' => $batch->id,
                    'batch_number' => $batch->batch_number,
                    'bin_location' => $product->storage_bin,
                    'expiry_date' => $batch->expiry_date?->toDateString(),
                    // Whole days from today until expiry (negative once expired)
                    'days_to_expiry' => $batch->expiry_date
                        ? (int) now()->startOfDay()->diffInDays($batch->expiry_date->copy()->startOfDay(), false)
                        : null,
                    'expiry_status' => $batch->status->value,
                    'fefo_compliant' => $this->fefoService->validateFefoCompliance($batch, $reservation->quantity),
                ];
            }
        }

        // Sort by priority, then by location for efficient picking route
        usort($pickingItems, function ($a, $b) {
            if ($a['priority'] !== $b['priority']) {
                return $b['priority'] <=> $a['priority']; // Higher priority first
            }
            return ($a['bin_location'] ?? '') <=> ($b['bin_location'] ?? ''); // Then by location
        });

        return [
            'generated_at' => now()->toISOString(),
            'total_items' => count($pickingItems),
            'total_orders' => $orders->count(),
            'items' => $pickingItems,
        ];
    }

    /**
     * Calculate order priority (for picking list sorting).
     */
    private function calculateOrderPriority(CustomerOrder $order): int
    {
        $priority = 50; // Base priority

        // Overdue orders get highest priority
        if ($order->isOverdue()) {
            $priority += 100;
        }

        // Due today
        if ($order->required_date && $order->required_date->isToday()) {
            $priority += 50;
        }

        // Due within 3 days
        if ($order->required_date && $order->required_date->diffInDays(now(), false) <= 3) {
            $priority += 25;
        }

        return $priority;
    }

    /**
     * Reserve stock for a customer order.
     */
    public function reserveStock(CustomerOrder $order): Collection
    {
        return DB::transaction(function () use ($order) {
            $reservations = collect();

            foreach ($order->reservations as $reservation) {
                if ($reservation->status !== 'confirmed') {
                    continue;
                }

                // Use FEFO to select best batch
                $batch = $this->fefoService->selectBatchForPick(
                    $reservation->product,
                    $reservation->quantity
                );

                if ($batch) {
                    $reservation->allocate($batch);
                    $reservations->push($reservation);
                }
            }

            return $reservations;
        });
    }

    /**
     * Release reservations and return stock to available.
     */
    public function releaseReservations(CustomerOrder $order): int
    {
        return $order->reservations()
            ->whereIn('status', ['pending', 'confirmed', 'allocated'])
            ->update([
                'status' => 'cancelled',
                'batch_id' => null,
            ]);
    }

    /**
     * Get fulfillment statistics.
     */
    public function getFulfillmentStats(int $days = 30): array
    {
        $startDate = now()->subDays($days);

        $orders = CustomerOrder::where('created_at', '>=', $startDate)->get();

        return [
            'period_days' => $days,
            'total_orders' => $orders->count(),
            'pending' => $orders->where('status', OrderStatus::PENDING)->count(),
            'confirmed' => $orders->where('status', OrderStatus::CONFIRMED)->count(),
            'fulfilled' => $orders->where('status', OrderStatus::FULFILLED)->count(),
            'cancelled' => $orders->where('status', OrderStatus::CANCELLED)->count(),
            'overdue' => $orders->filter->isOverdue()->count(),
            'fulfillment_rate' => $orders->count() > 0 
                ? ($orders->where('status', OrderStatus::FULFILLED)->count() / $orders->count()) * 100 
                : 0,
            'average_fulfillment_time' => $this->calculateAverageFulfillmentTime($orders),
        ];
    }

    /**
     * Calculate average time from order creation to fulfillment.
     */
    private function calculateAverageFulfillmentTime(Collection $orders): ?float
    {
        $fulfilledOrders = $orders->where('status', OrderStatus::FULFILLED)
            ->filter(fn($order) => $order->fulfilled_date !== null);

        if ($fulfilledOrders->isEmpty()) {
            return null;
        }

        $totalHours = $fulfilledOrders->sum(function ($order) {
            return $order->order_date->diffInHours($order->fulfilled_date);
        });

        return round($totalHours / $fulfilledOrders->count(), 2);
    }
}
