<?php

namespace App\Modules\Inventory\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Inventory\Models\StockTransaction;
use App\Modules\Inventory\Services\InventoryService;
use App\Modules\Inventory\Repositories\StockTransactionRepository;
use App\Modules\Inventory\Requests\StoreStockInRequest;
use App\Modules\Inventory\Requests\StoreStockOutRequest;
use App\Modules\Inventory\Resources\StockTransactionResource;
use App\Support\Enums\StockTransactionType;
use Illuminate\Http\Request;

class StockTransactionController extends BaseController
{
    public function __construct(
        private StockTransactionRepository $transactionRepository,
        private InventoryService $inventoryService
    ) {}

    /**
     * Display a listing of stock transactions.
     */
    public function index(Request $request)
    {
        $this->authorize('stock_transaction.read');

        $transactions = $this->transactionRepository->paginate(
            filters: [
                'product_id' => $request->product_id,
                'batch_id' => $request->batch_id,
                'type' => $request->type,
                'user_id' => $request->user_id,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
                'search' => $request->search
            ],
            perPage: $request->per_page ?? 15,
            with: ['product', 'batch', 'user']
        );

        return $this->successResponse(
            StockTransactionResource::collection($transactions),
            'Stock transactions retrieved successfully'
        );
    }

    /**
     * Display the specified stock transaction.
     */
    public function show(StockTransaction $stockTransaction)
    {
        $this->authorize('stock_transaction.read');

        $stockTransaction->load(['product', 'batch', 'user']);

        return $this->successResponse(
            new StockTransactionResource($stockTransaction),
            'Stock transaction retrieved successfully'
        );
    }

    /**
     * Process stock in transaction.
     */
    public function stockIn(StoreStockInRequest $request)
    {
        $this->authorize('stock_transaction.create');

        try {
            $transaction = $this->inventoryService->recordStockIn(
                $request->validated()
            );

            $this->logActivity('stock.in', $transaction->product, [
                'transaction_id' => $transaction->id,
                'quantity' => $request->quantity,
                'batch_code' => $request->batch_code ?? 'N/A'
            ]);

            return $this->successResponse(
                new StockTransactionResource($transaction->load(['product', 'batch', 'user'])),
                'Stock in recorded successfully',
                201
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Process stock out transaction.
     */
    public function stockOut(StoreStockOutRequest $request)
    {
        $this->authorize('stock_transaction.create');

        try {
            $transactions = $this->inventoryService->recordStockOut(
                $request->validated()
            );

            $this->logActivity('stock.out', null, [
                'product_id' => $request->product_id,
                'quantity' => $request->quantity,
                'transactions_count' => count($transactions)
            ]);

            return $this->successResponse(
                StockTransactionResource::collection(collect($transactions)->load(['product', 'batch', 'user'])),
                'Stock out recorded successfully',
                201
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Get stock movement history for a product.
     */
    public function productHistory(Request $request)
    {
        $this->authorize('stock_transaction.read');

        $request->validate([
            'product_id' => 'required|exists:products,id'
        ]);

        $history = $this->transactionRepository->getProductHistory(
            $request->product_id,
            $request->per_page ?? 15
        );

        return $this->successResponse(
            StockTransactionResource::collection($history),
            'Product stock history retrieved successfully'
        );
    }

    /**
     * Get stock movement history for a batch.
     */
    public function batchHistory(Request $request)
    {
        $this->authorize('stock_transaction.read');

        $request->validate([
            'batch_id' => 'required|exists:batches,id'
        ]);

        $history = $this->transactionRepository->getBatchHistory(
            $request->batch_id,
            $request->per_page ?? 15
        );

        return $this->successResponse(
            StockTransactionResource::collection($history),
            'Batch stock history retrieved successfully'
        );
    }

    /**
     * Get transactions by type.
     */
    public function byType(Request $request, string $type)
    {
        $this->authorize('stock_transaction.read');

        if (!in_array($type, array_column(StockTransactionType::cases(), 'value'))) {
            return $this->errorResponse('Invalid transaction type', 400);
        }

        $transactions = $this->transactionRepository->getByType(
            StockTransactionType::from($type),
            $request->per_page ?? 15
        );

        return $this->successResponse(
            StockTransactionResource::collection($transactions),
            "Stock {$type} transactions retrieved successfully"
        );
    }

    /**
     * Get daily stock summary.
     */
    public function dailySummary(Request $request)
    {
        $this->authorize('stock_transaction.read');

        $date = $request->date ?? now()->format('Y-m-d');

        $summary = $this->transactionRepository->getDailySummary($date);

        return $this->successResponse(
            $summary,
            'Daily stock summary retrieved successfully'
        );
    }

    /**
     * Get stock transaction statistics.
     */
    public function statistics(Request $request)
    {
        $this->authorize('stock_transaction.read');

        $period = $request->period ?? '30'; // days
        $stats = $this->transactionRepository->getStatistics($period);

        return $this->successResponse(
            $stats,
            "Stock transaction statistics for last {$period} days retrieved successfully"
        );
    }

    /**
     * Reverse a stock transaction.
     */
    public function reverse(StockTransaction $stockTransaction)
    {
        $this->authorize('stock_transaction.create');

        try {
            $reversedTransaction = $this->inventoryService->reverseTransaction($stockTransaction);

            $this->logActivity('stock.transaction_reversed', $stockTransaction->product, [
                'original_transaction_id' => $stockTransaction->id,
                'reversed_transaction_id' => $reversedTransaction->id,
                'quantity' => $stockTransaction->quantity
            ]);

            return $this->successResponse(
                new StockTransactionResource($reversedTransaction->load(['product', 'batch', 'user'])),
                'Stock transaction reversed successfully',
                201
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Get user's stock transaction history.
     */
    public function userHistory(Request $request)
    {
        $this->authorize('stock_transaction.read');

        $userId = $request->user_id ?? auth()->id();

        $history = $this->transactionRepository->getUserHistory(
            $userId,
            $request->per_page ?? 15
        );

        return $this->successResponse(
            StockTransactionResource::collection($history),
            'User stock transaction history retrieved successfully'
        );
    }
}