# P3 Reporting Fixes Implementation Plan

## Overview

This plan addresses critical reporting bugs discovered after P0 (security), P1 (stock integrity), and P2 (workflow states) completion. The fixes target five areas: PO status mismatches, KPI formula errors, divide-by-zero crashes, inconsistent alert definitions, and unwired reorder calculations.

## Prerequisites

- P0, P1, P2 must be completed and committed
- Laravel dependencies installed (`composer install`)
- Database migrated and seeded
- Tests passing: `./vendor/bin/phpunit --testsuite=Feature`

## Task Breakdown

### T24 - PO Status Mismatch (CRITICAL FOR REPORTS)

**Problem**: Reports filter RECEIVED only but RECEIVED=partial receipt, COMPLETED=full receipt. Spend/concentration queries miss completed orders.

**Files to modify**:
- `app/Modules/Reporting/Services/DashboardService.php`
- `app/Modules/Reporting/Services/AnalyticsService.php`
- `app/Modules/Procurement/Services/ReorderPointCalculator.php`

**Changes needed**:

1. **DashboardService.php**:
   - Line 288: Change `->where('status', PurchaseOrderStatus::RECEIVED)` to `->whereIn('status', [PurchaseOrderStatus::RECEIVED, PurchaseOrderStatus::COMPLETED])`
   - Line 296: Same change for previous period query
   - Line 347: Change `->whereIn('status', [PurchaseOrderStatus::APPROVED, PurchaseOrderStatus::SENT, PurchaseOrderStatus::RECEIVED])` to include COMPLETED
   - Line 587: Change `$deliveredOrders = $orders->where('status', PurchaseOrderStatus::RECEIVED);` to `$deliveredOrders = $orders->whereIn('status', [PurchaseOrderStatus::RECEIVED, PurchaseOrderStatus::COMPLETED]);`

2. **AnalyticsService.php**:
   - Line 356: Change `$deliveredOrders = $orders->where('status', PurchaseOrderStatus::RECEIVED)->count();` to include COMPLETED
   - Line 394: Change `PurchaseOrder::where('status', PurchaseOrderStatus::RECEIVED)` to include COMPLETED
   - Line 456: Change `PurchaseOrder::where('status', PurchaseOrderStatus::RECEIVED)` to include COMPLETED
   - Lines 508, 512: Include COMPLETED in spend calculation status filters

**Verification**: Run `./vendor/bin/phpunit tests/Feature/Reporting/ProcurementReportsTest.php` - all tests pass

---

### T25 - KPI Formula Fixes (CRITICAL FOR ACCURACY)

**Files to modify**:
- `app/Modules/Reporting/Services/AnalyticsService.php`
- `app/Modules/Reporting/Services/DashboardService.php`

**Specific fixes needed**:

#### 1. Shrinkage Rate (AnalyticsService.php, lines 118-140)
**Problem**: Always 0 because checks `quantity < 0` but adjustments store signed values
**Fix**: 
```php
// Replace line 124-126:
$shrinkageTransactions = StockTransaction::where('type', StockTransactionType::ADJUSTMENT)
    ->whereBetween('created_at', [$startDate, $endDate])
    ->where('quantity', '<', 0) // Negative adjustments (signed)
    ->get();

// Also fix line 129-131 to use period calculation not cumulative:
$totalShrinkageValue = $shrinkageTransactions->sum(function ($transaction) {
    return abs($transaction->quantity * $transaction->unit_cost);
});

// Replace total inventory denominator with period movement value
```

#### 2. Accuracy Variance Value (AnalyticsService.php, line 48-49)
**Problem**: Uses `$count->product->unit_cost` which doesn't exist
**Fix**: Replace `unit_cost` with `unit_price`

#### 3. Pending Variance Approvals (DashboardService.php, line 438)
**Problem**: Missing `variance_approved = false` filter
**Fix**: 
```php
return \App\Modules\Inventory\Models\PhysicalCount::where('created_at', '>=', Carbon::now()->subDays(7))
    ->whereRaw('ABS(variance_percentage) > 5')
    ->where('variance_approved', false) // Add this filter
    ->count();
```

#### 4. Accuracy Trend Missing Parameter (DashboardService.php, line 553)
**Problem**: `getWeeklyAccuracy()` calls need `weekEnd` parameter
**Fix**: Pass end date parameter to accuracy calculations

