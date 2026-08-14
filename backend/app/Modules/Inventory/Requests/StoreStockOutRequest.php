<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Support\Enums\StockTransactionType;

class StoreStockOutRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('stock_transaction.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1|max:999999',
            'reference_type' => 'nullable|string|max:50',
            'reference_id' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
            'force_fefo' => 'boolean',
            'specific_batches' => 'array',
            'specific_batches.*.batch_id' => 'required|exists:batches,id',
            'specific_batches.*.quantity' => 'required|integer|min:1'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'product_id.required' => 'Product selection is required.',
            'product_id.exists' => 'Selected product does not exist.',
            'quantity.required' => 'Quantity is required.',
            'quantity.integer' => 'Quantity must be a whole number.',
            'quantity.min' => 'Quantity must be at least 1.',
            'quantity.max' => 'Quantity cannot exceed 999,999.',
            'specific_batches.*.batch_id.required' => 'Batch ID is required for each specific batch.',
            'specific_batches.*.batch_id.exists' => 'One or more specified batches do not exist.',
            'specific_batches.*.quantity.required' => 'Quantity is required for each specific batch.',
            'specific_batches.*.quantity.integer' => 'Batch quantities must be whole numbers.',
            'specific_batches.*.quantity.min' => 'Batch quantities must be at least 1.'
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'product_id' => 'product',
            'force_fefo' => 'force FEFO'
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Set default force_fefo to true (FEFO is default behavior)
        if (!$this->has('force_fefo')) {
            $this->merge(['force_fefo' => true]);
        }

        // Ensure specific_batches is array
        if (!$this->has('specific_batches')) {
            $this->merge(['specific_batches' => []]);
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Validate product is active
            if ($this->product_id) {
                $product = \App\Modules\Inventory\Models\Product::find($this->product_id);
                
                if ($product && !$product->is_active) {
                    $validator->errors()->add(
                        'product_id',
                        'Cannot remove stock from inactive product.'
                    );
                }

                // Check if product has sufficient stock
                if ($product && $product->available_quantity < $this->quantity) {
                    $validator->errors()->add(
                        'quantity',
                        "Insufficient stock. Available: {$product->available_quantity}, Requested: {$this->quantity}"
                    );
                }
            }

            // Validate specific batches if provided
            if (!empty($this->specific_batches)) {
                $totalSpecificQuantity = 0;
                $batchIds = [];

                foreach ($this->specific_batches as $index => $batchData) {
                    $batchId = $batchData['batch_id'] ?? null;
                    $quantity = $batchData['quantity'] ?? 0;
                    
                    $totalSpecificQuantity += $quantity;
                    
                    if ($batchId) {
                        // Check for duplicate batch IDs
                        if (in_array($batchId, $batchIds)) {
                            $validator->errors()->add(
                                "specific_batches.{$index}.batch_id",
                                'Duplicate batch specified. Each batch can only be specified once.'
                            );
                        }
                        $batchIds[] = $batchId;
                        
                        $batch = \App\Modules\Inventory\Models\Batch::find($batchId);
                        
                        if ($batch) {
                            // Validate batch belongs to product
                            if ($batch->product_id != $this->product_id) {
                                $validator->errors()->add(
                                    "specific_batches.{$index}.batch_id",
                                    'Batch does not belong to the selected product.'
                                );
                            }
                            
                            // Validate batch has sufficient quantity
                            if ($batch->available_quantity < $quantity) {
                                $validator->errors()->add(
                                    "specific_batches.{$index}.quantity",
                                    "Insufficient quantity in batch {$batch->batch_code}. Available: {$batch->available_quantity}, Requested: {$quantity}"
                                );
                            }
                            
                            // Warn about expired batches
                            if ($batch->status === \App\Support\Enums\BatchStatus::EXPIRED) {
                                $validator->warnings()->add(
                                    "specific_batches.{$index}.batch_id",
                                    "Batch {$batch->batch_code} is expired. Verify this is intentional."
                                );
                            }
                        }
                    }
                }

                // Validate total specific quantity matches requested quantity
                if ($totalSpecificQuantity != $this->quantity) {
                    $validator->errors()->add(
                        'specific_batches',
                        "Total specific batch quantities ({$totalSpecificQuantity}) must equal requested quantity ({$this->quantity})."
                    );
                }

                // If specific batches provided, force_fefo should be false
                if ($this->force_fefo) {
                    $validator->warnings()->add(
                        'force_fefo',
                        'FEFO will be disabled when specific batches are provided.'
                    );
                }
            }

            // Validate reference consistency
            if ($this->reference_type && !$this->reference_id) {
                $validator->errors()->add(
                    'reference_id',
                    'Reference ID is required when reference type is provided.'
                );
            }

            if ($this->reference_id && !$this->reference_type) {
                $validator->errors()->add(
                    'reference_type',
                    'Reference type is required when reference ID is provided.'
                );
            }

            // Validate large quantity
            if ($this->quantity > 1000) {
                $validator->warnings()->add(
                    'quantity',
                    'Large quantity detected. Verify accuracy to prevent data entry errors.'
                );
            }

            // Validate FEFO compliance if not using specific batches
            if (empty($this->specific_batches) && $this->force_fefo && $this->product_id) {
                $product = \App\Modules\Inventory\Models\Product::find($this->product_id);
                
                if ($product) {
                    $expiredBatches = $product->batches()
                        ->where('status', \App\Support\Enums\BatchStatus::EXPIRED)
                        ->where('current_quantity', '>', 0)
                        ->count();
                    
                    if ($expiredBatches > 0) {
                        $validator->warnings()->add(
                            'product_id',
                            'Product has expired batches with stock. FEFO enforcement will prioritize these for removal.'
                        );
                    }
                }
            }
        });
    }

    /**
     * Get the validated data with computed fields.
     */
    public function validatedWithDefaults(): array
    {
        $validated = $this->validated();
        
        // Add transaction type
        $validated['type'] = StockTransactionType::OUT;
        
        // Add user ID
        $validated['user_id'] = auth()->id();
        
        // Disable force_fefo if specific batches are provided
        if (!empty($validated['specific_batches'])) {
            $validated['force_fefo'] = false;
        }
        
        return $validated;
    }

    /**
     * Check if using specific batch allocation.
     */
    public function hasSpecificBatches(): bool
    {
        return !empty($this->specific_batches);
    }

    /**
     * Get specific batch allocations.
     */
    public function getSpecificBatches(): array
    {
        return $this->specific_batches ?? [];
    }

    /**
     * Check if FEFO should be enforced.
     */
    public function shouldEnforceFEFO(): bool
    {
        return $this->boolean('force_fefo') && !$this->hasSpecificBatches();
    }

    /**
     * Get the reason for stock out based on reference.
     */
    public function getStockOutReason(): string
    {
        if ($this->reference_type) {
            return match($this->reference_type) {
                'customer_order' => 'Customer order fulfillment',
                'damage_report' => 'Damaged stock removal',
                'expired' => 'Expired stock disposal',
                'transfer' => 'Stock transfer',
                'adjustment' => 'Inventory adjustment',
                'sample' => 'Product sampling',
                'return' => 'Supplier return',
                default => ucfirst($this->reference_type)
            };
        }

        return 'General stock out';
    }
}