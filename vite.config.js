import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 개발 서버에는 Vercel 함수가 없으므로 실시간 버스·열차는 배포 서버에서 받아 온다
  server: { proxy: { '/api': { target: 'https://taxi-woad-seven.vercel.app', changeOrigin: true } } },
})
