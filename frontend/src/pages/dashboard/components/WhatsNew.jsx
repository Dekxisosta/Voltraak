/**
 * WhatsNew
 *
 * Changelog / release-notes panel shown on every role dashboard.
 * Items are sorted newest-first. Each entry has a `tag` (e.g. "Feature",
 * "Fix", "Improvement") that renders a colored badge so users can skim
 * the type of change at a glance.
 */

import { Sparkles } from 'lucide-react'

const TAG_CLASSES = {
  Feature: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Improvement: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Fix: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Security: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const updates = [
  {
    id: '1',
    tag: 'Feature',
    title: 'Role-Based Dashboards',
    description:
      'Each role now gets a tailored dashboard — Warehouse, Inventory, Manager, and Admin views are fully separated.',
    date: 'Aug 28, 2026',
  },
  {
    id: '2',
    tag: 'Feature',
    title: 'FEFO Batch Management',
    description:
      'Warehouse staff can now prioritize soon-to-expire batches directly from the FEFO tab, reducing write-offs.',
    date: 'Aug 20, 2026',
  },
  {
    id: '3',
    tag: 'Improvement',
    title: 'Live Alerts Panel',
    description:
      'Alerts now update in real time as stock levels, PO approvals, and discrepancies change — no page refresh needed.',
    date: 'Aug 14, 2026',
  },
  {
    id: '4',
    tag: 'Feature',
    title: 'Purchase Order Approvals',
    description:
      'Managers can approve or reject purchase orders inline. High-value POs (over ₱50,000) are flagged automatically.',
    date: 'Aug 5, 2026',
  },
  {
    id: '5',
    tag: 'Fix',
    title: 'Discrepancy Status Sync',
    description:
      'Resolved an issue where resolving a discrepancy on the Inventory page did not immediately update the Warehouse dashboard count.',
    date: 'Jul 30, 2026',
  },
]

export default function WhatsNew() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">What's New</h3>
          </div>
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full px-2.5 py-0.5">
            {updates.length} updates
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Latest changes and improvements to Voltraak
        </p>
      </div>

      <div className="card-body">
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {updates.map((item) => (
            <UpdateItem key={item.id} item={item} />
          ))}
        </ul>
      </div>
    </div>
  )
}

function UpdateItem({ item }) {
  const tagClass = TAG_CLASSES[item.tag] ?? TAG_CLASSES.Improvement

  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className={`mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight ${tagClass}`}
      >
        {item.tag}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
          {item.title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {item.description}
        </p>
      </div>
      <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap mt-0.5">
        {item.date}
      </span>
    </li>
  )
}
