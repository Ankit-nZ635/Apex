/**
 * VisualAssets.tsx
 * Reusable SVG illustrations, animated components, and avatar helpers.
 * Zero external image deps — everything renders inline.
 */
import React, { useRef, useEffect, useState } from 'react'

// ─── Account Type → Visual Icon Emblem (Inline SVG) ──────────────────────────

export function AccountEmblem({ type, size = 44 }: { type: string; size?: number }) {
  const configs: Record<string, { bg: string; gradient: string[]; icon: React.ReactNode }> = {
    ASSET: {
      bg: 'bg-emerald-50',
      gradient: ['#10B981', '#059669'],
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M2 20h20M6 20V10m4 10V4m4 16v-6m4 6v-8" stroke="#059669" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="2" r="1.5" fill="#10B981"/>
        </svg>
      ),
    },
    LIABILITY: {
      bg: 'bg-rose-50',
      gradient: ['#F43F5E', '#E11D48'],
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="18" height="13" rx="2" stroke="#E11D48" strokeWidth="2"/>
          <path d="M3 10h18" stroke="#E11D48" strokeWidth="2"/>
          <circle cx="8" cy="15" r="1.5" fill="#F43F5E"/>
        </svg>
      ),
    },
    EQUITY: {
      bg: 'bg-indigo-50',
      gradient: ['#6366F1', '#4F46E5'],
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    REVENUE: {
      bg: 'bg-sky-50',
      gradient: ['#0EA5E9', '#0284C7'],
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="#0284C7" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
    EXPENSE: {
      bg: 'bg-amber-50',
      gradient: ['#F59E0B', '#D97706'],
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M9 14l2 2 4-4m-5-4V4a2 2 0 012-2h2a2 2 0 012 2v4M5 20h14a2 2 0 002-2V10a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="#D97706" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
  }
  const cfg = configs[type] || configs.ASSET
  return (
    <div
      className={`${cfg.bg} rounded-xl flex items-center justify-center shrink-0 border border-white shadow-sm`}
      style={{ width: size, height: size }}
    >
      {cfg.icon}
    </div>
  )
}

// ─── DiceBear Avatar (URL-based, with clean fallback initials) ────────────────

export function UserAvatar({
  name = 'User',
  seed,
  size = 32,
  className = '',
}: {
  name?: string
  seed?: string
  size?: number
  className?: string
}) {
  const [imgErr, setImgErr] = useState(false)
  const avatarSeed = seed || name.toLowerCase().replace(/\s+/g, '-')
  const src = `https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-sky-500', 'bg-emerald-500', 'bg-rose-500']
  const colorIdx = name.charCodeAt(0) % colors.length

  if (imgErr) {
    return (
      <div
        className={`${colors[colorIdx]} rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {initials}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setImgErr(true)}
      className={`rounded-full object-cover shrink-0 bg-indigo-100 ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

// ─── Mini SVG Sparkline ───────────────────────────────────────────────────────

export function MiniSparkline({
  values,
  color = '#4F46E5',
  width = 80,
  height = 28,
}: {
  values: number[]
  color?: string
  width?: number
  height?: number
}) {
  if (!values.length) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })
  const pathD = `M ${pts.join(' L ')}`
  const areaD = `M 0,${height} L ${pts.join(' L ')} L ${width},${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <defs>
        <linearGradient id={`spk-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spk-${color.replace('#', '')})`} />
      <path d={pathD} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Animated Canvas Mesh Background (Auth & Hero) ────────────────────────────

export function AnimatedMeshCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    let t = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight

    const nodes = Array.from({ length: 24 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }))

    const draw = () => {
      t += 0.008
      ctx.clearRect(0, 0, W(), H())

      // Soft gradient wash
      const grad = ctx.createLinearGradient(0, 0, W(), H())
      grad.addColorStop(0, 'rgba(99,102,241,0.08)')
      grad.addColorStop(0.5, 'rgba(168,85,247,0.05)')
      grad.addColorStop(1, 'rgba(14,165,233,0.06)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W(), H())

      // Update nodes
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > W()) n.vx *= -1
        if (n.y < 0 || n.y > H()) n.vy *= -1
      }

      // Draw connecting lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 160) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(99,102,241,${0.07 * (1 - dist / 160)})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      // Draw pulsing nodes
      for (let i = 0; i < nodes.length; i++) {
        const pulse = 0.4 + 0.3 * Math.sin(t * 2 + i)
        ctx.beginPath()
        ctx.arc(nodes[i].x, nodes[i].y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${pulse})`
        ctx.fill()
      }

      // Flowing currency stream arcs
      for (let k = 0; k < 3; k++) {
        const phase = t + k * 2.1
        const startX = (k * W()) / 3 + W() * 0.1
        const y = H() * (0.3 + 0.4 * Math.sin(phase * 0.5 + k))
        const r = 60 + 20 * Math.sin(phase)
        ctx.beginPath()
        ctx.arc(startX + r * Math.cos(phase), y + r * Math.sin(phase * 0.7), 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(168,85,247,${0.25 + 0.15 * Math.sin(phase * 1.3)})`
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.9 }}
    />
  )
}

