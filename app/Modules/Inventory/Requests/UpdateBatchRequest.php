<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\Enums\BatchStatus;

class UpdateBatchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Authorization is handled by the controller
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $batchId = $this->route('batch')?->id;
        
        return [
            'batch_number' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('batches', 'batch_number')->ignore($batchId)
            ],
            'manufacture_date' => 'sometimes|nullable|date|before_or_equal:today',
            'expiry_date' => 'sometimes|nullable|date|after:manufacture_date',
            'unit_cost' => 'sometimes|required|numeric|min:0|max:999999.99',
            'supplier_batch_number' => 'sometimes|nullable|string|max:100',
            'status' => [
                'sometimes',
                'required',
                Rule::enum(BatchStatus::class)
            ],
            'notes' => 'sometimes|nullable|string|max:1000'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'batch_number.required' => 'Batch number is required.',
            'batch_number.unique' => 'This batch number already exists.',
            'batch_number.max' => 'Batch number cannot exceed 100 characters.',
            'manufacture_date.date' => 'Manufacture date must be a valid date.',
            'manufacture_date.before_or_equal' => 'Manufacture date cannot be in the future.',
            'expiry_date.date' => 'Expiry date must be a valid date.',
            'expiry_date.after' => 'Expiry date must be after manufacture date.',
            'unit_cost.required' => 'Unit cost is required.',
            'unit_cost.min' => 'Unit cost must be a positive number.',
            'unit_cost.max' => 'Unit cost cannot exceed ₱999,999.99.',
            'status.required' => 'Batch status is required.',
            'notes.max' => 'Notes cannot exceed 1,000 characters.'
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'batch_number' => 'batch number',
            'manufacture_date' => 'manufacture date',
            'expiry_date' => 'expiry date',
            'unit_cost' => 'unit cost'
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Only process fields that are being updated
        $updates = [];
        
        // Normalize batch number to uppercase if provided
        if ($this->has('batch_number')) {
            $updates['batch_number'] = strtoupper(trim($this->batch_number));
        }
        
        // Parse dates properly if provided
        if ($this->has('manufacture_date') && $this->manufacture_date) {
            $updates['manufacture_date'] = \Carbon\Carbon::parse($this->manufacture_date)->format('Y-m-d');
        }
        
        if ($this->has('expiry_date') && $this->expiry_date) {
            $updates['expiry_date'] = \Carbon\Carbon::parse($this->expiry_date)->format('Y-m-d');
        }
        
        if (!empty($updates)) {
            $this->merge($updates);
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $batch = $this->route('batch');
            
            // Validate status changes
            if ($this->has('status')) {
                $currentStatus = $batch->status;
                $newStatus = BatchStatus::from($this->status);
                
                // Prevent certain status changes
                if ($currentStatus === BatchStatus::EXPIRED && $newStatus !== BatchStatus::EXPIRED) {
                    $validator->errors()->add(
                        'status',
                        'Cannot change status from expired. Expired batches must remain expired for audit purposes.'
                    );
                }
                
                // Validate status change with current quantity
                if ($newStatus === BatchStatus::EXPIRED && $batch->quantity > 0) {
                    $validator->warnings()->add(
                        'status',
                        'Setting batch to expired while it still has quantity. Ensure proper disposal procedures are followed.'
                    );
                }
            }
            
            // Validate expiry date changes
            if ($this->has('expiry_date')) {
                $newExpiryDate = \Carbon\Carbon::parse($this->expiry_date);
                $currentExpiryDate = $batch->expiry_date;
                
                // Warn if moving expiry date significantly
                if ($currentExpiryDate) {
                    $daysDiff = $currentExpiryDate->diffInDays($newExpiryDate, false);
                    
                    if (abs($daysDiff) > 30) {
                        $direction = $daysDiff > 0 ? 'extended' : 'shortened';
                        $validator->warnings()->add(
                            'expiry_date',
                            "Expiry date {$direction} by {$daysDiff} days. Verify this change is accurate."
                        );
                    }
                }
                
                // Check if new expiry date affects current status appropriately
                $daysToExpiry = now()->diffInDays($newExpiryDate, false);
                
                if ($daysToExpiry <= 0) {
                    $validator->warnings()->add(
                        'expiry_date',
                        'Setting expiry date in the past. Batch status should be set to expired.'
                    );
                } elseif ($daysToExpiry <= 60 && (!$this->has('status') || $this->status !== BatchStatus::WARNING->value)) {
                    $validator->warnings()->add(
                        'status',
                        'Expiry date is within 60 days. Consider setting status to warning.'
                    );
                }
            }
            
            // Validate unit cost changes
            if ($this->has('unit_cost')) {
                $currentCost = $batch->unit_cost;
                $newCost = $this->unit_cost;
                
                if ($currentCost > 0) {
                    $changePercent = abs(($newCost - $currentCost) / $currentCost) * 100;
                    
                    if ($changePercent > 20) {
                        $validator->warnings()->add(
                            'unit_cost',
                            "Unit cost change of {$changePercent}% is significant. Verify accuracy and consider impact on inventory valuation."
                        );
                    }
                }
                
                // Check against product unit price
                if ($batch->product && $batch->product->unit_price) {
                    $productPrice = $batch->product->unit_price;
                    $costDiff = abs($newCost - $productPrice);
                    
                    if ($costDiff / $productPrice > 0.1) { // 10% difference
                        $validator->warnings()->add(
                            'unit_cost',
                            "Batch unit cost differs significantly from product unit price (₱{$productPrice}). Verify this is intentional."
                        );
                    }
                }
            }
            
            // Validate manufacture date changes
            if ($this->has('manufacture_date')) {
                $batch = $this->route('batch');
                
                // Check if there are stock transactions after this date
                if ($batch->stockTransactions()->where('created_at', '<', $this->manufacture_date)->exists()) {
                    $validator->errors()->add(
                        'manufacture_date',
                        'Cannot set manufacture date after existing stock transactions.'
                    );
                }
            }
            
            // Validate consistency between dates
            $mfgDate = $this->manufacture_date ?? $batch->manufacture_date;
            $expDate = $this->expiry_date ?? $batch->expiry_date;
            
            if ($mfgDate && $expDate) {
                $mfgCarbon = \Carbon\Carbon::parse($mfgDate);
                $expCarbon = \Carbon\Carbon::parse($expDate);
                $shelfLife = $mfgCarbon->diffInDays($expCarbon);
                
                if ($shelfLife < 1) {
                    $validator->errors()->add(
                        'expiry_date',
                        'Expiry date must be at least 1 day after manufacture date.'
                    );
                } elseif ($shelfLife < 30) {
                    $validator->warnings()->add(
                        'expiry_date',
                        "Short shelf life of {$shelfLife} days. Verify dates are correct."
                    );
                }
            }
        });
    }

    /**
     * Check if the update affects stock valuation.
     */
    public function affectsStockValuation(): bool
    {
        return $this->has('unit_cost') && $this->route('batch')->quantity > 0;
    }

    /**
     * Get the changes being made to the batch.
     */
    public function getChanges(): array
    {
        $batch = $this->route('batch');
        $changes = [];
        
        foreach ($this->validated() as $field => $newValue) {
            $oldValue = $batch->$field;
            
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
     * Check if status should be auto-updated based on other changes.
     */
    public function shouldAutoUpdateStatus(): ?BatchStatus
    {
        // Don't auto-update if status is being explicitly set
        if ($this->has('status')) {
            return null;
        }
        
        // Auto-update status based on expiry date changes
        if ($this->has('expiry_date')) {
            $expiryDate = \Carbon\Carbon::parse($this->expiry_date);
            $daysToExpiry = now()->diffInDays($expiryDate, false);
            
            if ($daysToExpiry <= 0) {
                return BatchStatus::EXPIRED;
            } elseif ($daysToExpiry <= 60) {
                return BatchStatus::WARNING;
            } else {
                return BatchStatus::SAFE;
            }
        }
        
        return null;
    }
}
