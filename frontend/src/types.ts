export interface User { id: string; email: string; role: string }
export interface Credentials { email: string; password: string }
export interface VehicleInput {
  make: string
  model: string
  category: string
  price: number
  quantity: number
}
export interface Vehicle extends VehicleInput { id: string }
export interface VehicleFilters {
  make?: string
  model?: string
  category?: string
  min_price?: number
  max_price?: number
}
