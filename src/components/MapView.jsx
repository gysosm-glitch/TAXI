// 벡터 지도 (OpenFreeMap, 키 없음). 지명은 한글로, 스팟·출발지·내 위치를 표시한다
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CHEONGJU_CENTER } from '../data.js'

const STYLE = 'https://tiles.openfreemap.org/styles/positron'
const KO_NAME = ['coalesce', ['get', 'name:ko'], ['get', 'name']]

function el(html, className, onClick) {
  const d = document.createElement('div')
  d.className = className
  d.innerHTML = html
  if (onClick) d.addEventListener('click', (e) => { e.stopPropagation(); onClick() })
  return d
}

// markers: [{ id, lat, lon, label, kind: 'spot'|'origin', on }]  me: { lat, lon, acc }
export default function MapView({ center = CHEONGJU_CENTER, zoom = 12, markers = [], me, onPick, onTap, className = '' }) {
  const box = useRef(null)
  const map = useRef(null)
  const pins = useRef([])
  const meMarker = useRef(null)
  const tapRef = useRef(onTap)   // 지도 클릭 처리는 항상 최신 함수로
  tapRef.current = onTap

  useEffect(() => {
    const m = new maplibregl.Map({
      container: box.current, style: STYLE, center: [center[1], center[0]], zoom,
      attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false,
    })
    m.touchZoomRotate.disableRotation()
    // 지명은 한글만 (기본은 "Osong 오송"처럼 영문 병기)
    m.on('styledata', () => {
      for (const l of m.getStyle().layers) {
        if (l.layout?.['text-field'] && l.id !== 'highway-shield') m.setLayoutProperty(l.id, 'text-field', KO_NAME)
      }
    })
    m.on('click', (e) => tapRef.current?.({ lat: e.lngLat.lat, lon: e.lngLat.lng }))
    // 지도를 나중에 불러오면 처음 잰 크기가 틀릴 수 있어, 상자 크기가 바뀔 때마다 다시 맞춘다
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(box.current)
    map.current = m
    return () => { ro.disconnect(); m.remove() }
  }, [])

  // 중심 이동
  useEffect(() => { map.current?.easeTo({ center: [center[1], center[0]], zoom, duration: 600 }) }, [center[0], center[1], zoom])

  // 스팟·출발지 핀
  useEffect(() => {
    pins.current.forEach((p) => p.remove())
    pins.current = markers.map((k) => {
      const html = k.kind === 'origin' || k.kind === 'dest' ? `<span class="pin-dot"></span><b>${k.label}</b>` : `<b>${k.label}</b>`
      const node = el(html, `mpin ${k.kind} ${k.on ? 'on' : ''}`, onPick ? () => onPick(k.id) : null)
      return new maplibregl.Marker({ element: node, anchor: 'bottom' }).setLngLat([k.lon, k.lat]).addTo(map.current)
    })
  }, [JSON.stringify(markers)])

  // 내 위치 (파란 점)
  useEffect(() => {
    if (!me) { meMarker.current?.remove(); meMarker.current = null; return }
    if (!meMarker.current) meMarker.current = new maplibregl.Marker({ element: el('<span></span>', 'me-dot') }).setLngLat([me.lon, me.lat]).addTo(map.current)
    else meMarker.current.setLngLat([me.lon, me.lat])
  }, [me?.lat, me?.lon])

  return <div ref={box} className={`map ${className}`} />
}
