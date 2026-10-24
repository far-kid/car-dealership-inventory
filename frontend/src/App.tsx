import { AuthProvider, useAuth } from './auth/AuthProvider'
import { AuthPage } from './auth/AuthPage'
import { Brand } from './components/Brand'
import { Dashboard } from './inventory/Dashboard'

function SessionGate() {
  const { user, loading, error, retry, signOut } = useAuth()
  if (loading) return <main className="session-screen"><Brand/><span className="loader"/><p role="status">Getting your workspace ready…</p></main>
  if (error) return <main className="session-screen"><Brand/><h1>Your workspace is a moment away.</h1><p role="alert" className="notice error">{error}</p><div className="flex gap-3"><button className="button primary" onClick={retry}>Try again</button><button className="button secondary" onClick={signOut}>Back to sign in</button></div></main>
  return user ? <Dashboard/> : <AuthPage/>
}

export default function App() { return <AuthProvider><SessionGate/></AuthProvider> }
