/**
 * Admin section
 * Routed at /admin — sub-pages picked via ?tab=
 */

import TabbedSection from '@/shared/components/common/TabbedSection'
import UserManagementPage from './users/UserManagementPage'

const TABS = {
  users: UserManagementPage,
}

export default function AdminSection() {
  return <TabbedSection basePath="/admin" tabs={TABS} defaultTab="users" />
}
