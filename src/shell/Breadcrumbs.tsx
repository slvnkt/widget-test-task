// TEMP stand-in until Omnitaki DS ships Breadcrumbs; replace then.
import type { MouseEvent } from 'react'

export interface Crumb {
  label: string
  href?: string
}

// Prototype: parent pages do not exist, so links stay on the page.
const stay = (e: MouseEvent) => e.preventDefault()

/** Last item is the current page: plain text with aria-current. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        {items.map((item, i) => {
          const current = i === items.length - 1
          return (
            <li key={item.label} className="breadcrumbs__item">
              {i > 0 && <span className="breadcrumbs__sep" aria-hidden="true">/</span>}
              {current ? (
                <span className="breadcrumbs__current" aria-current="page">{item.label}</span>
              ) : (
                <a className="breadcrumbs__link" href={item.href} onClick={stay}>{item.label}</a>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
