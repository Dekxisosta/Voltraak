/**
 * useWeather - fetches current conditions for the header's weather badge.
 *
 * Uses Open-Meteo (https://open-meteo.com), a free forecast API that
 * requires no API key, so there's nothing to configure or keep secret.
 * Tries the browser's geolocation first; if that's denied/unavailable it
 * falls back to a default location (override with VITE_WEATHER_DEFAULT_LAT
 * / VITE_WEATHER_DEFAULT_LON in .env). Refreshes every 15 minutes.
 */

import { useEffect, useState } from 'react'

const REFRESH_MS = 15 * 60 * 1000
const GEO_TIMEOUT_MS = 5000

// Neutral fallback (New York) — override via .env for a site-specific default.
const DEFAULT_LAT = Number(import.meta.env.VITE_WEATHER_DEFAULT_LAT) || 40.7128
const DEFAULT_LON = Number(import.meta.env.VITE_WEATHER_DEFAULT_LON) || -74.006

// WMO weather codes (https://open-meteo.com/en/docs) collapsed into the
// handful of conditions the badge actually distinguishes visually.
function classifyWeatherCode(code) {
  if (code === 0) return 'clear'
  if ([1, 2].includes(code)) return 'partly-cloudy'
  if (code === 3) return 'cloudy'
  if ([45, 48].includes(code)) return 'fog'
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow'
  if ([95, 96, 99].includes(code)) return 'storm'
  return 'partly-cloudy'
}

function getPosition() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON }),
      { timeout: GEO_TIMEOUT_MS, maximumAge: 10 * 60 * 1000 }
    )
  })
}

export function useWeather() {
  const [weather, setWeather] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { latitude, longitude } = await getPosition()
        const url = new URL('https://api.open-meteo.com/v1/forecast')
        url.searchParams.set('latitude', latitude)
        url.searchParams.set('longitude', longitude)
        url.searchParams.set('current', 'temperature_2m,weather_code')
        url.searchParams.set('temperature_unit', 'fahrenheit')
        url.searchParams.set('timezone', 'auto')

        const res = await fetch(url.toString())
        if (!res.ok) throw new Error(`Weather request failed: ${res.status}`)
        const data = await res.json()

        if (cancelled) return
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          condition: classifyWeatherCode(data.current.weather_code),
        })
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    load()
    const interval = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { weather, status }
}
