/**
 * Reusable table component with sorting, loading states, and responsive
 * design. Renders as a classic table ("list" view) by default, but every
 * table also gets a built-in List/Cards toggle so users can switch to a
 * card layout — useful on narrower screens or when a row has a lot of
 * columns to scan. The toggle lives here so every page using <Table>
 * gets it for free; no per-page changes needed.
 *
 * A third "Kanban" view is available opt-in: pass `views` including
 * 'kanban' plus `kanbanBy` (the row field to group cards by, e.g.
 * 'status'). Unlike List/Cards, Kanban only makes sense for tables with
 * a natural workflow field, so it's never on by default.
 */

import React from 'react'
import { ChevronUp, ChevronDown, ArrowUpDown, List, LayoutGrid } from 'lucide-react'
import { cn } from '@/utils'
import LoadingSpinner from './LoadingSpinner'

const VIEW_STORAGE_PREFIX = 'voltraak:table-view:'
const VALID_VIEWS = ['list', 'card', 'kanban']

function readStoredView(storageKey, fallback) {
  if (!storageKey || typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_PREFIX + storageKey)
    return VALID_VIEWS.includes(stored) ? stored : fallback
  } catch {
    return fallback
  }
}

// Small inline icon (not from lucide) so the Kanban toggle doesn't depend
// on a specific lucide-react version having a "Kanban"/"Columns" icon.
function KanbanIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="5.5" height="16" rx="1" />
      <rect x="9.75" y="4" width="5.5" height="11" rx="1" />
      <rect x="16.5" y="4" width="5.5" height="13" rx="1" />
    </svg>
  )
}

