import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, createApi, type Api } from '../lib/api'
import { messageOf } from '../lib/format'
import type { Credentials, User } from '../types'

const storageKey = 'motorway.token'
function readToken() {
  try {
    return sessionStorage.getItem(storageKey)
  } catch {
    return null
  }
}
function saveToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(storageKey, token)
    else sessionStorage.removeItem(storageKey)
  } catch {
    /* Private browser storage can be unavailable; the in-memory session still works. */
  }
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string
  notice: string
  api: Api
  signIn: (credentials: Credentials) => Promise<void>
  signOut: () => void
  retry: () => void
}
const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useRef(readToken())
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(token.current))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const signOut = useCallback(() => {
    token.current = null
    saveToken(null)
    setUser(null)
    setError('')
    setNotice('')
    setLoading(false)
  }, [])
  const api = useMemo(
    () =>
      createApi({
        getToken: () => token.current,
        onUnauthorized: () => {
          signOut()
          setNotice('Your session has expired. Please sign in again.')
        },
      }),
    [signOut],
  )

  useEffect(() => {
    if (!token.current) return
    let active = true
    setLoading(true)
    setError('')
    api
      .me()
      .then((current) => {
        if (active) setUser(current)
      })
      .catch((reason) => {
        if (active && !(reason instanceof ApiError && reason.status === 401))
          setError(messageOf(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [api, attempt])

  async function signIn(credentials: Credentials) {
    const result = await api.login(credentials)
    // Only persist a session once the server has confirmed its identity and role.
    const current = await createApi({ getToken: () => result.access_token }).me()
    token.current = result.access_token
    saveToken(result.access_token)
    setUser(current)
    setNotice('')
    setError('')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        notice,
        api,
        signIn,
        signOut,
        retry: () => setAttempt((value) => value + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
