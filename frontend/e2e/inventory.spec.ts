import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const adminEmail = 'admin@motorway.example.com'
const password = process.env.E2E_ADMIN_PASSWORD!
const catalogue = [
  { make: 'Volvo', model: 'XC60', category: 'SUV', price: 48900, quantity: 8 },
  { make: 'BMW', model: '320i', category: 'Sedan', price: 43500, quantity: 3 },
  { make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 24900, quantity: 12 },
  { make: 'Porsche', model: '911 Carrera', category: 'Coupe', price: 115000, quantity: 2 },
  { make: 'Land Rover', model: 'Defender', category: 'SUV', price: 68200, quantity: 0 },
  { make: 'Volkswagen', model: 'Golf', category: 'Hatchback', price: 28900, quantity: 6 },
]

async function login(page: Page, email = adminEmail) {
  await page.goto('/')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(6)
}

async function audit(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  return result.violations.map(violation => ({ id: violation.id, elements: violation.nodes.map(node => ({ target: node.target, problem: node.failureSummary })) }))
}

test.beforeEach(async ({ request }) => {
  // The startup harness only allows a local *_e2e database. Never point this at real inventory.
  const auth = await request.post('/api/auth/login', { data: { email: adminEmail, password } })
  expect(auth.status()).toBe(200)
  const headers = { Authorization: `Bearer ${(await auth.json()).access_token}` }
  const current = await request.get('/api/vehicles', { headers })
  for (const vehicle of await current.json()) expect((await request.delete(`/api/vehicles/${vehicle.id}`, { headers })).ok()).toBeTruthy()
  for (const vehicle of catalogue) expect((await request.post('/api/vehicles', { headers, data: vehicle })).ok()).toBeTruthy()
})

test('login and inventory are accessible and fit the viewport', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  await page.screenshot({ path: `test-results/login-${testInfo.project.name}.png`, fullPage: true })
  const loginIssues = await audit(page)
  await login(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({ path: `test-results/inventory-${testInfo.project.name}.png`, fullPage: true })
  expect([...loginIssues, ...await audit(page)]).toEqual([])
  expect(errors).toEqual([])
})

test('admin edits persist across reload, restock and delete', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Add vehicle', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Make', { exact: true }).fill('Audi')
  await dialog.getByLabel('Model', { exact: true }).fill('A6')
  await dialog.getByLabel('Category', { exact: true }).fill('Sedan')
  await dialog.getByLabel(/Price/).fill('56000')
  await dialog.getByLabel('Quantity', { exact: true }).fill('1')
  await dialog.getByRole('button', { name: 'Save vehicle' }).click()
  await expect(page.getByRole('article', { name: 'Audi A6' })).toBeVisible()
  await page.reload()
  const card = page.getByRole('article', { name: 'Audi A6' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Edit Audi A6' }).click()
  await dialog.getByLabel('Model', { exact: true }).fill('A6 Avant')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  const updated = page.getByRole('article', { name: 'Audi A6 Avant' })
  await updated.getByRole('button', { name: 'Restock Audi A6 Avant' }).click()
  await dialog.getByLabel('Units to add').fill('4')
  await dialog.getByRole('button', { name: 'Confirm restock' }).click()
  await expect(updated.getByText('5 in stock')).toBeVisible()
  await updated.getByRole('button', { name: 'Delete Audi A6 Avant' }).click()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(updated).toBeVisible()
  await updated.getByRole('button', { name: 'Delete Audi A6 Avant' }).click()
  await dialog.getByRole('button', { name: 'Delete vehicle', exact: true }).click()
  await expect(updated).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(6)
})

test('registers a buyer, filters inventory and purchases the last unit', async ({ page }, testInfo) => {
  const email = `buyer-${Date.now()}-${testInfo.project.name}@motorway.example.com`
  await page.goto('/')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByText('Account created. Sign in to get started.')).toBeVisible()
  await login(page, email)
  await expect(page.getByRole('button', { name: 'Add vehicle', exact: true })).toHaveCount(0)
  await page.getByLabel('Category', { exact: true }).selectOption('Coupe')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('button', { name: /^Filters/ }).click()
  await page.getByLabel('Minimum price').fill('100000')
  await page.getByLabel('Maximum price').fill('120000')
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page.getByRole('article', { name: 'Porsche 911 Carrera' })).toBeVisible()
  for (let unit = 0; unit < 2; unit++) {
    await page.getByRole('button', { name: 'Purchase Porsche 911 Carrera' }).click()
    await page.getByRole('button', { name: 'Confirm purchase' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  await expect(page.getByRole('article', { name: 'Porsche 911 Carrera' }).getByRole('button', { name: 'Out of stock' })).toBeDisabled()
  await page.reload()
  await expect(page.getByRole('article', { name: 'Porsche 911 Carrera' }).getByRole('button', { name: 'Out of stock' })).toBeDisabled()
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
})

test('dialogs trap keyboard focus, close on Escape and restore the trigger', async ({ page }) => {
  await login(page)
  const trigger = page.getByRole('button', { name: 'Add vehicle', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBeTruthy()
  }
  expect(await audit(page)).toEqual([])
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await page.getByRole('button', { name: 'List view' }).click()
  await expect(page.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
})
