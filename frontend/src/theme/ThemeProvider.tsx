import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'
const storageKey = 'motorway.theme'

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<Theme | null>(storedTheme)
  const [system, setSystem] = useState<Theme>(systemTheme)
  const theme = choice ?? system

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const changed = (event: MediaQueryListEvent) => setSystem(event.matches ? 'dark' : 'light')
    query.addEventListener('change', changed)
    return () => query.removeEventListener('change', changed)
  }, [])

  function setTheme(next: Theme) {
    setChoice(next)
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // The choice still applies for this mount if browser storage is unavailable.
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('ThemeToggle must be used inside ThemeProvider')
  const dark = context.theme === 'dark'
  const target = dark ? 'light' : 'dark'
  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      aria-label={`Switch to ${target} mode`}
      title={`Switch to ${target} mode`}
      aria-pressed={dark}
      onClick={() => context.setTheme(target)}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="theme-toggle-label">{dark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}
