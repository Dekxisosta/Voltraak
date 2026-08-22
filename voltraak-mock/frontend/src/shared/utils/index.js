/**
 * Utility functions for the Voltraak IMS frontend
 */

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility for merging Tailwind CSS classes with clsx
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency values
 */
export function formatCurrency(
  amount,
  currency = 'PHP',
  locale = 'en-PH'
) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format numbers with thousand separators
 */
export function formatNumber(
  value,
  minimumFractionDigits = 0,
  maximumFractionDigits = 2
) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}

/**
 * Format numbers compactly with a K/M/B suffix (e.g. 1247 -> "1.2K",
 * 892450 -> "892.5K", 4200000 -> "4.2M"). Small values pass through
 * unchanged, so this is a safe drop-in replacement for formatNumber
 * anywhere large totals might show up, like dashboard stat cards.
 */
export function formatCompactNumber(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits,
  }).format(value)
}

/**
 * Format currency compactly with a K/M/B suffix (e.g. ₱892,450 -> "₱892.5K").
 * Same idea as formatCompactNumber, but keeps the currency symbol.
 */
export function formatCompactCurrency(
  amount,
  currency = 'PHP',
  locale = 'en-PH',
  maximumFractionDigits = 1
) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits,
  }).format(amount)
}

/**
 * Format percentage values
 */
export function formatPercentage(
  value,
  decimals = 1
) {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format date values
 */
export function formatDate(
  date,
  options = {}
) {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
  
  const formatOptions = { ...defaultOptions, ...options }
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj)
}

/**
 * Format date with time
 */
export function formatDateTime(
  date,
  options = {}
) {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }
  
  const formatOptions = { ...defaultOptions, ...options }
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj)
}

/**
 * Get relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
  
  return formatDate(dateObj)
}

/**
 * Calculate days until expiry
 */
export function getDaysUntilExpiry(expiryDate) {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  
  const diffTime = expiry.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Get status variant based on stock levels or expiry
 */
export function getStockStatusVariant(
  currentStock,
  minimumStock,
  reorderPoint
) {
  if (currentStock <= 0) return 'critical'
  if (currentStock <= minimumStock) return 'critical'
  if (currentStock <= reorderPoint) return 'warning'
  return 'ok'
}

/**
 * Get batch status variant based on expiry days
 */
export function getBatchStatusVariant(daysUntilExpiry) {
  if (daysUntilExpiry < 0) return 'critical' // Expired
  if (daysUntilExpiry <= 60) return 'warning' // Warning period
  return 'ok' // Safe
}

/**
 * Debounce function for search inputs
 */
export function debounce(func, delay) {
  let timeoutId
  
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Generate initials from a name
 */
export function getInitials(name) {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Capitalize first letter of each word
 */
export function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

/**
 * Convert camelCase to readable format
 */
export function camelToTitle(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, char => char.toUpperCase())
    .trim()
}

/**
 * Generate a random ID
 */
export function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value) {
  if (value == null) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Safe array access - returns undefined instead of throwing
 */
export function safeGet(array, index) {
  return array?.[index]
}

/**
 * Group array by key
 */
export function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {})
}

/**
 * Sort array by multiple fields
 */
export function sortBy(array, ...sortKeys) {
  return [...array].sort((a, b) => {
    for (const key of sortKeys) {
      const aVal = a[key]
      const bVal = b[key]
      
      if (aVal < bVal) return -1
      if (aVal > bVal) return 1
    }
    return 0
  })
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value, total) {
  if (total === 0) return 0
  return (value / total) * 100
}

/**
 * Calculate variance percentage
 */
export function calculateVariance(actual, expected) {
  if (expected === 0) return actual === 0 ? 0 : 100
  return ((actual - expected) / expected) * 100
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number format (Philippine mobile)
 */
export function isValidPhoneNumber(phone) {
  const phoneRegex = /^(\+63|0)?9\d{9}$/
  return phoneRegex.test(phone.replace(/\s|-/g, ''))
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('639')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
  }
  
  if (cleaned.startsWith('09')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
  }
  
  return phone
}

/**
 * Sleep utility for testing
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  }
}