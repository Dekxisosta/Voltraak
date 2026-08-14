<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePhysicalCountRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('physical_count.create');
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
            'batch_id' => 'nullable|exists:batches,id',
            'actual_quantity' => 'required|integer|min:0|max:999999',
            'count_date' => 'nullable|date|before_or_equal:now',
            'notes' => 'nullable|string|max:1000'
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
            'batch_id.exists' => 'Selected batch does not exist.',
            'actual_quantity.required' => 'Actual quantity is required.',
            'actual_quantity.integer' => 'Actual quantity must be a whole number.',
            'actual_quantity.min' => 'Actual quantity cannot be negative.',
            'actual_quantity.max' => 'Actual quantity cannot exceed 999,999.',
            'count_date.date' => 'Count date must be a valid date.',
            'count_date.before_or_equal' => 'Count date cannot be in the future.',
            'notes.max' => 'Notes cannot exceed 1,000 characters.'
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'product_id' => 'product',
            'batch_id' => 'batch',
            'actual_quantity' => 'actual quantity',
            'count_date' => 'count date'
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Set default count date to now if not provided
        if (!$this->has('count_date') || empty($this->count_date)) {
            $this->merge(['count_date' => now()]);
        }

        // Parse count date properly
        if ($this->has('count_date') && $this->count_date) {
            $this->merge([
                'count_date' => \Carbon\Carbon::parse($this->count_date)->format('Y-m-d H:i:s')
            ]);
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
                    $validator->warnings()->add(
                        'product_id',
                        'Counting inactive product. Verify this is intentional.'
                    );
                }
            }

            // Validate batch belongs to product
            if ($this->batch_id && $this->product_id) {
                $batch = \App\Modules\Inventory\Models\Batch::find($this->batch_id);
                
                if ($batch && $batch->product_id != $this->product_id) {
                    $validator->errors()->add(
                        'batch_id',
                        'Selected batch does not belong to the selected product.'
                    );
                }
            }

            // Check for recent counts to prevent duplicate counting
            if ($this->product_id) {
                $recentCountQuery = \App\Modules\Inventory\Models\PhysicalCount::where('product_id', $this->product_id)
                    ->where('created_at', '>=', now()->subHours(2));

                if ($this->batch_id) {
                    $recentCountQuery->where('batch_id', $this->batch_id);
                }

                $recentCount = $recentCountQuery->first();

                if ($recentCount) {
                    $timeDiff = $recentCount->created_at->diffInMinutes(now());
                    $validator->warnings()->add(
                        'product_id',
                        "This product" . ($this->batch_id ? "/batch" : "") . " was counted {$timeDiff} minutes ago. Verify this new count is necessary."
                    );
                }
            }

            // Validate reasonable quantity changes
            if ($this->product_id) {
                $product = \App\Modules\Inventory\Models\Product::find($this->product_id);
                
                if ($product) {
                    $expectedQuantity = $this->batch_id 
                        ? optional(\App\Modules\Inventory\Models\Batch::find($this->batch_id))->current_quantity ?? 0
                        : $product->current_quantity;
                    
                    $variance = $this->actual_quantity - $expectedQuantity;
                    $variancePercent = $expectedQuantity > 0 ? abs($variance / $expectedQuantity) * 100 : 0;
                    
                    // Warn for large variances
                    if ($variancePercent > 50) {
                        $validator->warnings()->add(
                            'actual_quantity',
                            "Large variance detected: {$variancePercent}%. Expected: {$expectedQuantity}, Actual: {$this->actual_quantity}. Verify count accuracy."
                        );
                    } elseif ($variancePercent > 20) {
                        $validator->warnings()->add(
                            'actual_quantity',
                            "Significant variance detected: {$variancePercent}%. Expected: {$expectedQuantity}, Actual: {$this->actual_quantity}."
                        );
                    }

                    // Error for impossible quantities
                    if ($this->actual_quantity > ($expectedQuantity * 2) && $expectedQuantity > 0) {
                        $validator->errors()->add(
                            'actual_quantity',
                            "Actual quantity is more than double the expected quantity. This seems unlikely - please verify."
                        );
                    }
                }
            }

            // Validate count date is not too far in the past
            if ($this->count_date) {
                $countDate = \Carbon\Carbon::parse($this->count_date);
                $daysPast = $countDate->diffInDays(now(), false);
                
                if ($daysPast > 7) {
                    $validator->warnings()->add(
                        'count_date',
                        "Count date is {$daysPast} days old. Consider if this historical count is still relevant."
                    );
                } elseif ($daysPast > 1) {
                    $validator->warnings()->add(
                        'count_date',
                        "Count date is {$daysPast} days old. Ensure no stock movements occurred since then."
                    );
                }
            }

            // Validate very large quantities
            if ($this->actual_quantity > 10000) {
                $validator->warnings()->add(
                    'actual_quantity',
                    'Very large quantity detected. Verify accuracy to prevent data entry errors.'
                );
            }
        });
    }

    /**
     * Get the validated data with computed fields.
     */
    public function validatedWithDefaults(): array
    {
        $validated = $this->validated();
        
        // Add user ID
        $validated['user_id'] = auth()->id();
        
        // Calculate expected quantity and variance
        $expectedQuantity = $this->getExpectedQuantity();
        $variance = $validated['actual_quantity'] - $expectedQuantity;
        $variancePercentage = $expectedQuantity > 0 ? ($variance / $expectedQuantity) * 100 : 0;
        
        $validated['expected_quantity'] = $expectedQuantity;
        $validated['variance'] = $variance;
        $validated['variance_percentage'] = round($variancePercentage, 2);
        
        return $validated;
    }

    /**
     * Get expected quantity for the count.
     */
    public function getExpectedQuantity(): int
    {
        if ($this->batch_id) {
            $batch = \App\Modules\Inventory\Models\Batch::find($this->batch_id);
            return $batch ? $batch->current_quantity : 0;
        }

        if ($this->product_id) {
            $product = \App\Modules\Inventory\Models\Product::find($this->product_id);
            return $product ? $product->current_quantity : 0;
        }

        return 0;
    }

    /**
     * Check if count will require approval.
     */
    public function willRequireApproval(): bool
    {
        $expectedQuantity = $this->getExpectedQuantity();
        $variance = $this->actual_quantity - $expectedQuantity;
        $variancePercentage = $expectedQuantity > 0 ? abs($variance / $expectedQuantity) * 100 : 0;
        
        // Require approval for variances > 5%
        if ($variancePercentage > 5) {
            return true;
        }
        
        // Require approval for high-value variances
        if ($this->product_id) {
            $product = \App\Modules\Inventory\Models\Product::find($this->product_id);
            if ($product && $product->unit_cost > 0) {
                $valueVariance = abs($variance) * $product->unit_cost;
                if ($valueVariance > 500) { // ₱500+ variance
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Get variance severity level.
     */
    public function getVarianceSeverity(): string
    {
        $expectedQuantity = $this->getExpectedQuantity();
        $variance = $this->actual_quantity - $expectedQuantity;
        $variancePercentage = $expectedQuantity > 0 ? abs($variance / $expectedQuantity) * 100 : 0;
        
        if ($variancePercentage >= 20) {
            return 'critical';
        } elseif ($variancePercentage >= 10) {
            return 'high';
        } elseif ($variancePercentage >= 5) {
            return 'medium';
        } elseif ($variancePercentage > 0) {
            return 'low';
        }
        
        return 'none';
    }

    /**
     * Check if count is for a specific batch.
     */
    public function isBatchCount(): bool
    {
        return !is_null($this->batch_id);
    }
}