import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title,
  description,
  children,
  onClose,
  busy = false,
}: {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  // Capture before React mounts auto-focused form fields inside the dialog.
  const trigger = useRef(document.activeElement as HTMLElement | null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = overflow
      trigger.current?.focus()
    }
  }, [])
  return (
    <dialog
      className="modal"
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const focusable = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
          ),
        )
        const first = focusable[0]
        const last = focusable.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          const r = event.currentTarget.getBoundingClientRect()
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose()
        }
      }}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">MOTORWAY INVENTORY</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}>
          <X size={20} />
        </button>
      </div>
      {description && (
        <p className="modal-description" id={descriptionId}>
          {description}
        </p>
      )}
      {children}
    </dialog>
  )
}
