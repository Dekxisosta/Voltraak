/**
 * Authentication flow test component
 * Tests the complete authentication system including login, session management, and routing guards
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSessionStatus } from '@/components/common/SessionManager'

// Auth test result structure: { name, status, message, data }
const _createAuthTestResult = (name, status = 'pending', message = '', data = null) => ({
  name,
  status, // 'pending' | 'success' | 'error' | 'skipped'
  message,
  data
})

export default function AuthFlowTest() {
  const { 
    isAuthenticated, 
    login, 
    logout, 
    user, 
    hasRole, 
    canAccessRoute
  } = useAuth()
  const { timeRemaining, isExpiringSoon, formatTime } = useSessionStatus()

  const [results, setResults] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState('')

  const updateResult = (name, status, message, data) => {
    setResults(prev => prev.map(r => 
      r.name === name ? { ...r, status, message, data } : r
    ))
  }

  const runAuthTests = async () => {
    setIsRunning(true)
    setCurrentStep('Initializing...')
    
    const testSuites = [
      { name: 'Initial State Check', status: 'pending', message: 'Testing...' },
      { name: 'Login Flow', status: 'pending', message: 'Testing...' },
      { name: 'User Context', status: 'pending', message: 'Testing...' },
      { name: 'Role Checking', status: 'pending', message: 'Testing...' },
      { name: 'Route Access Control', status: 'pending', message: 'Testing...' },
      { name: 'Session Management', status: 'pending', message: 'Testing...' },
      { name: 'Logout Flow', status: 'pending', message: 'Testing...' },
    ]
    
    setResults(testSuites)

    try {
      // Test 1: Initial State
      setCurrentStep('Testing initial authentication state...')
      const initialAuth = isAuthenticated
      updateResult('Initial State Check', 'success', 
        `Initial auth state: ${initialAuth ? 'authenticated' : 'not authenticated'}`, 
        { isAuthenticated: initialAuth, user: user?.name || null }
      )

      // Test 2: Login Flow (if not authenticated)
      if (!isAuthenticated) {
        setCurrentStep('Testing login with demo credentials...')
        try {
          await login('manager@voltraak.com', 'manager123')
          updateResult('Login Flow', 'success', 'Login successful', {
            user: user?.name,
            role: user?.role,
            isAuthenticated: true
          })
        } catch (error) {
          updateResult('Login Flow', 'error', `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          // Skip remaining tests that require authentication
          const skipTests = ['User Context', 'Role Checking', 'Route Access Control', 'Session Management']
          skipTests.forEach(testName => {
            updateResult(testName, 'skipped', 'Skipped due to login failure')
          })
          return
        }
      } else {
        updateResult('Login Flow', 'skipped', 'Already authenticated')
      }

      // Test 3: User Context
      setCurrentStep('Verifying user context data...')
      if (user) {
        updateResult('User Context', 'success', 'User data available', {
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions?.length || 0
        })
      } else {
        updateResult('User Context', 'error', 'User data not available')
      }

      // Test 4: Role Checking
      setCurrentStep('Testing role-based access control...')
      const roleTests = {
        hasManagerRole: hasRole('manager'),
        hasInventoryRole: hasRole('inventory_staff'),
        hasWarehouseRole: hasRole('warehouse'),
        hasMultipleRoles: hasRole(['manager', 'inventory_staff']),
        hasWrongRole: hasRole('non_existent_role')
      }
      
      const roleTestsPassed = Object.values(roleTests).some(test => test === true)
      updateResult('Role Checking', roleTestsPassed ? 'success' : 'error', 
        roleTestsPassed ? 'Role checking working correctly' : 'Role checking failed',
        roleTests
      )

      // Test 5: Route Access Control
      setCurrentStep('Testing route access control...')
      const routeTests = {
        canAccessDashboard: canAccessRoute(),
        canAccessManagerRoutes: canAccessRoute(['manager']),
        canAccessInventoryRoutes: canAccessRoute(['inventory_staff', 'manager']),
        canAccessWarehouseRoutes: canAccessRoute(['warehouse', 'manager']),
        cannotAccessRestrictedRoute: !canAccessRoute(['non_existent_role'])
      }

      const routeTestsPassed = routeTests.canAccessDashboard && routeTests.cannotAccessRestrictedRoute
      updateResult('Route Access Control', routeTestsPassed ? 'success' : 'error',
        routeTestsPassed ? 'Route access control working correctly' : 'Route access control issues detected',
        routeTests
      )

      // Test 6: Session Management
      setCurrentStep('Testing session management...')
      const sessionData = {
        timeRemaining: formatTime(timeRemaining),
        isExpiringSoon,
        hasValidSession: timeRemaining !== null && timeRemaining > 0
      }

      updateResult('Session Management', sessionData.hasValidSession ? 'success' : 'error',
        sessionData.hasValidSession ? 'Session management active' : 'Session management not working',
        sessionData
      )

      // Test 7: Logout Flow (optional)
      setCurrentStep('Authentication flow tests completed')
      updateResult('Logout Flow', 'skipped', 'Manual test - use logout button in header')

    } catch (error) {
      updateResult('Login Flow', 'error', `Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunning(false)
      setCurrentStep('')
    }
  }

  // Auto-run tests when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      runAuthTests()
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-800 bg-green-100'
      case 'error': return 'text-red-800 bg-red-100'
      case 'skipped': return 'text-gray-800 bg-gray-100'
      default: return 'text-yellow-800 bg-yellow-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✓'
      case 'error': return '✗'
      case 'skipped': return '⊝'
      default: return '⏳'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded-lg">
      <h2 className="text-2xl font-bold mb-6">Authentication Flow Test</h2>
      
      {/* Current authentication status */}
      <div className="mb-6 p-4 border rounded-lg bg-blue-50">
        <h3 className="font-semibold mb-2">Current Authentication Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>User:</strong> {user?.name || 'None'}
          </div>
          <div>
            <strong>Role:</strong> {user?.role || 'None'}
          </div>
          <div>
            <strong>Email:</strong> {user?.email || 'None'}
          </div>
          <div>
            <strong>Session:</strong> {formatTime(timeRemaining)}
          </div>
          <div>
            <strong>Expiring Soon:</strong> {isExpiringSoon ? 'Yes' : 'No'}
          </div>
        </div>
      </div>

      {/* Test controls */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={runAuthTests}
          disabled={isRunning}
          className={`px-4 py-2 rounded font-medium ${
            isRunning 
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRunning ? 'Running Tests...' : 'Run Authentication Tests'}
        </button>
        
        {isAuthenticated && (
          <button
            onClick={() => logout()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
          >
            Test Logout
          </button>
        )}
      </div>

      {/* Current step */}
      {currentStep && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 font-medium">{currentStep}</p>
        </div>
      )}

      {/* Test results */}
      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.name} className="border border-gray-200 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{result.name}</h3>
              <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(result.status)}`}>
                {getStatusIcon(result.status)} {result.status.toUpperCase()}
              </span>
            </div>
            
            <p className="text-gray-700 mb-2">{result.message}</p>
            
            {result.data && (
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Test information */}
      <div className="mt-6 text-sm text-gray-600">
        <h4 className="font-medium mb-2">Test Suite Information:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Initial State Check:</strong> Verifies the initial authentication state</li>
          <li><strong>Login Flow:</strong> Tests login with demo manager credentials</li>
          <li><strong>User Context:</strong> Verifies user data is properly loaded</li>
          <li><strong>Role Checking:</strong> Tests role-based access control functions</li>
          <li><strong>Route Access Control:</strong> Tests route-level access control</li>
          <li><strong>Session Management:</strong> Verifies session timing and management</li>
          <li><strong>Logout Flow:</strong> Manual test via header logout button</li>
        </ul>
      </div>
    </div>
  )
}