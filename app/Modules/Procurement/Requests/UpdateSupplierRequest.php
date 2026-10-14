<?php

namespace App\Modules\Procurement\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization is handled by the controller
        return true;
    }

    public function rules(): array
    {
        $supplierId = $this->route('supplier')->id;
        
        return [
            'name' => 'sometimes|required|string|max:255|unique:suppliers,name,' . $supplierId,
            'contact_person' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:suppliers,email,' . $supplierId,
            'phone' => 'sometimes|required|string|max:20',
            'address' => 'sometimes|required|string|max:500',
            'city' => 'sometimes|required|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'sometimes|required|string|max:100',
            'tax_id' => 'nullable|string|max:50',
            'payment_terms' => 'sometimes|required|integer|min:0|max:365',
            'default_lead_time_days' => 'sometimes|required|integer|min:1|max:365',
            'category' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',
            'is_active' => 'boolean'
        ];
    }
}
