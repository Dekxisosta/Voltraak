/**
 * API connectivity test component
 * Temporary component to test API integration
 */

import { useState } from 'react'
import { apiClient } from '@/api/client'
import { authApi } from '@/api/auth'

// Test result structure: { name, status, message, data }
const _createTestResult = (name, status = 'pending', message = '', data = null) => ({
  name,
  status, // 'pending' | 'success' | 'error'
  message,
  data
})

export default function ApiTest() {
  const [results, setResults] = useState([])
  const [isRunning, setIsRunning] = useState(false)

  const updateResult = (name, status, message, data) => {
    setResults(prev => prev.map(r => 
      r.name === name ? { ...r, status, message, data } : r
    ))
  }

  const runTests = async () => {
    setIsRunning(true)
    setResults([
      { name: 'Health Check', status: 'pending', message: 'Testing...' },
      { name: 'Auth Endpoints', status: 'pending', message: 'Testing...' },
      { name: 'Protected Route', status: 'pending', message: 'Testing...' },
    ])

    try {
      // Test 1: Health check
      try {
        const healthResponse = await apiClient.get('/health')
        updateResult('Health Check', 'success', 'API is healthy', healthResponse)
      } catch (error) {
        updateResult('Health Check', 'error', `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Test 2: Auth endpoints (login with demo credentials)
      try {
        const loginResponse = await authApi.login({
          email: 'manager@voltraak.com',
          password: 'manager123'
        })
        updateResult('Auth Endpoints', 'success', 'Login successful', { user: loginResponse.user.name, role: loginResponse.user.role })
      } catch (error) {
        updateResult('Auth Endpoints', 'error', `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Test 3: Protected route (get user profile)
      try {
        const userProfile = await authApi.me()
        updateResult('Protected Route', 'success', 'Protected route works', { user: userProfile.name, email: userProfile.email })
      } catch (error) {
        updateResult('Protected Route', 'error', `Protected route failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 shadow rounded-lg">
      <h2 className="text-2xl font-bold mb-6">API Connectivity Test</h2>
      
      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`px-4 py-2 rounded font-medium ${
            isRunning 
              ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500 dark:text-gray-400'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRunning ? 'Running Tests...' : 'Run API Tests'}
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.name} className="border border-gray-200 dark:border-gray-700 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{result.name}</h3>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                result.status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                result.status === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
              }`}>
                {result.status.toUpperCase()}
              </span>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-2">{result.message}</p>
            
            {result.data && (
              <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        <h4 className="font-medium mb-2">Test Details:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Health Check:</strong> Tests if the Laravel backend is running and accessible</li>
          <li><strong>Auth Endpoints:</strong> Tests login with demo manager credentials</li>
          <li><strong>Protected Route:</strong> Tests authenticated API call to get user profile</li>
        </ul>
        <p className="mt-2">
          <strong>Base URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}
        </p>
      </div>
    </div>
  )
}