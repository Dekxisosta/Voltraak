<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDiscrepancyReportRequest extends FormRequest
{
    public const TYPES = ['shortage', 'overage', 'damage', 'theft', 'misplacement', 'other'];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|exists:products,id',
            'batch_id' => 'nullable|exists:batches,id',
            'expected_quantity' => 'required|integer|min:0',
            'actual_quantity' => 'required|integer|min:0',
            'discrepancy_type' => ['nullable', Rule::in(self::TYPES)],
            'location' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:2000',
        ];
    }
}
