<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Support\Enums\DamageType;
use Illuminate\Validation\Rule;

class UpdateDamageReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'quantity_damaged' => 'sometimes|required|integer|min:1',
            'damage_type' => ['sometimes', 'required', Rule::enum(DamageType::class)],
            'severity' => ['sometimes', Rule::in(['minor', 'moderate', 'severe'])],
            'description' => 'sometimes|required|string|max:2000',
            'estimated_value' => 'nullable|numeric|min:0',
            'photo_path' => 'nullable|string|max:500',
        ];
    }
}