export default function Table({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  onSort,
  sortOptions,
  className,
  striped = false,
  compact = false,
  // View toggle controls. `views` lets a page limit the toggle to a single
  // mode (e.g. views={['list']} to opt a table out entirely, though every
  // table supports list/card by default). `viewStorageKey` persists the
  // user's choice across visits (per key) via localStorage; omit it to
  // keep the choice local to this mount.
  views = ['list', 'card'],
  defaultView = 'list',
  viewStorageKey,
  getRowId,
  // Row id (matched against getRowId(row, index) if supplied, otherwise
  // row.id) to scroll to and briefly flash — set from a deep link such as
  // the global search bar's `?highlight=` param. See useHighlightParam.
  highlightRowId,
  // Kanban-only props (ignored unless 'kanban' is in `views`).
  kanbanBy,
  kanbanLanes,
  onKanbanMove,
}) {
  const highlightRef = React.useRef(null)

  React.useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    // Only needs to run once the highlighted row actually mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightRowId, data])
  const showToggle = views.length > 1
  const [view, setView] = React.useState(() =>
    readStoredView(viewStorageKey, views.includes(defaultView) ? defaultView : views[0])
  )

  const changeView = (next) => {
    setView(next)
    if (viewStorageKey && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(VIEW_STORAGE_PREFIX + viewStorageKey, next)
      } catch {
        // Ignore storage failures (private browsing, quota, etc.) — the
        // toggle still works for the current session.
      }
    }
  }

  const handleSort = (column) => {
    if (!column.sortable || !onSort) return

    const field = String(column.key)
    const currentDirection = sortOptions?.field === field ? sortOptions.direction : null
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc'

    onSort(field, newDirection)
  }

  const getSortIcon = (column) => {
    if (!column.sortable) return null

    const field = String(column.key)
    const isCurrentSort = sortOptions?.field === field

    if (isCurrentSort) {
      return sortOptions.direction === 'asc' ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )
    }

    return <ArrowUpDown className="h-4 w-4 opacity-50" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" message="Loading data..." />
      </div>
    )
  }

  const activeView = views.includes(view) ? view : views[0]

  return (
    <div className={cn('overflow-hidden', className)}>
      {showToggle && (
        <div className="flex items-center justify-end mb-3">
          <ViewToggle view={activeView} onChange={changeView} views={views} />
        </div>
      )}

      {activeView === 'kanban' ? (
        <KanbanBoard
          data={data}
          columns={columns}
          emptyMessage={emptyMessage}
          getRowId={getRowId}
          kanbanBy={kanbanBy}
          kanbanLanes={kanbanLanes}
          onKanbanMove={onKanbanMove}
        />
      ) : activeView === 'card' ? (
        <CardGrid
          data={data}
          columns={columns}
          emptyMessage={emptyMessage}
          getRowId={getRowId}
          onSort={onSort}
          sortOptions={sortOptions}
          handleSort={handleSort}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={cn(
                      'table-header-cell',
                      column.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none',
                      column.className
                    )}
                    style={column.width ? { width: column.width } : undefined}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {column.sortable && getSortIcon(column)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cn('table-body', striped && 'divide-y-0')}>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row, rowIndex) => {
                  const rowId = getRowId ? getRowId(row, rowIndex) : row.id
                  const isHighlighted =
                    highlightRowId != null && rowId != null && String(rowId) === String(highlightRowId)

                  return (
                  <tr
                    key={getRowId ? getRowId(row, rowIndex) : rowIndex}
                    ref={isHighlighted ? highlightRef : undefined}
                    className={cn(
                      'table-row',
                      striped && rowIndex % 2 === 1 && 'bg-gray-50 dark:bg-gray-900',
                      isHighlighted && 'table-row-highlight'
                    )}
                  >
                    {columns.map((column, colIndex) => {
                      const value = row[column.key]
                      const content = column.render ? column.render(value, row) : value

                      return (
                        <td
                          key={colIndex}
                          className={cn(
                            compact ? 'px-4 py-2' : 'table-cell',
                            column.className
                          )}
                        >
                          {content}
                        </td>
                      )
                    })}
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Segmented List/Cards/Kanban control. Kept small and icon-led so it
// doesn't compete with page-level filters that usually sit just above the
// table. Only shows the options a page actually opted into via `views`.
function ViewToggle({ view, onChange, views }) {
  const allOptions = [
    { value: 'list', label: 'List', icon: List },
    { value: 'card', label: 'Cards', icon: LayoutGrid },
    { value: 'kanban', label: 'Kanban', icon: KanbanIcon },
  ]
  const options = allOptions.filter((o) => views.includes(o.value))

  return (
    <div
      className="inline-flex items-center rounded-md border p-0.5"
      style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-tertiary)' }}
      role="group"
      aria-label="Toggle table view"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = view === value
        return (
          <button
            key={value}
            type="button"
            title={`${label} view`}
            aria-label={`${label} view`}
            aria-pressed={active}
            onClick={() => onChange(value)}
            className={cn(
              'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Card layout used by the "card" view. Reuses each column's `render`
// function so badges, formatted currency, progress bars, etc. all look
// the same as they do in the table cell — only the layout changes.
// The first column becomes the card's title; a column keyed 'actions' (the
// convention used across the app's pages) is pulled out into a footer
// action row instead of a label/value line.
function CardGrid({ data, columns, emptyMessage, getRowId, onSort, sortOptions, handleSort }) {
  const sortableColumns = columns.filter((c) => c.sortable)

  if (data.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 border rounded-lg" style={{ borderColor: 'var(--color-border-primary)' }}>
        {emptyMessage}
      </div>
    )
  }

  const [titleColumn, ...restColumns] = columns
  const actionsColumn = restColumns.find((c) => c.key === 'actions')
  const detailColumns = restColumns.filter((c) => c.key !== 'actions')

  return (
    <div className="space-y-3">
      {sortableColumns.length > 0 && onSort && (
        <div className="flex items-center justify-end gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sort by</label>
          <select
            className="form-input py-1 text-xs w-auto"
            value={sortOptions?.field || ''}
            onChange={(e) => {
              const column = sortableColumns.find((c) => String(c.key) === e.target.value)
              if (column) handleSort(column)
            }}
          >
            <option value="" disabled>
              Choose field
            </option>
            {sortableColumns.map((column) => (
              <option key={String(column.key)} value={String(column.key)}>
                {column.label}
              </option>
            ))}
          </select>
          {sortOptions?.field && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const column = sortableColumns.find((c) => String(c.key) === sortOptions.field)
                if (column) handleSort(column)
              }}
              title={sortOptions.direction === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOptions.direction === 'asc' ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((row, rowIndex) => {
          const titleValue = row[titleColumn.key]
          const titleContent = titleColumn.render
            ? titleColumn.render(titleValue, row)
            : titleValue

          return (
            <div key={getRowId ? getRowId(row, rowIndex) : rowIndex} className="card flex flex-col">
              <div className="card-body flex-1 space-y-3">
                <div>
                  {!titleColumn.render && (
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                      {titleColumn.label}
                    </p>
                  )}
                  <div className="font-medium text-gray-900 dark:text-gray-100">{titleContent}</div>
                </div>

                {detailColumns.length > 0 && (
                  <dl className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--color-border-primary)' }}>
                    {detailColumns.map((column, colIndex) => {
                      const value = row[column.key]
                      const content = column.render ? column.render(value, row) : value
                      if (content === null || content === undefined || content === '') return null

                      return (
                        <div key={colIndex} className="flex items-start justify-between gap-3">
                          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0 pt-0.5">
                            {column.label}
                          </dt>
                          <dd className="text-sm text-gray-900 dark:text-gray-100 text-right min-w-0">{content}</dd>
                        </div>
                      )
                    })}
                  </dl>
                )}
              </div>

              {actionsColumn && (
                <div
                  className="card-footer flex items-center justify-end gap-2"
                >
                  {actionsColumn.render
                    ? actionsColumn.render(row[actionsColumn.key], row)
                    : row[actionsColumn.key]}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Kanban board used by the "kanban" view. Groups rows into lanes by the
// `kanbanBy` field (e.g. status) and renders each row using the same
// title/detail/actions convention as CardGrid, so badges and formatted
// values look identical across all three views. Drag-and-drop between
// lanes is opt-in: it's only wired up when the page supplies
// `onKanbanMove`, since that's the callback responsible for actually
// persisting the status change — without it, cards are still grouped and
// readable, just not draggable.
function KanbanBoard({ data, columns, emptyMessage, getRowId, kanbanBy, kanbanLanes, onKanbanMove }) {
  const [draggedId, setDraggedId] = React.useState(null)
  const [dragOverLane, setDragOverLane] = React.useState(null)

  if (!kanbanBy) {
    return (
      <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400 border rounded-lg" style={{ borderColor: 'var(--color-border-primary)' }}>
        Kanban view needs a <code>kanbanBy</code> field to group cards by.
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 border rounded-lg" style={{ borderColor: 'var(--color-border-primary)' }}>
        {emptyMessage}
      </div>
    )
  }

  const titleColumn = columns[0]
  const actionsColumn = columns.find((c) => c.key === 'actions')
  const detailColumns = columns.filter((c) => c !== titleColumn && c.key !== 'actions' && c.key !== kanbanBy)

  const rowId = (row, index) => (getRowId ? getRowId(row, index) : String(index))

  // Lane list: explicit order/labels if supplied, otherwise derived from
  // the data itself (first-seen order) with a title-cased label.
  const lanes = kanbanLanes && kanbanLanes.length > 0
    ? kanbanLanes
    : Array.from(new Set(data.map((row) => row[kanbanBy]))).map((value) => ({
        value,
        label: String(value ?? 'Unassigned').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      }))

  const draggable = Boolean(onKanbanMove)

  const handleDrop = (laneValue) => {
    setDragOverLane(null)
    if (!draggable || draggedId == null) return

    const rowIndex = data.findIndex((row, index) => rowId(row, index) === draggedId)
    if (rowIndex === -1) return

    const row = data[rowIndex]
    if (row[kanbanBy] !== laneValue) {
      onKanbanMove(row, laneValue, row[kanbanBy])
    }
    setDraggedId(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {lanes.map((lane) => {
        const laneRows = data.filter((row) => row[kanbanBy] === lane.value)
        const isDragOver = dragOverLane === lane.value

        return (
          <div
            key={String(lane.value)}
            className="flex-shrink-0 w-72 rounded-lg border flex flex-col max-h-[calc(100vh-16rem)]"
            style={{
              borderColor: isDragOver ? 'var(--color-accent)' : 'var(--color-border-primary)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
            onDragOver={(e) => {
              if (!draggable) return
              e.preventDefault()
              if (dragOverLane !== lane.value) setDragOverLane(lane.value)
            }}
            onDragLeave={() => {
              if (dragOverLane === lane.value) setDragOverLane(null)
            }}
            onDrop={(e) => {
              if (!draggable) return
              e.preventDefault()
              handleDrop(lane.value)
            }}
          >
            <div
              className="flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0"
              style={{ borderColor: 'var(--color-border-primary)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {lane.label}
              </span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
              >
                {laneRows.length}
              </span>
            </div>

            <div className="p-2 space-y-2 overflow-y-auto">
              {laneRows.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>
                  No items
                </p>
              ) : (
                laneRows.map((row) => {
                  const index = data.indexOf(row)
                  const id = rowId(row, index)
                  const titleContent = titleColumn.render
                    ? titleColumn.render(row[titleColumn.key], row)
                    : row[titleColumn.key]

                  return (
                    <div
                      key={id}
                      draggable={draggable}
                      onDragStart={() => setDraggedId(id)}
                      onDragEnd={() => {
                        setDraggedId(null)
                        setDragOverLane(null)
                      }}
                      className={cn(
                        'card space-y-2 p-3',
                        draggable && 'cursor-grab active:cursor-grabbing',
                        draggedId === id && 'opacity-40'
                      )}
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {titleContent}
                      </div>

                      {detailColumns.length > 0 && (
                        <dl className="space-y-1">
                          {detailColumns.map((column, colIndex) => {
                            const value = row[column.key]
                            const content = column.render ? column.render(value, row) : value
                            if (content === null || content === undefined || content === '') return null

                            return (
                              <div key={colIndex} className="flex items-start justify-between gap-2">
                                <dt className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                                  {column.label}
                                </dt>
                                <dd className="text-xs text-right min-w-0" style={{ color: 'var(--color-text-secondary)' }}>
                                  {content}
                                </dd>
                              </div>
                            )
                          })}
                        </dl>
                      )}

                      {actionsColumn && (
                        <div className="flex items-center justify-end gap-2 pt-1 border-t" style={{ borderColor: 'var(--color-border-primary)' }}>
                          {actionsColumn.render
                            ? actionsColumn.render(row[actionsColumn.key], row)
                            : row[actionsColumn.key]}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Higher-order component for tables with built-in state management
export function useTableSort(initialSort) {
  const [sortOptions, setSortOptions] = React.useState(initialSort)

  const handleSort = React.useCallback((field, direction) => {
    setSortOptions({ field, direction })
  }, [])

  return {
    sortOptions,
    handleSort,
    setSortOptions,
  }
}

// Responsive table wrapper for mobile devices
export function ResponsiveTable(props) {
  return (
    <div className="sm:hidden">
      {/* Mobile card layout */}
      <div className="space-y-4">
        {props.data.map((row, index) => (
          <div key={index} className="card">
            <div className="card-body space-y-2">
              {props.columns.map((column, colIndex) => {
                const value = row[column.key]
                const content = column.render ? column.render(value, row) : value

                return (
                  <div key={colIndex} className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {column.label}:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{content}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Combined responsive and desktop table
export function AdaptiveTable(props) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block">
        <Table {...props} />
      </div>

      {/* Mobile cards */}
      <ResponsiveTable {...props} />
    </>
  )
}
