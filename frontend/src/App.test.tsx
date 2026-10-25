import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { installServer } from './test/server'

let server: ReturnType<typeof installServer>
beforeEach(() => {
  server = installServer()
})

async function enterInventory(role = 'user') {
  server = installServer(role)
  sessionStorage.setItem('motorway.token', 'test-token')
  render(<App />)
  await screen.findByRole('heading', { name: 'Inventory' })
  await screen.findByRole('heading', { name: 'Volvo XC60' })
  return userEvent.setup()
}
function card(name: string) {
  return screen.getByRole('article', { name })
}

describe('authentication', () => {
  it('switches light and dark mode and remembers the choice across mounts', async () => {
    localStorage.clear()
    const user = userEvent.setup()
    const first = render(<App />)
    expect(document.documentElement.dataset.theme).toBe('light')
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('motorway.theme')).toBe('dark')
    first.unmount()
    render(<App />)
    expect(document.documentElement.dataset.theme).toBe('dark')
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('motorway.theme')).toBe('light')
  })

  it('signs in, loads the actual user role, and signs out', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Email address'), 'driver@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await screen.findByRole('heading', { name: 'Inventory' })
    expect(sessionStorage.getItem('motorway.token')).toBe('test-token')
    expect(screen.queryByRole('button', { name: 'Add vehicle' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument()
    expect(sessionStorage.getItem('motorway.token')).toBeNull()
  })

  it('registers without sending a role and returns to sign in', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Create an account' }))
    await user.type(screen.getByLabelText('Email address'), 'new@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Account created. Sign in to get started.')).toBeInTheDocument()
    const call = server.fetchMock.mock.calls.find(([url]) => String(url).endsWith('/register'))!
    expect(JSON.parse(call[1]?.body as string)).toEqual({
      email: 'new@example.com',
      password: 'password123',
    })
  })

  it('rejects mismatched registration passwords before contacting the server', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Create an account' }))
    await user.type(screen.getByLabelText('Email address'), 'new@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'different123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match')
    expect(server.fetchMock).not.toHaveBeenCalled()
  })

  it('clears an expired stored session and explains why sign-in is needed', async () => {
    sessionStorage.setItem('motorway.token', 'expired')
    server.fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Invalid access token' }), { status: 401 }),
    )
    render(<App />)
    expect(
      await screen.findByText('Your session has expired. Please sign in again.'),
    ).toBeInTheDocument()
    expect(sessionStorage.getItem('motorway.token')).toBeNull()
  })

  it('retains a session during a temporary server failure and allows retry', async () => {
    sessionStorage.setItem('motorway.token', 'test-token')
    server.fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    render(<App />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
    expect(sessionStorage.getItem('motorway.token')).toBe('test-token')
  })
})

