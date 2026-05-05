// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, className = '', ...props }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-green-400 text-white hover:bg-green-600 active:scale-95',
    secondary: 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 active:scale-95',
    ghost: 'bg-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    dark: 'bg-stone-900 text-white hover:bg-stone-700 active:scale-95'
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base'
  }
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <span className="mr-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', padding = true, ...props }) {
  return (
    <div className={`bg-white rounded-2xl border border-stone-200 ${padding ? 'p-6' : ''} ${className}`} {...props}>
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-stone-100 text-stone-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600'
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-stone-700">{label}</label>}
      <input
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all
          ${error ? 'border-red-300 focus:ring-red-200' : 'border-stone-200 focus:border-green-400 focus:ring-green-100'}
          focus:outline-none focus:ring-2 bg-white ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-stone-700">{label}</label>}
      <select
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all
          border-stone-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 focus:outline-none bg-white ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Loading spinner ───────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div className={`${sizes[size]} border-2 border-stone-200 border-t-green-400 rounded-full animate-spin`} />
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-4xl mb-4">{icon}</div>}
      <h3 className="font-medium text-stone-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-stone-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend }) {
  return (
    <div className="bg-stone-50 rounded-xl p-5">
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-serif text-stone-900">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ label, title, description }) {
  return (
    <div className="mb-8">
      {label && <p className="text-xs font-medium uppercase tracking-widest text-green-400 mb-2">{label}</p>}
      <h2 className="font-serif text-3xl text-stone-900 mb-2">{title}</h2>
      {description && <p className="text-stone-500 text-sm max-w-xl">{description}</p>}
    </div>
  )
}

// ── Pence to pounds formatter ─────────────────────────────────────────────────
export function formatPence(pence) {
  return `£${(pence / 100).toFixed(2)}`
}

// ── Format date ───────────────────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
