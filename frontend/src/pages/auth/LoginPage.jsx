/**
 * Login page component
 */

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff, LogIn, KeyRound } from 'lucide-react'
import { useAuth } from '@/shared/contexts/AuthContext'
import { useFormNotifications } from '@/shared/hooks/useNotifications'
import { cn } from '@/shared/utils'
import { dataSourceMode } from '@/shared/services/dataSource'
import DemoCredentialsModal from './components/DemoCredentialsModal'



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
  const [showDemoCredentials, setShowDemoCredentials] = useState(false)

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

  const handleUseDemoAccount = (account) => {
    setFormData({ email: account.email, password: account.password })
    setErrors({})
    setShowDemoCredentials(false)
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
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
              errors.email ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : ''
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
                errors.password ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : ''
              )}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
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
              className="h-4 w-4 text-gray-600 dark:text-gray-400 focus:ring-gray-400 dark:focus:ring-gray-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
              Remember me
            </label>
          </div>

          <Link
            to="/auth/forgot-password"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
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

      {/* Demo credentials — only meaningful while running on mocks */}
      {dataSourceMode === 'mocks' && (
        <>
          <button
            type="button"
            onClick={() => setShowDemoCredentials(true)}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] py-2"
          >
            <KeyRound className="h-4 w-4" />
            View demo credentials
          </button>

          <DemoCredentialsModal
            isOpen={showDemoCredentials}
            onClose={() => setShowDemoCredentials(false)}
            onSelect={handleUseDemoAccount}
          />
        </>
      )}
    </div>
  )
}