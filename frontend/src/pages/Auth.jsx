import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button, Input, Card } from '../pages/components/ui'
import toast from 'react-hot-toast'

function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-stone-900 p-10 text-white">
        <Link to="/" className="font-serif text-2xl text-white">
          par<span className="text-green-400">give</span>
        </Link>
        <div>
          <p className="font-serif text-4xl leading-tight mb-4">Play with purpose.<br/>Win with <em className="italic text-green-400">heart.</em></p>
          <p className="text-stone-400 text-sm leading-relaxed">Every score you enter is a step toward helping the charity you love — and a chance to win.</p>
        </div>
        <div className="flex gap-3">
          {['10K+', 'subscribers', '£48K', 'monthly pool', '44', 'charities'].map((t, i) =>
            i % 2 === 0
              ? <span key={i} className="font-serif text-green-400 text-xl">{t}</span>
              : <span key={i} className="text-stone-500 text-sm self-end pb-0.5">{t} · </span>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Link to="/" className="lg:hidden font-serif text-xl text-stone-900 block mb-8">
              par<span className="text-green-400">give</span>
            </Link>
            <h1 className="font-serif text-3xl text-stone-900 mb-1.5">{title}</h1>
            <p className="text-stone-500 text-sm">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const redirect = searchParams.get('redirect') || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    if (!form.email) { setErrors(p => ({ ...p, email: 'Email required' })); return }
    if (!form.password) { setErrors(p => ({ ...p, password: 'Password required' })); return }

    setLoading(true)
    try {
      await signIn(form.email, form.password)
      navigate(redirect)
    } catch (err) {
      toast.error(err.message || 'Sign in failed')
      setErrors({ password: 'Invalid email or password' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Pargive account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
          error={errors.password}
        />
        <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
          Sign in
        </Button>
      </form>
      <p className="text-center text-sm text-stone-500 mt-6">
        Don't have an account?{' '}
        <Link to="/auth/register" className="text-green-600 font-medium hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Full name required'
    if (!form.email.includes('@')) e.email = 'Valid email required'
    if (form.password.length < 8) e.password = 'Minimum 8 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      await signUp(form.email, form.password, form.fullName)
      toast.success('Account created! Please check your email to verify.')
      navigate('/auth/login')
    } catch (err) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })), error: errors[k] })

  return (
    <AuthLayout title="Create your account" subtitle="Join Pargive and start playing with purpose">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full name" placeholder="Your name" {...f('fullName')} />
        <Input label="Email address" type="email" placeholder="you@example.com" {...f('email')} />
        <Input label="Password" type="password" placeholder="Min. 8 characters" {...f('password')} />
        <Input label="Confirm password" type="password" placeholder="Repeat password" {...f('confirm')} />
        <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
          Create account
        </Button>
      </form>
      <p className="text-center text-sm text-stone-500 mt-6">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-green-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
      <p className="text-center text-xs text-stone-400 mt-4">
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>
    </AuthLayout>
  )
}
