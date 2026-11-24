// TEMP stand-in until Omnitaki DS ships Drawer; replace then.
// Non-modal mode only, pinned to the viewport's top-right corner (720px at >=1440, 640px below): no scrim, no focus trap, Esc closes. Motion constants live in styles.css until DS motion tokens exist.
import { useEffect, useId, useRef, useState, type AnimationEvent, type ReactNode, type Ref } from 'react'
import { X } from '@phosphor-icons/react'
import { IconButton } from '@ds/components/IconButton'

/**
 * DS tooltips are absolutely positioned inside their trigger, so the scrolling body clips them. Inside the drawer every
 * floating tooltip is re-placed as `position: fixed` (escapes the scroll clip): the requested side if it fits within the
 * drawer region (body, or the whole drawer for header triggers), else top or bottom by the room available, clamped
 * horizontally. The arrow is hidden because the side can change without the DS side class.
 * shortcut: DOM patch over the DS Tooltip; drop it once the DS Tooltip portals or uses floating positioning.
 */
function placeTooltip(tip: HTMLElement, drawer: HTMLElement) {
  const anchor = tip.parentElement
  if (!anchor) return
  const body = drawer.querySelector('.drawer__body')
  const bounds = (body?.contains(tip) ? body : drawer).getBoundingClientRect()
  const gap = parseFloat(getComputedStyle(tip).getPropertyValue('--ot-tooltip-offset')) + 6 || 10
  const edge = gap
  Object.assign(tip.style, { position: 'fixed', top: '0px', left: '0px', right: 'auto', bottom: 'auto', transform: 'none', maxWidth: `${Math.min(360, bounds.width - 2 * edge)}px` })
  const arrow = tip.querySelector<HTMLElement>('.ot-tooltip__arrow')
  if (arrow) arrow.style.display = 'none'
  const a = anchor.getBoundingClientRect()
  const { width: w, height: h } = tip.getBoundingClientRect()
  let top: number
  let left: number
  if (tip.classList.contains('ot-tooltip--right') && a.right + gap + w <= bounds.right - edge) {
    left = a.right + gap
    top = Math.min(Math.max(a.top + a.height / 2 - h / 2, bounds.top + edge), bounds.bottom - edge - h)
  } else {
    const roomAbove = a.top - bounds.top
    const roomBelow = bounds.bottom - a.bottom
    const preferTop = tip.classList.contains('ot-tooltip--top')
    const above = preferTop ? roomAbove >= h + gap + edge || roomAbove > roomBelow : !(roomBelow >= h + gap + edge) && roomAbove > roomBelow
    top = above ? a.top - gap - h : a.bottom + gap
    left = Math.min(Math.max(a.left + a.width / 2 - w / 2, bounds.left + edge), bounds.right - edge - w)
  }
  tip.style.top = `${top}px`
  tip.style.left = `${left}px`
}

interface DrawerProps {
  open: boolean
  title: ReactNode
  description?: ReactNode
  onClose: () => void
  /** Receives the title heading (tabIndex -1) so the caller can move focus to it on open. */
  titleRef?: Ref<HTMLHeadingElement>
  children: ReactNode
}

export function Drawer({ open, title, description, onClose, titleRef, children }: DrawerProps) {
  const titleId = useId()
  const [mounted, setMounted] = useState(open)
  // Header divider appears only once the body scrolls.
  const [scrolled, setScrolled] = useState(false)
  // Keep the last content on screen while the exit animation runs.
  const last = useRef({ title, description, children })
  const aside = useRef<HTMLElement>(null)
  if (open) last.current = { title, description, children }

  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

  // Re-place every DS tooltip that opens inside the drawer (see placeTooltip).
  useEffect(() => {
    const el = aside.current
    if (!el) return
    const mo = new MutationObserver(records => {
      for (const r of records) {
        r.addedNodes.forEach(n => {
          if (n instanceof HTMLElement && n.classList.contains('ot-tooltip--floating')) placeTooltip(n, el)
        })
        // The DS flips the side class after measuring: place again.
        if (r.type === 'attributes' && r.target instanceof HTMLElement && r.target.classList.contains('ot-tooltip--floating')) placeTooltip(r.target, el)
      }
    })
    mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [mounted])

  useEffect(() => {
    if (!open) return
    // Esc closes only from the drawer, the page body or the table rows/cells: in a field or select it belongs to that control.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const a = document.activeElement
      const fromHere = !a || a === document.body || !!a.closest('.drawer, .campaigns-table tbody')
      if (fromHere) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open && !mounted) return null
  const content = last.current
  const onAnimationEnd = (e: AnimationEvent) => {
    if (e.target === e.currentTarget && !open) setMounted(false)
  }

  return (
    <aside
      ref={aside}
      className={['drawer', !open && 'drawer--closing'].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      onAnimationEnd={onAnimationEnd}
    >
      <header className={['drawer__header', scrolled && 'drawer__header--scrolled'].filter(Boolean).join(' ')}>
        <div className="drawer__title-row">
          <h2 id={titleId} ref={titleRef} className="drawer__title" tabIndex={-1}>{content.title}</h2>
          <IconButton variant="ghost" size="md" icon={<X />} label="Close" onClick={onClose} />
        </div>
        {content.description && <p className="drawer__description">{content.description}</p>}
      </header>
      <div className="drawer__body" onScroll={e => setScrolled(e.currentTarget.scrollTop > 0)}>{content.children}</div>
    </aside>
  )
}
