<?php

namespace App\Core\Shared;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use App\Core\Exceptions\ValidationException as ApiValidationException;

/**
 * Centralized validation service for business rules
 */
class ValidationService
{
    /**
     * Validate stock transaction data
     */
    public function validateStockTransaction(array $data): array
    {
        $rules = [
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'type' => 'required|string|in:in,out,transfer,return,adjustment',
            'batch_id' => 'nullable|integer|exists:batches,id',
            'reference_number' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500',
        ];

        return $this->validate($data, $rules);
    }

    /**
     * Validate product data
     */
    public function validateProduct(array $data, ?int $productId = null): array
    {
        $skuRule = 'required|string|max:50|unique:products,sku';
        if ($productId) {
            $skuRule .= ",{$productId}";
        }

        $rules = [
            'name' => 'required|string|max:255',
            'sku' => $skuRule,
            'category' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:1000',
            'unit_price' => 'required|numeric|min:0',
            'reorder_level' => 'required|integer|min:0',
            'max_stock_level' => 'nullable|integer|min:0',
            'is_seasonal' => 'boolean',
            'shelf_life_days' => 'nullable|integer|min:1',
            'storage_bin' => 'nullable|string|max:20',
            'barcode' => 'nullable|string|max:50',
        ];

        return $this->validate($data, $rules);
    }

    /**
     * Validate batch data
     */
    public function validateBatch(array $data): array
    {
        $rules = [
            'product_id' => 'required|integer|exists:products,id',
            'batch_number' => 'required|string|max:50',
            'quantity' => 'required|integer|min:0',
            'manufacture_date' => 'nullable|date|before_or_equal:today',
            'expiry_date' => 'nullable|date|after:manufacture_date',
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier_batch_number' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500',
        ];

        return $this->validate($data, $rules);
    }

    /**
     * Validate physical count data
     */
    public function validatePhysicalCount(array $data): array
    {
        $rules = [
            'product_id' => 'required|integer|exists:products,id',
            'counted_quantity' => 'required|integer|min:0',
            'count_reference' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500',
        ];

        return $this->validate($data, $rules);
    }

    /**
     * Validate supplier data
     */
    public function validateSupplier(array $data, ?int $supplierId = null): array
    {
        $codeRule = 'nullable|string|max:20|unique:suppliers,code';
        if ($supplierId) {
            $codeRule .= ",{$supplierId}";
        }

        $rules = [
            'name' => 'required|string|max:255',
            'code' => $codeRule,
            'contact_person' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'default_lead_time_days' => 'required|integer|min:1|max:365',
            'payment_terms' => 'required|string|in:cash,net_15,net_30,net_60',
            'notes' => 'nullable|string|max:1000',
        ];

        return $this->validate($data, $rules);
    }

    /**
     * Validate purchase order data
     */
    public function validatePurchaseOrder(array $data): array
    {
        $rules = [
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'expected_delivery_date' => 'nullable|date|after:today',
            'terms_and_conditions' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.specifications' => 'nullable|string|max:500',
            'items.*.notes' => 'nullable|string|max:500',
        ];

        return $this->validate($data, $rules);
    }

    /**
     * Validate user data
     */
    public function validateUser(array $data, ?int $userId = null): array
    {
        $emailRule = 'required|email|max:255|unique:users,email';
        if ($userId) {
            $emailRule .= ",{$userId}";
        }

        $rules = [
            'name' => 'required|string|max:255',
            'email' => $emailRule,
            'password' => $userId ? 'nullable|string|min:8' : 'required|string|min:8',
            'role' => 'required|string|in:warehouse,inventory,manager',
        ];

        return $this->validate($data, $rules);
    }

    /**
     * Validate damage report data
     */
    public function validateDamageReport(array $data): array
    {
        $rules = [
            'product_id' => 'required|integer|exists:products,id',
            'batch_id' => 'nullable|integer|exists:batches,id',
            'quantity_damaged' => 'required|integer|min:1',
            'damage_type' => 'required|string|in:expired,physical,water,theft,other',
            'description' => 'required|string|max:1000',
            'estimated_value' => 'nullable|numeric|min:0',
            'photo_path' => 'nullable|string|max:500',
        ];

        return $this->validate($data, $rules);
    }

    /**
     * Validate discrepancy report data
     */
    public function validateDiscrepancyReport(array $data): array
    {
        $rules = [
            'product_id' => 'required|integer|exists:products,id',
            'batch_id' => 'nullable|integer|exists:batches,id',
            'type' => 'required|string|in:receiving,picking,counting,system',
            'expected_quantity' => 'required|integer|min:0',
            'actual_quantity' => 'required|integer|min:0',
            'description' => 'required|string|max:1000',
        ];

        return $this->validate($data, $rules);
    }

    /**
     * Validate customer order data
     */
    public function validateCustomerOrder(array $data): array
    {
        $rules = [
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'customer_address' => 'nullable|string|max:500',
            'required_date' => 'nullable|date|after:today',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:500',
        ];

        return $this->validate($data, $rules);
    }

    /**
     * Generic validation method
     */
    private function validate(array $data, array $rules): array
    {
        try {
            $validator = Validator::make($data, $rules);
            
            if ($validator->fails()) {
                throw new ApiValidationException(
                    'Validation failed',
                    $validator->errors()->toArray()
                );
            }

            return $validator->validated();
        } catch (ValidationException $e) {
            throw new ApiValidationException(
                'Validation failed',
                $e->errors()
            );
        }
    }

    /**
     * Validate business rules for stock operations
     */
    public function validateStockOperation(array $data): void
    {
        // Check if trying to issue more stock than available
        if ($data['type'] === 'out' && isset($data['current_stock'])) {
            if ($data['quantity'] > $data['current_stock']) {
                throw new ApiValidationException(
                    'Insufficient stock available',
                    ['quantity' => ['Cannot issue more stock than available']]
                );
            }
        }

        // Validate FEFO compliance if batch is specified
        if (isset($data['batch_id']) && isset($data['earlier_batches']) && !empty($data['earlier_batches'])) {
            throw new ApiValidationException(
                'FEFO violation',
                ['batch_id' => ['Must pick from earliest expiring batch first']]
            );
        }

        // Validate expiry date for expired batches
        if (isset($data['batch_status']) && $data['batch_status'] === 'expired') {
            throw new ApiValidationException(
                'Expired batch operation',
                ['batch_id' => ['Cannot perform operations on expired batches']]
            );
        }
    }

    /**
     * Validate variance threshold
     */
    public function validateVarianceThreshold(float $variancePercentage, float $threshold = 5.0): bool
    {
        return abs($variancePercentage) <= $threshold;
    }

    /**
     * Validate seasonal adjustment factors
     */
    public function validateSeasonalFactor(float $factor): bool
    {
        // Seasonal factors should be between 0.1 and 5.0 (10% to 500% of normal demand)
        return $factor >= 0.1 && $factor <= 5.0;
    }
}