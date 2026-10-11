<?php

namespace App\Modules\UserManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChangePasswordRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Only authenticated users can change their password
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'current_password' => [
                'required',
                'string'
            ],
            'new_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'different:current_password',
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
            'current_password.required' => 'Current password is required',
            'new_password.required' => 'New password is required',
            'new_password.min' => 'New password must be at least 8 characters long',
            'new_password.confirmed' => 'Password confirmation does not match',
            'new_password.different' => 'New password must be different from current password',
            'new_password.regex' => 'New password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $user = $this->user();
            
            // Verify current password
            if ($user && !password_verify($this->input('current_password'), $user->password)) {
                $validator->errors()->add('current_password', 'The current password is incorrect.');
            }
        });
    }
}