#### 5. Turnover and DSI Annualisation (AnalyticsService.php, lines 67-87)
**Problem**: Not annualised, uses ending inventory not average
**Fix**: 
```php
// Annualise the turnover calculation
$periodDays = $startDate->diffInDays($endDate);
$annualizedCogs = $cogs * (365 / $periodDays);

// Use average inventory (simplified - would need historical data for precision)
$averageInventoryValue = $currentInventoryValue; // TODO: Implement historical average

$turnoverRate = $averageInventoryValue > 0 ? $annualizedCogs / $averageInventoryValue : 0;
```

#### 6. Stockout Rate and Service Level (AnalyticsService.php, lines 146-175, 192-222)
**Problem**: Counting completed sales as unmet demand
**Fix**: Implement proper denied/unfulfilled demand tracking, exclude completed transactions from stockout calculations

#### 7. FEFO Compliance N+1 Queries (AnalyticsService.php, lines 237-290)
**Problem**: Per-row queries in violation detection
**Fix**: Eager load relationships and use batch processing for violation checks

#### 8. Net Movement Trend Signed Values (AnalyticsService.php)
**Problem**: Uses absolute values instead of signed adjustments  
**Fix**: Use `impact` attribute or signed quantity for trend calculations

#### 9. Expiry Waste Filter (AnalyticsService.php, lines 292-330)
**Problem**: Filters by `created_at` instead of `reference_type='batch_expiry'`
**Fix**: 
```php
// Replace the expiry waste query to filter by reference_type
$expiryWasteTransactions = StockTransaction::where('type', StockTransactionType::ADJUSTMENT)
    ->where('reference_type', 'batch_expiry')
    ->whereBetween('created_at', [$startDate, $endDate])
    ->with('product', 'batch')
    ->get();
```

#### 10. Cost Savings Stub (AnalyticsService.php, lines 442-451)
**Fix**: Document as TODO and return proper structure:
```php
return [
    'total_savings' => 0, // TODO: Implement with baseline pricing data
    'savings_percentage' => 0, // TODO: Calculate vs historical pricing
    'savings_by_category' => [], // TODO: Group by product categories  
    'negotiation_impact' => 0, // TODO: Track negotiated vs list prices
    'implementation_status' => 'not_implemented'
];
```

**Verification**: Run accuracy and KPI tests - `./vendor/bin/phpunit tests/Feature/Reporting/AnalyticsServiceTest.php`

---

### T26 - Divide-by-Zero Guards

**Files to modify**:
- `app/Modules/Reporting/Services/AnalyticsService.php`
- `app/Modules/Procurement\Services\ReorderPointCalculator.php`

**Specific crash sites to fix**:

#### 1. ABC Analysis (AnalyticsService.php, lines 596-650)
**Problem**: `$products->count()` and `$totalValue` can be 0
**Fix**:
```php
public function getABCAnalysis(): array
{
    $products = Product::where('is_active', true)
        ->selectRaw('id, name, sku, unit_price, quantity, (unit_price * quantity) as total_value')
        ->orderBy('total_value', 'desc')
        ->get();

    if ($products->isEmpty()) {
        return [
            'total_products' => 0,
            'total_value' => 0,
            'category_breakdown' => [
                'A' => ['count' => 0, 'percentage' => 0, 'value_percentage' => 0],
                'B' => ['count' => 0, 'percentage' => 0, 'value_percentage' => 0],
                'C' => ['count' => 0, 'percentage' => 0, 'value_percentage' => 0]
            ],
            'products' => []
        ];
    }

    $totalValue = $products->sum('total_value');
    
    // Guard against zero total value
    if ($totalValue == 0) {
        // All products have zero value - assign evenly to C category
        return $this->getZeroValueABCAnalysis($products);
    }
    
    // Continue with normal analysis...
}
```

