/**
 * Demo Credentials Modal
 *
 * Shows the actual seeded mock accounts (see shared/mocks/auth.js) so the
 * login screen never drifts out of sync with what login() really accepts.
 * Only rendered while running on mock data — there's nothing meaningful to
 * show once the app is wired to a real backend.
 */

import { Modal, ModalBody } from '@/shared/components/common'
import { getDemoAccounts } from '@/shared/mocks/auth'
import { dataSourceMode } from '@/shared/services/dataSource'
import { ArrowRight } from 'lucide-react'

export default function DemoCredentialsModal({ isOpen, onClose, onSelect }) {
  if (dataSourceMode !== 'mocks') return null

  const accounts = getDemoAccounts()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Demo Credentials" size="sm">
      <ModalBody>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          This is a demo environment. Pick an account below to fill the login
          form, or sign in manually with any of these.
        </p>

        <div className="space-y-2">
          {accounts.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => onSelect(account)}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-border-primary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-colors text-left group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {account.role_display}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                  {account.email}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
                  {account.password}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] flex-shrink-0" />
            </button>
          ))}
        </div>
      </ModalBody>
    </Modal>
  )
}
