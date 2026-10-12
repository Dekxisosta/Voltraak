/**
 * HeroBanner - small hero section shown at the top of each role dashboard.
 * Uses /assets/hero/hero.png as a background image with a gradient
 * scrim so the title/subtitle stay legible over any photo. Drop the same
 * hero.png into public/assets/hero/ across systems to keep it consistent.
 */

export default function HeroBanner({ title, subtitle, children }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl shadow-sm"
      style={{ backgroundColor: 'var(--color-bg-inverse)' }}
    >
      <img
        src="/assets/hero/hero.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Scrim: keeps text readable regardless of the photo's content */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(24,24,27,0.85) 0%, rgba(24,24,27,0.55) 55%, rgba(24,24,27,0.25) 100%)',
        }}
      />

      <div className="relative flex flex-col gap-1 px-6 py-8 sm:px-8 sm:py-10">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-200">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
