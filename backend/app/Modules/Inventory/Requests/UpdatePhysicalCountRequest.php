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
            'actual_quantity' => 'sometimes|required|integer|min:0|max:999999',
            'count_date' => 'sometimes|nullable|date|before_or_equal:now',
            'notes' => 'sometimes|nullable|string|max:1000'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
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
            'actual_quantity' => 'actual quantity',
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

            // Validate that count hasn't been processed/approved
            // (This would require additional status tracking in the future)
            
            // Validate quantity changes
            if ($this->has('actual_quantity')) {
                $oldQuantity = $physicalCount->actual_quantity;
                $newQuantity = $this->actual_quantity;
                $expectedQuantity = $physicalCount->expected_quantity;
                
                // Calculate new variance
                $newVariance = $newQuantity - $expectedQuantity;
                $newVariancePercentage = $expectedQuantity > 0 ? abs($newVariance / $expectedQuantity) * 100 : 0;
                
                // Warn about large changes
                if (abs($newQuantity - $oldQuantity) > 100) {
                    $validator->warnings()->add(
                        'actual_quantity',
                        "Large change in actual quantity: {$oldQuantity} → {$newQuantity}. Verify accuracy."
                    );
                }
                
                // Warn about increasing variance
                $oldVariance = $physicalCount->variance;
                if (abs($newVariance) > abs($oldVariance)) {
                    $validator->warnings()->add(
                        'actual_quantity',
                        "New variance ({$newVariance}) is larger than previous variance ({$oldVariance})."
                    );
                }
                
                // Error for impossible quantities
                if ($newQuantity > ($expectedQuantity * 2) && $expectedQuantity > 0) {
                    $validator->errors()->add(
                        'actual_quantity',
                        "Actual quantity is more than double the expected quantity. This seems unlikely - please verify."
                    );
                }
                
                // Warn for very large variances
                if ($newVariancePercentage > 50) {
                    $validator->warnings()->add(
                        'actual_quantity',
                        "Large variance: {$newVariancePercentage}%. Expected: {$expectedQuantity}, New Actual: {$newQuantity}."
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
            if ($this->has('actual_quantity') && $this->actual_quantity > 10000) {
                $validator->warnings()->add(
                    'actual_quantity',
                    'Very large quantity detected. Verify accuracy to prevent data entry errors.'
                );
            }
        });
    }

    /**
     * Get the validated data with recalculated variance.
     */
    public function validatedWithRecalculation(): array
    {
        $validated = $this->validated();
        $physicalCount = $this->route('physicalCount');
        
        // Recalculate variance if actual quantity changed
        if (isset($validated['actual_quantity'])) {
            $expectedQuantity = $physicalCount->expected_quantity;
            $variance = $validated['actual_quantity'] - $expectedQuantity;
            $variancePercentage = $expectedQuantity > 0 ? ($variance / $expectedQuantity) * 100 : 0;
            
            $validated['variance'] = $variance;
            $validated['variance_percentage'] = round($variancePercentage, 2);
        }
        
        return $validated;
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
        if (!$this->has('actual_quantity')) {
            return false;
        }
        
        $physicalCount = $this->route('physicalCount');
        $expectedQuantity = $physicalCount->expected_quantity;
        $newVariance = $this->actual_quantity - $expectedQuantity;
        $newVariancePercentage = $expectedQuantity > 0 ? abs($newVariance / $expectedQuantity) * 100 : 0;
        
        // Require re-approval for significant variances
        if ($newVariancePercentage > 5) {
            return true;
        }
        
        // Require re-approval for high-value variances
        if ($physicalCount->product && $physicalCount->product->unit_cost > 0) {
            $valueVariance = abs($newVariance) * $physicalCount->product->unit_cost;
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
        if (!$this->has('actual_quantity')) {
            return 'unchanged';
        }
        
        $physicalCount = $this->route('physicalCount');
        $expectedQuantity = $physicalCount->expected_quantity;
        $newVariance = $this->actual_quantity - $expectedQuantity;
        $newVariancePercentage = $expectedQuantity > 0 ? abs($newVariance / $expectedQuantity) * 100 : 0;
        
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
        if (!$this->has('actual_quantity')) {
            return false;
        }
        
        $physicalCount = $this->route('physicalCount');
        $oldVarianceAbs = abs($physicalCount->variance);
        $newVarianceAbs = abs($this->actual_quantity - $physicalCount->expected_quantity);
        
        return $newVarianceAbs < $oldVarianceAbs;
    }
}