// 내 위치 (GPS). 계속 추적하지 않고 필요할 때 한 번만 잰다 (배터리·끊김 부담 줄이기)
// 이미 허용된 기기면 처음 열 때 한 번 재고, 아니면 버튼을 눌렀을 때 묻는다
import { useEffect, useState } from 'react'

export function useMyPosition() {
  const [pos, setPos] = useState(null)        // { lat, lon, acc }
  const [state, setState] = useState('idle')  // idle | finding | on | denied | unsupported

  const start = () => {
    if (!navigator.geolocation) return setState('unsupported')
    setState('finding')
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy) }); setState('on') },
      (e) => setState(e.code === 1 ? 'denied' : 'idle'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  useEffect(() => {
    navigator.permissions?.query({ name: 'geolocation' }).then((p) => { if (p.state === 'granted') start() }).catch(() => {})
  }, [])

  return { pos, state, start }
}
