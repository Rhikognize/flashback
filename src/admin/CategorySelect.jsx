import { useEffect, useRef, useState } from 'react'

export default function CategorySelect({ categories, value, onChange, placeholder = 'Select a category...' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selected = categories.find((c) => c.id === value)

  return (
    <div className="category-select" ref={ref}>
      <button
        type="button"
        className={`category-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? '' : 'placeholder'}>
          {selected ? selected.name : placeholder}
        </span>
        <span className="category-select-arrow" aria-hidden="true">▾</span>
      </button>

      {open && (
        <ul className="category-select-list" role="listbox">
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`category-select-option ${c.id === value ? 'active' : ''}`}
                onClick={() => { onChange(c.id); setOpen(false) }}
              >
                {c.name}
              </button>
            </li>
          ))}
          {categories.length === 0 && (
            <li className="category-select-empty">No categories yet.</li>
          )}
        </ul>
      )}
    </div>
  )
}