describe('inventory workflows', () => {
  it('offers the same theme preference in the inventory workspace', async () => {
    const user = await enterInventory()
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('motorway.theme')).toBe('dark')
  })

  it('disables purchasing an out-of-stock model and confirms a single purchase', async () => {
    const user = await enterInventory()
    expect(within(card('BMW 320i')).getByRole('button', { name: 'Out of stock' })).toBeDisabled()
    await user.click(
      within(card('Volvo XC60')).getByRole('button', { name: 'Purchase Volvo XC60' }),
    )
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/one vehicle/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Confirm purchase' }))
    await waitFor(() => expect(server.getVehicles()[0].quantity).toBe(1))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(card('Volvo XC60')).getByText('1 in stock')).toBeInTheDocument()
  })

  it('searches by model and clears an empty result', async () => {
    const user = await enterInventory()
    await user.type(screen.getByRole('searchbox', { name: 'Search inventory' }), 'Corolla')
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Volvo XC60' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('heading', { name: 'Toyota Corolla' })).toBeInTheDocument()
    await user.clear(screen.getByRole('searchbox', { name: 'Search inventory' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search inventory' }), 'spaceship')
    await screen.findByText('No vehicles found')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByRole('heading', { name: 'Volvo XC60' })).toBeInTheDocument()
  })

  it('filters categories and stock, and sorts prices', async () => {
    const user = await enterInventory()
    await user.selectOptions(screen.getByLabelText('Category'), 'SUV')
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Toyota Corolla' })).not.toBeInTheDocument(),
    )
    await user.selectOptions(screen.getByLabelText('Category'), '')
    await user.click(screen.getByRole('button', { name: /Out of stock inventory/ }))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Volvo XC60' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('heading', { name: 'BMW 320i' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /All inventory/ }))
    await user.selectOptions(screen.getByLabelText('Sort vehicles'), 'price-asc')
    await waitFor(() =>
      expect(screen.getAllByRole('article')[0]).toHaveAccessibleName('Toyota Corolla'),
    )
  })

  it('applies inclusive price filters and rejects an inverted range', async () => {
    const user = await enterInventory()
    await user.click(screen.getByRole('button', { name: /Filters/ }))
    await user.type(screen.getByLabelText('Minimum price'), '42000')
    await user.type(screen.getByLabelText('Maximum price'), '48000')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Toyota Corolla' })).not.toBeInTheDocument(),
    )
    expect(screen.getAllByRole('article')).toHaveLength(2)
    await user.clear(screen.getByLabelText('Minimum price'))
    await user.type(screen.getByLabelText('Minimum price'), '90000')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Minimum price cannot exceed maximum price')
  })

  it('handles a purchase conflict without falsely reporting success', async () => {
    const user = await enterInventory()
    await user.click(
      within(card('Volvo XC60')).getByRole('button', { name: 'Purchase Volvo XC60' }),
    )
    server.fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Vehicle is out of stock' }), { status: 409 }),
    )
    await user.click(screen.getByRole('button', { name: 'Confirm purchase' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Vehicle is out of stock')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(server.getVehicles()[0].quantity).toBe(2)
  })

  it('shows a retryable inventory error instead of a misleading empty catalogue', async () => {
    sessionStorage.setItem('motorway.token', 'test-token')
    server.fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(server.user)))
    server.fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Volvo XC60' })).toBeInTheDocument()
  })
})

describe('administration', () => {
  it('creates a vehicle with numeric price and quantity', async () => {
    const user = await enterInventory('admin')
    await user.click(screen.getByRole('button', { name: 'Add vehicle' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Make'), 'Porsche')
    await user.type(within(dialog).getByLabelText('Model'), '911')
    await user.type(within(dialog).getByLabelText('Category'), 'Coupe')
    await user.type(within(dialog).getByLabelText(/Price/), '115000')
    await user.clear(within(dialog).getByLabelText('Quantity'))
    await user.type(within(dialog).getByLabelText('Quantity'), '3')
    await user.click(within(dialog).getByRole('button', { name: 'Save vehicle' }))
    expect(await screen.findByRole('heading', { name: 'Porsche 911' })).toBeInTheDocument()
    expect(server.getVehicles().at(-1)).toMatchObject({ price: 115000, quantity: 3 })
  })

  it('edits, restocks, and deletes with explicit confirmation', async () => {
    const user = await enterInventory('admin')
    await user.click(within(card('Volvo XC60')).getByRole('button', { name: 'Edit Volvo XC60' }))
    await user.clear(within(screen.getByRole('dialog')).getByLabelText('Model'))
    await user.type(within(screen.getByRole('dialog')).getByLabelText('Model'), 'XC90')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByRole('heading', { name: 'Volvo XC90' })
    await user.click(within(card('Volvo XC90')).getByRole('button', { name: 'Restock Volvo XC90' }))
    await user.clear(screen.getByLabelText('Units to add'))
    await user.type(screen.getByLabelText('Units to add'), '4')
    await user.click(screen.getByRole('button', { name: 'Confirm restock' }))
    await waitFor(() =>
      expect(within(card('Volvo XC90')).getByText('6 in stock')).toBeInTheDocument(),
    )
    await user.click(within(card('Volvo XC90')).getByRole('button', { name: 'Delete Volvo XC90' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(card('Volvo XC90')).toBeInTheDocument()
    await user.click(within(card('Volvo XC90')).getByRole('button', { name: 'Delete Volvo XC90' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete vehicle' }),
    )
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Volvo XC90' })).not.toBeInTheDocument(),
    )
  })

  it('keeps Tab focus inside a dialog and restores the trigger on close', async () => {
    const user = await enterInventory('admin')
    const trigger = screen.getByRole('button', { name: 'Add vehicle' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog')
    const buttons = within(dialog).getAllByRole('button')
    const first = within(dialog).getByRole('button', { name: 'Close dialog' })
    const last = buttons.at(-1)!
    last.focus()
    await user.tab()
    expect(first).toHaveFocus()
    await user.tab({ shift: true })
    expect(last).toHaveFocus()
    await user.click(first)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
