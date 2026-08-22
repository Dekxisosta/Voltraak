/**
 * Mock Data Store
 *
 * A client-side "fake backend" for the mock datasets — the mutation
 * counterpart to dataSource.js's read-only fetchData(). Where Mock Service
 * Worker intercepts fetch() at the network layer and hands back canned
 * responses, this intercepts nothing: pages call it directly, the same way
 * they'd call a real API client. What it gives you that a plain in-memory
 * array doesn't:
 *
 *   - Real create/update/remove semantics (id assignment, 404-style errors
 *     for missing records) instead of every page hand-rolling its own
 *     `setData(prev => [...prev, newThing])`.
 *   - Persistence across reloads via localStorage, so approving a PO or
 *     logging a stock transaction survives a refresh instead of snapping
 *     back to the seed data.
 *   - One shared source of truth per resource, so two pages/components
 *     reading the same collection (e.g. a dashboard alert count and the
 *     full table) can both react to a mutation via subscribe().
 *   - Optional simulated latency/error-rate, same as you'd configure in an
 *     MSW handler, for exercising loading and error states.
 *
 * Usage — most pages won't touch this module directly; go through
 * createResourceDataSource() in dataSource.js instead, which also handles
 * the mock/real-API switch. This module is the mock half of that.
 */

import { SEED_COLLECTIONS, isRegisteredCollection } from '../mocks/collections'

const STORAGE_KEY = 'voltraak:mock-db:v1'
const MOCK_DELAY = 500 // ms, mirrors dataSource.js's default
const ERROR_RATE = Number(import.meta.env.VITE_MOCK_ERROR_RATE ?? 0) // 0..1

const hasStorage = typeof window !== 'undefined' && !!window.localStorage

// In-memory cache: { [collectionKey]: record[] }. Hydrated lazily per
// collection on first access, then kept in sync with localStorage.
const cache = {}

// { [collectionKey]: Set<listener> }
const listeners = {}

function delay(ms = MOCK_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function maybeFail(action, key) {
  if (ERROR_RATE > 0 && Math.random() < ERROR_RATE) {
    throw new Error(`[mock-store] Simulated failure on ${action} "${key}"`)
  }
}

function assertRegistered(key) {
  if (!isRegisteredCollection(key)) {
    throw new Error(
      `[mock-store] "${key}" is not a registered mutable collection. ` +
      `Add it to shared/mocks/collections.js first.`
    )
  }
}

function readAllFromStorage() {
  if (!hasStorage) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (error) {
    console.warn('[mock-store] Failed to read persisted data, starting fresh:', error)
    return {}
  }
}

function writeAllToStorage(all) {
  if (!hasStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch (error) {
    console.warn('[mock-store] Failed to persist mock data:', error)
  }
}

function persistCollection(key) {
  const all = readAllFromStorage()
  all[key] = cache[key]
  writeAllToStorage(all)
}

function ensureLoaded(key) {
  assertRegistered(key)
  if (cache[key]) return cache[key]

  const persisted = readAllFromStorage()
  cache[key] = Array.isArray(persisted[key])
    ? persisted[key]
    : structuredCloneSafe(SEED_COLLECTIONS[key])

  return cache[key]
}

function structuredCloneSafe(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value))
}

function notify(key) {
  listeners[key]?.forEach((listener) => listener(cache[key]))
}

function nextId(records) {
  const numericIds = records
    .map((r) => r.id)
    .filter((id) => typeof id === 'number' && Number.isFinite(id))
  return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1
}

/**
 * Subscribe to changes on a collection. Returns an unsubscribe function.
 * Fires immediately with the current snapshot, then again on every mutation.
 */
export function subscribe(key, listener) {
  ensureLoaded(key)
  listeners[key] = listeners[key] || new Set()
  listeners[key].add(listener)
  listener(cache[key])
  return () => listeners[key]?.delete(listener)
}

/** List all records in a collection (clone — safe to mutate by the caller). */
export async function listRecords(key, { delayMs = MOCK_DELAY } = {}) {
  await delay(delayMs)
  maybeFail('list', key)
  return structuredCloneSafe(ensureLoaded(key))
}

/** Get a single record by id, or null if not found. */
export async function getRecord(key, id, { delayMs = MOCK_DELAY } = {}) {
  await delay(delayMs)
  maybeFail('get', key)
  const records = ensureLoaded(key)
  const found = records.find((r) => String(r.id) === String(id))
  return found ? structuredCloneSafe(found) : null
}

/**
 * Create a record. Assigns an auto-incrementing numeric `id` when the
 * caller doesn't supply one. New records are prepended (most-recent-first),
 * matching the convention already used across the app's pages.
 */
export async function createRecord(key, partialRecord, { delayMs = MOCK_DELAY } = {}) {
  await delay(delayMs)
  maybeFail('create', key)

  const records = ensureLoaded(key)
  const record = {
    id: partialRecord.id ?? nextId(records),
    ...partialRecord,
  }
  cache[key] = [record, ...records]
  persistCollection(key)
  notify(key)
  return structuredCloneSafe(record)
}

/** Merge `patch` into the record matching `id`. Throws if not found. */
export async function updateRecord(key, id, patch, { delayMs = MOCK_DELAY } = {}) {
  await delay(delayMs)
  maybeFail('update', key)

  const records = ensureLoaded(key)
  const index = records.findIndex((r) => String(r.id) === String(id))
  if (index === -1) {
    throw new Error(`[mock-store] Cannot update "${key}" record ${id}: not found`)
  }

  const updated = { ...records[index], ...patch, id: records[index].id }
  const next = [...records]
  next[index] = updated
  cache[key] = next
  persistCollection(key)
  notify(key)
  return structuredCloneSafe(updated)
}

/** Remove the record matching `id`. No-op (returns false) if not found. */
export async function removeRecord(key, id, { delayMs = MOCK_DELAY } = {}) {
  await delay(delayMs)
  maybeFail('remove', key)

  const records = ensureLoaded(key)
  const next = records.filter((r) => String(r.id) !== String(id))
  const removed = next.length !== records.length
  cache[key] = next
  if (removed) {
    persistCollection(key)
    notify(key)
  }
  return removed
}

/** Restore a single collection to its seed data, discarding mutations. */
export function resetCollection(key) {
  assertRegistered(key)
  cache[key] = structuredCloneSafe(SEED_COLLECTIONS[key])
  persistCollection(key)
  notify(key)
}

/** Restore every registered collection to its seed data. */
export function resetAllCollections() {
  Object.keys(SEED_COLLECTIONS).forEach(resetCollection)
}

/** Whether any collection currently has persisted (mutated) data saved. */
export function hasPersistedMutations() {
  if (!hasStorage) return false
  const stored = readAllFromStorage()
  return Object.keys(stored).length > 0
}

// Dev-only debugging hook, mirrors the kind of visibility MSW's devtools
// give you into intercepted requests — lets you poke at the store from the
// browser console during development.
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__voltraakMockStore = {
    listRecords,
    getRecord,
    createRecord,
    updateRecord,
    removeRecord,
    resetCollection,
    resetAllCollections,
  }
}
