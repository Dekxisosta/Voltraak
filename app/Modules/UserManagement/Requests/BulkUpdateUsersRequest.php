<?php

namespace App\Modules\UserManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\Enums\UserRole;

class BulkUpdateUsersRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Only managers can perform bulk operations
        return $this->user() && $this->user()->isManager();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'user_ids' => [
                'required',
                'array',
                'min:1',
                'max:50' // Limit bulk operations
            ],
            'user_ids.*' => [
                'integer',
                'exists:users,id'
            ],
            'updates' => [
                'required',
                'array',
                'min:1'
            ],
            'updates.role' => array_merge(
                ['sometimes', 'string', Rule::enum(UserRole::class)],
                $this->user()?->role === UserRole::ADMIN
                    ? []
                    : ['not_in:' . UserRole::MANAGER->value . ',' . UserRole::ADMIN->value]
            ),
            'updates.is_active' => [
                'sometimes',
                'boolean'
            ],
            'updates.department' => [
                'sometimes',
                'nullable',
                'string',
                'max:100'
            ]
        ];
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'user_ids.required' => 'At least one user ID is required',
            'user_ids.array' => 'User IDs must be provided as an array',
            'user_ids.min' => 'At least one user must be selected',
            'user_ids.max' => 'Cannot update more than 50 users at once',
            'user_ids.*.integer' => 'All user IDs must be integers',
            'user_ids.*.exists' => 'One or more selected users do not exist',
            'updates.required' => 'Update data is required',
            'updates.array' => 'Updates must be provided as an object',
            'updates.min' => 'At least one field must be updated',
            'updates.role.enum' => 'Please select a valid user role',
            'updates.role.not_in' => 'You cannot assign that role in bulk operations',
            'updates.department.max' => 'Department name cannot exceed 100 characters'
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $userIds = $this->input('user_ids', []);
            $currentUserId = $this->user()->id;
            
            // Prevent users from updating themselves in bulk operations
            if (in_array($currentUserId, $userIds)) {
                $validator->errors()->add('user_ids', 'Cannot include your own account in bulk operations');
            }
            
            // Managers cannot bulk update manager / admin accounts (admins can).
            if ($this->user()->role !== UserRole::ADMIN) {
                $protectedIds = \App\Models\User::whereIn('id', $userIds)
                    ->whereIn('role', [UserRole::MANAGER, UserRole::ADMIN])
                    ->pluck('id')
                    ->toArray();

                if (!empty($protectedIds)) {
                    $validator->errors()->add('user_ids', 'Cannot bulk update manager or admin accounts');
                }
            }
        });
    }
}