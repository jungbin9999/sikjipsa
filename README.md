# 식집사 2.0

날씨를 아는 AI 식물집사 — 초보 식집사를 위한 물주기·분갈이·화분위치 케어 앱

기획부터 구현까지 직접 진행한 **포트폴리오용 MVP 프로토타입**입니다. 실제 서비스 출시본이 아닙니다.

- 배포: **https://sikjipsa-one.vercel.app** — 로그인 화면의 **"데모 계정으로 바로 보기"** 버튼으로 가입 없이 둘러볼 수 있습니다(식물 9개가 등록된 상태)
  - 같은 배포를 가리키는 다른 주소: `sikjipsa-git-main-jungvin.vercel.app`(브랜치 별칭)
- **한 장 요약** — `식집사 업그레이드 프로젝트.md`의 **5단계 ③ 프로젝트 요약 원페이저**부터 보시면 빠릅니다
- 기획 문서: `식집사 업그레이드 프로젝트.md` (리서치·전략·화면설계·데이터모델·정책·회고 전 단계)
- 진행 상태·결정 로그: `spec.md` / 개발 일지: `docs/dev-log.md`

## 핵심 기능

- **날씨를 반영한 물주기 계산** — 종별 기본 간격에 계절 배율(봄1.0·여름0.8·가을1.0·겨울1.6)을 곱하고 폭염(-1일)·한파(+2일)·장마(+2일) 보정을 더한다. 서버 스케줄러 없이 화면 진입 시 on-demand로 재계산
- **분갈이 권장 시기** — 생장 속도별 기본 주기 + 화분 크기 보정, 휴면기에 걸리면 다음 생장기(3월)로 이동
- 식물 등록 → 케어 일정 자동 생성 → 오늘의 할일 완료 체크 → 이력 조회까지 한 바퀴

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프론트엔드 | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 |
| 백엔드 · DB · 인증 | Supabase (PostgreSQL + Auth, 이메일 로그인) |
| 날씨 | OpenWeatherMap Current Weather (무료 티어) |
| 배포 | Vercel |

전 구간 무료 티어로 운영합니다.

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local   # 키 채우기
npm run dev                        # http://localhost:3000
```

`.env.local`에 필요한 값:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENWEATHER_API_KEY                # 없어도 앱은 동작(날씨 배너만 폴백 문구)
```

DB 스키마는 `supabase/migrations/`에 있습니다. `supabase link` 후 `supabase db push`로 적용합니다.

## 화면

화면 ID(SC-01~SC-12)를 라우트에 그대로 사용합니다.

| 화면 | 라우트 | 상태 |
|---|---|---|
| SC-01 회원가입·로그인 | `/sc01` | ✅ |
| SC-02 온보딩 | `/sc02` | ✅ |
| SC-03 오늘의 케어 요약 | `/sc03` | ✅ |
| SC-04 빈 상태 | `/sc04` | ✅ |
| SC-05 월간 캘린더 | `/sc05` | ✅ |
| SC-06 식물 리스트 | `/sc06` | ✅ |
| SC-07 식물 상세 | `/sc07` | ✅ 물주기·분갈이·배치 위치 3개 탭 |
| SC-08 식물 등록 | `/sc08` | ✅ |
| SC-09 제품 리스트 | `/sc09` | ✅ |
| SC-10 제품 상세 | `/sc10` | ✅ |
| SC-11 마이페이지 | `/sc11` | ✅ |
| SC-12 계정 관리 | `/sc12` | ✅ |

## 날씨 예외 시연

실제 날씨로는 원하는 예외를 재현할 수 없어 강제 스위치를 뒀습니다. 파라미터가 없으면 항상 실제 API를 호출합니다.

```
/sc03?weather=폭염    /sc03?weather=한파    /sc03?weather=장마
```

## 폴더 구조

```
app/            화면(sc01~sc12) · api/weather(키를 서버에만 두기 위한 라우트) · 파비콘/OG 이미지
components/     PhoneFrame(데스크톱 폰 프레임) · TabBar · CareRing · SpeciesCombobox
lib/            care-calc(계산) · care-service(조회·완료 처리) · care-report(집계) · weather · supabase · plants · demo(데모 계정)
data/           plants.json(29종) · products.json(16개) — DB가 아닌 정적 데이터
types/          데이터정의서 기준 엔티티 타입
supabase/       마이그레이션
design-refs/    디자인 참고 이미지·팔레트
docs/           개발 일지
```
