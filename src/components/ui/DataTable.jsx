import { useNavigate } from 'react-router-dom'
import { Skeleton } from './Feedback.jsx'

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' }

// DataTable renders rows under a quiet header. Columns:
//   { key, header, cell: (row) => node, align: 'right', hide: 'md', className }
// rowHref makes the whole row open a page (the first cell should still hold
// a real link for keyboard and middle-click users).
export default function DataTable({ columns, rows, rowKey = (r) => r.id, rowHref, loading, empty, stale, footer, dense }) {
  const navigate = useNavigate()
  const pad = dense ? 'py-2' : 'py-3'
  return (
    <div className={`transition-opacity ${stale ? 'opacity-60' : ''}`}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              {columns.map((c) => (
                <th key={c.key} scope="col"
                  className={`whitespace-nowrap px-4 py-2.5 text-xs font-medium text-fg-3 first:pl-5 last:pr-5 ${c.align === 'right' ? 'text-right' : ''} ${HIDE[c.hide] || ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading && !rows
              ? [...Array(5)].map((_, i) => (
                <tr key={i}>{columns.map((c) => <td key={c.key} className={`px-4 ${pad} first:pl-5 last:pr-5 ${HIDE[c.hide] || ''}`}><Skeleton className="h-4 w-3/4" /></td>)}</tr>
              ))
              : (rows || []).map((r) => {
                const href = rowHref?.(r)
                return (
                  <tr key={rowKey(r)} onClick={href ? (e) => { if (!e.target.closest('a,button,select,input')) navigate(href) } : undefined}
                    className={`transition-colors ${href ? 'cursor-pointer hover:bg-surface-2/70' : ''}`}>
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
      {footer && <div className="flex items-center gap-3 border-t border-line px-5 py-3 text-xs text-fg-3">{footer}</div>}
    </div>
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
          className="rounded-md border border-line px-2.5 py-1 text-fg-2 hover:border-line-strong hover:text-fg disabled:opacity-40">Previous</button>
        <button type="button" disabled={total != null ? offset + limit >= total : count < limit} onClick={() => onChange(offset + limit)}
          className="rounded-md border border-line px-2.5 py-1 text-fg-2 hover:border-line-strong hover:text-fg disabled:opacity-40">Next</button>
      </span>
    </>
  )
}
