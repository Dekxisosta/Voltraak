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
        return $this->user()->can('product.update');
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
            'unit' => 'sometimes|required|string|max:50',
            'unit_cost' => 'sometimes|required|numeric|min:0|max:999999.99',
            'selling_price' => 'sometimes|required|numeric|min:0|max:999999.99',
            'reorder_point' => 'sometimes|nullable|integer|min:0|max:999999',
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
            'unit.required' => 'Unit of measure is required.',
            'unit_cost.required' => 'Unit cost is required.',
            'unit_cost.min' => 'Unit cost must be a positive number.',
            'unit_cost.max' => 'Unit cost cannot exceed ₱999,999.99.',
            'selling_price.required' => 'Selling price is required.',
            'selling_price.min' => 'Selling price must be a positive number.',
            'selling_price.max' => 'Selling price cannot exceed ₱999,999.99.',
            'reorder_point.integer' => 'Reorder point must be a whole number.',
            'reorder_point.min' => 'Reorder point cannot be negative.',
            'reorder_point.max' => 'Reorder point cannot exceed 999,999.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'sku' => 'SKU',
            'unit_cost' => 'unit cost',
            'selling_price' => 'selling price',
            'reorder_point' => 'reorder point',
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
            
            // Get current or new values for validation
            $unitCost = $this->unit_cost ?? $product->unit_cost;
            $sellingPrice = $this->selling_price ?? $product->selling_price;
            
            // Validate that selling price is higher than unit cost
            if ($unitCost && $sellingPrice && $sellingPrice <= $unitCost) {
                $validator->errors()->add(
                    'selling_price',
                    'Selling price should be higher than unit cost for profitability.'
                );
            }
            
            // Validate reorder point changes
            if ($this->has('reorder_point')) {
                $newReorderPoint = $this->reorder_point;
                $currentQuantity = $product->current_quantity;
                
                if ($newReorderPoint !== null && $newReorderPoint > $currentQuantity) {
                    $validator->warnings()->add(
                        'reorder_point',
                        "New reorder point ({$newReorderPoint}) is above current stock level ({$currentQuantity}). This may trigger immediate reorder alerts."
                    );
                }
                
                if ($newReorderPoint === 0) {
                    $validator->warnings()->add(
                        'reorder_point',
                        'Setting reorder point to 0 may cause stockouts. Consider setting a minimum level.'
                    );
                }
            }
            
            // Validate deactivation
            if ($this->has('is_active') && !$this->is_active && $product->current_quantity > 0) {
                $validator->warnings()->add(
                    'is_active',
                    'Deactivating a product with current stock. Ensure all stock is cleared before deactivation.'
                );
            }
            
            // Validate significant cost changes
            if ($this->has('unit_cost')) {
                $currentCost = $product->unit_cost;
                $newCost = $this->unit_cost;
                
                if ($currentCost > 0) {
                    $changePercent = abs(($newCost - $currentCost) / $currentCost) * 100;
                    
                    if ($changePercent > 20) {
                        $validator->warnings()->add(
                            'unit_cost',
                            "Unit cost change of {$changePercent}% is significant. Verify accuracy and consider impact on existing batches."
                        );
                    }
                }
            }
        });
    }

    /**
     * Check if the update will affect existing stock.
     */
    public function affectsExistingStock(): bool
    {
        $product = $this->route('product');
        
        // Changes that affect existing stock calculations
        $stockAffectingFields = ['unit_cost', 'is_active'];
        
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