/**
 * Forgot password page component
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { useFormNotifications } from '@/hooks/useNotifications'
import { cn } from '@/utils'

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
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset link')
      }

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
      <div className="text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Mail className="h-8 w-8 text-green-600" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a password reset link to{' '}
            <span className="font-medium">{email}</span>
          </p>
        </div>

        <div className="text-sm text-gray-500 space-y-2">
          <p>Didn't receive the email? Check your spam folder.</p>
          <button
            onClick={() => setIsSubmitted(false)}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Try a different email address
          </button>
        </div>

        <Link
          to="/auth/login"
          className="btn btn-secondary inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
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
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) {
                setErrors(prev => ({ ...prev, email: '' }))
              }
            }}
            className={cn(
              'form-input',
              errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
            )}
            placeholder="Enter your email address"
          />
          {errors.email && (
            <p className="form-error">{errors.email}</p>
          )}
        </div>

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
      <div className="text-center">
        <Link
          to="/auth/login"
          className="text-sm text-blue-600 hover:text-blue-500 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to login
        </Link>
      </div>
    </div>
  )
}