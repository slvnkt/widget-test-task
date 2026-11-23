// TEMP stand-in until Omnitaki DS ships SideNav; replace then.
// Rows follow the ListItem look (size md, list-item tokens) but are real links with aria-current.
import type { MouseEvent, ReactNode } from 'react'

export interface NavLink {
  label: string
  icon: ReactNode
  href: string
  current?: boolean
}

// Prototype: the other sections do not exist, so links stay on the page.
const stay = (e: MouseEvent) => e.preventDefault()

function NavList({ items }: { items: NavLink[] }) {
  return (
    <ul className="sidenav__list">
      {items.map(item => (
        <li key={item.label}>
          <a className="sidenav__link" href={item.href} aria-current={item.current ? 'page' : undefined} onClick={stay}>
            <span className="sidenav__icon" aria-hidden="true">{item.icon}</span>
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

/** `account`: optional account / advertiser switcher under the wordmark. */
export function SideNav({ brand, account, items, footerItems }: { brand: string; account?: ReactNode; items: NavLink[]; footerItems: NavLink[] }) {
  return (
    <aside className="sidenav">
      <p className="sidenav__brand">{brand}</p>
      {account && <div className="sidenav__account">{account}</div>}
      <nav className="sidenav__nav" aria-label="Main">
        <NavList items={items} />
      </nav>
      <nav className="sidenav__footer" aria-label="Help and settings">
        <NavList items={footerItems} />
      </nav>
    </aside>
  )
}
