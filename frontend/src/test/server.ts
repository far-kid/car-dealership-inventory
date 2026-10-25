import { vi } from 'vitest'
import type { Vehicle, User } from '../types'

export const initialVehicles: Vehicle[] = [
  { id: 'volvo-1', make: 'Volvo', model: 'XC60', category: 'SUV', price: 48000, quantity: 2 },
  { id: 'bmw-1', make: 'BMW', model: '320i', category: 'Sedan', price: 42000, quantity: 0 },
  {
    id: 'toyota-1',
    make: 'Toyota',
    model: 'Corolla',
    category: 'Sedan',
    price: 25000,
    quantity: 6,
  },
]

// Stateful HTTP boundary double: components still execute the real API client.
export function installServer(role = 'user') {
  let vehicles = structuredClone(initialVehicles)
  const user: User = { id: 'user-1', email: 'driver@example.com', role }
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input), 'http://localhost')
    const path = url.pathname
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    if (path === '/api/auth/login')
      return json({ access_token: 'test-token', token_type: 'bearer' })
    if (path === '/api/auth/register') return json({ id: user.id, email: body.email }, 201)
    if (path === '/api/auth/me') return json(user)
    if (path === '/api/vehicles/search') {
      const p = url.searchParams
      return json(
        vehicles.filter(
          (v) =>
            (!p.get('make') || v.make.toLowerCase().includes(p.get('make')!.toLowerCase())) &&
            (!p.get('model') || v.model.toLowerCase().includes(p.get('model')!.toLowerCase())) &&
            (!p.get('category') || v.category.toLowerCase() === p.get('category')!.toLowerCase()) &&
            (!p.has('min_price') || v.price >= Number(p.get('min_price'))) &&
            (!p.has('max_price') || v.price <= Number(p.get('max_price'))),
        ),
      )
    }
    if (path === '/api/vehicles' && method === 'GET') return json(vehicles)
    if (path === '/api/vehicles' && method === 'POST') {
      const vehicle = { ...body, id: 'new-car' }
      vehicles.push(vehicle)
      return json(vehicle, 201)
    }
    const match = path.match(/^\/api\/vehicles\/([^/]+)(?:\/(purchase|restock))?$/)
    if (match) {
      const vehicle = vehicles.find((v) => v.id === match[1])
      if (!vehicle) return json({ detail: 'Vehicle not found' }, 404)
      if (method === 'DELETE') {
        vehicles = vehicles.filter((v) => v.id !== vehicle.id)
        return new Response(null, { status: 204 })
      }
      if (method === 'PUT') {
        Object.assign(vehicle, body)
        return json(vehicle)
      }
      if (match[2] === 'purchase') {
        if (!vehicle.quantity) return json({ detail: 'Vehicle is out of stock' }, 409)
        vehicle.quantity -= 1
      }
      if (match[2] === 'restock') vehicle.quantity += body.quantity
      return json(vehicle)
    }
    throw new Error(`Unexpected request: ${method} ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, user, getVehicles: () => vehicles }
}
