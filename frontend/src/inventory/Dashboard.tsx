import { useMemo, useState, type FormEvent } from 'react'
import { ArrowDownUp, ArrowUpRight, Box, CarFront, Check, ChevronRight, CircleHelp, CircleParking, CircleUserRound, Clock3, LayoutGrid, List, LogOut, Menu, PackageCheck, Plus, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Wallet, X } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { Brand } from '../components/Brand'
import { VehicleArt } from '../components/VehicleArt'
import { Modal } from '../components/Modal'
import { currency, money, number } from '../lib/format'
import type { VehicleFilters } from '../types'
import { useInventory } from './useInventory'
import { VehicleCard } from './VehicleCard'
import { VehicleDialog, type VehicleAction } from './VehicleDialog'

type StockView = 'all' | 'available' | 'low' | 'empty'
const stockNames = { all: 'All vehicles', available: 'In stock', low: 'Low stock', empty: 'Out of stock' }
const defaultDraft = { make: '', model: '', min_price: '', max_price: '' }

export function Dashboard() {
  const { user, signOut } = useAuth()
  const admin = user?.role === 'admin'
  const [filters, setFilters] = useState<VehicleFilters>({})
  const [draft, setDraft] = useState(defaultDraft)
  const [filterError, setFilterError] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [query, setQuery] = useState('')
  const [stockView, setStockView] = useState<StockView>('all')
  const [sort, setSort] = useState('make')
  const [view, setView] = useState('grid')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [help, setHelp] = useState(false)
  const [action, setAction] = useState<VehicleAction | null>(null)
  const [toast, setToast] = useState('')
  const { all, results, loading, error, refresh, reconcile } = useInventory(filters)
  const categories = useMemo(() => [...new Set((all ?? []).map(vehicle => vehicle.category))].sort(), [all])
  const counts = {
    all: all?.length ?? 0,
    available: all?.filter(vehicle => vehicle.quantity > 0).length ?? 0,
    low: all?.filter(vehicle => vehicle.quantity > 0 && vehicle.quantity <= 3).length ?? 0,
    empty: all?.filter(vehicle => vehicle.quantity === 0).length ?? 0,
  }
  const visible = useMemo(() => results.filter(vehicle => {
    const matchesQuery = `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(query.trim().toLowerCase())
    const matchesStock = stockView === 'all' || (stockView === 'available' && vehicle.quantity > 0) || (stockView === 'low' && vehicle.quantity > 0 && vehicle.quantity <= 3) || (stockView === 'empty' && vehicle.quantity === 0)
    return matchesQuery && matchesStock
  }).sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : sort === 'stock' ? a.quantity - b.quantity : `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`)), [results, query, stockView, sort])
  const activeFilterCount = Object.values(filters).filter(value => value !== undefined && value !== '').length
  const filtered = activeFilterCount > 0 || Boolean(query) || stockView !== 'all'

  function clearFilters() { setFilters({}); setDraft(defaultDraft); setFilterError(''); setQuery(''); setStockView('all') }
  function selectStock(stock: StockView) { setStockView(stock); setMobileMenu(false) }
  function applyFilters(event: FormEvent) {
    event.preventDefault()
    const min = draft.min_price === '' ? undefined : Number(draft.min_price)
    const max = draft.max_price === '' ? undefined : Number(draft.max_price)
    if (min !== undefined && max !== undefined && min > max) { setFilterError('Minimum price cannot exceed maximum price.'); return }
    setFilterError('')
    setFilters(current => ({ category: current.category, make: draft.make.trim(), model: draft.model.trim(), min_price: min, max_price: max }))
  }
  const nav = [
    { id: 'all' as const, label: 'All inventory', icon: LayoutGrid },
    { id: 'available' as const, label: 'In stock', icon: CarFront },
    { id: 'low' as const, label: 'Low stock', icon: Clock3 },
    { id: 'empty' as const, label: 'Out of stock', icon: CircleParking },
  ]

  return <div className="workspace">
    <a className="skip-link" href="#main-content">Skip to inventory</a>
    {mobileMenu && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)}/>}
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`} aria-label="Workspace navigation">
      <div className="sidebar-brand"><Brand/><button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileMenu(false)}><X size={20}/></button></div>
      <div className="dealership-switch"><span className="dealership-icon"><CarFront size={20}/></span><div><strong>Your dealership</strong><span>Inventory workspace</span></div><ShieldCheck size={16}/></div>
      <p className="nav-caption">WORKSPACE</p>
      <nav aria-label="Inventory views">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${stockView === id ? 'active' : ''}`} aria-label={`${label}${id !== 'all' ? ' inventory' : ''}`} aria-current={stockView === id ? 'page' : undefined} onClick={() => selectStock(id)}><Icon size={19}/><span>{label}</span><span className="nav-count">{all ? counts[id] : '—'}</span></button>)}</nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><span className="note-icon"><ArrowUpRight size={22}/></span><h3>A little clarity.<br/>A lot of possibility.</h3><p>Good inventory is the start of a great journey.</p><button onClick={() => setHelp(true)}>Get to know your workspace <ArrowUpRight size={14}/></button></div>
        <button className="nav-item help-link" onClick={() => setHelp(true)}><CircleHelp size={19}/><span>Quick guide</span></button>
        <div className="user-card"><span className="avatar">{user!.email.slice(0, 2).toUpperCase()}</span><div><strong title={user!.email}>{user!.email.split('@')[0]}</strong><span>{admin ? 'Administrator' : 'Buyer account'}</span></div><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={18}/></button></div>
      </div>
    </aside>
    <div className="workspace-body">
      <header className="topbar"><div className="flex items-center gap-3"><button className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}><Menu size={21}/></button><span className="breadcrumb">Workspace <ChevronRight size={14}/> <strong>Inventory</strong></span></div><div className="topbar-right"><span className="workspace-status"><span className="live-dot"/> Your inventory, connected</span><span className="topbar-divider"/><span className="account-pill"><CircleUserRound size={16}/>{admin ? 'Admin workspace' : 'Buyer workspace'}</span></div></header>
      <main id="main-content" className="main-content" tabIndex={-1}>
        <div className="page-heading"><div><span className="eyebrow">A CLEAR VIEW OF WHAT’S NEXT</span><h1>Inventory<span className="heading-dot" aria-hidden="true">.</span></h1><p>{admin ? 'Manage your vehicles. Make room for possibility.' : 'Find your next drive. The road ahead is yours.'}</p></div><div className="page-actions"><button className="button secondary refresh-button" onClick={refresh} disabled={loading} aria-label="Refresh inventory"><RefreshCw size={16} className={loading ? 'spin' : ''}/><span>Refresh</span></button>{admin && <button className="button primary" onClick={() => setAction({ kind: 'create' })}><Plus size={18}/>Add vehicle</button>}</div></div>
        <section className="inventory-hero" aria-label="Welcome to your inventory"><div className="hero-copy"><span className="hero-kicker"><span/> EVERY GREAT JOURNEY STARTS HERE</span><h2>The right vehicle.<br/><span>A world of possibility.</span></h2><p>Your entire collection. One place to keep it moving.</p><a href="#vehicle-collection">Explore your inventory <ArrowUpRight size={16}/></a></div><div className="hero-visual"><span className="hero-orbit"/><span className="hero-orbit hero-orbit-two"/><span className="hero-coordinate">DRIVE WHAT’S NEXT ↗</span><VehicleArt category="SUV" seed="motorway" hero/><span className="hero-visual-caption">THE MOTORWAY COLLECTION</span></div></section>
        <section className="stats-grid" aria-label="Inventory overview">
          {[
            { label: 'Vehicle models', value: all ? number(all.length) : '—', foot: 'Across your entire inventory', icon: CarFront, className: '' },
            { label: 'Units in stock', value: all ? number(all.reduce((sum, vehicle) => sum + vehicle.quantity, 0)) : '—', foot: 'Ready for their next chapter', icon: PackageCheck, className: '' },
            { label: 'Inventory value', value: all ? money(all.reduce((sum, vehicle) => sum + vehicle.price * vehicle.quantity, 0)) : '—', foot: `Stock value · ${currency}`, icon: Wallet, className: 'value-stat' },
            { label: 'Low stock', value: all ? number(counts.low) : '—', foot: 'Models with 1–3 units left', icon: Box, className: 'low-stat' },
          ].map(({ label, value, foot, icon: Icon, className }) => <div className={`stat-card ${className}`} key={label}><div className="stat-top"><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><span className="stat-foot">{foot}</span></div>)}
        </section>
        <section id="vehicle-collection" className="collection" aria-labelledby="collection-heading">
          <div className="collection-heading"><div><h2 id="collection-heading">The collection <span>{all ? all.length : '—'}</span></h2><p>A closer look at what’s in your showroom.</p></div><div className="view-switch" aria-label="Display options"><button aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={18}/></button><button aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={19}/></button></div></div>
          <div className="collection-toolbar"><label className="search-field"><Search size={19}/><input type="search" aria-label="Search inventory" placeholder="Search make or model…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><X size={15}/></button>}</label><label className="select-field"><span className="sr-only">Category</span><select value={filters.category ?? ''} onChange={e => setFilters(current => ({ ...current, category: e.target.value }))}><option value="">All categories</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label><button className={`button secondary filter-toggle ${showFilters ? 'selected' : ''}`} aria-expanded={showFilters} aria-controls="advanced-filters" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={16}/>Filters{activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}</button><label className="sort-field"><ArrowDownUp size={15}/><span className="sr-only">Sort vehicles</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="make">Make: A to Z</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="stock">Stock: low to high</option></select></label></div>
          {showFilters && <form id="advanced-filters" className="advanced-filters" onSubmit={applyFilters}><div className="filter-fields">{([{ key: 'make', label: 'Make', type: 'text' }, { key: 'model', label: 'Model', type: 'text' }, { key: 'min_price', label: 'Minimum price', type: 'number' }, { key: 'max_price', label: 'Maximum price', type: 'number' }] as const).map(({ key, label, type }) => <label className="field" key={key}>{label}<input type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '1' : undefined} max={type === 'number' ? '2147483647' : undefined} value={draft[key]} placeholder={type === 'number' ? currency : `Any ${label.toLowerCase()}`} onChange={e => setDraft(current => ({ ...current, [key]: e.target.value }))}/></label>)}<button className="button primary" type="submit">Apply filters</button></div>{filterError && <p role="alert" className="notice error">{filterError}</p>}</form>}
          <div className="results-bar"><div className="stock-tabs" aria-label="Stock filters">{(['all', 'available', 'low', 'empty'] as StockView[]).map(stock => <button key={stock} aria-pressed={stockView === stock} onClick={() => setStockView(stock)}>{stockNames[stock]}{stock === 'low' && counts.low > 0 && <span className="tab-dot"/>}</button>)}</div><span className="result-count" role="status">{loading ? 'Updating inventory…' : error ? 'Inventory unavailable' : `${visible.length} ${visible.length === 1 ? 'vehicle' : 'vehicles'}`}</span></div>
          {filtered && <div className="active-filters"><span>Showing filtered inventory</span><button onClick={clearFilters}>Clear filters <X size={13}/></button></div>}
          {error ? <div className="empty-state"><CircleHelp size={32}/><h3>Let’s try that again.</h3><p className="notice error" role="alert">{error}</p><button className="button secondary" onClick={refresh}>Try again</button></div> : loading ? <div className="vehicle-grid" aria-label="Loading vehicles" aria-busy="true">{[1, 2, 3].map(item => <div className="skeleton-card" key={item}><div/><span/><span/><span/></div>)}</div> : visible.length === 0 ? <div className="empty-state"><span className="empty-icon"><CarFront size={30}/></span><h3>{all?.length ? 'No vehicles found' : 'Your showroom starts here.'}</h3><p>{all?.length ? 'Try a different search or give your filters a little more room.' : admin ? 'Add your first vehicle to get things moving.' : 'New vehicles will appear here when your dealership adds them.'}</p>{!filtered && admin && <button className="button primary" onClick={() => setAction({ kind: 'create' })}><Plus size={17}/>Add your first vehicle</button>}</div> : <div className={`vehicle-grid ${view === 'list' ? 'vehicle-list' : ''}`}>{visible.map(vehicle => <VehicleCard key={vehicle.id} vehicle={vehicle} admin={admin} onAction={setAction}/>)}</div>}
        </section>
        <footer className="workspace-footer"><span><span className="footer-mark">m.</span> A better way to keep moving.</span><span>Motorway · Inventory workspace</span></footer>
      </main>
    </div>
    {toast && <div className="toast" role="status"><span className="toast-check"><Check size={18}/></span><p>{toast}</p><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={17}/></button></div>}
    {action && <VehicleDialog action={action} onClose={() => setAction(null)} onRefresh={refresh} onSaved={(vehicle, message, deletedId) => { reconcile(vehicle, deletedId); setAction(null); setToast(message) }}/>}
    {help && <Modal title="A little guidance for the road." onClose={() => setHelp(false)}><div className="guide-content"><p>Browse the collection, search by make or model, and combine category and price filters to find the right vehicle.</p><h3>Make your next move</h3><p>Purchasing removes one unit from stock. Out-of-stock vehicles stay visible, but cannot be purchased.</p>{admin && <><h3>Keep your showroom up to date</h3><p>Add and edit vehicle details, restock existing models, or remove a listing. Low stock means a model has 1–3 units left.</p></>}<h3>Your session</h3><p>You are signed in as <strong>{user!.email}</strong>. Use the sign-out button beside your profile when you’re finished.</p><button className="button primary" onClick={() => setHelp(false)}>Got it <Check size={17}/></button></div></Modal>}
  </div>
}
