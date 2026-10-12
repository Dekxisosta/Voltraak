/**
 * Mock Authentication Service
 *
 * Stands in for the /auth/* backend endpoints when VITE_DATA_SOURCE !== 'api'.
 * Unlike the other files in shared/mocks/**, this isn't static data — login
 * has to actually check a password, "me" has to resolve a token back to a
 * user, etc. — so it exports a small service object instead of a plain array.
 *
 * How the mock token works:
 *   Real JWTs are opaque to the frontend; this mock token just encodes the
 *   user id so `me()` / `refreshToken()` can resolve a session after a page
 *   reload without needing a server-side session store:
 *     mock.<userId>.<issuedAtMs>.<random>
 *
 * Demo credentials (all use the same password so they're easy to remember):
 *   admin@voltraak.com     / password123   (admin — full access, every section)
 *   manager@voltraak.com   / password123   (manager — manager-only tabs)
 *   inventory@voltraak.com / password123   (inventory_staff)
 *   warehouse@voltraak.com / password123   (warehouse)
 */

import { ApiError } from '../api/client'
import { validateMockData } from './validate'

const MOCK_DELAY = 500 // ms
const DEMO_PASSWORD = 'password123'
const TOKEN_EXPIRES_IN = 60 * 60 // seconds, matches AuthContext's session length

// Persists name/email edits made through the Profile modal across reloads.
// Only these two fields are ever written here — passwords stay in-memory
// only (see changePassword below), so nothing sensitive touches storage.
const PROFILE_OVERRIDES_KEY = 'voltraak:mock-profile-overrides:v1'

function delay(ms = MOCK_DELAY) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function readProfileOverrides() {
  if (typeof window === 'undefined' || !window.localStorage) return {}
  try {
    const raw = window.localStorage.getItem(PROFILE_OVERRIDES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (error) {
    console.warn('[mock-auth] Failed to read profile overrides:', error)
    return {}
  }
}

function writeProfileOverrides(overrides) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(PROFILE_OVERRIDES_KEY, JSON.stringify(overrides))
  } catch (error) {
    console.warn('[mock-auth] Failed to persist profile overrides:', error)
  }
}

// Full records, including the password check field. Never exported directly —
// sanitizeUser() strips `password` before anything leaves this module.
const mockAccounts = [
  {
    id: 1,
    name: 'Himmel - Administrator',
    email: 'himmel@voltraak.com',
    password: DEMO_PASSWORD,
    role: 'admin',
    role_display: 'Administrator',
    permissions: ['*'],
    is_active: true,
    last_login: '2024-08-14T10:30:00Z',
    created_at: '2024-01-01',
  },
  {
    id: 2,
    name: 'Fern - Manager',
    email: 'fern@voltraak.com',
    password: DEMO_PASSWORD,
    role: 'manager',
    role_display: 'Manager',
    permissions: ['*'],
    is_active: true,
    last_login: '2024-08-14T09:15:00Z',
    created_at: '2024-01-01',
  },
  {
    id: 3,
    name: 'Stark - Inventory Staff',
    email: 'stark@voltraak.com',
    password: DEMO_PASSWORD,
    role: 'inventory_staff',
    role_display: 'Inventory Staff',
    permissions: ['*'],
    is_active: true,
    last_login: '2024-08-14T08:00:00Z',
    created_at: '2024-02-15',
  },
  {
    id: 4,
    name: 'Übel - Warehouse Staff',
    email: 'ubel@voltraak.com',
    password: DEMO_PASSWORD,
    role: 'warehouse',
    role_display: 'Warehouse Staff',
    permissions: ['*'],
    is_active: true,
    last_login: '2024-08-14T07:30:00Z',
    created_at: '2024-02-15',
  },
]

// Apply any persisted profile edits (from a previous session) on top of the
// seed accounts, so a name/email change made via the Profile modal survives
// a reload the same way mutations in shared/services/mockStore.js do.
const profileOverrides = readProfileOverrides()
mockAccounts.forEach((account) => {
  const override = profileOverrides[account.id]
  if (override) Object.assign(account, override)
})

/**
 * Read-only list of the seeded demo accounts, for UI that wants to display
 * them (e.g. the login page's "demo credentials" modal). Always reports the
 * original seed password, even if changePassword() has mutated an account's
 * in-memory password during this session — the modal should describe what
 * a fresh clone/reload logs in with, not the current (unpersisted) state.
 */
