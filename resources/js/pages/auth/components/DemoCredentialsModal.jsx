/**
 * Demo Credentials Modal
 *
 * Shows the actual seeded mock accounts (see shared/mocks/auth.js) so the
 * login screen never drifts out of sync with what login() really accepts.
 * Only rendered while running on mock data — there's nothing meaningful to
 * show once the app is wired to a real backend.
 */

import { useState } from 'react'
import { Modal, ModalBody } from '@/shared/components/common'
import { getDemoAccounts } from '@/shared/mocks/auth'
import { dataSourceMode } from '@/shared/services/dataSource'
import { ArrowRight, Check, Copy, FlaskConical } from 'lucide-react'

// Small fixed palette for role badges. Picked once per role_display via a
// deterministic hash so the same role always lands on the same color across
// renders and reloads, without hardcoding specific role names.
const BADGE_PALETTE = [
  { bg: 'bg-blue-500/10', text: 'text-blue-600' },
  { bg: 'bg-violet-500/10', text: 'text-violet-600' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  { bg: 'bg-amber-500/10', text: 'text-amber-600' },
  { bg: 'bg-rose-500/10', text: 'text-rose-600' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-600' },
]

function badgeFor(label) {
  let hash = 0
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0
  return BADGE_PALETTE[hash % BADGE_PALETTE.length]
}

function initialsFor(label) {
  const words = label.trim().split(/\s+/)
  return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase()
}

export default function DemoCredentialsModal({ isOpen, onClose, onSelect }) {
  const [copiedEmail, setCopiedEmail] = useState(null)

  if (dataSourceMode !== 'mocks') return null

  const accounts = getDemoAccounts()

  const handleCopyPassword = (e, account) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(account.password)
    setCopiedEmail(account.email)
    setTimeout(() => setCopiedEmail((current) => (current === account.email ? null : current)), 1500)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Demo Credentials" size="sm">
      <ModalBody>
        <div className="flex items-start gap-2.5 mb-5 p-3 rounded-lg bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20">
          <FlaskConical className="h-4 w-4 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            This is a demo environment. Select an account to fill the login form, or sign in manually with any of these.
          </p>
        </div>

        <div className="space-y-2">
          {accounts.map((account) => {
            const badge = badgeFor(account.role_display)
            const justCopied = copiedEmail === account.email

            return (
              <button
                key={account.email}
                type="button"
                onClick={() => onSelect(account)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border-primary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:-translate-y-px hover:shadow-sm transition-all duration-150 text-left group"
              >
                <div className={`h-9 w-9 rounded-full ${badge.bg} ${badge.text} flex items-center justify-center text-xs font-semibold flex-shrink-0`}>
                  {initialsFor(account.role_display)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {account.role_display}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                    {account.email}
                  </p>
                  <div className="mt-1 inline-flex items-center gap-1.5">
                    <span className="text-xs font-mono text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] rounded px-1.5 py-0.5">
                      {account.password}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyPassword(e, account)}
                      className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                      aria-label={`Copy password for ${account.role_display}`}
                      title="Copy password"
                    >
                      {justCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            )
          })}
        </div>
      </ModalBody>
    </Modal>
  )
}