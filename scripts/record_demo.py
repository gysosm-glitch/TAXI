"""쉐어택 시연 영상: 장면별 음성(edge-tts, 1.2배) + Playwright 화면 녹화 → mp4.
사용: python record.py <작업 폴더> <ffmpeg 경로> <출력 mp4>
개발 서버(http://localhost:5173)가 켜져 있어야 한다.
"""
import asyncio, json, os, re, subprocess, sys, time
import edge_tts
from playwright.async_api import async_playwright

WORK, FF, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(WORK, exist_ok=True)
APP = "http://localhost:5173"
VOICE, RATE = "ko-KR-SunHiNeural", "+20%"   # 말 속도 1.2배
FOOT = "모집·동승자·송금은 가상 상황이고, 시각과 열차·버스 정보는 실제입니다"

SCENES = [
  dict(id="login", label="로그인", title="시연 계정으로<br>바로 시작", sub="로그인 화면에 시연 계정이 채워져 있습니다",
       say="쉐어택은 청주의 복합할증 구간에서 같은 방향 손님끼리 택시를 같이 타고, 돌아가는 빈 차까지 줄이는 서비스입니다. 시연 계정으로 바로 시작합니다."),
  dict(id="compare", label="요금 비교", title="혼자 15,745원<br>둘이면 7,900원", sub="오송역 → 터미널 12.1km · 할증 구간 35%",
       say="첫 화면에서 할증이 얼마나 줄어드는지 바로 보입니다. 오송역에서 터미널까지 혼자 타면 1만 5천 745원, 두 명이 같이 타면 1인 7천 900원입니다."),
  dict(id="board", label="모집 칸", title="경로·시간·요금을<br>보고 고릅니다", sub="가상 모집 10건 · 시각은 현재 기준",
       say="모집 칸에는 경로별로 출발 시각, 인원, 1인 요금, 조건이 보입니다. 오송역 모집은 실제 KTX 도착 시각에 맞춰 열립니다."),
  dict(id="join", label="참여", title="조건을 확인하고<br>탑승합니다", sub="같은 성별끼리 · 2~4명 · 출발지 걸어서 15분",
       say="마음에 드는 칸에서 참여를 누르면, 조건과 1인 금액을 확인하고 탑승합니다."),
  dict(id="chat", label="대화", title="번호 없이<br>약속합니다", sub="빠른 답장으로 만날 곳 약속",
       say="휴대폰 번호를 주고받지 않고, 앱 대화로 만날 곳을 약속합니다. 시연에서는 동승자가 몇 초 만에 모이도록 줄였습니다."),
  dict(id="precheck", label="탑승 전 확인 · 새 기능", title="안전·법적 확인 후<br>탑승합니다", sub="택시발전법 시행규칙 제11조의2 (2022.6 시행)",
       say="인원이 모이면 탑승 전 확인이 나옵니다. 같은 성별과 번호 비공개는 앱이 자동으로 확인하고, 만날 곳과 좌석, 본인 계정, 탑승 정보 안내, 동성 동승 기준은 직접 체크합니다. "
           "2022년 시행된 택시 동승 규칙의 조건을 그대로 담아, 우버나 타다처럼 법 문제로 서비스가 멈추는 일이 없도록 처음부터 설계했습니다."),
  dict(id="pay", label="송금", title="택시 호출 전에<br>1인 금액 송금", sub="앱은 돈을 보관하지 않습니다",
       say="모두 확인하면 택시를 부르기 전에 1인 금액을 방장에게 보냅니다. 앱은 돈을 보관하지 않고, 정식 운영 때는 호출 플랫폼의 분할 결제를 씁니다."),
  dict(id="arrive", label="도착", title="아낀 돈을<br>기록합니다", sub="내 정보에서 모아 보기",
       say="방장이 택시를 부르면 함께 타고, 내린 뒤 도착을 누르면 아낀 금액이 기록됩니다."),
  dict(id="transit", label="교통 정보", title="실제 열차·버스<br>실시간", sub="TAGO 공공데이터 · 출처와 확인 시각 표시",
       say="교통 탭에서는 오송역에 도착하는 KTX와 근처 시내버스를 실시간으로 보여 줍니다. 열차 도착에 맞춰 모집하고, 막차가 끊긴 뒤에는 택시 동승으로 이어집니다."),
  dict(id="driver", label="다음 단계 · 귀로 체험", title="빈 차 대신<br>귀로 손님", sub="호출 플랫폼 제휴 이후를 가정한 가상 체험",
       say="기사 탭은 다음 단계인 귀로 매칭의 가상 체험입니다. 오송역에서 손님을 내린 기사가 시내로 가는 손님을 태우면, 빈 차로 돌아오는 대신 수입이 생깁니다. 시뮬레이션에서 참여 기사는 하루 약 5천 7백 원을 더 법니다."),
  dict(id="end", label="마무리", title="빈 차 귀로를 채우면,<br>할증의 이유가 사라진다", sub="taxi-woad-seven.vercel.app",
       say="내 정보에서는 그동안 아낀 돈을 모아 봅니다. 빈 차 귀로를 채우면, 할증의 이유가 사라집니다. 쉐어택이었습니다."),
]

