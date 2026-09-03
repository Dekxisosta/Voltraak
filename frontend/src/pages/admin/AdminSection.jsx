/**
 * Admin section
 * Routed at /admin — sub-pages picked via ?tab=
 */

import TabbedSection from '@/shared/components/common/TabbedSection'
import UserManagementPage from './users/UserManagementPage'
import WorkQueuePage from '@/pages/work-queue/WorkQueuePage'

const TABS = {
  'work-queue': WorkQueuePage,
  users: UserManagementPage,
}

export default function AdminSection() {
  return <TabbedSection basePath="/admin" tabs={TABS} defaultTab="users" />
}
