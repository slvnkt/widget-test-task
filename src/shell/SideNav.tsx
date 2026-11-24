// TEMP stand-in until Omnitaki DS ships SideNav; replace then.
// Rows follow the ListItem look (size md, list-item tokens) but are real links with aria-current.
import type { ReactNode } from 'react'

export interface NavLink {
  label: string
  icon: ReactNode
  href: string
  current?: boolean
}

// Prototype: the other sections do not exist, so they render disabled (no href: not focusable, no hover).

function NavList({ items }: { items: NavLink[] }) {
  return (
    <ul className="sidenav__list">
      {items.map(item => (
        <li key={item.label}>
          <a
            className={['sidenav__link', !item.current && 'sidenav__link--disabled'].filter(Boolean).join(' ')}
            href={item.current ? item.href : undefined}
            aria-current={item.current ? 'page' : undefined}
            aria-disabled={item.current ? undefined : true}
          >
            <span className="sidenav__icon" aria-hidden="true">{item.icon}</span>
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

/**
 * Floating panel of stacked blocks: account (wordmark, `brandAction` e.g. theme toggle, `account` switcher), navigation,
 * and an optional `bottom` block (the prototype control).
 */
export function SideNav({ brand, brandAction, account, items, footerItems, bottom }: {
  brand: string
  brandAction?: ReactNode
  account?: ReactNode
  items: NavLink[]
  footerItems: NavLink[]
  bottom?: ReactNode
}) {
  return (
    <aside className="sidenav">
      <div className="sidenav__block sidenav__block--surface">
        <div className="sidenav__brand-row">
          <p className="sidenav__brand">{brand}</p>
          {brandAction}
        </div>
        {account}
      </div>
      <nav className="sidenav__nav" aria-label="Main">
        <NavList items={items} />
      </nav>
      <nav className="sidenav__footer" aria-label="Help and settings">
        <NavList items={footerItems} />
      </nav>
      {bottom && <div className="sidenav__block sidenav__block--surface">{bottom}</div>}
    </aside>
  )
}
