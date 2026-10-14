<?php

namespace App\Modules\Procurement\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProcurementRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization is handled by the controller
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|exists:products,id',
            'current_stock' => 'required|integer|min:0',
            'reorder_point' => 'required|integer|min:0',
            'suggested_quantity' => 'required|integer|min:1',
            'priority' => 'required|in:low,medium,high,critical',
            'notes' => 'nullable|string|max:500',
        ];
    }
}
