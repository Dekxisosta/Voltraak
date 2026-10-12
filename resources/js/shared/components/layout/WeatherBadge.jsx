/**
 * Small weather indicator shown next to the live clock in the header.
 * Backed by useWeather (Open-Meteo). Renders nothing while loading or if
 * the request fails, so it never leaves an awkward gap or error state
 * sitting in the header.
 */

import { Sun, CloudSun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning } from 'lucide-react'
import { useWeather } from '@/hooks/useWeather'

const CONDITION_ICON = {
  clear: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
}

export default function WeatherBadge() {
  const { weather, status } = useWeather()

  if (status !== 'ready' || !weather) return null

  const Icon = CONDITION_ICON[weather.condition] ?? Cloud

  return (
    <div className="hidden md:flex items-center gap-1.5 pr-4 border-r border-[var(--color-border-primary)] select-none">
      <Icon className="h-5 w-5 text-[var(--color-text-secondary)]" aria-hidden="true" />
      <span className="text-sm font-medium text-[var(--color-text-primary)] tabular-nums">
        {weather.temperature}°F
      </span>
    </div>
  )
}
