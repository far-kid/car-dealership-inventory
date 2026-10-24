import { ArrowUpRight, Pencil, PackagePlus, Trash2 } from 'lucide-react'
import { VehicleArt } from '../components/VehicleArt'
import { money } from '../lib/format'
import type { Vehicle } from '../types'
import type { VehicleAction } from './VehicleDialog'

export function VehicleCard({ vehicle, admin, onAction }: { vehicle: Vehicle; admin: boolean; onAction: (action: VehicleAction) => void }) {
  const name = `${vehicle.make} ${vehicle.model}`
  const stock = vehicle.quantity === 0 ? 'empty' : vehicle.quantity <= 3 ? 'low' : 'available'
  return <article className="vehicle-card" aria-label={name}>
    <div className={`vehicle-preview paint-${vehicle.make.length % 4}`}>
      <span className="category-tag">{vehicle.category}</span>
      <VehicleArt category={vehicle.category} seed={vehicle.make}/>
      <span className="preview-caption">Illustrative preview</span>
    </div>
    <div className="vehicle-info">
      <div className="vehicle-topline"><span className="vehicle-make">{vehicle.make}</span><span className={`stock-indicator ${stock}`}><span/>{vehicle.quantity === 0 ? 'Out of stock' : `${vehicle.quantity} in stock`}</span></div>
      <h3>{name}</h3>
      <div className="vehicle-price"><strong>{money(vehicle.price)}</strong><span>per vehicle</span></div>
      <div className="vehicle-card-footer"><span className="stock-note">{stock === 'low' ? 'Limited availability' : stock === 'empty' ? 'Awaiting restock' : 'Ready for the road'}</span><button className="purchase-button" disabled={!vehicle.quantity} aria-label={vehicle.quantity ? `Purchase ${name}` : 'Out of stock'} onClick={() => onAction({ kind: 'purchase', vehicle })}>{vehicle.quantity ? <>Purchase<ArrowUpRight size={16}/></> : 'Out of stock'}</button></div>
      {admin && <div className="admin-actions"><button onClick={() => onAction({ kind: 'edit', vehicle })} aria-label={`Edit ${name}`}><Pencil size={14}/>Edit</button><button onClick={() => onAction({ kind: 'restock', vehicle })} aria-label={`Restock ${name}`}><PackagePlus size={15}/>Restock</button><button className="delete-action" onClick={() => onAction({ kind: 'delete', vehicle })} aria-label={`Delete ${name}`}><Trash2 size={15}/></button></div>}
    </div>
  </article>
}
