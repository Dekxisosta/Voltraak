/**
 * Main application shell with sidebar navigation and header
 */

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      {/* Sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Sidebar backdrop */}
          <div
            className="fixed inset-0 bg-[var(--color-overlay)]"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar panel */}
          <div className="fixed inset-y-0 left-0 w-64 bg-sidebar-bg">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>

    </div>
  )
}