<?php

namespace App\Modules\Procurement\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProcurementRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization is handled by the controller
        return true;
    }

    public function rules(): array
    {
        return [
            'current_stock' => 'sometimes|required|integer|min:0',
            'reorder_point' => 'sometimes|required|integer|min:0',
            'suggested_quantity' => 'sometimes|required|integer|min:1',
            'priority' => 'sometimes|required|in:low,medium,high,critical',
            'notes' => 'nullable|string|max:500',
        ];
    }
}
