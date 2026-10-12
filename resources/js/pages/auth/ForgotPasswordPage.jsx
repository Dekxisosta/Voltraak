/**
 * Forgot password page component
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { authApi } from '@/shared/api/auth'
import { useFormNotifications } from '@/shared/hooks/useNotifications'
import { cn } from '@/shared/utils'

export default function ForgotPasswordPage() {
  const { showValidationErrors, showFormSuccess } = useFormNotifications()
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const validateEmail = () => {
    const newErrors = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateEmail()) {
      showValidationErrors(errors)
      return
    }

    setIsSubmitting(true)

    try {
      await authApi.forgotPassword({ email })

      setIsSubmitted(true)
      showFormSuccess('Password reset link sent to your email')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset link'
      setErrors({ general: message })
      showValidationErrors({ general: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-soft)] flex items-center justify-center">
          <Mail className="h-6 w-6 text-[var(--color-text-primary)]" />
        </div>

        <div>
          <h2 className="font-heading text-2xl font-semibold text-[var(--color-text-primary)]">
            Check your email
          </h2>
          <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)]">
            We've sent a password reset link to{' '}
            <span className="font-medium text-[var(--color-text-secondary)]">{email}</span>
          </p>
        </div>

        <div className="text-sm text-[var(--color-text-tertiary)] space-y-2">
          <p>Didn't receive the email? Check your spam folder.</p>
          <button
            onClick={() => setIsSubmitted(false)}
            className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-hover)]"
          >
            Try a different email address
          </button>
        </div>

        <Link
          to="/auth/login"
          className="btn btn-secondary rounded-xl inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-semibold text-[var(--color-text-primary)]">
          Reset your password
        </h2>
        <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)]">
          Enter your email and we'll send you a link to get back in.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
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
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) {
                  setErrors(prev => ({ ...prev, email: '' }))
                }
              }}
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
              Sending reset link...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Send reset link
            </>
          )}
        </button>
      </form>

      {/* Back to login */}
      <div>
        <Link
          to="/auth/login"
          className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to login
        </Link>
      </div>
    </div>
  )
}