WRAP = """<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;width:1280px;height:720px;background:#fff;font-family:'Pretendard','Noto Sans KR',sans-serif;overflow:hidden}
#app{position:absolute;left:90px;top:0;width:420px;height:720px;border:0;box-shadow:0 0 0 1px #ececf0}
#cap{position:absolute;left:600px;top:250px;width:620px}
#label{color:#1d9e75;font-weight:700;font-size:17px;margin-bottom:14px}
#title{color:#1c1c1e;font-weight:800;font-size:40px;line-height:1.3;letter-spacing:-1px}
#sub{color:#636366;font-size:19px;margin-top:18px}
#foot{position:absolute;left:600px;bottom:26px;color:#a1a1a6;font-size:14px}
</style></head><body><iframe id="app" src="/"></iframe>
<div id="cap"><div id="label"></div><div id="title"></div><div id="sub"></div></div><div id="foot">FOOT</div></body></html>""".replace("FOOT", FOOT)


def dur(path):
    out = subprocess.run([FF, "-hide_banner", "-i", path], capture_output=True, text=True).stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


async def tts():
    for sc in SCENES:
        p = os.path.join(WORK, f"{sc['id']}.mp3")
        await edge_tts.Communicate(sc["say"], VOICE, rate=RATE).save(p)
        sc["audio"], sc["dur"] = p, dur(p)
        print(f"tts {sc['id']}: {sc['dur']:.1f}s")


