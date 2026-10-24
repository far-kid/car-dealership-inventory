import type { Credentials, User, Vehicle, VehicleFilters, VehicleInput } from '../types'

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

interface ApiOptions { getToken?: () => string | null; onUnauthorized?: () => void }
const pending = async <T>(): Promise<T> => { throw new Error('API client not implemented') }

export function createApi(_options: ApiOptions = {}) {
  return {
    login: (_body: Credentials) => pending<{ access_token: string; token_type: string }>(),
    register: (_body: Credentials) => pending<{ id: string; email: string }>(),
    me: () => pending<User>(),
    list: (_signal?: AbortSignal) => pending<Vehicle[]>(),
    search: (_filters: VehicleFilters, _signal?: AbortSignal) => pending<Vehicle[]>(),
    create: (_body: VehicleInput) => pending<Vehicle>(),
    update: (_id: string, _body: VehicleInput) => pending<Vehicle>(),
    remove: (_id: string) => pending<void>(),
    purchase: (_id: string) => pending<Vehicle>(),
    restock: (_id: string, _quantity: number) => pending<Vehicle>(),
  }
}

export type Api = ReturnType<typeof createApi>
