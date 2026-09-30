import React from 'react'
import { usePage, router } from '@inertiajs/react'
import { TrendingUp, TrendingDown, Package, DollarSign, AlertTriangle, CheckCircle, Clock, BarChart3 } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'

export default function ManagerDashboard() {
  const { dashboard, user } = usePage().props

  const MetricCard = ({ title, value, change, icon: Icon, trend }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
          <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
      </div>
    </div>
  )

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manager Dashboard</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Welcome back, {user.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Daily Transactions"
            value={dashboard.operational_metrics.daily_transactions}
            icon={BarChart3}
          />
          <MetricCard
            title="Physical Counts (Week)"
            value={dashboard.operational_metrics.weekly_physical_counts}
            icon={CheckCircle}
          />
          <MetricCard
            title="Pending POs"
            value={dashboard.operational_metrics.pending_pos}
            icon={Clock}
          />
          <MetricCard
            title="Low Stock Products"
            value={dashboard.operational_metrics.low_stock_products}
            icon={AlertTriangle}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Pending Approvals</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Procurement Requests</span>
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-sm font-medium rounded-full">
                  {dashboard.pending_approvals.procurement_requests}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Purchase Orders</span>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-full">
                  {dashboard.pending_approvals.purchase_orders}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Variance Adjustments</span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm font-medium rounded-full">
                  {dashboard.pending_approvals.variance_adjustments}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Inventory Alerts</h2>
            <div className="space-y-3">
              {dashboard.inventory_alerts.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No alerts at this time</p>
              ) : (
                dashboard.inventory_alerts.slice(0, 5).map((alert, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-900 dark:text-white font-medium">{alert.message}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{alert.product_name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Procurement Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Monthly Spend</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                ₱{dashboard.procurement_summary?.monthly_spend?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Orders This Month</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {dashboard.procurement_summary?.orders_this_month || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Supplier Performance</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {dashboard.procurement_summary?.supplier_performance || 0}%
              </p>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
