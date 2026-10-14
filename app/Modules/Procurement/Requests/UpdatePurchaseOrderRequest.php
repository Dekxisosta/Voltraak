<?php

namespace App\Modules\Procurement\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization is handled by the controller
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => 'sometimes|required|exists:suppliers,id',
            'expected_delivery_date' => 'sometimes|required|date|after:today',
            'notes' => 'nullable|string|max:1000',
            'items' => 'sometimes|required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ];
    }
}
