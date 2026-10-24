import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, description, children, onClose, busy = false }: {
  title: string; description?: string; children: ReactNode; onClose: () => void; busy?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element.close(); document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  return <dialog className="modal" ref={dialog} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
    onClick={event => { if (event.target === event.currentTarget && !busy) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose() } }}>
    <div className="modal-heading"><div><span className="eyebrow">MOTORWAY INVENTORY</span><h2 id={titleId}>{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={20}/></button></div>
    {description && <p className="modal-description" id={descriptionId}>{description}</p>}
    {children}
  </dialog>
}
