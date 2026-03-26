/**
 * API configuration — Server Stats + Weather
 * Stats come from a lightweight JSON endpoint on the server.
 * No WordPress dependency.
 */
export const API_BASE = 'https://neo.lietztech.com'

// Stats endpoint — served by Caddy as static JSON (updated by cron)
export const STATS_URL = `${API_BASE}/api/stats.json`

export async function fetchStats<T = unknown>(): Promise<T | null> {
  try {
    const res = await fetch(STATS_URL, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

// Fallback stats when API is unreachable (real server values)
export const FALLBACK_STATS = {
  cpu: '12',
  ram_total: 12288,
  ram_free: 7200,
  disk_used_pct: '34',
  net_rx: '24',
  containers: '8',
  services: '14',
  crons: '15',
  uptime_seconds: '15552000', // ~180 days
}

// Open-Meteo weather API (no auth needed)
export const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m,weather_code&timezone=Europe/Berlin'
