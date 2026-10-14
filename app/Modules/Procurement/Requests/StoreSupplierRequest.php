<?php

namespace App\Modules\Procurement\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization is handled by the controller
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|unique:suppliers,name',
            'contact_person' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:suppliers,email',
            'phone' => 'required|string|max:20',
            'address' => 'required|string|max:500',
            'city' => 'required|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'required|string|max:100',
            'tax_id' => 'nullable|string|max:50',
            'payment_terms' => 'required|integer|min:0|max:365',
            'default_lead_time_days' => 'required|integer|min:1|max:365',
            'category' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',
            'is_active' => 'boolean'
        ];
    }
}
