// TEMP stand-in until Omnitaki DS ships Pagination; replace then.
// Range text + prev/next only; page size fixed at 25, no selector (handoff v8 §8).
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { IconButton } from '@ds/components/IconButton'

const PAGE_SIZE = 25

export function Pagination({ total }: { total: number }) {
  // shortcut: one page only (the mock never exceeds 25 rows); add page state when real data can.
  const end = Math.min(total, PAGE_SIZE)
  const single = total <= PAGE_SIZE
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="pagination__range" aria-live="polite">{total === 0 ? '0 of 0' : `1–${end} of ${total}`}</span>
      <span className="pagination__buttons">
        <IconButton variant="ghost" size="sm" icon={<CaretLeft />} label="Previous page" disabled />
        <IconButton variant="ghost" size="sm" icon={<CaretRight />} label="Next page" disabled={single} />
      </span>
    </nav>
  )
}
