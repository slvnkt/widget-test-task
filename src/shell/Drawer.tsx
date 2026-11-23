// TEMP stand-in until Omnitaki DS ships Drawer; replace then.
// Non-modal mode only (md 720px): no scrim, no focus trap, Esc closes. Motion constants live in styles.css until DS motion tokens exist.
import { useEffect, useId, useRef, useState, type AnimationEvent, type ReactNode, type Ref } from 'react'
import { X } from '@phosphor-icons/react'
import { Divider } from '@ds/components/Divider'
import { IconButton } from '@ds/components/IconButton'

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
  // Keep the last content on screen while the exit animation runs.
  const last = useRef({ title, description, children })
  if (open) last.current = { title, description, children }

  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose()
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
      className={['drawer', !open && 'drawer--closing'].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      onAnimationEnd={onAnimationEnd}
    >
      <header className="drawer__header">
        <div className="drawer__title-row">
          <h2 id={titleId} ref={titleRef} className="drawer__title" tabIndex={-1}>{content.title}</h2>
          <IconButton variant="ghost" size="md" icon={<X />} label="Close" onClick={onClose} />
        </div>
        {content.description && <p className="drawer__description">{content.description}</p>}
      </header>
      <Divider />
      <div className="drawer__body">{content.children}</div>
    </aside>
  )
}
