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

/** iOS-style app icon: navy rounded square with a white chevron mark. */
function AppIcon() {
  return (
    <svg className="sidenav__logo" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--ot-palette-navy-900)" />
      <path d="M13 9.5 19.5 16 13 22.5" fill="none" stroke="var(--ot-palette-white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Sidebar on the page canvas: logo + name, `account` switcher, navigation, and a `bottom` slot (prototype control, theme). */
export function SideNav({ brand, account, items, footerItems, bottom }: {
  brand: string
  account?: ReactNode
  items: NavLink[]
  footerItems: NavLink[]
  bottom?: ReactNode
}) {
  return (
    <aside className="sidenav">
      <div className="sidenav__brand-row">
        <AppIcon />
        <p className="sidenav__brand">{brand}</p>
      </div>
      {account}
      <nav className="sidenav__nav" aria-label="Main">
        <NavList items={items} />
      </nav>
      <nav className="sidenav__footer" aria-label="Help and settings">
        <NavList items={footerItems} />
      </nav>
      {bottom && <div className="sidenav__bottom">{bottom}</div>}
    </aside>
  )
}
