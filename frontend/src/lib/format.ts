const configuredCurrency = import.meta.env.VITE_CURRENCY || 'USD'
export const currency = /^[A-Z]{3}$/.test(configuredCurrency) ? configuredCurrency : 'USD'
export const money = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency, maximumFractionDigits: 0,
}).format(value)
export const number = (value: number) => new Intl.NumberFormat('en-US').format(value)
export const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.'