async def main():
    await tts()
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1280, "height": 720}, record_video_dir=WORK, record_video_size={"width": 1280, "height": 720}, locale="ko-KR", timezone_id="Asia/Seoul")
        page = await ctx.new_page()
        t0 = time.monotonic()
        await page.route("**/__rec.html", lambda r: r.fulfill(body=WRAP, content_type="text/html; charset=utf-8"))
        await page.goto(APP + "/__rec.html")
        f = page.frame_locator("#app")
        S = {s["id"]: s for s in SCENES}

        async def show(sc):
            await page.evaluate("([l,t,s])=>{label.textContent=l;title.innerHTML=t;sub.textContent=s}", [sc["label"], sc["title"], sc["sub"]])
            sc["t"] = time.monotonic() - t0

        async def hold(sc, extra=0.6):
            left = sc["t"] + sc["dur"] + extra - (time.monotonic() - t0)
            if left > 0: await asyncio.sleep(left)

        async def scroll(y):
            await page.mouse.move(300, 400)
            await page.mouse.wheel(0, y)

        # 1 로그인
        await f.get_by_role("button", name="로그인", exact=True).wait_for()
        await show(S["login"]); await asyncio.sleep(3.5)
        await f.get_by_role("button", name="로그인", exact=True).click()
        await hold(S["login"])
        # 2 요금 비교
        await f.get_by_text("복합할증 35%").first.wait_for()
        await show(S["compare"]); await hold(S["compare"])
        # 3 모집 칸
        await show(S["board"]); await asyncio.sleep(1.2); await scroll(380); await hold(S["board"])
        # 4 참여 → 탑승
        await show(S["join"]); await asyncio.sleep(1.0)
        await f.get_by_role("button", name="참여").first.click(); await asyncio.sleep(2.2)
        await f.get_by_role("button", name="탑승", exact=True).click()
        await hold(S["join"])
        # 5 대화
        box = f.locator(".card.mine").get_by_placeholder("메시지 입력")
        await box.scroll_into_view_if_needed()
        await show(S["chat"]); await asyncio.sleep(1.5)
        await f.locator(".card.mine").get_by_role("button", name="승차장 앞이에요").click()
        await asyncio.sleep(0.5); await box.scroll_into_view_if_needed()
        await hold(S["chat"])
        # 6 탑승 전 확인
        pc = f.locator(".precheck")
        await pc.wait_for(timeout=40000)
        await pc.scroll_into_view_if_needed()
        await show(S["precheck"]); await asyncio.sleep(3.0)
        while await pc.locator("input[type=checkbox]:not(:checked)").count():
            await pc.locator("input[type=checkbox]:not(:checked)").first.click(); await asyncio.sleep(1.3)
        await hold(S["precheck"], 0.3)
        # 7 송금
        await show(S["pay"]); await asyncio.sleep(1.2)
        await pc.get_by_role("button").click()
        await asyncio.sleep(1.0)
        await f.locator(".card.mine").scroll_into_view_if_needed()
        await hold(S["pay"])
        # 8 도착
        arrive = f.locator(".card.mine").get_by_role("button", name="도착", exact=True)
        await arrive.wait_for(timeout=30000)
        await arrive.scroll_into_view_if_needed()
        await show(S["arrive"]); await asyncio.sleep(1.5); await arrive.click()
        await asyncio.sleep(0.6)
        await f.locator(".form-msg").first.evaluate("(el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' })")
        await hold(S["arrive"], 1.2)
        # 9 교통
        await f.get_by_role("button", name="교통").last.click()
        await show(S["transit"]); await asyncio.sleep(4); await scroll(300); await hold(S["transit"])
        # 10 기사
        await f.get_by_role("button", name="기사").last.click()
        await show(S["driver"]); await asyncio.sleep(3.5)
        take = f.get_by_role("button", name="태우기")
        if await take.count(): await take.first.click()
        await asyncio.sleep(1.5); await scroll(350); await hold(S["driver"])
        # 11 마무리
        await f.get_by_role("button", name="내 정보").last.click()
        await show(S["end"]); await hold(S["end"], 1.5)
        total = time.monotonic() - t0
        vpath = await page.video.path()
        await ctx.close(); await b.close()

    json.dump({"scenes": [{k: s[k] for k in ("id", "t", "dur", "audio")} for s in SCENES], "total": total, "video": vpath}, open(os.path.join(WORK, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    # 음성 합치기: 장면 시작 시각에 각 음성을 놓는다
    ins, flt = [], []
    for i, s in enumerate(SCENES):
        ins += ["-i", s["audio"]]
        ms = int(s["t"] * 1000)
        flt.append(f"[{i + 1}:a]adelay={ms}|{ms}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(SCENES))) + f"amix=inputs={len(SCENES)}:normalize=0[aout]"
    cmd = [FF, "-y", "-hide_banner", "-loglevel", "error", "-i", vpath, *ins, "-filter_complex", ";".join(flt + [mix]),
           "-map", "0:v", "-map", "[aout]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "23", "-r", "25",
           "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-shortest", OUT]
    subprocess.run(cmd, check=True)
    print("done", OUT, f"{total:.1f}s")

asyncio.run(main())
