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
            'unit_price' => 'required|numeric|min:0|max:999999.99',
            'reorder_level' => 'nullable|integer|min:0|max:999999',
            'max_stock_level' => 'nullable|integer|min:0|max:999999',
            'is_seasonal' => 'boolean',
            'shelf_life_days' => 'nullable|integer|min:0',
            'storage_bin' => 'nullable|string|max:255',
            'barcode' => 'nullable|string|max:255',
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
            // Advisory only: Laravel's validator has no warnings() API, so
            // non-blocking notes are collected instead of failing the request.
            if ($this->reorder_level !== null && (int) $this->reorder_level === 0) {
                $this->warnings['reorder_level'][] =
                    'Reorder level of 0 may cause stockouts. Consider setting a minimum level.';
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
     * Get the validated data with computed fields.
     */
    public function validatedWithDefaults(): array
    {
        $validated = $this->validated();
        
        // Add computed/default fields
        $validated['quantity'] = 0;
        
        return $validated;
    }
}