/**
 * Validates a mock dataset against its entry in schema.js (the unified
 * reference for what shape each page's data must be).
 *
 * Runs only in dev builds (import.meta.env.DEV) so it never adds cost to
 * production bundles. On a mismatch it prints a single console.warn per
 * dataset naming exactly which fields are missing, instead of letting the
 * page silently render `undefined`.
 *
 * Usage (bottom of every file in shared/mocks/**):
 *   import { validateMockData } from '../validate'
 *   validateMockData('inventory/stock-levels', mockStockLevels)
 */

import { MOCK_SCHEMAS } from './schema'

function checkFields(record, requiredFields, label) {
  if (!record || typeof record !== 'object') return [label]
  const missing = requiredFields.filter(field => !(field in record))
  return missing
}

export function validateMockData(schemaKey, data) {
  if (!import.meta.env?.DEV) return

  const schema = MOCK_SCHEMAS[schemaKey]
  if (!schema) {
    console.warn(
      `[mocks] "${schemaKey}" has no entry in shared/mocks/schema.js — ` +
      `add one so this dataset stays checked against what its page reads.`
    )
    return
  }

  if (schema.type === 'array') {
    if (!Array.isArray(data)) {
      console.warn(`[mocks] "${schemaKey}" expected an array, got ${typeof data}`)
      return
    }
    if (data.length === 0) return
    const missing = checkFields(data[0], schema.fields, 'record')
    if (missing.length > 0) {
      console.warn(
        `[mocks] "${schemaKey}" is missing field(s) [${missing.join(', ')}] ` +
        `that its page reads. Check shared/mocks/schema.js vs the actual mock data.`
      )
    }
  } else if (schema.type === 'object') {
    const missing = checkFields(data, schema.fields, 'object')
    if (missing.length > 0) {
      console.warn(
        `[mocks] "${schemaKey}" is missing field(s) [${missing.join(', ')}] ` +
        `that its page reads. Check shared/mocks/schema.js vs the actual mock data.`
      )
    }
  }
}
