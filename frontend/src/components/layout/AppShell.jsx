/**
 * Main application shell with sidebar navigation and header
 */

import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import NotificationContainer from '../common/NotificationContainer'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Sidebar backdrop */}
          <div
            className="fixed inset-0 bg-gray-900/80"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar panel */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white">
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
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Notification container */}
      <NotificationContainer />
    </div>
  )
}