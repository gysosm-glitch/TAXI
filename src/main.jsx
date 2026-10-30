import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

// 휴대폰에서 '홈 화면에 추가'로 앱처럼 열 수 있도록 서비스 워커 등록
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
