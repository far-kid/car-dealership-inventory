export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`} aria-label="Motorway">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <path d="M4 25V7h6l6 10 6-10h6v18h-6V16l-6 9-6-9v9Z" fill="currentColor" />
        </svg>
      </span>
      <span>
        motorway<span className="brand-dot">.</span>
      </span>
    </div>
  )
}
