/**
 * Authentication layout component
 * Used for login, registration, and other auth-related pages
 */

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center">
            <img
              src="/assets/logo/voltraak-logo.png"
              alt="Voltraak"
              className="w-10 h-10 rounded-lg object-contain"
            />
            <div className="ml-3">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Voltraak</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inventory Management</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          &copy; 2024 Voltraak IMS. Built for WalangBrownout Appliances.
        </p>
      </div>
    </div>
  )
}
