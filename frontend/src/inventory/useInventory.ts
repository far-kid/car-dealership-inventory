import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { messageOf } from '../lib/format'
import type { Vehicle, VehicleFilters } from '../types'

export function useInventory(filters: VehicleFilters) {
  const { api } = useAuth()
  const [all, setAll] = useState<Vehicle[] | null>(null)
  const [results, setResults] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    api.list(controller.signal).then(vehicles => {
      if (!controller.signal.aborted) setAll(vehicles)
    }).catch(reason => {
      if (!controller.signal.aborted) { setError(messageOf(reason)); setLoading(false) }
    })
    return () => controller.abort()
  }, [api, revision])

  useEffect(() => {
    if (!all) return
    const controller = new AbortController()
    const hasFilters = Object.values(filters).some(value => value !== undefined && value !== '')
    setError('')
    if (!hasFilters) { setResults(all); setLoading(false); return }
    setLoading(true)
    api.search(filters, controller.signal).then(vehicles => {
      if (!controller.signal.aborted) setResults(vehicles)
    }).catch(reason => {
      if (!controller.signal.aborted) setError(messageOf(reason))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [api, all, filters])

  const reconcile = (vehicle: Vehicle | null, deletedId?: string) => {
    setAll(current => {
      if (!current) return current
      if (!vehicle) return current.filter(item => item.id !== deletedId)
      return current.some(item => item.id === vehicle.id) ? current.map(item => item.id === vehicle.id ? vehicle : item) : [...current, vehicle]
    })
  }
  return { all, results, loading, error, refresh, reconcile }
}