// ─── Animated Money Flow Diagram (SVG Path with flowing dots) ─────────────────

export function MoneyFlowDiagram({
  sourceLabel,
  destLabel,
  amount,
  sourceType,
  destType,
}: {
  sourceLabel: string
  destLabel: string
  amount: string
  sourceType?: string
  destType?: string
}) {
  return (
    <div className="money-flow-container relative py-3">
      <svg
        viewBox="0 0 400 60"
        className="w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#6366F1" stopOpacity="1" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.6" />
          </linearGradient>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#6366F1" />
          </marker>
        </defs>

        {/* Flow path */}
        <path
          d="M 110 30 Q 200 10 290 30"
          stroke="url(#flowGrad)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,4"
          markerEnd="url(#arrowhead)"
          className="flow-path"
        />

        {/* Animated dots */}
        <circle r="3.5" fill="#6366F1" opacity="0.9">
          <animateMotion dur="1.8s" repeatCount="indefinite" path="M 110 30 Q 200 10 290 30" />
        </circle>
        <circle r="2.5" fill="#6366F1" opacity="0.6">
          <animateMotion dur="1.8s" begin="0.6s" repeatCount="indefinite" path="M 110 30 Q 200 10 290 30" />
        </circle>
        <circle r="2" fill="#818CF8" opacity="0.4">
          <animateMotion dur="1.8s" begin="1.2s" repeatCount="indefinite" path="M 110 30 Q 200 10 290 30" />
        </circle>

        {/* Amount label on path */}
        <text x="200" y="8" textAnchor="middle" fontSize="10" fontWeight="700" fill="#4F46E5" fontFamily="Inter, system-ui, sans-serif">
          ${amount}
        </text>
      </svg>

      {/* Source & Dest labels */}
      <div className="flex items-center justify-between -mt-1">
        <div className="flex items-center gap-1.5 text-xs">
          <AccountEmblem type={sourceType || 'ASSET'} size={28} />
          <div>
            <div className="font-semibold text-slate-900 truncate max-w-[100px]">{sourceLabel}</div>
            <span className="badge badge-rose text-[9px]">CREDIT</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <div className="text-right">
            <div className="font-semibold text-slate-900 truncate max-w-[100px]">{destLabel}</div>
            <span className="badge badge-emerald text-[9px]">DEBIT</span>
          </div>
          <AccountEmblem type={destType || 'ASSET'} size={28} />
        </div>
      </div>
    </div>
  )
}

// ─── Animated Security Shield SVG ─────────────────────────────────────────────

