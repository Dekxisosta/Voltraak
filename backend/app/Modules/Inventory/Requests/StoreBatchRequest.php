<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\Enums\BatchStatus;

class StoreBatchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('batch.create');
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
            'batch_code' => [
                'required',
                'string',
                'max:100',
                Rule::unique('batches', 'batch_code')
            ],
            'manufacturing_date' => 'nullable|date|before_or_equal:today',
            'expiry_date' => 'nullable|date|after:manufacturing_date|after:today',
            'initial_quantity' => 'required|integer|min:1|max:999999',
            'unit_cost' => 'required|numeric|min:0|max:999999.99',
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
            'batch_code.required' => 'Batch code is required.',
            'batch_code.unique' => 'This batch code already exists.',
            'batch_code.max' => 'Batch code cannot exceed 100 characters.',
            'manufacturing_date.date' => 'Manufacturing date must be a valid date.',
            'manufacturing_date.before_or_equal' => 'Manufacturing date cannot be in the future.',
            'expiry_date.date' => 'Expiry date must be a valid date.',
            'expiry_date.after' => 'Expiry date must be after manufacturing date and today.',
            'initial_quantity.required' => 'Initial quantity is required.',
            'initial_quantity.integer' => 'Initial quantity must be a whole number.',
            'initial_quantity.min' => 'Initial quantity must be at least 1.',
            'initial_quantity.max' => 'Initial quantity cannot exceed 999,999.',
            'unit_cost.required' => 'Unit cost is required.',
            'unit_cost.min' => 'Unit cost must be a positive number.',
            'unit_cost.max' => 'Unit cost cannot exceed ₱999,999.99.',
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
            'batch_code' => 'batch code',
            'manufacturing_date' => 'manufacturing date',
            'expiry_date' => 'expiry date',
            'initial_quantity' => 'initial quantity',
            'unit_cost' => 'unit cost'
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Normalize batch code to uppercase
        if ($this->has('batch_code')) {
            $this->merge([
                'batch_code' => strtoupper(trim($this->batch_code))
            ]);
        }
        
        // Parse dates properly
        if ($this->has('manufacturing_date') && $this->manufacturing_date) {
            $this->merge([
                'manufacturing_date' => \Carbon\Carbon::parse($this->manufacturing_date)->format('Y-m-d')
            ]);
        }
        
        if ($this->has('expiry_date') && $this->expiry_date) {
            $this->merge([
                'expiry_date' => \Carbon\Carbon::parse($this->expiry_date)->format('Y-m-d')
            ]);
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Check if product exists and is active
            if ($this->product_id) {
                $product = \App\Modules\Inventory\Models\Product::find($this->product_id);
                
                if ($product && !$product->is_active) {
                    $validator->errors()->add(
                        'product_id',
                        'Cannot create batch for inactive product.'
                    );
                }
            }
            
            // Validate expiry date warnings
            if ($this->expiry_date) {
                $expiryDate = \Carbon\Carbon::parse($this->expiry_date);
                $daysToExpiry = now()->diffInDays($expiryDate, false);
                
                if ($daysToExpiry <= 30) {
                    $validator->warnings()->add(
                        'expiry_date',
                        "Batch expires in {$daysToExpiry} days. Consider if this batch should be created."
                    );
                } elseif ($daysToExpiry <= 60) {
                    $validator->warnings()->add(
                        'expiry_date',
                        "Batch expires in {$daysToExpiry} days. Will need priority selling."
                    );
                }
            }
            
            // Validate manufacturing to expiry date span
            if ($this->manufacturing_date && $this->expiry_date) {
                $mfgDate = \Carbon\Carbon::parse($this->manufacturing_date);
                $expDate = \Carbon\Carbon::parse($this->expiry_date);
                $shelfLife = $mfgDate->diffInDays($expDate);
                
                if ($shelfLife < 30) {
                    $validator->warnings()->add(
                        'expiry_date',
                        "Short shelf life of {$shelfLife} days. Verify dates are correct."
                    );
                } elseif ($shelfLife > 1095) { // 3 years
                    $validator->warnings()->add(
                        'expiry_date',
                        "Long shelf life of {$shelfLife} days. Verify dates are correct."
                    );
                }
            }
            
            // Validate reasonable quantity
            if ($this->initial_quantity) {
                if ($this->initial_quantity > 10000) {
                    $validator->warnings()->add(
                        'initial_quantity',
                        'Large initial quantity. Verify accuracy to prevent data entry errors.'
                    );
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
        
        // Set computed fields for new batch
        $validated['current_quantity'] = $validated['initial_quantity'];
        $validated['reserved_quantity'] = 0;
        
        // Determine initial status based on expiry date
        if (isset($validated['expiry_date'])) {
            $expiryDate = \Carbon\Carbon::parse($validated['expiry_date']);
            $daysToExpiry = now()->diffInDays($expiryDate, false);
            
            if ($daysToExpiry <= 0) {
                $validated['status'] = BatchStatus::EXPIRED;
            } elseif ($daysToExpiry <= 60) {
                $validated['status'] = BatchStatus::WARNING;
            } else {
                $validated['status'] = BatchStatus::AVAILABLE;
            }
        } else {
            $validated['status'] = BatchStatus::AVAILABLE;
        }
        
        return $validated;
    }

    /**
     * Generate a batch code if not provided.
     */
    public function generateBatchCodeIfNeeded(): array
    {
        $validated = $this->validatedWithDefaults();
        
        if (empty($validated['batch_code'])) {
            $product = \App\Modules\Inventory\Models\Product::find($validated['product_id']);
            $date = $validated['manufacturing_date'] ?? now()->format('Y-m-d');
            $dateCode = \Carbon\Carbon::parse($date)->format('ymd');
            
            // Generate format: SKU-YYMMDD-XXX (where XXX is sequence)
            $baseCode = "{$product->sku}-{$dateCode}";
            $sequence = 1;
            
            do {
                $batchCode = "{$baseCode}-" . str_pad($sequence, 3, '0', STR_PAD_LEFT);
                $exists = \App\Modules\Inventory\Models\Batch::where('batch_code', $batchCode)->exists();
                $sequence++;
            } while ($exists && $sequence <= 999);
            
            if ($sequence > 999) {
                throw new \Exception("Cannot generate unique batch code for {$baseCode}");
            }
            
            $validated['batch_code'] = $batchCode;
        }
        
        return $validated;
    }
}