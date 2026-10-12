<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePhysicalCountRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('physical_count.update');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'counted_quantity' => 'sometimes|required|integer|min:0|max:999999',
            'count_date' => 'sometimes|nullable|date|before_or_equal:now',
            'count_reference' => 'sometimes|nullable|string|max:255',
            'notes' => 'sometimes|nullable|string|max:1000'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
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
            'counted_quantity' => 'counted quantity',
            'count_date' => 'count date'
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Parse count date properly if provided
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
            $physicalCount = $this->route('physicalCount');

            // Validate quantity changes
            if ($this->has('counted_quantity')) {
                $oldQuantity = $physicalCount->counted_quantity;
                $newQuantity = $this->counted_quantity;
                $systemQuantity = $physicalCount->system_quantity;
                
                // Calculate new variance
                $newVariance = $newQuantity - $systemQuantity;
                $newVariancePercentage = $systemQuantity > 0 ? abs($newVariance / $systemQuantity) * 100 : 0;
                
                // Warn about large changes
                if (abs($newQuantity - $oldQuantity) > 100) {
                    $validator->warnings()->add(
                        'counted_quantity',
                        "Large change in counted quantity: {$oldQuantity} → {$newQuantity}. Verify accuracy."
                    );
                }
                
                // Warn about increasing variance
                $oldVariance = $physicalCount->variance;
                if (abs($newVariance) > abs($oldVariance)) {
                    $validator->warnings()->add(
                        'counted_quantity',
                        "New variance ({$newVariance}) is larger than previous variance ({$oldVariance})."
                    );
                }
                
                // Error for impossible quantities
                if ($newQuantity > ($systemQuantity * 2) && $systemQuantity > 0) {
                    $validator->errors()->add(
                        'counted_quantity',
                        "Counted quantity is more than double the system quantity. This seems unlikely - please verify."
                    );
                }
                
                // Warn for very large variances
                if ($newVariancePercentage > 50) {
                    $validator->warnings()->add(
                        'counted_quantity',
                        "Large variance: {$newVariancePercentage}%. System: {$systemQuantity}, New Counted: {$newQuantity}."
                    );
                }
            }

            // Validate count date changes
            if ($this->has('count_date')) {
                $oldDate = $physicalCount->count_date;
                $newDate = \Carbon\Carbon::parse($this->count_date);
                
                // Warn about significant date changes
                $daysDiff = abs($oldDate->diffInDays($newDate));
                if ($daysDiff > 1) {
                    $validator->warnings()->add(
                        'count_date',
                        "Count date changed by {$daysDiff} days: {$oldDate->format('M d, Y')} → {$newDate->format('M d, Y')}."
                    );
                }
                
                // Check if new date conflicts with stock transactions
                if ($physicalCount->product_id) {
                    $conflictingTransactions = \App\Modules\Inventory\Models\StockTransaction::where('product_id', $physicalCount->product_id)
                        ->whereBetween('created_at', [
                            min($oldDate, $newDate),
                            max($oldDate, $newDate)
                        ])
                        ->exists();
                    
                    if ($conflictingTransactions) {
                        $validator->warnings()->add(
                            'count_date',
                            'Stock transactions exist between old and new count dates. This may affect variance calculations.'
                        );
                    }
                }
            }

            // Validate very large quantities
            if ($this->has('counted_quantity') && $this->counted_quantity > 10000) {
                $validator->warnings()->add(
                    'counted_quantity',
                    'Very large quantity detected. Verify accuracy to prevent data entry errors.'
                );
            }
        });
    }

    /**
     * Get the validated data.
     *
     * Note: variance/variance_percentage/accuracy_percentage/exceeds_threshold
     * are recalculated automatically by the PhysicalCount model's saving
     * event - they don't need to be set here.
     */
    public function validatedWithRecalculation(): array
    {
        return $this->validated();
    }

    /**
     * Get the changes being made to the physical count.
     */
    public function getChanges(): array
    {
        $physicalCount = $this->route('physicalCount');
        $changes = [];
        
        foreach ($this->validated() as $field => $newValue) {
            $oldValue = $physicalCount->$field;
            
            if ($oldValue != $newValue) {
                $changes[$field] = [
                    'old' => $oldValue,
                    'new' => $newValue
                ];
            }
        }
        
        return $changes;
    }

    /**
     * Check if the update will require re-approval.
     */
    public function willRequireReapproval(): bool
    {
        if (!$this->has('counted_quantity')) {
            return false;
        }
        
        $physicalCount = $this->route('physicalCount');
        $systemQuantity = $physicalCount->system_quantity;
        $newVariance = $this->counted_quantity - $systemQuantity;
        $newVariancePercentage = $systemQuantity > 0 ? abs($newVariance / $systemQuantity) * 100 : 0;
        
        // Require re-approval for significant variances
        if ($newVariancePercentage > 5) {
            return true;
        }
        
        // Require re-approval for high-value variances
        if ($physicalCount->product && $physicalCount->product->unit_price > 0) {
            $valueVariance = abs($newVariance) * $physicalCount->product->unit_price;
            if ($valueVariance > 500) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get the new variance severity level.
     */
    public function getNewVarianceSeverity(): string
    {
        if (!$this->has('counted_quantity')) {
            return 'unchanged';
        }
        
        $physicalCount = $this->route('physicalCount');
        $systemQuantity = $physicalCount->system_quantity;
        $newVariance = $this->counted_quantity - $systemQuantity;
        $newVariancePercentage = $systemQuantity > 0 ? abs($newVariance / $systemQuantity) * 100 : 0;
        
        if ($newVariancePercentage >= 20) {
            return 'critical';
        } elseif ($newVariancePercentage >= 10) {
            return 'high';
        } elseif ($newVariancePercentage >= 5) {
            return 'medium';
        } elseif ($newVariancePercentage > 0) {
            return 'low';
        }
        
        return 'none';
    }

    /**
     * Check if variance improved with the update.
     */
    public function isVarianceImproved(): bool
    {
        if (!$this->has('counted_quantity')) {
            return false;
        }
        
        $physicalCount = $this->route('physicalCount');
        $oldVarianceAbs = abs($physicalCount->variance);
        $newVarianceAbs = abs($this->counted_quantity - $physicalCount->system_quantity);
        
        return $newVarianceAbs < $oldVarianceAbs;
    }
}
