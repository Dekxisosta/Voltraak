<?php

namespace App\Modules\Inventory\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Inventory\Models\Reservation;
use App\Modules\Inventory\Resources\ReservationResource;
use Illuminate\Http\Request;

class ReservationController extends BaseController
{
    private const LIVE_STATUSES = ['pending', 'confirmed', 'allocated'];

    /**
     * Display a listing of reservations.
     *
     * `status` accepts a stored status (pending, confirmed, allocated,
     * fulfilled, cancelled) or the derived values `active` (still holding
     * stock and not past its expiry) and `expired` (still holding stock but
     * past its expiry).
     */
    public function index(Request $request)
    {
        $this->authorize('reservation.read');

        $request->validate([
            'status' => 'nullable|string|in:active,expired,pending,confirmed,allocated,fulfilled,cancelled',
            'search' => 'nullable|string|max:255',
            'product_id' => 'nullable|integer',
            'customer_order_id' => 'nullable|integer',
            'per_page' => 'nullable|integer|min:1',
        ]);

        $query = Reservation::with(['product', 'batch', 'customerOrder']);

        if ($request->filled('status')) {
            match ($request->status) {
                'active' => $query->active(),
                'expired' => $query->expired(),
                default => $query->where('status', $request->status),
            };
        }

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('customer_order_id')) {
            $query->where('customer_order_id', $request->customer_order_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('customerOrder', function ($o) use ($search) {
                    $o->where('order_number', 'like', "%{$search}%")
                      ->orWhere('customer_name', 'like', "%{$search}%");
                })->orWhereHas('product', function ($p) use ($search) {
                    $p->where('name', 'like', "%{$search}%")
                      ->orWhere('sku', 'like', "%{$search}%");
                });
            });
        }

        $reservations = $query->latest('reserved_at')
            ->latest('id')
            ->paginate(min((int) ($request->per_page ?? 15), 500));

        return $this->successResponse(
            ReservationResource::collection($reservations),
            'Reservations retrieved successfully'
        );
    }

    /**
     * Cancel a single reservation and release the stock it was holding.
     */
    public function cancel(Request $request, Reservation $reservation)
    {
        $this->authorize('reservation.cancel');

        if (!in_array($reservation->status, self::LIVE_STATUSES, true)) {
            return $this->errorResponse(
                "Only pending, confirmed or allocated reservations can be cancelled (current status: {$reservation->status})",
                409
            );
        }

        $reservation->cancel();

        $this->logActivity('reservation.cancelled', $reservation, [
            'customer_order_id' => $reservation->customer_order_id,
            'product_id' => $reservation->product_id,
            'quantity' => $reservation->quantity,
        ]);

        return $this->successResponse(
            new ReservationResource($reservation->refresh()->load(['product', 'batch', 'customerOrder'])),
            'Reservation cancelled successfully'
        );
    }
}
