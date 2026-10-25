import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, ShieldCheck, Check } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { Brand } from '../components/Brand'
import { VehicleArt } from '../components/VehicleArt'
import { messageOf } from '../lib/format'
import { ThemeToggle } from '../theme/ThemeProvider'

export function AuthPage() {
  const { api, signIn, notice } = useAuth()
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (register && password !== confirmation) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const credentials = { email: email.trim(), password }
      if (register) {
        await api.register(credentials)
        setRegister(false)
        setPassword('')
        setConfirmation('')
        setSuccess('Account created. Sign in to get started.')
      } else await signIn(credentials)
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    setRegister(!register)
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmation('')
  }

  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand light />
        <div className="auth-story-copy">
          <span className="eyebrow light-eyebrow">
            <span className="live-dot" /> THE ROAD AHEAD
          </span>
          <h1>
            Great inventory.
            <br />
            Greater possibilities.
          </h1>
          <p>
            A little less admin. A lot more momentum.
            <br />
            Your entire dealership, in one clear view.
          </p>
        </div>
        <div className="auth-illustration">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <VehicleArt category="SUV" seed="motorway" hero />
          <span className="illustration-caption">DESIGNED TO KEEP YOU MOVING</span>
        </div>
        <div className="auth-story-footer">
          <span>
            <ShieldCheck size={17} /> A secure home for your inventory
          </span>
          <span>01 — ∞</span>
        </div>
      </aside>
      <main className="auth-main">
        <ThemeToggle className="auth-theme-toggle" />
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <span className="eyebrow">YOUR DEALERSHIP, CONNECTED</span>
          <h2>{register ? 'Start your journey.' : 'Welcome back.'}</h2>
          <p className="auth-intro">
            {register
              ? 'Create your account and find your next great drive.'
              : 'Sign in to see what’s next for your inventory.'}
          </p>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          {success && (
            <p className="notice success" role="status">
              <Check size={18} />
              {success}
            </p>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={submit} className="auth-form">
            <fieldset disabled={busy}>
              <label className="field">
                Email address
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@dealership.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="field">
                Password
                <span className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={register ? 'new-password' : 'current-password'}
                    minLength={register ? 8 : undefined}
                    maxLength={128}
                    placeholder={register ? 'At least 8 characters' : 'Enter your password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
              {register && (
                <label className="field">
                  Confirm password
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmation"
                    autoComplete="new-password"
                    required
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    placeholder="Enter your password again"
                  />
                </label>
              )}
              {register && (
                <p className="field-help">
                  Use 8–128 characters. Your account starts with buyer access.
                </p>
              )}
              <button className="button primary auth-submit" type="submit">
                {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
                <ArrowRight size={18} />
              </button>
            </fieldset>
          </form>
          <p className="auth-switch">
            {register ? 'Already part of the journey?' : 'New to Motorway?'}{' '}
            <button type="button" onClick={switchMode} disabled={busy}>
              {register ? 'Sign in instead' : 'Create an account'}
            </button>
          </p>
          <div className="auth-security">
            <ShieldCheck size={16} />
            <span>Your session stays with you in this browser tab.</span>
          </div>
        </div>
        <footer className="auth-footer">
          <span>Motorway · Dealership inventory</span>
          <span>Built for the road ahead.</span>
        </footer>
      </main>
    </div>
  )
}
