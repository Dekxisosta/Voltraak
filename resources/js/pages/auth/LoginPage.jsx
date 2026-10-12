/**
 * Login page component
 */

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff, LogIn, KeyRound, Mail, Lock, Construction } from 'lucide-react'
import { useAuth } from '@/shared/contexts/AuthContext'
import { useFormNotifications } from '@/shared/hooks/useNotifications'
import { cn } from '@/shared/utils'
import { dataSourceMode } from '@/shared/services/dataSource'
import { Modal, ModalBody } from '@/shared/components/common'
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
  const [showForgotPassword, setShowForgotPassword] = useState(false)

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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-semibold text-[var(--color-text-primary)]">
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)]">
          Sign in to keep tabs on every shelf.
        </p>
      </div>

      {/* General error */}
      {errors.general && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10 px-3.5 py-2.5">
          <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email field */}
        <div>
          <label htmlFor="email" className="form-label">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className={cn(
                'form-input rounded-xl pl-10',
                errors.email ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : ''
              )}
              placeholder="you@company.com"
            />
          </div>
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
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              className={cn(
                'form-input rounded-xl pl-10 pr-10',
                errors.password ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : ''
              )}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-[var(--color-text-muted)]" />
              ) : (
                <Eye className="h-4 w-4 text-[var(--color-text-muted)]" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="form-error">{errors.password}</p>
          )}
        </div>

        {/* Remember me and forgot password */}
        <div className="flex items-center justify-between pt-1">
          <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer select-none">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--color-border-secondary)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            <span className="text-sm text-[var(--color-text-secondary)]">Remember me</span>
          </label>

          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full btn btn-primary btn-lg rounded-xl',
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

      {/* Forgot password — password reset needs a real backend to send email,
          so this just sets expectations rather than routing anywhere. */}
      <Modal isOpen={showForgotPassword} onClose={() => setShowForgotPassword(false)} title="Password reset" size="sm">
        <ModalBody>
          <div className="flex flex-col items-center text-center py-2">
            <div className="h-12 w-12 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-4">
              <Construction className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Not available yet
            </p>
            <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] max-w-[280px]">
              Password reset needs a real backend to send the reset email. It'll be wired up once Voltraak is connected to one.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="mt-5 btn btn-secondary rounded-xl w-full"
            >
              Got it
            </button>
          </div>
        </ModalBody>
      </Modal>
    </div>
  )
}