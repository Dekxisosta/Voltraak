/**
 * Authentication layout component
 * Used for login, registration, and other auth-related pages.
 *
 * Split layout: a quiet, functional form column on the left, and a branded
 * panel on the right that speaks to what Voltraak actually does day to day
 * (live stock levels, FEFO tracking, reorder alerts) for WalangBrownout
 * Appliances. The brand panel is decorative and drops away below the lg
 * breakpoint; on mobile a compact brand strip stands in for it instead.
 */

import { useRef, useState, useCallback } from 'react'
import { Mail, Github, UserCog, PackageSearch, Boxes } from 'lucide-react'
import { CONTACT } from '@/shared/constants/contact'
import { SOCIAL } from '@/shared/constants/social'
import { DEVS } from '@/shared/constants/devs'

// The three roles Voltraak is built around. Shared between the desktop
// floating badges and the mobile brand strip so the two stay in sync.
const ROLES = [
  { icon: UserCog, label: 'Manager', sub: 'Approves reorders', accent: 'bg-emerald-400' },
  { icon: Boxes, label: 'Warehouse Staff', sub: 'Picks & packs orders', accent: 'bg-blue-400' },
  { icon: PackageSearch, label: 'Inventory Staff', sub: 'Logs stock counts', accent: 'bg-amber-400' },
]

// Base bar heights for the sparkline — used as scaleY targets (0–1 range).
const BAR_HEIGHTS = [38, 52, 46, 64, 58, 74, 66]

// Each bar gets its own keyframe oscillating between two scale values.
// Using scaleY instead of height keeps animation on the compositor thread
// and avoids sub-pixel paint artifacts at the bar edges.
const BAR_KEYFRAMES = BAR_HEIGHTS.map((base, i) => {
  const lo  = Math.max(14, base - 18) / 100
  const hi  = Math.min(92, base + 18) / 100
  const mid = (Math.round((base * 100 / 100) + (i % 2 === 0 ? 6 : -6)) / 100)
  return { lo, hi, mid: Math.min(0.92, Math.max(0.14, mid)) }
})

/**
 * Sparkline bars animated entirely in CSS via scaleY.
 * scaleY is GPU-composited — no layout, no paint, no stray pixels.
 * transform-origin is set to bottom so bars grow upward from the baseline.
 */
function AnimatedBars() {
  const keyframeCSS = BAR_KEYFRAMES.map((kf, i) => `
    @keyframes bar-pulse-${i} {
      0%   { transform: scaleY(${kf.lo}); }
      40%  { transform: scaleY(${kf.hi}); }
      70%  { transform: scaleY(${kf.mid}); }
      100% { transform: scaleY(${kf.lo}); }
    }
  `).join('')

  return (
    <>
      <style>{keyframeCSS}</style>
      <div className="mt-6 flex items-end gap-2 h-20">
        {BAR_HEIGHTS.map((_, i) => {
          const duration = 3.2 + i * 0.37
          const delay    = -(i * 0.61 + 0.4)
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-amber-400/30 to-amber-300/90"
              style={{
                height: '100%',
                transformOrigin: 'bottom',
                animation: `bar-pulse-${i} ${duration}s ${delay}s ease-in-out infinite`,
                willChange: 'transform',
              }}
            />
          )
        })}
      </div>
    </>
  )
}


/**
 * Wraps a card in a mouse-tracked 3D tilt + idle float.
 * - Tilt responds to cursor position relative to the card's center.
 * - Float is a slow, small-amplitude bob driven by CSS, paused while hovered
 *   so the two motions never fight each other.
 * - depth controls how far child elements (like the fill-rate ring) push
 *   toward the viewer on hover, for a layered parallax feel.
 */
