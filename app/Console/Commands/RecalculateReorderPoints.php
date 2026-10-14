<?php

namespace App\Console\Commands;

use App\Modules\Inventory\Models\Product;
use App\Modules\Procurement\Services\ReorderPointCalculator;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

class RecalculateReorderPoints extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'reorder:recalculate 
                            {--product=* : Specific product IDs to recalculate} 
                            {--dry-run : Show what would be changed without updating} 
                            {--min-history=30 : Minimum history days required}';

    /**
     * The console command description.
     */
    protected $description = 'Recalculate optimal reorder points for products using demand and lead time analysis';

    public function __construct(
        private ReorderPointCalculator $calculator
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting reorder point recalculation...');
        
        $productIds = $this->option('product');
        $isDryRun = $this->option('dry-run');
        $minHistoryDays = (int) $this->option('min-history');
        
        // Get products to analyze
        $productsQuery = Product::where('is_active', true);
        
        if (!empty($productIds)) {
            $productsQuery->whereIn('id', $productIds);
        }
        
        $products = $productsQuery->get();
        
        if ($products->isEmpty()) {
            $this->error('No active products found to analyze');
            return 1;
        }
        
        $this->info("Analyzing {$products->count()} products...");
        
        $updated = 0;
        $skipped = 0;
        $errors = 0;
        
        $progressBar = $this->output->createProgressBar($products->count());
        
        foreach ($products as $product) {
            try {
                // Check minimum history requirement
                $demandAnalysis = $this->calculator->analyzeDemand($product, $minHistoryDays);
                
                if ($demandAnalysis['transaction_count'] < $minHistoryDays / 7) { // Need at least weekly data
                    $this->line("Skipping {$product->name}: insufficient history ({$demandAnalysis['transaction_count']} transactions)");
                    $skipped++;
                    $progressBar->advance();
                    continue;
                }
                
                $currentReorderPoint = $product->reorder_point ?? $product->reorder_level ?? 0;
                $calculatedReorderPoint = $this->calculator->calculateReorderPoint($product);
                
                // Clamp extreme values
                $calculatedReorderPoint = max(1, min($calculatedReorderPoint, $product->quantity * 2));
                
                if ($isDryRun) {
                    $this->line("Would update {$product->name}: {$currentReorderPoint} → {$calculatedReorderPoint}");
                } else {
                    if ($currentReorderPoint != $calculatedReorderPoint) {
                        $product->reorder_point = $calculatedReorderPoint;
                        
                        // Update analytics columns if they exist
                        if ($product->getConnection()->getSchemaBuilder()->hasColumn('products', 'avg_daily_usage')) {
                            $product->avg_daily_usage = $demandAnalysis['average_daily_demand'];
                        }
                        
                        if ($product->getConnection()->getSchemaBuilder()->hasColumn('products', 'lead_time_days')) {
                            $leadTimeAnalysis = $this->calculator->analyzeLeadTime($product);
                            $product->lead_time_days = $leadTimeAnalysis['average_lead_time'];
                        }
                        
                        $product->save();
                        $updated++;
                        
                        $this->line("Updated {$product->name}: {$currentReorderPoint} → {$calculatedReorderPoint}");
                    }
                }
                
            } catch (\Exception $e) {
                $this->error("Error processing {$product->name}: " . $e->getMessage());
                $errors++;
            }
            
            $progressBar->advance();
        }
        
        $progressBar->finish();
        $this->newLine(2);
        
        // Summary
        $this->info('Recalculation completed!');
        $this->table([
            ['Metric', 'Count']
        ], [
            ['Products analyzed', $products->count()],
            ['Updated', $updated],
            ['Skipped (insufficient data)', $skipped], 
            ['Errors', $errors]
        ]);
        
        if ($isDryRun) {
            $this->warn('This was a dry run. Use --no-dry-run to apply changes.');
        }
        
        return $errors > 0 ? 1 : 0;
    }
}