// Vercel 크론(매일 1회): Supabase를 깨워 무료 플랜 일시정지를 막고, 출발 2시간 지난 모집을 자동 마감한다.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return res.status(200).json({ ok: false, reason: 'no_supabase_env' })
  try {
    const r = await fetch(`${url}/rest/v1/rpc/close_stale_rides`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: '{}',
    })
    const closed = await r.json().catch(() => null)
    return res.status(200).json({ ok: r.ok, closed, at: new Date().toISOString() })
  } catch (e) {
    return res.status(200).json({ ok: false, reason: 'api_error', message: String(e) })
  }
}
