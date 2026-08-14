/**
 * Data Source Service
 * 
 * Toggle between mock data and real API calls via VITE_DATA_SOURCE env var.
 * - "mocks" (default): returns local mock data with simulated delay
 * - "api": calls the real backend
 * 
 * Usage in pages:
 *   import { createDataSource } from '@/shared/services/dataSource'
 *   import { mockProducts } from './mocks'
 *   import { inventoryApi } from '@/api'
 * 
 *   const ds = createDataSource({
 *     mock: () => mockProducts,
 *     api: () => inventoryApi.getProducts(),
 *   })
 * 
 *   // In your load function:
 *   const data = await ds.fetch()
 */

const USE_MOCKS = import.meta.env.VITE_DATA_SOURCE !== 'api'
const MOCK_DELAY = 600 // ms

/**
 * Simulates network delay for mock data
 */
function delay(ms = MOCK_DELAY) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Creates a data source that switches between mock and API based on env config
 * 
 * @param {Object} options
 * @param {Function} options.mock - function that returns mock data (sync or async)
 * @param {Function} options.api - function that calls the real API (async)
 * @param {number} [options.mockDelay] - override delay for mocks (default 600ms)
 */
export function createDataSource({ mock, api, mockDelay = MOCK_DELAY }) {
  return {
    async fetch() {
      if (USE_MOCKS) {
        await delay(mockDelay)
        return typeof mock === 'function' ? mock() : mock
      }
      return api()
    },

    get isUsingMocks() {
      return USE_MOCKS
    },
  }
}

/**
 * Quick helper for components that just need to know the mode
 */
export const dataSourceMode = USE_MOCKS ? 'mocks' : 'api'

/**
 * Helper to run a mock or API call directly without creating a full data source
 */
export async function fetchData(mockFn, apiFn) {
  if (USE_MOCKS) {
    await delay()
    return typeof mockFn === 'function' ? mockFn() : mockFn
  }
  return apiFn()
}
