// 내 위치 (GPS). 이미 허용된 기기면 바로 켜고, 아니면 버튼을 눌렀을 때 묻는다
import { useEffect, useRef, useState } from 'react'

export function useMyPosition() {
  const [pos, setPos] = useState(null)        // { lat, lon, acc }
  const [state, setState] = useState('idle')  // idle | finding | on | denied | unsupported
  const watch = useRef(null)

  const start = () => {
    if (!navigator.geolocation) return setState('unsupported')
    if (watch.current != null) return
    setState('finding')
    watch.current = navigator.geolocation.watchPosition(
      (p) => { setPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy) }); setState('on') },
      (e) => { setState(e.code === 1 ? 'denied' : 'idle'); navigator.geolocation.clearWatch(watch.current); watch.current = null },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
    )
  }

  useEffect(() => {
    navigator.permissions?.query({ name: 'geolocation' }).then((p) => { if (p.state === 'granted') start() }).catch(() => {})
    return () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current) }
  }, [])

  return { pos, state, start }
}
