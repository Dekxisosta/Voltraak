<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Support\Enums\DamageType;
use Illuminate\Validation\Rule;

class StoreDamageReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|exists:products,id',
            'batch_id' => 'nullable|exists:batches,id',
            'quantity_damaged' => 'required|integer|min:1',
            'damage_type' => ['required', Rule::enum(DamageType::class)],
            'severity' => ['nullable', Rule::in(['minor', 'moderate', 'severe'])],
            'description' => 'required|string|max:2000',
            'estimated_value' => 'nullable|numeric|min:0',
            'photo_path' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'damage_type.Illuminate\Validation\Rules\Enum' => 'Invalid damage type selected',
        ];
    }
}
