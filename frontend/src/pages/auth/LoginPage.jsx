/**
 * Login page component
 */

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFormNotifications } from '@/hooks/useNotifications'
import { cn } from '@/utils'



export default function LoginPage() {
  const location = useLocation()
  const { login } = useAuth()
  const { showValidationErrors } = useFormNotifications()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get the page user was trying to access before login
  const from = (location.state)?.from || '/dashboard'

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showValidationErrors(errors)
      return
    }

    setIsSubmitting(true)

    try {
      await login(formData.email, formData.password, from)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      setErrors({ general: message })
      showValidationErrors({ general: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Access your inventory management dashboard
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email field */}
        <div>
          <label htmlFor="email" className="form-label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={cn(
              'form-input',
              errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
            )}
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="form-error">{errors.email}</p>
          )}
        </div>

        {/* Password field */}
        <div>
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              className={cn(
                'form-input pr-10',
                errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
              )}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="form-error">{errors.password}</p>
          )}
        </div>

        {/* Remember me and forgot password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <Link
            to="/auth/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Forgot your password?
          </Link>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full btn btn-primary btn-lg',
            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
          )}
        >
          {isSubmitting ? (
            <>
              <div className="loading-spinner" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Sign in
            </>
          )}
        </button>
      </form>

      {/* Demo credentials */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
        <h3 className="text-sm font-medium text-amber-800 mb-2">Demo Credentials</h3>
        <div className="text-sm text-amber-700 space-y-1">
          <p><strong>Manager:</strong> manager@voltraak.com / manager123</p>
          <p><strong>Inventory Staff:</strong> inventory@voltraak.com / inventory123</p>
          <p><strong>Warehouse Staff:</strong> warehouse@voltraak.com / warehouse123</p>
        </div>
      </div>
    </div>
  )
}