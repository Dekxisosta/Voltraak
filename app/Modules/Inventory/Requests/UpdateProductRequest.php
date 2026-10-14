<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Authorization is handled by the controller's $this->authorize('product.update') call
        // This avoids gate resolution timing issues in the request lifecycle
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $productId = $this->route('product')?->id;
        
        return [
            'name' => 'sometimes|required|string|max:255',
            'sku' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('products', 'sku')->ignore($productId)
            ],
            'description' => 'sometimes|nullable|string|max:1000',
            'category' => 'sometimes|required|string|max:100',
            'unit_price' => 'sometimes|required|numeric|min:0|max:999999.99',
            'reorder_level' => 'sometimes|nullable|integer|min:0|max:999999',
            'max_stock_level' => 'sometimes|nullable|integer|min:0|max:999999',
            'is_seasonal' => 'sometimes|boolean',
            'shelf_life_days' => 'sometimes|nullable|integer|min:0',
            'storage_bin' => 'sometimes|nullable|string|max:255',
            'barcode' => 'sometimes|nullable|string|max:255',
            'is_active' => 'sometimes|boolean'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Product name is required.',
            'name.max' => 'Product name cannot exceed 255 characters.',
            'sku.required' => 'Product SKU is required.',
            'sku.unique' => 'This SKU is already in use by another product.',
            'sku.max' => 'SKU cannot exceed 100 characters.',
            'category.required' => 'Product category is required.',
            'unit_price.required' => 'Unit price is required.',
            'unit_price.min' => 'Unit price must be a positive number.',
            'unit_price.max' => 'Unit price cannot exceed ₱999,999.99.',
            'reorder_level.integer' => 'Reorder level must be a whole number.',
            'reorder_level.min' => 'Reorder level cannot be negative.',
            'reorder_level.max' => 'Reorder level cannot exceed 999,999.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'sku' => 'SKU',
            'unit_price' => 'unit price',
            'reorder_level' => 'reorder level',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Only process fields that are being updated
        $updates = [];
        
        // Normalize SKU to uppercase if provided
        if ($this->has('sku')) {
            $updates['sku'] = strtoupper($this->sku);
        }
        
        // Clean and format category if provided
        if ($this->has('category')) {
            $updates['category'] = ucfirst(strtolower(trim($this->category)));
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
            $product = $this->route('product');

            // Advisory only: Laravel's validator has no warnings() API, so
            // non-blocking notes are collected instead of failing the request.
            if ($this->has('reorder_level')) {
                $newReorderLevel = $this->reorder_level;
                $currentQuantity = $product->quantity;

                if ($newReorderLevel !== null && $newReorderLevel > $currentQuantity) {
                    $this->warnings['reorder_level'][] =
                        "New reorder level ({$newReorderLevel}) is above current stock level ({$currentQuantity}). This may trigger immediate reorder alerts.";
                }

                if ($newReorderLevel !== null && (int) $newReorderLevel === 0) {
                    $this->warnings['reorder_level'][] =
                        'Setting reorder level to 0 may cause stockouts. Consider setting a minimum level.';
                }
            }

            if ($this->has('is_active') && !$this->boolean('is_active') && $product->quantity > 0) {
                $this->warnings['is_active'][] =
                    'Deactivating a product with current stock. Ensure all stock is cleared before deactivation.';
            }

            if ($this->has('unit_price')) {
                $currentPrice = (float) $product->unit_price;
                $newPrice = (float) $this->unit_price;

                if ($currentPrice > 0) {
                    $changePercent = round(abs(($newPrice - $currentPrice) / $currentPrice) * 100, 1);

                    if ($changePercent > 20) {
                        $this->warnings['unit_price'][] =
                            "Unit price change of {$changePercent}% is significant. Verify accuracy and consider impact on existing batches.";
                    }
                }
            }
        });
    }

    /**
     * Non-blocking advisories collected during validation.
     */
    protected array $warnings = [];

    public function getWarnings(): array
    {
        return $this->warnings;
    }

    /**
     * Check if the update will affect existing stock.
     */
    public function affectsExistingStock(): bool
    {
        $product = $this->route('product');
        
        // Changes that affect existing stock calculations
        $stockAffectingFields = ['unit_price', 'is_active'];
        
        foreach ($stockAffectingFields as $field) {
            if ($this->has($field)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get the changes being made to the product.
     */
    public function getChanges(): array
    {
        $product = $this->route('product');
        $changes = [];
        
        foreach ($this->validated() as $field => $newValue) {
            $oldValue = $product->$field;
            
            if ($oldValue != $newValue) {
                $changes[$field] = [
                    'old' => $oldValue,
                    'new' => $newValue
                ];
            }
        }
        
        return $changes;
    }
}