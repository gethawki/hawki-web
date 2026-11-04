import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Skeleton } from './Feedback.jsx'

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' }

// DataTable renders rows under a sticky header. Columns:
//   { key, header, cell: (row) => node, align: 'right', hide: 'md', className,
//     sort: (row) => value }
// rowHref makes the whole row open a page (the first cell should still hold
// a real link for keyboard and middle-click users).
//
// Unless the table brings its own footer (a server pager or "Load more"),
// it pages on the client (pageSize rows, 10 by default), offers a search box
// over the rows' text once there is more than a page, and sorts by any
// column whose values are plain text or numbers.
export default function DataTable({ columns, rows, rowKey = (r) => r.id, rowHref, loading, empty, stale, footer, dense, pageSize = 10, search, label }) {
  const navigate = useNavigate()
  const pad = dense ? 'py-2' : 'py-3'
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(pageSize)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState(null) // { key, dir }
  const all = rows || []
  const clientPaged = !footer
  const accessor = (c) => c.sort || (all.length && ['string', 'number'].includes(typeof all[0]?.[c.key]) ? (r) => r[c.key] : null)

  const shown = useMemo(() => {
    let list = all
    const needle = q.trim().toLowerCase()
    if (needle) list = list.filter((r) => rowText(r).includes(needle))
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      const get = col && accessor(col)
      if (get) {
        list = [...list].sort((a, b) => {
          const x = get(a)
          const y = get(b)
          const d = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true })
          return sort.dir === 'asc' ? d : -d
        })
      }
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, q, sort])
  const pages = clientPaged ? Math.max(1, Math.ceil(shown.length / size)) : 1
  const current = Math.min(page, pages - 1)
  const visible = clientPaged ? shown.slice(current * size, current * size + size) : shown
  const showSearch = search ?? (clientPaged && all.length > pageSize)

  function toggleSort(c) {
    if (!accessor(c)) return
    setPage(0)
    setSort((s) => (s?.key !== c.key ? { key: c.key, dir: 'desc' } : s.dir === 'desc' ? { key: c.key, dir: 'asc' } : null))
  }

  return (
    <div className={`transition-opacity ${stale ? 'opacity-60' : ''}`}>
      {showSearch && (
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 sm:px-5">
          <div className="relative w-full max-w-xs">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
            <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Filter rows" aria-label={`Filter ${label || 'rows'}`}
              className="h-8 w-full rounded-lg border border-line bg-surface-2/60 pl-8 pr-2.5 text-xs text-fg placeholder:text-fg-3 outline-none focus:border-accent/60" />
          </div>
          <span className="ml-auto whitespace-nowrap text-xs text-fg-3 tnum">{shown.length} of {all.length}</span>
        </div>
      )}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-surface-2/95 backdrop-blur">
            <tr className="border-b border-line text-left">
              {columns.map((c) => {
                const sortable = !!accessor(c)
                const on = sort?.key === c.key
                return (
                  <th key={c.key} scope="col" aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`whitespace-nowrap px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-wider text-fg-3 first:pl-5 last:pr-5 ${c.align === 'right' ? 'text-right' : ''} ${HIDE[c.hide] || ''}`}>
                    {sortable && c.header ? (
                      <button type="button" onClick={() => toggleSort(c)} className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-fg ${on ? 'text-fg' : ''} ${c.align === 'right' ? 'flex-row-reverse' : ''}`}>
                        {c.header}
                        {on ? (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-40" />}
                      </button>
                    ) : c.header}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading && !rows
              ? [...Array(5)].map((_, i) => (
                <tr key={i}>{columns.map((c) => <td key={c.key} className={`px-4 ${pad} first:pl-5 last:pr-5 ${HIDE[c.hide] || ''}`}><Skeleton className="h-4 w-3/4" /></td>)}</tr>
              ))
              : visible.map((r) => {
                const href = rowHref?.(r)
                return (
                  <tr key={rowKey(r)} onClick={href ? (e) => { if (!e.target.closest('a,button,select,input')) navigate(href) } : undefined}
                    className={`transition-colors hover:bg-surface-2/60 ${href ? 'cursor-pointer' : ''}`}>
                    {columns.map((c) => (
                      <td key={c.key} className={`px-4 ${pad} align-middle first:pl-5 last:pr-5 ${c.align === 'right' ? 'text-right tnum' : ''} ${HIDE[c.hide] || ''} ${c.className || ''}`}>
                        {c.cell ? c.cell(r) : r[c.key]}
                      </td>
                    ))}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
      {!loading && rows && rows.length === 0 && empty}
      {!loading && rows && rows.length > 0 && shown.length === 0 && <p className="px-5 py-6 text-center text-sm text-fg-3">No rows match "{q}".</p>}
      {clientPaged && all.length > Math.min(size, pageSize) && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-2.5 text-xs text-fg-3 sm:px-5">
          <span className="tnum">{shown.length === 0 ? 'No rows' : `${current * size + 1}-${Math.min(shown.length, current * size + size)} of ${shown.length}`}</span>
          <label className="hidden items-center gap-1.5 sm:inline-flex">
            Rows
            <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0) }} aria-label="Rows per page"
              className="h-7 rounded-md border border-line bg-surface-2 px-1.5 text-xs text-fg">
              {[...new Set([pageSize, 10, 25, 50])].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <PageButtons page={current} pages={pages} onChange={setPage} />
        </div>
      )}
      {footer && <div className="flex items-center gap-3 border-t border-line px-5 py-3 text-xs text-fg-3">{footer}</div>}
    </div>
  )
}

function rowText(r) {
  return Object.values(r).map((v) => (v == null ? '' : typeof v === 'object' ? (Array.isArray(v) ? v.filter((x) => typeof x !== 'object').join(' ') : '') : String(v))).join(' ').toLowerCase()
}

// PageButtons are numbered page links with previous and next.
export function PageButtons({ page, pages, onChange }) {
  const nums = []
  for (let i = 0; i < pages; i++) {
    if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) nums.push(i)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }
  const btn = 'grid h-7 min-w-7 place-items-center rounded-md border px-2 transition disabled:opacity-40'
  return (
    <nav className="ml-auto flex items-center gap-1" aria-label="Pages">
      <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => onChange(page - 1)} className={`${btn} border-line text-fg-2 hover:border-line-strong hover:text-fg`}><ChevronLeft size={14} /></button>
      {nums.map((n, i) => n === '…'
        ? <span key={`gap${i}`} className="px-1 text-fg-3">…</span>
        : <button key={n} type="button" aria-current={n === page ? 'page' : undefined} onClick={() => onChange(n)}
          className={`${btn} tnum ${n === page ? 'border-accent/50 bg-accent/15 text-fg' : 'border-line text-fg-2 hover:border-line-strong hover:text-fg'}`}>{n + 1}</button>)}
      <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => onChange(page + 1)} className={`${btn} border-line text-fg-2 hover:border-line-strong hover:text-fg`}><ChevronRight size={14} /></button>
    </nav>
  )
}

// Pager is the footer for offset paged tables.
export function Pager({ offset, limit, total, count, onChange }) {
  const shown = total != null ? total : offset + count
  return (
    <>
      <span className="tnum">{shown === 0 ? 'No results' : `${offset + 1}-${offset + count}${total != null ? ` of ${total}` : ''}`}</span>
      <span className="ml-auto flex gap-1.5">
        <button type="button" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}
          className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-fg-2 hover:border-line-strong hover:text-fg disabled:opacity-40"><ChevronLeft size={13} />Previous</button>
        {total != null && total > limit && <span className="self-center px-1 tnum">Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}</span>}
        <button type="button" disabled={total != null ? offset + limit >= total : count < limit} onClick={() => onChange(offset + limit)}
          className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-fg-2 hover:border-line-strong hover:text-fg disabled:opacity-40">Next<ChevronRight size={13} /></button>
      </span>
    </>
  )
}
