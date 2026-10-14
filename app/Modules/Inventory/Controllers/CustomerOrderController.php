<?php

namespace App\Modules\Inventory\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Inventory\Models\CustomerOrder;
use App\Modules\Inventory\Services\FulfillmentService;
use App\Modules\Inventory\Requests\StoreCustomerOrderRequest;
use App\Modules\Inventory\Requests\UpdateCustomerOrderRequest;
use App\Modules\Inventory\Resources\CustomerOrderResource;
use Illuminate\Http\Request;

class CustomerOrderController extends BaseController
{
    public function __construct(
        private FulfillmentService $fulfillmentService
    ) {}

    /**
     * Display a listing of customer orders.
     */
    public function index(Request $request)
    {
        $this->authorize('customer_order.read');

        $query = CustomerOrder::with(['reservations.product', 'reservations.batch', 'creator']);

        // Filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $query->searchCustomer($request->search);
        }

        if ($request->filled('overdue')) {
            $query->overdue();
        }

        if ($request->filled('due_today')) {
            $query->dueToday();
        }

        $orders = $query->latest()->paginate($request->per_page ?? 15);

        return $this->successResponse(
            CustomerOrderResource::collection($orders),
            'Customer orders retrieved successfully'
        );
    }

    /**
     * Store a newly created customer order.
     */
    public function store(StoreCustomerOrderRequest $request)
    {
        $this->authorize('customer_order.create');

        try {
            $order = $this->fulfillmentService->createCustomerOrder($request->validated());

            $this->logActivity('customer_order.created', null, [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'customer' => $order->customer_name,
            ]);

            return $this->successResponse(
                new CustomerOrderResource($order->load(['reservations.product', 'reservations.batch'])),
                'Customer order created successfully',
                201
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Display the specified customer order.
     */
    public function show(CustomerOrder $customerOrder)
    {
        $this->authorize('customer_order.read');

        $customerOrder->load(['reservations.product', 'reservations.batch', 'creator']);

        return $this->successResponse(
            new CustomerOrderResource($customerOrder),
            'Customer order retrieved successfully'
        );
    }

    /**
     * Update the specified customer order.
     */
    public function update(UpdateCustomerOrderRequest $request, CustomerOrder $customerOrder)
    {
        $this->authorize('customer_order.update');

        if (!$customerOrder->canBeModified()) {
            return $this->errorResponse('Cannot update order in current status', 409);
        }

        $customerOrder->update($request->validated());

        $this->logActivity('customer_order.updated', null, [
            'order_id' => $customerOrder->id,
            'order_number' => $customerOrder->order_number,
        ]);

        return $this->successResponse(
            new CustomerOrderResource($customerOrder->refresh()),
            'Customer order updated successfully'
        );
    }

    /**
     * Remove the specified customer order.
     */
    public function destroy(CustomerOrder $customerOrder)
    {
        $this->authorize('customer_order.delete');

        if (!$customerOrder->canBeModified()) {
            return $this->errorResponse('Cannot delete order in current status', 409);
        }

        $customerOrder->delete();

        $this->logActivity('customer_order.deleted', null, [
            'order_id' => $customerOrder->id,
            'order_number' => $customerOrder->order_number,
        ]);

        return $this->successResponse(null, 'Customer order deleted successfully');
    }

    /**
     * Confirm a customer order (transition to confirmed status and allocate reservations).
     */
    public function confirm(Request $request, CustomerOrder $customerOrder)
    {
        $this->authorize('customer_order.update');

        if ($customerOrder->status->value !== 'pending') {
            return $this->errorResponse('Only pending orders can be confirmed', 409);
        }

        try {
            $result = $this->fulfillmentService->confirmOrder($customerOrder, auth()->user());

            $this->logActivity('customer_order.confirmed', null, [
                'order_id' => $customerOrder->id,
                'order_number' => $customerOrder->order_number,
            ]);

            return $this->successResponse(
                new CustomerOrderResource($result),
                'Customer order confirmed successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Fulfill a customer order (complete picking and issue stock).
     */
    public function fulfill(Request $request, CustomerOrder $customerOrder)
    {
        $this->authorize('customer_order.fulfill');

        if ($customerOrder->status->value !== 'confirmed') {
            return $this->errorResponse('Only confirmed orders can be fulfilled', 409);
        }

        $request->validate([
            'fulfilled_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $result = $this->fulfillmentService->fulfillOrder(
                $customerOrder,
                auth()->user(),
                $request->fulfilled_date,
                $request->notes
            );

            $this->logActivity('customer_order.fulfilled', null, [
                'order_id' => $customerOrder->id,
                'order_number' => $customerOrder->order_number,
                'transactions' => count($result['transactions']),
            ]);

            return $this->successResponse(
                [
                    'order' => new CustomerOrderResource($customerOrder->refresh()),
                    'transactions' => $result['transactions'],
                ],
                'Customer order fulfilled successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Cancel a customer order.
     */
    public function cancel(Request $request, CustomerOrder $customerOrder)
    {
        $this->authorize('customer_order.cancel');

        if (!$customerOrder->canBeModified()) {
            return $this->errorResponse('Cannot cancel order in current status', 409);
        }

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $customerOrder->cancel();

        $this->logActivity('customer_order.cancelled', null, [
            'order_id' => $customerOrder->id,
            'order_number' => $customerOrder->order_number,
            'reason' => $request->reason,
        ]);

        return $this->successResponse(
            new CustomerOrderResource($customerOrder->refresh()),
            'Customer order cancelled successfully'
        );
    }

    /**
     * Get picking list for warehouse.
     */
    public function pickingList(Request $request)
    {
        $this->authorize('customer_order.read');

        $orders = CustomerOrder::confirmed()
            ->with(['reservations' => function ($query) {
                $query->where('status', 'allocated')
                      ->with(['product', 'batch']);
            }])
            ->get();

        $pickingList = $this->fulfillmentService->generatePickingList($orders);

        return $this->successResponse(
            $pickingList,
            'Picking list generated successfully'
        );
    }
}
