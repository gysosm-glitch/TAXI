// 브라우저 저장소는 로그인 상태·동의·동승 기준 같은 개인 편의용으로만 사용 (사생활 모드에서 실패해도 앱은 동작)
const KEYS = ['user_v1', 'consent_v1', 'blocked_v1', 'prefs_v1', 'history_v1']

export const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* 저장 불가 환경 */ }
  },
  clear() {
    try { KEYS.forEach((k) => localStorage.removeItem(k)) } catch { /* 저장 불가 환경 */ }
  },
}

export const DEFAULT_PREFS = { sameGender: true, verifiedOnly: true, minRating: 4.5, maxParty: 3, maxWaitMin: 10, gender: 'F' }
