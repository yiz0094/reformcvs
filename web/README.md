# 리폼 편의점 웹앱 · 프론트엔드 시안

백엔드 없이 동작하는 고객 앱과 운영 콘솔 시안입니다. 화면 흐름과 기능 ID는 Claude Docs의 「리폼 편의점 웹앱 개발 기획안」을 따릅니다.

## 실행

```bash
npm install
npm run dev
```

- 고객 앱: http://localhost:3000
- 운영 콘솔: http://localhost:3000/admin

노트북에서는 화면 가운데 휴대폰 크기로 보입니다.

휴대폰으로 시연하려면 개발 서버 대신 운영 모드로 띄웁니다. 개발 서버는 보안 때문에 다른 기기의 접속을 막습니다.

```bash
npm run build
npm run start
```

그다음 같은 와이파이에 연결한 휴대폰에서 `http://<이 컴퓨터의 IP>:3000`으로 접속합니다.

## 화면

| 경로 | 화면 | 기획안 기능 |
| --- | --- | --- |
| `/` | 랜딩 (원본·시안 비교) | C-01 |
| `/capture` | 촬영·업로드, 기기 내 품질 검사, 샘플 옷 | C-04, C-05, C-06 |
| `/g/[garmentId]` | AI 인식 확인·수정 | C-07 |
| `/g/[garmentId]/designs` | 디자인 추천과 불가 사유 | C-08 |
| `/m/[sessionId]` | 시안 만들기: 위치·크기·색, 끌어서 옮기기, 원본 비교, 크게 보기, AI 후보, 저장 | C-09–C-13, C-23 |
| `/checkout/[quoteId]` | 견적·로그인·동의·결제 | C-03, C-14, C-15 |
| `/orders/[orderId]` | 발송 등록, 진행 추적, 확정 시안 승인, 평가 | C-16–C-19, C-24 |
| `/admin` | 운영 콘솔 주문 보드와 작업지시서 | A-02–A-09 일부 |

## 실제로 동작하는 것과 흉내만 내는 것

**실제로 동작:** 사진 줄이기와 EXIF 제거, 밝기·흔들림·옷 크기 검사, 사진의 대표 색 계산, 디자인 적용 조건 판정, 오버레이 합성(위치·크기·색·이니셜), 원본 비교, 시안 이미지 저장(‘AI 예시’ 표시 포함), 가격 계산, 주문 상태 흐름, 고객 화면과 운영 콘솔 탭 사이 동기화.

**흉내만 냄:** 옷 종류 인식, AI 정밀 시안(화면 합성 효과로 대신 보여 줌), 카카오 로그인, 토스 결제, 알림톡, 배송 조회. 화면에 `데모` 표시가 붙은 곳이 여기에 해당합니다.

가격, 작업실 주소, 주문 번호, 콘솔 지표 숫자는 모두 예시입니다.

## 백엔드를 붙일 자리

| 파일 | 지금 | 백엔드 연결 후 |
| --- | --- | --- |
| `src/lib/store.ts` | 브라우저 localStorage에 저장 | `dispatch` 자리를 API 호출로 바꾼다 (`/api/garments`, `/api/mockups`, `/api/orders` 등) |
| `src/lib/image.ts` | 기기 내 품질 검사·축소 | 그대로 쓰고, 업로드는 서명 URL로 R2에 올린다 |
| `src/screens/garment.tsx` | 인식 진행을 연출 | `analyzeGarment` 결과를 받아 표시한다 |
| `src/screens/mockup.tsx`의 `generate` | 화면 합성으로 후보 3장 | `POST /api/mockups` 후 Realtime으로 후보를 받는다 |
| `src/screens/checkout.tsx` | 카카오·토스 자리만 있음 | Supabase Auth 카카오 로그인, 토스 결제위젯과 승인 API |
| `src/lib/designs.ts` | 디자인 카드 6종을 코드에 둠 | `design_versions` 테이블에서 읽는다 |
| `src/lib/demo-orders.ts` | 콘솔 예시 주문 | 삭제하고 `/api/admin/orders`를 쓴다 |

## 구조

```text
src/app/          경로(페이지). 동적 경로는 Suspense로 감싼다 (Cache Components 규칙)
src/screens/      화면 컴포넌트
src/components/   공통 UI, 휴대폰 프레임, 시안 무대(합성·비교·드래그)
src/lib/          타입, 디자인 카드, 샘플 옷, 이미지 처리, 합성, 저장소
public/samples/   샘플 옷 그림 (데님 자켓, 화이트 티셔츠, 그레이 후드티)
```

## 참고

- Next.js 16.4.2 (App Router, Cache Components), React 19, Tailwind CSS 4, lucide-react.
- 체험 기록은 이 브라우저의 localStorage에만 남습니다. 랜딩 맨 아래 ‘체험 기록 지우기’로 초기화합니다.
- 글꼴은 Pretendard를 CDN에서 불러오고, 인터넷이 없으면 기기 기본 글꼴로 보입니다.
