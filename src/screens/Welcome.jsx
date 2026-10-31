import Login from './Login.jsx'
import { CityScene } from '../components/Illust.jsx'

// 첫 화면: 로그인·회원가입
export default function Welcome({ onBrowse }) {
  return (
    <div className="welcome">
      <div className="welcome-top">
        <div className="logo">같이타</div>
        <h1>같은 방향이면,<br />택시도 같이 타요</h1>
        <p>오송·오창 할증 구간 요금, 함께 타면 n분의 1</p>
        <div className="scene"><CityScene /></div>
      </div>
      <div className="welcome-body">
        <Login />
        <button className="more" style={{ width: '100%' }} onClick={onBrowse}>로그인 없이 둘러보기</button>
      </div>
    </div>
  )
}
