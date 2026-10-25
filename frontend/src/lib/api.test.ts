import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createApi } from './api'

const vehicle = {
  id: 'car-1',
  make: 'Volvo',
  model: 'XC60',
  category: 'SUV',
  price: 48000,
  quantity: 2,
}
const fetchMock = vi.fn<typeof fetch>()
const expired = vi.fn()
const api = createApi({ getToken: () => 'session-token', onUnauthorized: expired })
const respond = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(
    new Response(status === 204 ? null : JSON.stringify(body), { status }),
  )

beforeEach(() => {
  fetchMock.mockReset()
  expired.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('the FastAPI client contract', () => {
  it('logs in with JSON credentials without an existing bearer token', async () => {
    respond({ access_token: 'new-token', token_type: 'bearer' })
    expect(await api.login({ email: 'driver@example.com', password: 'password123' })).toEqual({
      access_token: 'new-token',
      token_type: 'bearer',
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Authorization')).toBeNull()
    expect(JSON.parse(init?.body as string)).toEqual({
      email: 'driver@example.com',
      password: 'password123',
    })
  })

  it('attaches the bearer token to protected inventory requests', async () => {
    respond([vehicle])
    expect(await api.list()).toEqual([vehicle])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/vehicles')
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe(
      'Bearer session-token',
    )
  })

  it('encodes search fields and retains a zero lower price bound', async () => {
    respond([])
    await api.search({
      make: 'Land Rover',
      model: 'R&D',
      category: '',
      min_price: 0,
      max_price: 50000,
    })
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')
    expect(url.pathname).toBe('/api/vehicles/search')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      make: 'Land Rover',
      model: 'R&D',
      min_price: '0',
      max_price: '50000',
    })
  })

  it('purchases one vehicle without sending an invented quantity', async () => {
    respond({ ...vehicle, quantity: 1 })
    expect((await api.purchase('car-1')).quantity).toBe(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/vehicles/car-1/purchase')
    expect(fetchMock.mock.calls[0][1]?.body).toBeUndefined()
  })

  it('sends the restock amount and full replacement payload to the right endpoints', async () => {
    respond(vehicle)
    await api.restock('car-1', 5)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/vehicles/car-1/restock')
    expect(fetchMock.mock.calls[0][1]?.body).toBe('{"quantity":5}')
    respond(vehicle)
    await api.update('car-1', vehicle)
    expect(fetchMock.mock.calls[1][1]?.method).toBe('PUT')
  })

  it('accepts an empty 204 delete response', async () => {
    respond(null, 204)
    await expect(api.remove('car-1')).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE')
  })

  it('preserves a stock conflict message and status', async () => {
    respond({ detail: 'Vehicle is out of stock' }, 409)
    await expect(api.purchase('car-1')).rejects.toMatchObject({
      message: 'Vehicle is out of stock',
      status: 409,
    })
  })

  it('turns FastAPI field validation into a readable message', async () => {
    respond({ detail: [{ loc: ['body', 'price'], msg: 'Input should be greater than 0' }] }, 422)
    await expect(api.create(vehicle)).rejects.toThrow('price: Input should be greater than 0')
  })

  it('expires a session only for a protected 401, never invalid login credentials', async () => {
    respond({ detail: 'Invalid access token' }, 401)
    await expect(api.me()).rejects.toBeInstanceOf(ApiError)
    expect(expired).toHaveBeenCalledOnce()
    expired.mockClear()
    respond({ detail: 'Invalid email or password' }, 401)
    await expect(api.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(
      'Invalid email or password',
    )
    expect(expired).not.toHaveBeenCalled()
  })

  it('handles a proxy HTML error without exposing markup', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }))
    await expect(api.list()).rejects.toThrow('The server is unavailable. Please try again.')
  })

  it('explains network failures and preserves intentional cancellation', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(api.list()).rejects.toThrow(
      'Cannot reach the server. Check your connection and try again.',
    )
    const abort = new DOMException('Aborted', 'AbortError')
    fetchMock.mockRejectedValueOnce(abort)
    await expect(api.list()).rejects.toBe(abort)
  })
})