function TiltCard({ children, className = '', floatDelay = '0s', floatDuration = '6s', maxTilt = 10, depth = 18 }) {
  const ref = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [style, setStyle] = useState({})

  const handleMouseMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width   // 0 -> 1
    const py = (e.clientY - rect.top) / rect.height    // 0 -> 1
    const rotateY = (px - 0.5) * maxTilt * 2
    const rotateX = (0.5 - py) * maxTilt * 2
    setStyle({
      transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${depth}px) scale3d(1.02, 1.02, 1.02)`,
    })
  }, [maxTilt, depth])

  const handleLeave = useCallback(() => {
    setHovered(false)
    setStyle({ transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)' })
  }, [])

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleLeave}
      className={`voltraak-float ${className}`}
      style={{
        ...style,
        animationName: hovered ? 'none' : 'voltraak-float',
        animationDelay: floatDelay,
        animationDuration: floatDuration,
        transition: 'transform 220ms ease-out',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  )
}

/**
 * A single card listing the three roles who rely on Voltraak day to day.
 * Purely decorative (pointer-events-none) and idly floats like the
 * dashboard cards, as one unit rather than three separate pieces.
 */
function RoleGroupCard({ className = '', floatDelay = '0s', floatDuration = '7s' }) {
  return (
    <div
      className={`voltraak-float pointer-events-none select-none ${className}`}
      style={{ animationDelay: floatDelay, animationDuration: floatDuration }}
    >
      <div className="rounded-2xl bg-white/[0.08] border border-white/10 backdrop-blur-sm p-3 shadow-2xl">
        <ul className="space-y-2.5">
          {ROLES.map(({ icon: Icon, label, sub, accent }) => (
            <li key={label} className="flex items-center gap-2.5">
              <span className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${accent}`}>
                <Icon className="w-3.5 h-3.5 text-[#0b1220]" strokeWidth={2.25} />
              </span>
              <span className="leading-tight whitespace-nowrap">
                <p className="text-[12px] font-medium text-white">{label}</p>
                <p className="text-[10px] text-slate-400">{sub}</p>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * Compact stand-in for the brand panel on small screens, where the full
 * panel is hidden. Same dark surface and dot-grid texture as the desktop
 * panel, scaled down to a single card with role chips, so the brand
 * identity still shows up below the lg breakpoint instead of just a bare
 * form.
 */
function MobileBrandStrip() {
  return (
    <div className="lg:hidden mt-10 w-full rounded-2xl bg-[#0b1220] border border-white/10 relative overflow-hidden">
      <svg className="absolute inset-0 w-full h-full voltraak-dot-drift" aria-hidden="true">
        <defs>
          <pattern id="auth-dot-grid-mobile" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" fillOpacity="0.14" />
          </pattern>
        </defs>
        <rect width="200%" height="200%" x="-50%" y="-50%" fill="url(#auth-dot-grid-mobile)" />
      </svg>
      <div className="pointer-events-none absolute -top-16 -right-10 w-52 h-52 rounded-full bg-amber-400 opacity-[0.16] blur-[70px]" />

      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] leading-relaxed text-slate-300 max-w-[15rem]">
            One shared view for everyone keeping the shelves right.
          </p>
          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300 bg-emerald-400/10 rounded-full px-2.5 py-1 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            96% fill rate
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {ROLES.map(({ icon: Icon, label, accent }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 pl-1.5 pr-3 py-1.5"
            >
              <span className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${accent}`}>
                <Icon className="w-3 h-3 text-[#0b1220]" strokeWidth={2.25} />
              </span>
              <span className="text-[11px] font-medium text-slate-200 whitespace-nowrap">{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen lg:h-screen flex overflow-x-hidden bg-[var(--color-bg-primary)]">
      {/* Local keyframes + reduced-motion guard for float motion (brand panel + mobile strip) */}
      <style>{`
        @keyframes voltraak-float {
          0%   { transform: translateY(0px); }
          50%  { transform: translateY(-7px); }
          100% { transform: translateY(0px); }
        }
        @keyframes voltraak-dot-drift {
          0%   { transform: translate(0px, 0px); }
          25%  { transform: translate(10px, 6px); }
          50%  { transform: translate(18px, 14px); }
          75%  { transform: translate(8px, 20px); }
          100% { transform: translate(0px, 0px); }
        }
        .voltraak-dot-drift {
          animation: voltraak-dot-drift 40s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .voltraak-float { animation: none !important; transition: none !important; }
          .voltraak-dot-drift { animation: none !important; }
        }
        @media (max-height: 800px) {
          .voltraak-float { animation: none; }
        }
        .voltraak-no-scrollbar::-webkit-scrollbar { display: none; }
        .voltraak-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Form column */}
      <div className="w-full lg:w-[50%] xl:w-[50%] flex flex-col items-center lg:items-end min-h-screen lg:h-full lg:overflow-y-auto voltraak-no-scrollbar px-6 sm:px-12 lg:px-24 py-24 relative overflow-hidden">

        {/* Subtle diagonal line-grid — same vibe as the right panel but quieter */}
        <svg className="pointer-events-none absolute inset-0 w-full h-full" aria-hidden="true">
          <defs>
            <pattern id="form-line-grid" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="32" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.045" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#form-line-grid)" />
        </svg>

        {/* Warm glow — top-right corner, stays out of the way of the form */}
        <div className="pointer-events-none absolute -top-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-amber-400 opacity-[0.055] blur-[100px]" />
        {/* Cool accent glow — bottom-left, very faint */}
        <div className="pointer-events-none absolute -bottom-32 -left-20 w-[22rem] h-[22rem] rounded-full bg-indigo-500 opacity-[0.045] blur-[90px]" />
        <div className="w-full max-w-sm relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/logo/voltraak-logo.png"
              alt="Voltraak"
              className="w-9 h-9 shrink-0 object-contain"
            />
            <div className="leading-tight">
              <p className="font-heading font-semibold text-[var(--color-text-primary)]">Voltraak</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">Inventory Management</p>
            </div>
          </div>

          {/* Brand strip — mobile-only stand-in for the desktop brand panel */}
          <MobileBrandStrip />

          {/* Form content */}
          <div className="mt-14 sm:mt-16 lg:mt-20">
            {children}
          </div>

          {/* Footer */}
          <div className="mt-16 pt-10 space-y-3">
            {/* Partnership credit — who this was built for and through */}
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] flex-wrap">
              <span>In partnership with</span>
              <span className="font-medium text-[var(--color-text-secondary)]">WalangBrownout Appliances</span>
              <span className="text-[var(--color-text-muted)]">&middot;</span>
              <span className="font-medium text-[var(--color-text-secondary)]">App Dev, Prof. Carta</span>
            </div>

            {/* Contact + repo */}
            <div className="flex items-center gap-4">
              <a
                href={`mailto:${CONTACT.devEmail}`}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {CONTACT.devEmail}
              </a>
              <a
                href={SOCIAL.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                <Github className="h-3.5 w-3.5" />
                Source on GitHub
              </a>
            </div>

            {/* Team avatars */}
            <div className="flex items-center gap-1.5">
              {DEVS.map((dev) => (
                <a
                  key={dev.username}
                  href={dev.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={dev.username}
                  className="group relative"
                >
                  <img
                    src={dev.avatar}
                    alt={dev.username}
                    className="w-6 h-6 rounded-full ring-1 ring-[var(--color-border-secondary)] object-cover transition-transform group-hover:scale-110 group-hover:ring-[var(--color-accent)]"
                  />
                </a>
              ))}
              <span className="ml-1 text-xs text-[var(--color-text-muted)]">Built by the team</span>
            </div>

            <p className="text-xs text-[var(--color-text-muted)]">
              &copy; 2024 Voltraak IMS.
            </p>
          </div>
        </div>
      </div>

      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[50%] lg:h-full relative overflow-hidden bg-[#0b1220]">
        {/* Fine dot-grid texture — drifts slowly via voltraak-dot-drift */}
        <svg className="absolute inset-0 w-full h-full voltraak-dot-drift" aria-hidden="true">
          <defs>
            <pattern id="auth-dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" fillOpacity="0.16" />
            </pattern>
          </defs>
          <rect width="200%" height="200%" x="-50%" y="-50%" fill="url(#auth-dot-grid)" />
        </svg>

        {/* Ambient glow, echoes the "power" in Voltraak without being literal */}
        <div className="pointer-events-none absolute -top-32 -right-20 w-[32rem] h-[32rem] rounded-full bg-amber-400 opacity-[0.16] blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-[24rem] h-[24rem] rounded-full bg-blue-600 opacity-[0.12] blur-[110px]" />

        <div
          className="relative z-10 flex flex-col justify-center px-14 xl:px-20 py-10 xl:py-14 w-full h-full overflow-y-auto voltraak-no-scrollbar"
          style={{ perspective: '1400px' }}
        >
          <div className="max-w-md">
            {/* Role card sits in normal flow, right-aligned above the
                headline — can't overlap text since it isn't absolutely
                positioned. */}
            <div className="flex justify-end">
              <RoleGroupCard floatDelay="0.3s" floatDuration="7.5s" />
            </div>

            <h2 className="mt-5 font-heading text-[1.75rem] xl:text-[2.1rem] leading-[1.15] font-semibold text-white max-w-md">
              Voltraak! Smarter inventory, made easy
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-300 max-w-sm">
              Live stock counts, FEFO batch tracking, and reorder alerts for
              every shelf at WalangBrownout Appliances.
            </p>

            {/* Dashboard cluster */}
            <div className="mt-8 max-w-md">
            {/* Stock health card — the hero mockup */}
            <TiltCard floatDelay="0s" floatDuration="7s" maxTilt={9} depth={24} className="block">
              <div className="relative rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-sm p-5 shadow-2xl cursor-default">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Stock health this week</p>
                    <p className="font-heading text-lg text-white mt-0.5">Main Warehouse</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-400/10 rounded-full px-2.5 py-1 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    On track
                  </span>
                </div>

                {/* Sparkline bars — animated via AnimatedBars component */}
                <AnimatedBars />
                <div className="mt-2 flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>

                {/* Floating fill-rate ring, overlapping the card like a status badge.
                    translateZ lifts it above the card's own tilt plane for a layered feel. */}
                <div
                  className="absolute -bottom-7 -right-7 w-28 h-28 rounded-full bg-[#111827] border border-white/10 shadow-2xl flex items-center justify-center"
                  style={{ transform: 'translateZ(14px)' }}
                >
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center"
                    style={{ background: 'conic-gradient(#f59e0b 0deg 346deg, rgba(255,255,255,0.08) 346deg 360deg)' }}
                  >
                    <div className="w-[80%] h-[80%] rounded-full bg-[#0b1220] flex flex-col items-center justify-center">
                      <span className="font-heading text-lg text-white">96%</span>
                      <span className="text-[10px] text-slate-400 -mt-0.5">fill rate</span>
                    </div>
                  </div>
                </div>
              </div>
            </TiltCard>

            {/* Second row: expiring batches + reorder alerts, side by side */}
            <div className="mt-7 grid grid-cols-2 gap-4">
              {/* Expiring soon — a real sequence, so a connecting rail is meaningful */}
              <TiltCard floatDelay="0.6s" floatDuration="8s" maxTilt={12} depth={16}>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 cursor-default">
                  <p className="text-xs text-slate-400">Expiring soon</p>
                  <ul className="mt-3 space-y-3">
                    {[
                      { name: 'Dry Cell Batteries AA', days: '3 days', urgent: true },
                      { name: 'Aircon Filter Foam', days: '9 days', urgent: false },
                      { name: 'Adhesive Sealant 300ml', days: '14 days', urgent: false },
                    ].map((item, i, arr) => (
                      <li key={item.name} className="relative pl-4">
                        {i < arr.length - 1 && (
                          <span className="absolute left-[3px] top-3 bottom-[-12px] w-px bg-white/10" />
                        )}
                        <span
                          className={`absolute left-0 top-1.5 w-[7px] h-[7px] rounded-full ${
                            item.urgent ? 'bg-rose-400' : 'bg-slate-500'
                          }`}
                        />
                        <p className="text-[13px] text-slate-200 leading-tight">{item.name}</p>
                        <p className={`text-[11px] mt-0.5 ${item.urgent ? 'text-rose-300' : 'text-slate-500'}`}>
                          {item.days} left
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </TiltCard>

              {/* Reorder alerts — items below threshold */}
              <TiltCard floatDelay="1.2s" floatDuration="7.5s" maxTilt={12} depth={16}>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 cursor-default">
                  <p className="text-xs text-slate-400">Reorder alerts</p>
                  <ul className="mt-3 space-y-2.5">
                    {[
                      { name: 'Inverter AC Compressor', qty: '2 left' },
                      { name: 'Ceiling Fan Capacitor', qty: '5 left' },
                      { name: 'LED Bulb 9W (Warm)', qty: '8 left' },
                    ].map((item) => (
                      <li key={item.name} className="flex items-center justify-between gap-2">
                        <p className="text-[13px] text-slate-200 leading-tight truncate">{item.name}</p>
                        <span className="text-[11px] text-amber-300 bg-amber-400/10 rounded-full px-2 py-0.5 whitespace-nowrap shrink-0">
                          {item.qty}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TiltCard>
            </div>
          </div>
          </div>

          <p className="mt-6 text-xs text-slate-500 max-w-sm">
            Updated moments ago across 3 warehouses.
          </p>
        </div>
      </div>
    </div>
  )
}