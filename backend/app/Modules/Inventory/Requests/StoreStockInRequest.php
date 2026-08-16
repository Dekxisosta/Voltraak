<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Support\Enums\StockTransactionType;

class StoreStockInRequest extends FormRequest
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
            'batch_id' => 'nullable|exists:batches,id',
            'quantity' => 'required|integer|min:1|max:999999',
            'unit_cost' => 'required|numeric|min:0|max:999999.99',
            'reference_type' => 'nullable|string|max:50',
            'reference_id' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
            
            // Batch creation fields (if creating new batch)
            'create_batch' => 'boolean',
            'batch_code' => 'required_if:create_batch,true|string|max:100|unique:batches,batch_code',
            'manufacturing_date' => 'required_if:create_batch,true|date|before_or_equal:today',
            'expiry_date' => 'nullable|date|after:manufacturing_date|after:today'
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
            'quantity.required' => 'Quantity is required.',
            'quantity.integer' => 'Quantity must be a whole number.',
            'quantity.min' => 'Quantity must be at least 1.',
            'quantity.max' => 'Quantity cannot exceed 999,999.',
            'unit_cost.required' => 'Unit cost is required.',
            'unit_cost.min' => 'Unit cost must be a positive number.',
            'unit_cost.max' => 'Unit cost cannot exceed ₱999,999.99.',
            'batch_code.required_if' => 'Batch code is required when creating a new batch.',
            'batch_code.unique' => 'This batch code already exists.',
            'manufacturing_date.required_if' => 'Manufacturing date is required when creating a new batch.',
            'manufacturing_date.before_or_equal' => 'Manufacturing date cannot be in the future.',
            'expiry_date.after' => 'Expiry date must be after manufacturing date and today.'
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
            'unit_cost' => 'unit cost',
            'batch_code' => 'batch code',
            'manufacturing_date' => 'manufacturing date',
            'expiry_date' => 'expiry date'
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Set default create_batch to false if not provided
        if (!$this->has('create_batch')) {
            $this->merge(['create_batch' => false]);
        }

        // If creating batch, normalize batch code
        if ($this->create_batch && $this->has('batch_code')) {
            $this->merge([
                'batch_code' => strtoupper(trim($this->batch_code))
            ]);
        }

        // Parse dates if provided
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
            // Validate product is active
            if ($this->product_id) {
                $product = \App\Modules\Inventory\Models\Product::find($this->product_id);
                
                if ($product && !$product->is_active) {
                    $validator->errors()->add(
                        'product_id',
                        'Cannot add stock for inactive product.'
                    );
                }
            }

            // Validate batch belongs to product (if existing batch)
            if ($this->batch_id && $this->product_id && !$this->create_batch) {
                $batch = \App\Modules\Inventory\Models\Batch::find($this->batch_id);
                
                if ($batch && $batch->product_id != $this->product_id) {
                    $validator->errors()->add(
                        'batch_id',
                        'Selected batch does not belong to the selected product.'
                    );
                }

                // Check if batch is expired
                if ($batch && $batch->status === \App\Support\Enums\BatchStatus::EXPIRED) {
                    $validator->errors()->add(
                        'batch_id',
                        'Cannot add stock to expired batch.'
                    );
                }
            }

            // Validate unit cost against product unit cost
            if ($this->unit_cost && $this->product_id) {
                $product = \App\Modules\Inventory\Models\Product::find($this->product_id);
                
                if ($product && $product->unit_cost > 0) {
                    $costDiff = abs($this->unit_cost - $product->unit_cost);
                    $percentDiff = ($costDiff / $product->unit_cost) * 100;
                    
                    if ($percentDiff > 20) {
                        $validator->warnings()->add(
                            'unit_cost',
                            "Unit cost differs significantly from product standard cost (₱{$product->unit_cost}). Verify accuracy."
                        );
                    }
                }
            }

            // Validate large quantity
            if ($this->quantity > 1000) {
                $validator->warnings()->add(
                    'quantity',
                    'Large quantity detected. Verify accuracy to prevent data entry errors.'
                );
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

            // Validate batch creation fields consistency
            if ($this->create_batch) {
                if ($this->batch_id) {
                    $validator->errors()->add(
                        'batch_id',
                        'Cannot specify existing batch when creating new batch.'
                    );
                }

                // Validate expiry date for new batch
                if ($this->expiry_date) {
                    $expiryDate = \Carbon\Carbon::parse($this->expiry_date);
                    $daysToExpiry = now()->diffInDays($expiryDate, false);
                    
                    if ($daysToExpiry <= 30) {
                        $validator->warnings()->add(
                            'expiry_date',
                            "New batch expires in {$daysToExpiry} days. Consider if this stock should be received."
                        );
                    }
                }
            } elseif (!$this->batch_id) {
                $validator->errors()->add(
                    'batch_id',
                    'Either select existing batch or enable create new batch option.'
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
        
        // Add transaction type
        $validated['type'] = StockTransactionType::IN;
        
        // Add user ID
        $validated['user_id'] = auth()->id();
        
        // Calculate total cost
        $validated['total_cost'] = $validated['quantity'] * $validated['unit_cost'];
        
        return $validated;
    }

    /**
     * Check if this transaction should create a new batch.
     */
    public function shouldCreateBatch(): bool
    {
        return $this->boolean('create_batch');
    }

    /**
     * Get batch creation data.
     */
    public function getBatchData(): array
    {
        if (!$this->shouldCreateBatch()) {
            return [];
        }

        return [
            'product_id' => $this->product_id,
            'batch_code' => $this->batch_code,
            'manufacturing_date' => $this->manufacturing_date,
            'expiry_date' => $this->expiry_date,
            'initial_quantity' => $this->quantity,
            'current_quantity' => $this->quantity,
            'unit_cost' => $this->unit_cost
        ];
    }
}