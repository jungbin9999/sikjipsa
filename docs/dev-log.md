# 데일리 개발로그 — 식집사 2.0

세션마다 짧게 기록. 트러블슈팅·스펙 변경 이력도 별도 문서 없이 여기 한 항목으로 같이 기록한다.
양식은 기획서 3단계 ④ 기준. 최신 항목을 맨 위에 추가한다.

```
## YYYY-MM-DD
- 오늘 목표:
- 진행한 작업:
- 막힌 점 / 트러블슈팅:
- 스펙과 다르게 구현한 부분(있다면) + 이유:
- 내일 할 일:
```

---

## 2026-08-21

- **오늘 목표:** 구현 착수 순서 1번(프로젝트 셋업) · 2번(데이터 모델 구축)

- **진행한 작업:**
  - Next.js 16.3.1 (App Router · TypeScript) + Tailwind v4 + ESLint 셋업, `npm run build` 통과
  - 폴더 구조를 CLAUDE.md 기준으로 정리 — `/app` `/components` `/lib` `/data` `/types`, 루트에 있던 `plants.json`·`products.json`을 `/data`로, `image/*.png`를 `public/images/`로 이동
  - 보일러플레이트 정리 — 기본 SVG·Geist 폰트 제거, `layout.tsx` `lang="ko"` + 식집사 메타데이터, `page.tsx`는 파이프라인 확인용 placeholder
  - Supabase 프로젝트 생성 — `sikjipsa` / ref `ebtajqfrxfcisnhezphx` / ap-northeast-2, `lib/supabase.ts` 클라이언트 작성, 키는 `.env.local`(gitignore) + `.env.local.example` 커밋
  - GitHub private 저장소 `jungbin9999/sikjipsa` 생성·푸시, Vercel Import로 배포 파이프라인 연결 — https://sikjipsa-jungvin.vercel.app 공개 확인
  - Supabase 초기 스키마 적용(`supabase/migrations/20260821000000_init_schema.sql`) — `profiles` · `plants` · `care_logs` · `notifications` 4개 테이블, 전 테이블 RLS(본인 데이터만), 회원가입 시 `profiles` 자동 생성 트리거, `light_condition`·`status`·`care_type` CHECK 제약

- **막힌 점 / 트러블슈팅:**
  - 프로젝트 디렉터리명이 한글(`식집사`)이라 `create-next-app`이 npm 이름 제약으로 실패 → 임시 폴더에 생성 후 파일만 이동, `package.json` name은 `sikjipsa`로 지정
  - 상위 홈 디렉터리의 `package-lock.json`을 Turbopack 루트로 잡는 경고 → `next.config.ts`에 `turbopack.root` 고정
  - 배포 후 열어본 `sikjipsa.vercel.app`이 백지라 빌드 실패로 오판 → **타인이 선점한 도메인**이었음. 이 프로젝트 URL은 `-jungvin`이 붙는 쪽(`sikjipsa-jungvin.vercel.app`). 판별 근거는 `-jungvin` 계열 3개만 Vercel SSO로 302 리다이렉트된 점
  - Vercel Authentication(Standard Protection)이 기본 on이라 로그인해야만 접속 가능 → Settings > Deployment Protection에서 Require Log In 해제(포트폴리오용이라 공개 필요)
  - `supabase db push`가 `Access token not provided`로 실패 → CLI가 macOS 키체인의 토큰을 읽으려 할 때 뜬 권한 요청을 거부해서 발생. 허용 후 정상 적용

- **스펙과 다르게 구현한 부분 + 이유:**
  - `products` 테이블 미생성 — 구현 착수 순서 2번은 "제품 포함 5개 테이블", CLAUDE.md 기술스택 표는 "제품 카탈로그 = 코드 내 JSON(DB 테이블 아님)"으로 충돌. 제휴사 API 연동 금지·목업 사용이 MVP 범위이므로 JSON 단일 소스로 결정(사용자 확정). 실제 생성은 4개
  - 날씨 데이터 테이블 생략 — 구현 착수 순서 2번에 명시된 대로(조회성 데이터)
  - `profiles`에 `login_account` 필드 없음 — `auth.users.email`이 이미 보유, 중복 저장 회피
  - 회원가입 트리거(`handle_new_user`)는 데이터정의서에 없는 추가 요소 — CLAUDE.md가 요구하는 `auth.users` ↔ `profiles` 1:1 연결을 보장하기 위한 구현 수단

- **내일 할 일:**
  - 3번 정적 데이터 — `/data/plants.json`(24종) 필드·이미지 URL 검수, `/data/products.json` 10~20개 검수
  - 4번 인증 — SC-01 이메일 회원가입·로그인(Supabase Auth) 구현
  - OpenWeatherMap 무료 키 발급 후 `.env.local`의 `OPENWEATHER_API_KEY` 채우기(6번 날씨 연동 전까지)
