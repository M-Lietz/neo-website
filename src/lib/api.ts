/**
 * API configuration — Backend endpoints
 * When running against the old WordPress backend, these point to the WP AJAX handler.
 * Later can be replaced with direct API endpoints.
 */
export const API_BASE = 'https://neo.lietztech.com'

// WordPress AJAX endpoint (used by the existing backend)
export const AJAX_URL = `${API_BASE}/wp-admin/admin-ajax.php`

// Helper to make WordPress AJAX calls
export async function wpAjax<T = unknown>(action: string, extraData?: Record<string, string>): Promise<T | null> {
  try {
    const body = new URLSearchParams({ action })
    if (extraData) {
      Object.entries(extraData).forEach(([k, v]) => body.append(k, v))
    }
    const res = await fetch(AJAX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const data = await res.json()
    if (data.success) return data.data as T
    return null
  } catch {
    return null
  }
}

// Open-Meteo weather API (no auth needed)
export const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m,weather_code&timezone=Europe/Berlin'