export function getDemoAccounts() {
  return mockAccounts.map(account => ({
    name: account.name,
    email: account.email,
    password: DEMO_PASSWORD,
    role: account.role,
    role_display: account.role_display,
  }))
}

function sanitizeUser(account) {
  const { password, ...user } = account
  return user
}

function issueToken(userId) {
  return `mock.${userId}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`
}

function resolveUserFromToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('mock.')) {
    return null
  }
  const [, userIdRaw] = token.split('.')
  const userId = Number(userIdRaw)
  return mockAccounts.find(account => account.id === userId && account.is_active) || null
}

export const mockAuthApi = {
  async login({ email, password } = {}) {
    await delay()

    const account = mockAccounts.find(
      a => a.email.toLowerCase() === String(email).toLowerCase()
    )

    if (!account || account.password !== password) {
      throw new ApiError(401, 'Invalid email or password')
    }

    if (!account.is_active) {
      throw new ApiError(403, 'This account has been deactivated')
    }

    const payload = {
      user: sanitizeUser(account),
      token: issueToken(account.id),
      expires_in: TOKEN_EXPIRES_IN,
    }

    validateMockData('auth/login', payload)
    return payload
  },

  async logout() {
    await delay(150)
    return { message: 'Logged out successfully' }
  },

  async me(token) {
    await delay(200)

    const account = resolveUserFromToken(token)
    if (!account) {
      throw new ApiError(401, 'Invalid or expired token')
    }

    const user = sanitizeUser(account)
    validateMockData('auth/me', user)
    return user
  },

  async refreshToken(token) {
    await delay(200)

    const account = resolveUserFromToken(token)
    if (!account) {
      throw new ApiError(401, 'Invalid or expired token')
    }

    return {
      token: issueToken(account.id),
      expires_in: TOKEN_EXPIRES_IN,
    }
  },

  async forgotPassword() {
    await delay(400)
    // Deliberately generic, mirroring how a real API shouldn't reveal
    // whether an email is registered.
    return { message: 'If that email is registered, a reset link has been sent.' }
  },

  async resetPassword() {
    await delay(400)
    return { message: 'Password has been reset successfully.' }
  },

  /**
   * Update the current user's name/email. Persists to localStorage so the
   * change survives a reload (login/me() re-apply overrides on init).
   */
  async updateProfile(token, patch = {}) {
    await delay()

    const account = resolveUserFromToken(token)
    if (!account) {
      throw new ApiError(401, 'Invalid or expired token')
    }

    const { name, email } = patch
    if (name !== undefined && !String(name).trim()) {
      throw new ApiError(422, 'Name cannot be empty')
    }
    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new ApiError(422, 'Enter a valid email address')
      }
      const emailTaken = mockAccounts.some(
        a => a.id !== account.id && a.email.toLowerCase() === normalizedEmail
      )
      if (emailTaken) {
        throw new ApiError(422, 'That email is already in use')
      }
    }

    if (name !== undefined) account.name = String(name).trim()
    if (email !== undefined) account.email = String(email).trim().toLowerCase()

    const overrides = readProfileOverrides()
    overrides[account.id] = {
      ...overrides[account.id],
      ...(name !== undefined ? { name: account.name } : {}),
      ...(email !== undefined ? { email: account.email } : {}),
    }
    writeProfileOverrides(overrides)

    const user = sanitizeUser(account)
    validateMockData('auth/me', user)
    return user
  },

  /**
   * Validates the current password against the account and, if it matches,
   * updates it in-memory for the rest of the session. Not persisted to
   * localStorage — a page reload resets it back to the demo password,
   * which is intentional for a shared demo environment.
   */
  async changePassword(token, { current_password, password, password_confirmation } = {}) {
    await delay(400)

    const account = resolveUserFromToken(token)
    if (!account) {
      throw new ApiError(401, 'Invalid or expired token')
    }

    if (account.password !== current_password) {
      throw new ApiError(422, 'Current password is incorrect')
    }
    if (!password || password.length < 8) {
      throw new ApiError(422, 'New password must be at least 8 characters')
    }
    if (password !== password_confirmation) {
      throw new ApiError(422, 'New password and confirmation do not match')
    }

    account.password = password
    return { message: 'Password changed successfully.' }
  },
}
