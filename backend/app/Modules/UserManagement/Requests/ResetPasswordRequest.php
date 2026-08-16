<?php

namespace App\Modules\UserManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'token' => [
                'required',
                'string'
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255'
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
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
            'token.required' => 'Reset token is required',
            'email.required' => 'Email address is required',
            'email.email' => 'Please provide a valid email address',
            'password.required' => 'Password is required',
            'password.min' => 'Password must be at least 8 characters long',
            'password.confirmed' => 'Password confirmation does not match',
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => $this->input('email') ? trim(strtolower($this->input('email'))) : null
        ]);
    }
}