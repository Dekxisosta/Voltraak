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
 *
 * For resources that also need create/update/delete, see
 * createResourceDataSource() below — it's the mutation-capable counterpart,
 * backed by shared/services/mockStore.js instead of a static array.
 */

import {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  removeRecord,
  subscribe,
  resetCollection,
} from './mockStore'

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

/**
 * Same shape as fetchData(), named for call sites that are writing rather
 * than reading (a one-off create/update/delete that doesn't warrant a full
 * createResourceDataSource()). Purely a naming convenience — behavior is
 * identical to fetchData().
 */
export const mutateData = fetchData

/**
 * Creates a full CRUD data source for one resource, backed by the mutable
 * mock store when USE_MOCKS is on, or the given `api` client otherwise.
 * This is the drop-in alternative to standing up an MSW handler for the
 * same resource: pages get list/get/create/update/remove without caring
 * which side of the switch they're on, and mutations against mock data
 * persist to localStorage instead of vanishing on the next fetch.
 *
 * @param {string} key - resource key, matching an entry in
 *   shared/mocks/collections.js (e.g. 'manager/po-approvals')
 * @param {Object} [options]
 * @param {Object} [options.api] - real API client with matching methods:
 *   { list, get, create, update, remove }. Only required once
 *   VITE_DATA_SOURCE=api is set; each method receives the same arguments
 *   as its mock counterpart below.
 *
 * Usage in pages:
 *   const orders = createResourceDataSource('manager/po-approvals', {
 *     api: procurementApi, // TODO: wire once the endpoint exists
 *   })
 *
 *   const list = await orders.list()
 *   await orders.update(po.id, { status: 'approved' })
 *
 *   // Stay in sync with mutations made elsewhere (e.g. another tab/page):
 *   useEffect(() => orders.subscribe(setOrders), [])
 */
export function createResourceDataSource(key, { api } = {}) {
  return {
    async list() {
      if (USE_MOCKS) return listRecords(key)
      return api.list()
    },

    async get(id) {
      if (USE_MOCKS) return getRecord(key, id)
      return api.get(id)
    },

    async create(record) {
      if (USE_MOCKS) return createRecord(key, record)
      return api.create(record)
    },

    async update(id, patch) {
      if (USE_MOCKS) return updateRecord(key, id, patch)
      return api.update(id, patch)
    },

    async remove(id) {
      if (USE_MOCKS) return removeRecord(key, id)
      return api.remove(id)
    },

    /**
     * Subscribe to changes on this resource (mocks only — real API
     * consumers should poll or use their own websocket/event source).
     * Returns an unsubscribe function.
     */
    subscribe(listener) {
      if (!USE_MOCKS) return () => {}
      return subscribe(key, listener)
    },

    /** Discard mock mutations and restore seed data (mocks only). */
    reset() {
      if (USE_MOCKS) resetCollection(key)
    },

    get isUsingMocks() {
      return USE_MOCKS
    },
  }
}
