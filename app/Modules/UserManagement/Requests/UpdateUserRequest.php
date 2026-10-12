<?php

namespace App\Modules\UserManagement\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\Enums\UserRole;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        $targetUserId = $this->route('id') ?? $this->route('user');
        
        // Users can update their own profile or managers can update subordinates
        return $user && ($user->id == $targetUserId || $user->isManager());
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $userId = $this->route('id') ?? $this->route('user');
        $currentUser = $this->user();
        $isSelfUpdate = $currentUser && $currentUser->id == $userId;
        
        $rules = [
            'name' => [
                'sometimes',
                'string',
                'max:255',
                'regex:/^[a-zA-Z\s\-\'\.]+$/'
            ],
            'email' => [
                'sometimes',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($userId)
            ],
            'phone' => [
                'sometimes',
                'nullable',
                'string',
                'max:20',
                'regex:/^[\+]?[0-9\-\(\)\s]+$/'
            ],
            'department' => [
                'sometimes',
                'nullable',
                'string',
                'max:100'
            ]
        ];

        // Only allow password updates if it's a self-update or manager updating subordinate
        if ($this->has('password')) {
            $rules['password'] = [
                'string',
                'min:8',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'
            ];
            
            if ($isSelfUpdate) {
                $rules['current_password'] = ['required', 'string'];
            }
        }

        // Only managers can update role and is_active
        if ($currentUser && $currentUser->isManager() && !$isSelfUpdate) {
            $rules['role'] = [
                'sometimes',
                'string',
                Rule::enum(UserRole::class),
                'not_in:' . UserRole::MANAGER->value // Cannot assign manager role
            ];
            
            $rules['is_active'] = [
                'sometimes',
                'boolean'
            ];
        }

        return $rules;
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'name.regex' => 'Name can only contain letters, spaces, hyphens, apostrophes and periods',
            'email.email' => 'Please provide a valid email address',
            'email.unique' => 'This email address is already taken',
            'password.min' => 'Password must be at least 8 characters long',
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
            'current_password.required' => 'Current password is required to change password',
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
        $data = [];
        
        if ($this->has('name')) {
            $data['name'] = $this->input('name') ? trim($this->input('name')) : null;
        }
        
        if ($this->has('email')) {
            $data['email'] = $this->input('email') ? trim(strtolower($this->input('email'))) : null;
        }
        
        if ($this->has('phone')) {
            $data['phone'] = $this->input('phone') ? trim($this->input('phone')) : null;
        }
        
        if ($this->has('department')) {
            $data['department'] = $this->input('department') ? trim($this->input('department')) : null;
        }
        
        $this->merge($data);
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // If changing password and it's a self-update, verify current password
            if ($this->has('password') && $this->has('current_password')) {
                $user = $this->user();
                if (!$user || !\Hash::check($this->input('current_password'), $user->password)) {
                    $validator->errors()->add('current_password', 'The current password is incorrect.');
                }
            }
        });
    }
}