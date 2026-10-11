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
            'counted_quantity' => 'required|integer|min:0|max:999999',
            'count_date' => 'nullable|date|before_or_equal:now',
            'count_reference' => 'nullable|string|max:255',
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
            'counted_quantity.required' => 'Counted quantity is required.',
            'counted_quantity.integer' => 'Counted quantity must be a whole number.',
            'counted_quantity.min' => 'Counted quantity cannot be negative.',
            'counted_quantity.max' => 'Counted quantity cannot exceed 999,999.',
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
            'counted_quantity' => 'counted quantity',
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

            // Check for recent counts to prevent duplicate counting
            if ($this->product_id) {
                $recentCount = \App\Modules\Inventory\Models\PhysicalCount::where('product_id', $this->product_id)
                    ->where('created_at', '>=', now()->subHours(2))
                    ->first();

                if ($recentCount) {
                    $timeDiff = $recentCount->created_at->diffInMinutes(now());
                    $validator->warnings()->add(
                        'product_id',
                        "This product was counted {$timeDiff} minutes ago. Verify this new count is necessary."
                    );
                }
            }

            // Validate reasonable quantity changes
            if ($this->product_id) {
                $product = \App\Modules\Inventory\Models\Product::find($this->product_id);
                
                if ($product) {
                    $systemQuantity = $product->quantity;
                    
                    $variance = $this->counted_quantity - $systemQuantity;
                    $variancePercent = $systemQuantity > 0 ? abs($variance / $systemQuantity) * 100 : 0;
                    
                    // Warn for large variances
                    if ($variancePercent > 50) {
                        $validator->warnings()->add(
                            'counted_quantity',
                            "Large variance detected: {$variancePercent}%. System: {$systemQuantity}, Counted: {$this->counted_quantity}. Verify count accuracy."
                        );
                    } elseif ($variancePercent > 20) {
                        $validator->warnings()->add(
                            'counted_quantity',
                            "Significant variance detected: {$variancePercent}%. System: {$systemQuantity}, Counted: {$this->counted_quantity}."
                        );
                    }

                    // Error for impossible quantities
                    if ($this->counted_quantity > ($systemQuantity * 2) && $systemQuantity > 0) {
                        $validator->errors()->add(
                            'counted_quantity',
                            "Counted quantity is more than double the system quantity. This seems unlikely - please verify."
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
            if ($this->counted_quantity > 10000) {
                $validator->warnings()->add(
                    'counted_quantity',
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
        
        // Add counter
        $validated['counted_by'] = auth()->id();
        
        // Set system quantity and variance (variance_percentage/accuracy_percentage/
        // exceeds_threshold are auto-calculated by the PhysicalCount model's
        // saving event, so they don't need to be set here)
        $systemQuantity = $this->getSystemQuantity();
        $validated['system_quantity'] = $systemQuantity;
        
        return $validated;
    }

    /**
     * Get the current system quantity for the product being counted.
     */
    public function getSystemQuantity(): int
    {
        if ($this->product_id) {
            $product = \App\Modules\Inventory\Models\Product::find($this->product_id);
            return $product ? $product->quantity : 0;
        }

        return 0;
    }

    /**
     * Check if count will require approval.
     */
    public function willRequireApproval(): bool
    {
        $systemQuantity = $this->getSystemQuantity();
        $variance = $this->counted_quantity - $systemQuantity;
        $variancePercentage = $systemQuantity > 0 ? abs($variance / $systemQuantity) * 100 : 0;
        
        // Require approval for variances > 5%
        if ($variancePercentage > 5) {
            return true;
        }
        
        // Require approval for high-value variances
        if ($this->product_id) {
            $product = \App\Modules\Inventory\Models\Product::find($this->product_id);
            if ($product && $product->unit_price > 0) {
                $valueVariance = abs($variance) * $product->unit_price;
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
        $systemQuantity = $this->getSystemQuantity();
        $variance = $this->counted_quantity - $systemQuantity;
        $variancePercentage = $systemQuantity > 0 ? abs($variance / $systemQuantity) * 100 : 0;
        
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
}
