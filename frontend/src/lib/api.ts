import type { Credentials, User, Vehicle, VehicleFilters, VehicleInput } from '../types'

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

interface ApiOptions { getToken?: () => string | null; onUnauthorized?: () => void }

function errorMessage(body: unknown, status: number): string {
  const detail = body && typeof body === 'object' && 'detail' in body ? body.detail : null
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map(item => `${item.loc?.slice(1).join('.') || 'Input'}: ${item.msg || 'Invalid value'}`).join('. ')
  }
  return status >= 500 ? 'The server is unavailable. Please try again.' : 'The request could not be completed. Please try again.'
}

export function createApi({ getToken = () => null, onUnauthorized }: ApiOptions = {}) {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  async function request<T>(path: string, { method = 'GET', body, signal, publicRoute = false }: {
    method?: string; body?: unknown; signal?: AbortSignal; publicRoute?: boolean
  } = {}): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' })
    const token = publicRoute ? null : getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (body !== undefined) headers.set('Content-Type', 'application/json')
    let response: Response
    try {
      response = await fetch(`${base}/api${path}`, {
        method, headers, signal, body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') throw error
      throw new ApiError('Cannot reach the server. Check your connection and try again.', 0)
    }
    if (response.status === 204) return undefined as T
    const data: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      if (response.status === 401 && !publicRoute) onUnauthorized?.()
      throw new ApiError(errorMessage(data, response.status), response.status)
    }
    if (data === null) throw new ApiError('The server returned an unexpected response. Please try again.', response.status)
    return data as T
  }
  const vehiclePath = (id: string) => `/vehicles/${encodeURIComponent(id)}`
  return {
    login: (body: Credentials) => request<{ access_token: string; token_type: string }>('/auth/login', { method: 'POST', body, publicRoute: true }),
    register: (body: Credentials) => request<{ id: string; email: string }>('/auth/register', { method: 'POST', body, publicRoute: true }),
    me: () => request<User>('/auth/me'),
    list: (signal?: AbortSignal) => request<Vehicle[]>('/vehicles', { signal }),
    search: (filters: VehicleFilters, signal?: AbortSignal) => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value))
      })
      return request<Vehicle[]>(`/vehicles/search?${params}`, { signal })
    },
    create: (body: VehicleInput) => request<Vehicle>('/vehicles', { method: 'POST', body }),
    update: (id: string, body: VehicleInput) => request<Vehicle>(vehiclePath(id), { method: 'PUT', body }),
    remove: (id: string) => request<void>(vehiclePath(id), { method: 'DELETE' }),
    purchase: (id: string) => request<Vehicle>(`${vehiclePath(id)}/purchase`, { method: 'POST' }),
    restock: (id: string, quantity: number) => request<Vehicle>(`${vehiclePath(id)}/restock`, { method: 'POST', body: { quantity } }),
  }
}

export type Api = ReturnType<typeof createApi>