#### 2. Lead Time Analysis (ReorderPointCalculator.php, line 201)
**Problem**: `sqrt(var) / $averageLeadTime` division when `$averageLeadTime=0`
**Fix**:
```php
private function calculateVariance(Collection $values): float
{
    if ($values->count() < 2) {
        return 0;
    }
    
    $mean = $values->avg();
    
    // Guard against zero mean for percentage calculations
    if ($mean == 0) {
        return 0;
    }
    
    $squaredDifferences = $values->map(function ($value) use ($mean) {
        return pow($value - $mean, 2);
    });
    
    return $squaredDifferences->sum() / ($values->count() - 1);
}

// In analyzeLeadTime method, add guard:
$averageLeadTime = $leadTimes->avg();
$leadTimeVariance = $this->calculateVariance($leadTimes);

// Calculate reliability factor based on variance with division guard
$reliabilityFactor = $averageLeadTime > 0 
    ? 1 + (sqrt($leadTimeVariance) / $averageLeadTime)
    : 1.2; // Default 20% buffer
```

**Verification**: Run `./vendor/bin/phpunit tests/Unit/ReorderPointCalculatorTest.php` with edge cases

---

### T27 - Consistent Alert Definitions and URLs

**Files to modify**:
- `app/Modules/Reporting/Services/DashboardService.php`

**Fixes needed**:

#### 1. Low Stock Definition Consistency (lines 123-136 vs 706-715)
**Problem**: Executive excludes zero-stock, manager/staff include it
**Fix**: Standardize to one definition across all dashboard methods:
```php
// Replace inconsistent low stock queries with:
$lowStockCount = Product::where('is_active', true)
    ->whereRaw('quantity <= reorder_level') 
    ->where('reorder_level', '>', 0)
    ->where('quantity', '>=', 0) // Include zero stock consistently
    ->count();
```

#### 2. Expiry Warning Days Configuration (lines 143-150)
**Problem**: Hardcoded 30 days instead of config value
**Fix**: 
```php
$warningDays = config('ims.expiry.warning_days', 60);
$expiringBatchesCount = Batch::where('expiry_date', '<=', Carbon::now()->addDays($warningDays))
    ->where('quantity', '>', 0)
    ->count();
```

#### 3. Alert Overlap Prevention (lines 143-165)
**Problem**: Overlap between 'expiring soon' and 'expired' alerts
**Fix**:
```php
// Expiring batches (not expired yet)
$expiringBatchesCount = Batch::whereBetween('expiry_date', [Carbon::now(), Carbon::now()->addDays($warningDays)])
    ->where('quantity', '>', 0)
    ->count();

// Expired batches (clearly separated)
$expiredBatchesCount = Batch::where('expiry_date', '<', Carbon::now())
    ->where('quantity', '>', 0)
    ->count();
```

#### 4. Action URL Updates (all alert generation methods)
**Problem**: Dead `action_urls` pointing to non-existent routes
**Fix**: Replace with real inventory tabs:
```php
'action_url' => '/inventory?tab=products&filter=out_of_stock',
'action_url' => '/inventory?tab=products&filter=low_stock', 
'action_url' => '/inventory?tab=batches&filter=expiring_soon',
'action_url' => '/inventory?tab=batches&filter=expired',
'action_url' => '/procurement?tab=orders&filter=overdue',
'action_url' => '/procurement?tab=requests&filter=urgent',
```

**Verification**: Test dashboard API endpoints return consistent alerts and valid URLs

---

### T28 - Wire Up Reorder Calculator

**Files to modify**:
- `app/Modules/Procurement/Services/ProcurementService.php`
- `config/ims.php`
- `routes/api.php`  
- `app/Modules/Procurement/Routes/api.php`
- `app/Console/Commands/CalculateReorderPoints.php` (new)

**Changes needed**:

#### 1. Add Missing Caller (ProcurementService.php, lines 294-332)
**Problem**: `calculateReorderPoints` method exists but no caller
**Fix**: Add route and command that calls it:
```php
// In ProcurementService.php, add public method:
public function updateReorderPointsForProducts(?Collection $products = null): array
{
    $results = $this->calculateReorderPoints($products);
    
    $updated = 0;
    foreach ($results as $result) {
        $product = $result['product'];
        $newReorderPoint = $result['calculated_reorder_point'];
        
        if ($product->reorder_level !== $newReorderPoint) {
            $product->reorder_level = $newReorderPoint;
            $product->save();
            $updated++;
        }
    }
    
    return [
        'analyzed_products' => count($results),
        'updated_products' => $updated,
        'results' => $results
    ];
}
```

#### 2. Fix Request Generation Logic (ProcurementService.php, lines 133-170)
**Problem**: Uses `2×reorder_level−quantity` instead of calling calculator
**Fix**: Replace manual calculation with actual reorder point calculation