export function SecurityShieldAnimation({ verified = true }: { verified?: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow ring */}
      <div
        className={`absolute rounded-full ${verified ? 'shield-glow-emerald' : 'shield-glow-rose'}`}
        style={{ width: 100, height: 100 }}
      />
      <svg width="80" height="90" viewBox="0 0 80 90" fill="none">
        <defs>
          <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={verified ? '#10B981' : '#F43F5E'} />
            <stop offset="100%" stopColor={verified ? '#059669' : '#E11D48'} />
          </linearGradient>
          <filter id="shieldGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <path
          d="M40 4L8 16v24c0 20 14.5 38 32 44 17.5-6 32-24 32-44V16L40 4z"
          fill="url(#shieldGrad)"
          filter="url(#shieldGlow)"
          opacity="0.9"
        >
          <animate attributeName="opacity" values="0.85;1;0.85" dur="3s" repeatCount="indefinite" />
        </path>
        {/* Shield inner shine */}
        <path
          d="M40 12L16 22v18c0 15 11 28.5 24 33 13-4.5 24-18 24-33V22L40 12z"
          fill="white"
          opacity="0.12"
        />
        {verified ? (
          // Animated checkmark
          <path
            d="M26 44l10 10 20-20"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="50"
            strokeDashoffset="0"
          >
            <animate attributeName="stroke-dashoffset" from="50" to="0" dur="0.6s" fill="freeze" />
          </path>
        ) : (
          // X mark
          <path
            d="M28 36l24 24M52 36L28 60"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  )
}

// ─── Vault Dial (Time Machine Spinner) ────────────────────────────────────────

export function VaultDial({ value, min, max }: { value: number; min: number; max: number }) {
  const pct = max > min ? (value - min) / (max - min) : 0
  const angle = pct * 360 - 180 // -180 to +180

  return (
    <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
      {/* Dial ring */}
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" stroke="#E2E8F0" strokeWidth="6" fill="none" />
        <circle
          cx="40"
          cy="40"
          r="34"
          stroke="#4F46E5"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${pct * 213.6} 213.6`}
          strokeDashoffset="53.4"
          style={{ transition: 'stroke-dasharray 0.3s ease' }}
        />
      </svg>
      {/* Center needle */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: `rotate(${angle}deg)` }}
      >
        <div className="relative" style={{ height: 32 }}>
          <div className="w-1 h-6 bg-indigo-600 rounded-full mx-auto" />
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 mx-auto -mt-0.5 shadow-sm" />
        </div>
      </div>
      {/* Center dot */}
      <div className="absolute w-3 h-3 rounded-full bg-slate-200 border-2 border-white shadow" />
    </div>
  )
}

// ─── Blockchain Link Visualizer (Security Check) ──────────────────────────────

export function BlockChainVisualizer({
  blocks,
  verifying,
}: {
  blocks: Array<{ id: string; sequence_num?: string; description: string; hash: string; verified?: boolean; compromised?: boolean }>
  verifying: boolean
}) {
  if (!blocks.length) return null
  const display = blocks.slice(-5)

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {display.map((block, idx) => {
        const isLast = idx === display.length - 1
        const isVerified = block.verified && !block.compromised
        return (
          <React.Fragment key={block.id || idx}>
            <div
              className={`relative shrink-0 w-28 p-3 rounded-xl border text-center transition-all ${
                block.compromised
                  ? 'border-rose-300 bg-rose-50/60'
                  : isVerified
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-slate-200 bg-white'
              }`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {/* Lock Icon */}
              <div className={`w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center ${
                block.compromised ? 'bg-rose-100' : isVerified ? 'bg-emerald-100' : 'bg-slate-100'
              }`}>
                {verifying ? (
                  <svg className="w-4 h-4 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 10" />
                  </svg>
                ) : block.compromised ? (
                  <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24">
                    <path d="M18 11H6a2 2 0 00-2 2v5a2 2 0 002 2h12a2 2 0 002-2v-5a2 2 0 00-2-2zM8 11V7a4 4 0 118 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 16v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
                  </svg>
                )}
              </div>
              <div className="text-[9px] font-semibold text-slate-500 uppercase tabular-nums">
                Block #{block.sequence_num || idx + 1}
              </div>
              <div className="text-[10px] font-semibold text-slate-700 truncate mt-0.5">
                {block.description.slice(0, 14)}...
              </div>
              <div className="mt-1.5 text-[9px] text-slate-400 truncate tabular-nums">
                {block.hash.slice(0, 10)}...
              </div>

              {/* Scan line animation for verifying */}
              {verifying && (
                <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                  <div className="scan-line" />
                </div>
              )}
            </div>

            {!isLast && (
              <div className="flex items-center gap-0.5 shrink-0">
                <div className={`w-4 h-0.5 ${isVerified && !verifying ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                <svg className={`w-3 h-3 ${isVerified && !verifying ? 'text-emerald-500' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 8 8">
                  <polygon points="0,0 8,4 0,8" />
                </svg>
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Empty State Illustration ─────────────────────────────────────────────────

export function EmptyStateIllustration({
  title,
  subtitle,
  variant = 'search',
}: {
  title: string
  subtitle?: string
  variant?: 'search' | 'transfer' | 'vault'
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
      <div className="relative">
        {variant === 'search' && (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" fill="#F1F5F9" />
            <circle cx="34" cy="34" r="14" stroke="#CBD5E1" strokeWidth="3" fill="none" />
            <path d="M44 44l12 12" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
            <path d="M28 34h12M34 28v12" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
        {variant === 'transfer' && (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" fill="#F1F5F9" />
            <rect x="14" y="30" width="22" height="20" rx="4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
            <rect x="44" y="30" width="22" height="20" rx="4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
            <path d="M36 40h8M40 36l4 4-4 4" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {variant === 'vault' && (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" fill="#F1F5F9" />
            <rect x="18" y="20" width="44" height="40" rx="5" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
            <circle cx="40" cy="40" r="10" stroke="#94A3B8" strokeWidth="2" fill="none" />
            <circle cx="40" cy="40" r="4" fill="#CBD5E1" />
            <path d="M40 30v4M40 46v4M30 40h4M46 40h4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── Floating Glassmorphic Notification Card ──────────────────────────────────

export function SettlementNotifCard({
  amount = '$5,000.00',
  style,
  className = '',
}: {
  amount?: string
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <div
      className={`glass-notif-card flex items-center gap-3 ${className}`}
      style={style}
    >
      <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <div className="text-xs font-bold text-slate-900">{amount} Settled</div>
        <div className="text-[10px] text-slate-500 flex items-center gap-1">
          <span className="text-emerald-700 font-semibold">Audit-Verified</span>
          <span>· Instant</span>
        </div>
      </div>
      <div className="ml-auto">
        <span className="badge badge-emerald text-[9px]">✓ LIVE</span>
      </div>
    </div>
  )
}

// ─── Currency Flag Badge ───────────────────────────────────────────────────────

export function CurrencyBadge({ currency }: { currency: string }) {
  const flags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
    INR: '🇮🇳',
    SGD: '🇸🇬',
    AUD: '🇦🇺',
    CAD: '🇨🇦',
    JPY: '🇯🇵',
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600">
      <span>{flags[currency] || '🏳️'}</span>
      <span>{currency}</span>
    </span>
  )
}

