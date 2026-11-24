// Campaign search: DS Input with a real clear button (the DS trailing icon slot is decorative, aria-hidden).
import { useRef } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { Input } from '@ds/components/Input'

interface Props {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SearchField({ value, onChange, className }: Props) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className={['search', value && 'search--filled', className].filter(Boolean).join(' ')}>
      <Input
        ref={input}
        size="sm"
        leadingIcon={<MagnifyingGlass />}
        placeholder="Search campaigns"
        aria-label="Search campaigns"
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button
          type="button"
          className="search__clear"
          aria-label="Clear search"
          onClick={() => {
            onChange('')
            input.current?.focus()
          }}
        >
          <X />
        </button>
      )}
    </div>
  )
}