#### 3. Add Missing Analytics Columns Update
**Problem**: `avg_daily_usage`, `lead_time_days`, `safety_stock`, `reorder_point` columns never filled
**Fix**: Update product analytics columns when calculating reorder points

#### 4. Enforce Min History Days (config and validation)
**Problem**: `min_history_days` config not enforced  
**Fix**: Add validation in calculator methods to require minimum history

#### 5. Fix Seasonal Factor Edge Case
**Problem**: Extreme values on one-day spans
**Fix**: Clamp seasonal factor between 0.5 and 2.0, add minimum period validation

#### 6. Use Available Quantity (ProcurementService.php)
**Problem**: Low-stock check uses `quantity` not `available_quantity`
**Fix**: Update low stock detection to use `available_quantity` (accounting for reservations)

#### 7. Add Artisan Command (new file)
**Create**: `app/Console/Commands/CalculateReorderPoints.php`
```php
<?php

namespace App\Console\Commands;

use App\Modules\Procurement\Services\ProcurementService;
use Illuminate\Console\Command;

class CalculateReorderPoints extends Command
{
    protected $signature = 'reorder:calculate {--product=* : Specific product IDs} {--update : Apply calculated reorder points}';
    protected $description = 'Calculate optimal reorder points for products';
    
    public function handle(ProcurementService $procurementService)
    {
        // Implementation here...
    }
}
```

#### 8. Add API Routes
**Add to**: `app/Modules/Procurement/Routes/api.php`
```php
Route::prefix('reorder')->name('reorder.')->group(function () {
    Route::get('/calculate', [ProcurementController::class, 'calculateReorderPoints'])->name('calculate');
    Route::post('/update', [ProcurementController::class, 'updateReorderPoints'])->name('update');
    Route::get('/recommendations/{product}', [ProcurementController::class, 'getReorderRecommendations'])->name('recommendations');
});
```

**Verification**: 
- Test command: `php artisan reorder:calculate --update`
- Test API: `GET /api/v1/procurement/reorder/calculate`
- Verify analytics columns populated

---

## Implementation Order

1. **T26** (Divide-by-zero guards) - Fix crashes first
2. **T24** (PO status mismatch) - Fix data inconsistencies  
3. **T25** (KPI formulas) - Fix calculation accuracy
4. **T27** (Alert definitions) - Standardize UI/UX
5. **T28** (Wire reorder calculator) - Complete missing functionality

## Testing Strategy

**Unit Tests**: 
- `tests/Unit/AnalyticsServiceTest.php` - KPI calculations
- `tests/Unit/ReorderPointCalculatorTest.php` - Edge cases

**Feature Tests**:
- `tests/Feature/Reporting/DashboardTest.php` - Dashboard consistency  
- `tests/Feature/Reporting/ProcurementReportsTest.php` - PO status fixes
- `tests/Feature/Procurement/ReorderCalculationTest.php` - Calculator integration

**Verification Commands**:
```bash
# Run all reporting tests
./vendor/bin/phpunit tests/Feature/Reporting/

# Test specific KPI calculations
./vendor/bin/phpunit --filter=AnalyticsService

# Test reorder point calculation
php artisan reorder:calculate --product=1

# Test dashboard APIs
curl -H "Authorization: Bearer $TOKEN" http://localhost/api/v1/reporting/dashboard/executive
```

## Rollback Plan

Each task creates atomic commits that can be reverted:
```bash
git revert <commit-hash>  # Revert specific task
git reset --hard HEAD~5   # Revert all P3 changes (emergency)
```

## Post-Implementation Validation

1. **KPI Dashboard** - All metrics show non-zero, realistic values
2. **PO Reports** - Include both RECEIVED and COMPLETED orders  
3. **Alerts** - Consistent definitions, working URLs
4. **Reorder System** - Calculator accessible via API/command
5. **No Crashes** - All dashboard endpoints handle edge cases

## Success Criteria

- [ ] All dashboard APIs return HTTP 200 with valid data
- [ ] KPI calculations produce accurate, non-zero values where expected
- [ ] PO completion rates include both RECEIVED and COMPLETED statuses
- [ ] Reorder point calculator is accessible and functional
- [ ] All tests pass: `./vendor/bin/phpunit --testsuite=Feature`
- [ ] No divide-by-zero errors in error logs after 24h production use