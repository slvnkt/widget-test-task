// TEMP stand-in until Omnitaki DS ships PageHeader; replace then.
import type { ReactNode } from 'react'

export function PageHeader({ title, status, description }: { title: string; status?: ReactNode; description?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-header__row">
        <h1 className="page-header__title">{title}</h1>
        {status}
      </div>
      {description && <p className="page-header__description">{description}</p>}
    </header>
  )
}
