<?php

namespace App\Modules\Reporting\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Reporting\Services\AnalyticsService;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\StockTransaction;
use App\Modules\Inventory\Models\PhysicalCount;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Procurement\Models\Supplier;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportController extends BaseController
{
    public function __construct(
        private AnalyticsService $analyticsService
    ) {}

    /**
     * Get inventory summary report.
     */
    public function inventorySummary(Request $request)
    {
        $this->authorize('report.inventory');

        $request->validate([
            'date' => 'nullable|date',
            'category' => 'nullable|string',
            'include_inactive' => 'nullable|boolean'
        ]);

        try {
            $date = $request->date ? Carbon::parse($request->date) : Carbon::now();
            $includeInactive = $request->boolean('include_inactive', false);

            $query = Product::query();
            
            if (!$includeInactive) {
                $query->where('is_active', true);
            }
            
            if ($request->category) {
                $query->where('category', $request->category);
            }

            $products = $query->with(['batches' => function($q) {
                $q->where('current_quantity', '>', 0)->orderBy('expiry_date');
            }])->get();

            $summary = [
                'report_date' => $date->format('Y-m-d'),
                'total_products' => $products->count(),
                'total_inventory_value' => $products->sum(function($p) { 
                    return $p->current_quantity * $p->unit_cost; 
                }),
                'categories' => $products->groupBy('category')->map(function($categoryProducts) {
                    return [
                        'product_count' => $categoryProducts->count(),
                        'total_quantity' => $categoryProducts->sum('current_quantity'),
                        'total_value' => $categoryProducts->sum(function($p) { 
                            return $p->current_quantity * $p->unit_cost; 
                        })
                    ];
                }),
                'stock_levels' => [
                    'in_stock' => $products->where('current_quantity', '>', 0)->count(),
                    'low_stock' => $products->filter(function($p) { 
                        return $p->current_quantity > 0 && 
                               $p->reorder_point > 0 && 
                               $p->current_quantity <= $p->reorder_point; 
                    })->count(),
                    'out_of_stock' => $products->where('current_quantity', '<=', 0)->count()
                ]
            ];

            return $this->successResponse($summary, 'Inventory summary report generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to generate inventory summary: ' . $e->getMessage(), 500);
        }
    }
    /**
     * Get stock movement report.
     */
    public function stockMovement(Request $request)
    {
        $this->authorize('report.inventory');

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'product_id' => 'nullable|exists:products,id',
            'transaction_type' => 'nullable|in:in,out,adjustment'
        ]);

        try {
            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);

            $query = StockTransaction::whereBetween('created_at', [$startDate, $endDate])
                ->with(['product:id,name,sku', 'batch:id,batch_code', 'user:id,name']);

            if ($request->product_id) {
                $query->where('product_id', $request->product_id);
            }

            if ($request->transaction_type) {
                $query->where('type', $request->transaction_type);
            }

            $transactions = $query->orderBy('created_at', 'desc')->get();

            $summary = [
                'period' => [
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d')
                ],
                'totals' => [
                    'total_transactions' => $transactions->count(),
                    'stock_in' => $transactions->where('type', 'in')->sum('quantity'),
                    'stock_out' => $transactions->where('type', 'out')->sum('quantity'),
                    'adjustments' => $transactions->where('type', 'adjustment')->sum('quantity'),
                    'net_movement' => $transactions->where('type', 'in')->sum('quantity') - 
                                   $transactions->where('type', 'out')->sum('quantity') + 
                                   $transactions->where('type', 'adjustment')->sum('quantity')
                ],
                'by_product' => $transactions->groupBy('product_id')->map(function($productTransactions) {
                    $product = $productTransactions->first()->product;
                    return [
                        'product_name' => $product->name ?? 'Unknown',
                        'product_sku' => $product->sku ?? '',
                        'total_transactions' => $productTransactions->count(),
                        'stock_in' => $productTransactions->where('type', 'in')->sum('quantity'),
                        'stock_out' => $productTransactions->where('type', 'out')->sum('quantity'),
                        'adjustments' => $productTransactions->where('type', 'adjustment')->sum('quantity')
                    ];
                })->values(),
                'transactions' => $transactions->map(function($transaction) {
                    return [
                        'id' => $transaction->id,
                        'date' => $transaction->created_at->format('Y-m-d H:i:s'),
                        'type' => $transaction->type,
                        'product_name' => $transaction->product->name ?? 'Unknown',
                        'product_sku' => $transaction->product->sku ?? '',
                        'batch_code' => $transaction->batch->batch_code ?? null,
                        'quantity' => $transaction->quantity,
                        'unit_cost' => $transaction->unit_cost,
                        'total_cost' => $transaction->total_cost,
                        'reference_type' => $transaction->reference_type,
                        'reference_id' => $transaction->reference_id,
                        'user_name' => $transaction->user->name ?? 'System',
                        'notes' => $transaction->notes
                    ];
                })
            ];

            return $this->successResponse($summary, 'Stock movement report generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to generate stock movement report: ' . $e->getMessage(), 500);
        }
    }
    /**
     * Get accuracy report.
     */
    public function accuracy(Request $request)
    {
        $this->authorize('report.accuracy');

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'variance_threshold' => 'nullable|numeric|min:0',
            'product_id' => 'nullable|exists:products,id'
        ]);

        try {
            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);
            $varianceThreshold = $request->variance_threshold ?? 5.0;

            $query = PhysicalCount::whereBetween('count_date', [$startDate, $endDate])
                ->with(['product:id,name,sku,category', 'user:id,name']);

            if ($request->product_id) {
                $query->where('product_id', $request->product_id);
            }

            $physicalCounts = $query->orderBy('count_date', 'desc')->get();

            $accurateCounts = $physicalCounts->filter(function($count) use ($varianceThreshold) {
                return abs($count->variance_percentage) <= $varianceThreshold;
            });

            $summary = [
                'period' => [
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d')
                ],
                'variance_threshold' => $varianceThreshold,
                'overall_accuracy' => [
                    'total_counts' => $physicalCounts->count(),
                    'accurate_counts' => $accurateCounts->count(),
                    'accuracy_percentage' => $physicalCounts->count() > 0 ? 
                        round(($accurateCounts->count() / $physicalCounts->count()) * 100, 2) : 0,
                    'total_variance_value' => $physicalCounts->sum(function($count) {
                        return abs($count->variance * ($count->product->unit_cost ?? 0));
                    })
                ],
                'by_category' => $physicalCounts->groupBy('product.category')->map(function($categoryCounts) use ($varianceThreshold) {
                    $accurate = $categoryCounts->filter(function($count) use ($varianceThreshold) {
                        return abs($count->variance_percentage) <= $varianceThreshold;
                    });
                    return [
                        'total_counts' => $categoryCounts->count(),
                        'accurate_counts' => $accurate->count(),
                        'accuracy_percentage' => $categoryCounts->count() > 0 ? 
                            round(($accurate->count() / $categoryCounts->count()) * 100, 2) : 0
                    ];
                }),
                'variance_analysis' => [
                    'counts_with_variance' => $physicalCounts->filter(function($count) {
                        return $count->variance != 0;
                    })->count(),
                    'positive_variances' => $physicalCounts->filter(function($count) {
                        return $count->variance > 0;
                    })->count(),
                    'negative_variances' => $physicalCounts->filter(function($count) {
                        return $count->variance < 0;
                    })->count(),
                    'high_variances' => $physicalCounts->filter(function($count) {
                        return abs($count->variance_percentage) > 10;
                    })->count()
                ]
            ];

            return $this->successResponse($summary, 'Accuracy report generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to generate accuracy report: ' . $e->getMessage(), 500);
        }
    }
    /**
     * Get procurement report.
     */
    public function procurement(Request $request)
    {
        $this->authorize('report.procurement');

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'status' => 'nullable|in:pending,approved,sent,delivered,cancelled'
        ]);

        try {
            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);

            $query = PurchaseOrder::whereBetween('order_date', [$startDate, $endDate])
                ->with(['supplier:id,name', 'items.product:id,name,sku']);

            if ($request->supplier_id) {
                $query->where('supplier_id', $request->supplier_id);
            }

            if ($request->status) {
                $query->where('status', $request->status);
            }

            $purchaseOrders = $query->orderBy('order_date', 'desc')->get();

            $summary = [
                'period' => [
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d')
                ],
                'totals' => [
                    'total_orders' => $purchaseOrders->count(),
                    'total_value' => $purchaseOrders->sum('total_amount'),
                    'average_order_value' => $purchaseOrders->count() > 0 ? 
                        round($purchaseOrders->sum('total_amount') / $purchaseOrders->count(), 2) : 0,
                    'total_items' => $purchaseOrders->sum(function($po) { return $po->items->count(); })
                ],
                'by_status' => $purchaseOrders->groupBy('status')->map(function($statusOrders) {
                    return [
                        'count' => $statusOrders->count(),
                        'total_value' => $statusOrders->sum('total_amount'),
                        'percentage' => 0 // Will be calculated below
                    ];
                }),
                'by_supplier' => $purchaseOrders->groupBy('supplier_id')->map(function($supplierOrders) {
                    $supplier = $supplierOrders->first()->supplier;
                    return [
                        'supplier_name' => $supplier->name ?? 'Unknown',
                        'order_count' => $supplierOrders->count(),
                        'total_value' => $supplierOrders->sum('total_amount'),
                        'average_order_value' => round($supplierOrders->sum('total_amount') / $supplierOrders->count(), 2),
                        'delivery_performance' => $this->calculateSupplierDeliveryPerformance($supplierOrders)
                    ];
                })->values(),
                'delivery_performance' => $this->calculateOverallDeliveryPerformance($purchaseOrders)
            ];

            // Calculate status percentages
            $totalOrders = $purchaseOrders->count();
            if ($totalOrders > 0) {
                foreach ($summary['by_status'] as $status => &$statusData) {
                    $statusData['percentage'] = round(($statusData['count'] / $totalOrders) * 100, 2);
                }
            }

            return $this->successResponse($summary, 'Procurement report generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to generate procurement report: ' . $e->getMessage(), 500);
        }
    }
    /**
     * Calculate supplier delivery performance.
     */
    private function calculateSupplierDeliveryPerformance($orders): array
    {
        $deliveredOrders = $orders->where('status', 'delivered')->filter(function($order) {
            return $order->delivered_at && $order->expected_delivery_date;
        });

        if ($deliveredOrders->isEmpty()) {
            return ['on_time_rate' => 0, 'average_delay_days' => 0];
        }

        $onTimeOrders = $deliveredOrders->filter(function($order) {
            return $order->delivered_at->lte($order->expected_delivery_date);
        });

        $delays = $deliveredOrders->filter(function($order) {
            return $order->delivered_at->gt($order->expected_delivery_date);
        })->map(function($order) {
            return $order->expected_delivery_date->diffInDays($order->delivered_at);
        });

        return [
            'on_time_rate' => round(($onTimeOrders->count() / $deliveredOrders->count()) * 100, 2),
            'average_delay_days' => $delays->isNotEmpty() ? round($delays->avg(), 1) : 0
        ];
    }

    /**
     * Calculate overall delivery performance.
     */
    private function calculateOverallDeliveryPerformance($orders): array
    {
        $deliveredOrders = $orders->where('status', 'delivered')->filter(function($order) {
            return $order->delivered_at && $order->expected_delivery_date;
        });

        if ($deliveredOrders->isEmpty()) {
            return [
                'total_delivered' => 0,
                'on_time_deliveries' => 0,
                'on_time_rate' => 0,
                'average_cycle_time' => 0
            ];
        }

        $onTimeOrders = $deliveredOrders->filter(function($order) {
            return $order->delivered_at->lte($order->expected_delivery_date);
        });

        $cycleTimes = $deliveredOrders->map(function($order) {
            return Carbon::parse($order->order_date)->diffInDays($order->delivered_at);
        });

        return [
            'total_delivered' => $deliveredOrders->count(),
            'on_time_deliveries' => $onTimeOrders->count(),
            'on_time_rate' => round(($onTimeOrders->count() / $deliveredOrders->count()) * 100, 2),
            'average_cycle_time' => round($cycleTimes->avg(), 1)
        ];
    }

    /**
     * Get expiry report.
     */
    public function expiry(Request $request)
    {
        $this->authorize('report.inventory');

        $request->validate([
            'days_ahead' => 'nullable|integer|min:1|max:365',
            'include_expired' => 'nullable|boolean'
        ]);

        try {
            $daysAhead = $request->days_ahead ?? 60;
            $includeExpired = $request->boolean('include_expired', true);

            $query = \App\Modules\Inventory\Models\Batch::where('current_quantity', '>', 0)
                ->with('product:id,name,sku,category,unit_cost');

            if ($includeExpired) {
                $query->where('expiry_date', '<=', Carbon::now()->addDays($daysAhead));
            } else {
                $query->whereBetween('expiry_date', [Carbon::now(), Carbon::now()->addDays($daysAhead)]);
            }

            $batches = $query->orderBy('expiry_date')->get();

            $summary = [
                'report_date' => Carbon::now()->format('Y-m-d'),
                'days_ahead' => $daysAhead,
                'include_expired' => $includeExpired,
                'totals' => [
                    'total_batches' => $batches->count(),
                    'total_quantity' => $batches->sum('current_quantity'),
                    'total_value' => $batches->sum(function($batch) {
                        return $batch->current_quantity * $batch->unit_cost;
                    })
                ]
            ];

            return $this->successResponse($summary, 'Expiry report generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to generate expiry report: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get ABC analysis report.
     */
    public function abcAnalysis()
    {
        $this->authorize('report.analytics');

        try {
            $analysis = $this->analyticsService->getABCAnalysis();
            return $this->successResponse($analysis, 'ABC analysis report generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to generate ABC analysis: ' . $e->getMessage(), 500);
        }
    }
}