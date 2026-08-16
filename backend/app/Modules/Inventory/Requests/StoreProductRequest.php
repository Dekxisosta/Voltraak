<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('product.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'sku' => [
                'required',
                'string',
                'max:100',
                Rule::unique('products', 'sku')
            ],
            'description' => 'nullable|string|max:1000',
            'category' => 'required|string|max:100',
            'unit' => 'required|string|max:50',
            'unit_cost' => 'required|numeric|min:0|max:999999.99',
            'selling_price' => 'required|numeric|min:0|max:999999.99',
            'reorder_point' => 'nullable|integer|min:0|max:999999',
            'is_active' => 'boolean'
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
        // Normalize SKU to uppercase
        if ($this->has('sku')) {
            $this->merge([
                'sku' => strtoupper($this->sku)
            ]);
        }
        
        // Set default active status if not provided
        if (!$this->has('is_active')) {
            $this->merge([
                'is_active' => true
            ]);
        }
        
        // Clean and format category
        if ($this->has('category')) {
            $this->merge([
                'category' => ucfirst(strtolower(trim($this->category)))
            ]);
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Validate that selling price is higher than unit cost (reasonable margin)
            if ($this->unit_cost && $this->selling_price) {
                if ($this->selling_price <= $this->unit_cost) {
                    $validator->errors()->add(
                        'selling_price',
                        'Selling price should be higher than unit cost for profitability.'
                    );
                }
            }
            
            // Validate reasonable reorder point
            if ($this->reorder_point !== null && $this->reorder_point === 0) {
                $validator->warnings()->add(
                    'reorder_point',
                    'Reorder point of 0 may cause stockouts. Consider setting a minimum level.'
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
        
        // Add computed/default fields
        $validated['current_quantity'] = 0;
        $validated['reserved_quantity'] = 0;
        
        return $validated;
    }
}