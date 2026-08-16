<?php

namespace App\Modules\UserManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\Enums\UserRole;

class StoreUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Only managers can create users
        return $this->user() && $this->user()->isManager();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-zA-Z\s\-\'\.]+$/'
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email'
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'
            ],
            'role' => [
                'required',
                'string',
                Rule::enum(UserRole::class),
                'not_in:' . UserRole::MANAGER->value // Managers cannot create other managers
            ],
            'phone' => [
                'nullable',
                'string',
                'max:20',
                'regex:/^[\+]?[0-9\-\(\)\s]+$/'
            ],
            'department' => [
                'nullable',
                'string',
                'max:100'
            ],
            'is_active' => [
                'nullable',
                'boolean'
            ]
        ];
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Full name is required',
            'name.regex' => 'Name can only contain letters, spaces, hyphens, apostrophes and periods',
            'email.required' => 'Email address is required',
            'email.email' => 'Please provide a valid email address',
            'email.unique' => 'This email address is already registered',
            'password.required' => 'Password is required',
            'password.min' => 'Password must be at least 8 characters long',
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
            'role.required' => 'User role is required',
            'role.enum' => 'Please select a valid user role',
            'role.not_in' => 'You cannot assign manager role to other users',
            'phone.regex' => 'Please provide a valid phone number',
            'department.max' => 'Department name cannot exceed 100 characters'
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => $this->input('name') ? trim($this->input('name')) : null,
            'email' => $this->input('email') ? trim(strtolower($this->input('email'))) : null,
            'phone' => $this->input('phone') ? trim($this->input('phone')) : null,
            'department' => $this->input('department') ? trim($this->input('department')) : null,
        ]);
    }
}