<?php

namespace App\Modules\UserManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResetUserPasswordRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Only managers can reset other users' passwords
        return $this->user() && $this->user()->isManager();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'new_password' => [
                'required',
                'string',
                'min:8',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'
            ]
        ];
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'new_password.required' => 'New password is required',
            'new_password.min' => 'Password must be at least 8 characters long',
            'new_password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $targetUserId = $this->route('id') ?? $this->route('user');
            $currentUser = $this->user();
            
            // Cannot reset own password using this endpoint
            if ($currentUser && $currentUser->id == $targetUserId) {
                $validator->errors()->add('new_password', 'Cannot reset your own password using this endpoint. Use the change password endpoint instead.');
            }
            
            // Check if target user is a manager
            $targetUser = \App\Models\User::find($targetUserId);
            if ($targetUser && $targetUser->role === \App\Support\Enums\UserRole::MANAGER) {
                $validator->errors()->add('new_password', 'Cannot reset password for manager accounts.');
            }
        });
    }
}