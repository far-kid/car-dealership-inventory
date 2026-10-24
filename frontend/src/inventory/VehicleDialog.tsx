import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, AlertTriangle, PackagePlus, ShoppingBag } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { Modal } from '../components/Modal'
import { VehicleArt } from '../components/VehicleArt'
import { ApiError } from '../lib/api'
import { currency, messageOf, money } from '../lib/format'
import type { Vehicle, VehicleInput } from '../types'

export type VehicleAction = { kind: 'create' } | { kind: 'edit' | 'purchase' | 'restock' | 'delete'; vehicle: Vehicle }

export function VehicleDialog({ action, onClose, onSaved, onRefresh }: {
  action: VehicleAction; onClose: () => void; onSaved: (vehicle: Vehicle | null, message: string, deletedId?: string) => void; onRefresh: () => void
}) {
  const { api } = useAuth()
  const vehicle = 'vehicle' in action ? action.vehicle : null
  const editing = action.kind === 'create' || action.kind === 'edit'
  const [fields, setFields] = useState({
    make: vehicle?.make ?? '', model: vehicle?.model ?? '', category: vehicle?.category ?? '',
    price: vehicle ? String(vehicle.price) : '', quantity: String(vehicle?.quantity ?? 0),
  })
  const [units, setUnits] = useState('1')
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  const [error, setError] = useState('')
  const name = vehicle ? `${vehicle.make} ${vehicle.model}` : ''
  const title = { create: 'Add a vehicle', edit: 'Edit vehicle', purchase: 'Your next great drive.', restock: 'Keep things moving.', delete: 'Delete this vehicle?' }[action.kind]
  const submitLabel = { create: 'Save vehicle', edit: 'Save changes', purchase: 'Confirm purchase', restock: 'Confirm restock', delete: 'Delete vehicle' }[action.kind]

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (sending.current) return
    setError('')
    const payload: VehicleInput = { ...fields, make: fields.make.trim(), model: fields.model.trim(), category: fields.category.trim(), price: Number(fields.price), quantity: Number(fields.quantity) }
    if (editing && (!payload.make || !payload.model || !payload.category)) { setError('Make, model and category cannot be blank.'); return }
    if (editing && (!Number.isSafeInteger(payload.price) || payload.price <= 0 || !Number.isSafeInteger(payload.quantity) || payload.quantity < 0)) { setError('Use a positive whole-number price and a nonnegative whole-number quantity.'); return }
    if (action.kind === 'restock' && (!Number.isSafeInteger(Number(units)) || Number(units) <= 0)) { setError('Enter a positive whole number of units.'); return }
    sending.current = true; setBusy(true)
    try {
      if (action.kind === 'create') onSaved(await api.create(payload), 'Vehicle added to your inventory.')
      else if (action.kind === 'edit') onSaved(await api.update(action.vehicle.id, payload), 'Vehicle details updated.')
      else if (action.kind === 'purchase') onSaved(await api.purchase(action.vehicle.id), `${name} purchased. One unit has been removed from stock.`)
      else if (action.kind === 'restock') onSaved(await api.restock(action.vehicle.id, Number(units)), `${units} units added to ${name}.`)
      else { await api.remove(action.vehicle.id); onSaved(null, `${name} removed from inventory.`, action.vehicle.id) }
    } catch (reason) {
      setError(messageOf(reason))
      if (reason instanceof ApiError && [404, 409].includes(reason.status)) onRefresh()
    } finally { sending.current = false; setBusy(false) }
  }

  const field = (key: keyof typeof fields, value: string) => setFields(current => ({ ...current, [key]: value }))
  return <Modal title={title} onClose={onClose} busy={busy} description={editing ? 'Good details make great inventory. Keep every field up to date.' : undefined}>
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        {editing ? <div className="vehicle-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="field">Make<input required maxLength={100} value={fields.make} onChange={e => field('make', e.target.value)} placeholder="e.g. Volvo" autoFocus/></label><label className="field">Model<input required maxLength={100} value={fields.model} onChange={e => field('model', e.target.value)} placeholder="e.g. XC60"/></label></div>
          <label className="field">Category<input required list="vehicle-categories" maxLength={100} value={fields.category} onChange={e => field('category', e.target.value)} placeholder="Choose or enter a category"/></label>
          <datalist id="vehicle-categories">{['SUV', 'Sedan', 'Hatchback', 'Coupe', 'Convertible', 'Truck', 'Van', 'Wagon'].map(category => <option key={category} value={category}/>)}</datalist>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="field">Price ({currency})<input required type="number" min="1" max="2147483647" step="1" value={fields.price} onChange={e => field('price', e.target.value)} placeholder="e.g. 48000"/></label><label className="field">Quantity<input required type="number" min="0" max="2147483647" step="1" value={fields.quantity} onChange={e => field('quantity', e.target.value)}/></label></div>
          <p className="field-help">Prices are in whole {currency} units. Vehicle artwork is an illustrative category preview.</p>
        </div> : <>
          <div className="dialog-vehicle"><VehicleArt category={vehicle!.category} seed={vehicle!.make}/><div><span className="eyebrow">{vehicle!.category}</span><h3>{name}</h3><strong>{money(vehicle!.price)}</strong><span className="field-help">{vehicle!.quantity} currently in stock</span></div></div>
          {action.kind === 'purchase' && <div className="action-explanation"><ShoppingBag size={20}/><p>You’re purchasing <strong>one vehicle</strong>. Confirming will reduce available stock by one. No payment is collected here.</p></div>}
          {action.kind === 'restock' && <><div className="action-explanation"><PackagePlus size={20}/><p>Add units to the existing stock for this vehicle.</p></div><label className="field">Units to add<input type="number" min="1" max={2147483647 - vehicle!.quantity} step="1" required value={units} onChange={e => setUnits(e.target.value)} autoFocus/></label></>}
          {action.kind === 'delete' && <div className="action-explanation danger-copy"><AlertTriangle size={20}/><p>This will permanently remove <strong>{name}</strong> and its stock record. This action cannot be undone.</p></div>}
        </>}
        {error && <p className="notice error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className={`button ${action.kind === 'delete' ? 'danger' : 'primary'}`}>{busy ? 'Saving…' : submitLabel}{action.kind !== 'delete' && <ArrowRight size={17}/>}</button></div>
      </fieldset>
    </form>
  </Modal>
}
