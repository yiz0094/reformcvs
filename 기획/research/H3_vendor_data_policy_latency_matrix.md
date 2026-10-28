# H3. 생성·인식 API 벤더 데이터 정책·운영 조건 매트릭스 및 옷 사진의 개인정보 해당성

- 작성일: 2026-10-22 (모든 "확인일"은 별도 표기가 없으면 2026-10-22)
- 담당: 보완 리서치 H3 (A·B·C·F 보고서의 [미확인] 항목 중 벤더 DPA·보관·리전·한도·지연·국외이전 법률 요건을 확정)
- 조사 방법: 각 벤더 공식 약관·개인정보 정책·문서·상태 페이지와 법제처 국가법령정보센터 Open API(law.go.kr DRF) 원문을 직접 열람. 이번 세션은 웹 검색 쿼터가 소진되어 **검색 엔진 없이 공식 URL 직접 열람만** 수행했다. JS 렌더링 페이지(BytePlus 법무 문서 본문, 각사 Trust Center 하위처리자 목록, Artificial Analysis 생성시간 차트)는 본문 추출에 실패하여 [미확인]으로 남겼다. openai.com 정책 페이지는 403으로 차단되어 developers.openai.com 문서로 대체했다.

---

## 0. 한 줄 결론

1. **학습 사용**: 조사한 유료 API 전부(Google Gemini API 유료·Vertex AI, OpenAI API, Anthropic API, fal.ai API Services, Modal·RunPod DPA)가 "고객 입력을 자사 모델 학습에 쓰지 않는다"를 약관으로 명시했다. **Gemini API 무료 티어만 학습·사람 검토 대상**이므로 운영 라우팅에서 제외해야 한다. BytePlus ModelArk는 Trust Center의 일반 진술("고객 데이터 격리·명시적 허가 없이 접근 안 함")만 확인되고 **학습 사용 여부 조항 원문은 [미확인]**이다.
2. **보관 기간**: 남용 모니터링 로그가 핵심 변수다. Gemini API 55일, OpenAI 30일(ZDR 승인 시 제외), Anthropic 30일 이내 삭제(ZDR 가능·단 Fable/Mythos 계열은 30일 보관 강제), fal 요청 I/O 90일(헤더로 비활성화 가능·ZDR은 영업 협의), Vertex AI는 비-프론티어 Google 모델은 분류기 플래그 시에만 최대 90일·Master Agreement 고객 기본 면제, Modal 함수 입출력 최대 7일.
3. **리전**: **한국(서울) 리전에서 ML 처리까지 보장하는 이미지 생성 API는 현재 Vertex AI의 일부 모델뿐**이며 그것도 모델별로 다르다(Nano Banana 2.1은 Vertex 모델 페이지상 `global` 전용, Nano Banana 2 `gemini-3.1-flash-image`는 데이터 레지던시 표에 수록). OpenAI는 한국을 "저장만 가능, 처리는 불가" 리전으로 명시. Anthropic 1st-party API는 `us`/`global`만. Modal은 `jp`·`ap-northeast`까지(한국 없음), RunPod는 AP-JP-1·AP-IN-1(한국 없음). 따라서 **고객 사진의 국외 이전은 설계상 불가피**하고, 법적으로는 개인정보 보호법 제28조의8 제1항 제3호(계약 이행을 위한 국외 처리위탁·보관 → 처리방침 공개 또는 서면등 통지)로 **별도 동의 없이도 적법하게 처리 가능**하다(단, 제4항·시행령 제29조의10 보호조치 필수).
4. **지연**: Artificial Analysis의 모델별 생성시간 중앙값·p95는 차트 데이터가 추출되지 않아 **[미확인]**. 공식 문서 기준 확정 가능한 것은 OpenAI "복잡한 프롬프트는 최대 2분", Gemini 3 계열 "thinking 비활성화 불가(interim 이미지 최대 2장 생성)"뿐. 그래서 지연 목표는 **PoC 실측을 전제로 "첫 장 p50 ≤ 25초 / p90 ≤ 45초 / p95 ≤ 60초, 하드 타임아웃 75초"** 하나로 통일할 것을 제안한다(A·E·F의 30/45/90초 혼재를 정리).
5. **라우팅 제외 권고**: (a) Gemini API 무료 티어, (b) BytePlus ModelArk 직접 호출 및 fal 경유 Seedream(제3자 전달 조항) — DPA·AUP 원문 확인 전까지, (c) OpenAI gpt-image-2.5 xhigh/max 품질 — 동기(첫 장) 경로에서 제외하고 비동기 고화질 경로로만, (d) RunPod Community Cloud, (e) Anthropic Fable/Mythos 계열(ZDR 불가) — 인식 폴백은 Haiku 5.5/Sonnet 5.5로.

---

## 1. 벤더 × 데이터 정책 매트릭스 (a-1)

범례: ◎ 확인(원문 인용 가능) / ○ 확인(요약) / △ 부분 확인 / ✕ 해당 없음 / [미확인] 원문 열람 실패

### 1.1 학습 사용 · 보관 · 삭제/ZDR

| 벤더 | 입력 이미지 학습 사용 | 보관(남용 모니터링 등) | 삭제·ZDR 옵션 | 출처(확인일 2026-10-22) |
|---|---|---|---|---|
| **Google Gemini API (유료)** | ◎ 안 함. "Google doesn't use your prompts or responses to improve our products"(Paid Services). 무료는 **학습·사람 검토 함** | ◎ 유료도 "logs prompts and responses for a limited period of time" (약관) → 사용 정책 페이지에 **55일** 명시, 정책집행 모델 외 학습 금지 | △ ZDR 공식 옵션 없음(약관상 55일 로그는 비활성화 불가). 삭제는 DPA 종료 절차 | 약관 https://ai.google.dev/gemini-api/terms (effective 2026-03-23, updated 2026-04-28) ; 사용정책 https://ai.google.dev/gemini-api/docs/usage-policies (updated 2026-06-09) ; 가격표의 "Used to improve products: Paid No / Free Yes" https://ai.google.dev/gemini-api/docs/pricing |
| **Google Vertex AI (Gemini 이미지 모델)** | ◎ "won't use your data to train or fine-tune any AI/ML models without your prior permission or instruction" | ◎ 비-프론티어 Google 모델: 분류기 플래그 시에만 프롬프트 로그, **최대 90일**, Google Cloud Master Agreement 고객은 **기본 면제**. 프론티어 모델(Gemini 4 Argon Cyber Permissive 등): 프롬프트·응답 최대 30일. 암시적 캐시 ≤24시간, 요청-응답 로깅 기본 OFF | ◎ 요청-응답 로깅 OFF 유지 + `disableCache: true`(또는 `retentionType=EPHEMERAL`)로 ZDR 구성 가능. CDPA 종료 시 삭제 최대 180일(복구기간 30일 포함) | 데이터 거버넌스 https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance (updated 2026-10-21) ; 남용 모니터링 https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/abuse-monitoring (updated 2026-10-21) ; Cloud DPA https://cloud.google.com/terms/data-processing-addendum (last modified 2026-06-08) |
| **OpenAI Images API (gpt-image-2.5)** | ◎ 기본 미학습. "data sent to the OpenAI API is not used to train or improve OpenAI models" (opt-in 제외) | ◎ 남용 모니터링 로그 **최대 30일** 기본. `/v1/images/generations`·`/v1/images/edits` 모두 "30 days" | ◎ **ZDR 가능(승인제)**: "Image generation is Zero Data Retention compatible when using" gpt-image-2.5 sunburst/flare, gpt-image-2, 1.5, 1, 1-mini. Modified Abuse Monitoring도 승인제. 예외: CSAM 분류기 탐지 시 수동검토용 보관 | https://developers.openai.com/api/docs/guides/your-data (페이지 내 갱신일 없음) |
| **BytePlus ModelArk (Seedream 5.0 Pro)** | **[미확인]** Privacy Policy(2026-06-08)·General Terms for AI Services(2026-08-28)·GenAI AUP(2026-08-31) 본문이 JS 렌더링으로 추출 실패. Trust Center: "does not access your customers' data without explicit permission", "Each customer's data is isolated" | **[미확인]** Trust Center: 보관·삭제는 "customer's instructions and BytePlus policies"에 따름(기간 미기재) | **[미확인]** DPA 문서 존재(2026-05-15 갱신)만 확인 | https://www.byteplus.com/en/trust-center ; https://docs.byteplus.com/en/legal/docs/privacy-policy ; https://docs.byteplus.com/en/docs/legal/data-processing-addendum |
| **fal.ai** | ◎ API Services 보충약관: "Company will not use Client Content to create, train, develop (directly or indirectly) Company's products or services" — 단 **Excluded Models("Pending Enterprise Ready" 표시 API)는 제외**, 보안·DPA 의무도 미적용. ToS §6(c): Customer Input에서 파생된 **Usage Data**는 제품·AI 모델 개발에 사용 가능(개인정보 비식별 전제로 해석 필요) | ◎ 요청 입력·출력은 대시보드 이력용으로 **기본 90일** 보관. CDN 파일은 `X-Fal-Object-Lifecycle-Preference`로 만료 지정 | ◎ `X-Fal-Store-IO: 0` 헤더로 페이로드 저장 비활성화(계정 기본값 변경 가능). **ZDR은 영업팀 협의**로 추론 워크로드에 제공, 모델 배포자의 자체 로깅은 미보장. Delete Request Payloads API 제공(입력 CDN 파일은 별도 삭제) | API Services https://fal.ai/legal/api-services ; ToS https://fal.ai/legal/terms-of-service (2026-09-08) ; Privacy https://fal.ai/legal/privacy-policy (2026-07-22) ; Storage https://fal.ai/docs/model-apis/storage |
| **Anthropic API (인식 폴백)** | ◎ Commercial Terms §B: "Anthropic may not train models on Customer Content from Services". Vision 문서: 업로드 이미지는 요청 처리 후 자동 삭제, 학습 미사용 | ◎ 입력·출력 **30일 이내 삭제**(수신·생성 기준). T&S 플래그 시 최대 2년, 분류 점수 최대 7년 | ◎ **ZDR 가능(영업 협의, 조직 단위)**. 단 **Covered Models(Fable 5.1/5, Mythos 5.1/5)는 30일 보관 강제·ZDR 불가**. Files API·Batch는 ZDR 비대상. DPA: 종료 후 30일 내 삭제 | Commercial Terms https://www.anthropic.com/legal/commercial-terms (effective 2025-06-17) ; 보관 https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-personal-data ; ZDR 범위 https://platform.claude.com/docs/en/manage-claude/api-and-data-retention ; DPA https://www.anthropic.com/legal/data-processing-addendum (effective 2025-02-24) ; Vision https://platform.claude.com/docs/en/build-with-claude/vision |
| **Modal (서버리스 GPU)** | ○ DPA §10 목적 제한("will not Process Customer Personal Data for any purpose other than…"), 학습 조항 자체는 없음 | ◎ 함수 입력·출력 **최대 7일** 후 삭제. Dedicated/Shared Endpoint·Server 페이로드는 "never written to disk"(ZDR). 로그(stdout/stderr)·볼륨·이미지·스냅샷은 **미국 저장** | ◎ DPA §24 종료 시 전부 삭제. 엔드포인트 ZDR 기본 | Security https://modal.com/docs/guide/security ; DPA https://modal.com/legal/dpa (effective 2025-10-31) ; Data residency https://modal.com/docs/guide/data-residency ; Privacy(웹사이트용, 2023-05-17) https://modal.com/legal/privacy-policy |
| **RunPod (서버리스 GPU)** | ○ DPA §3 "neither Runpod nor its Sub-Processors shall process Customer Personal Data for their own purposes"; ToS는 **집계·익명화된 Your Content를 서비스 개선에 사용**하는 라이선스 포함 | △ 기간 미기재. ToS: 고객이 백업·암호화 책임. Performance Data(로그·텔레메트리)는 Customer Personal Data 아님 | ○ DPA §12 요청 시 삭제/반환. 포드 종료 후 삭제 조항 없음 | DPA https://www.runpod.io/legal/data-processing-agreement ; ToS https://www.runpod.io/legal/terms-of-service (2026-03-24) ; Privacy https://www.runpod.io/legal/privacy-policy (2025-08-07, 사업고객 데이터 제외) |

### 1.2 리전 · DPA · 하위처리자

| 벤더 | 처리 리전(한국/아시아 선택) | DPA 체결 | 하위처리자 목록 | 국외이전 메커니즘(벤더 측) |
|---|---|---|---|---|
| **Gemini API** | ✕ 리전 선택 없음. "This data may be stored transiently or cached in any country in which Google or its agents maintain facilities" | ◎ 유료 서비스는 "Data Processing Addendum for Products Where Google is a Data Processor"(Version 10, 2026-05-07) 자동 적용, 그 외는 Controller-Controller Terms | ○ https://business.safety.google/subprocessors/ (목록 본문 [미확인]) | SCCs(C2P·P2P), Data Privacy Framework 인증. **한국·APEC CBPR 언급 없음** |
| **Vertex AI** | △ Locations 페이지는 Asia Pacific(서울 asia-northeast3 포함) 그룹에 `gemini-nano-banana-2.1`, `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`, `gemini-3-pro-image`, `gemini-2.5-flash-image`, `virtual-try-on-001`을 나열. **그러나 Nano Banana 2.1 모델 페이지는 model availability·PT·PayGo 모두 `global`만 표기**, Data residency 페이지의 아시아 ML 처리 표에는 이미지 모델 중 `gemini-3.1-flash-image`·`gemini-2.5-flash-image`만 수록(셀 값 추출 실패). "Requests submitted to a global endpoint may be processed in any Google Cloud location… don't provide any data residency guarantees" → **서울 리전 ML 처리 보장은 모델별로 확인 필요 [확인 필요]** | ◎ Cloud Data Processing Addendum(last modified 2026-06-08): Google = processor | ○ https://cloud.google.com/terms/subprocessors (JS, 본문 [미확인]) | SCCs(EU), BR SCCs, Turkish SCCs, Alternative Transfer Solution. Appendix 3 특정법: EU/UK/스위스·CCPA·터키·이스라엘·브라질. **한국 없음** |
| **OpenAI** | △ 리전 데이터 레지던시: US(저장+처리), EU(저장+처리, ZDR/MAM 등 필요), UAE(승인). **일본·한국·싱가포르·인도는 "regional storage only, no regional processing"**, MAM 또는 ZDR + Modified Retention amendment 필요 | [미확인] openai.com/policies/data-processing-addendum 403 차단. your-data 문서는 DPA 언급 없음 | [미확인] openai.com/policies/subprocessor-list 403 | [미확인] |
| **BytePlus ModelArk** | △ Trust Center "customers can select the geological region of service"(리전명 미기재). Region availability 문서(2026-09-28 갱신) 본문 [미확인] | △ DPA 존재(2026-05-15 갱신), 본문 [미확인] | △ Sub-processor List 존재(2026-09-24 갱신), 본문 [미확인] | △ Trust Center: **APEC CBPR·PRP 인증** 보유 명시(제28조의8 제1항 제4호 "보호위원회 고시 인증" 해당 여부는 [미확인]) |
| **fal.ai** | ✕ "process and store personal information on servers located in the United States and other countries". 리전 선택 없음. 제3자 모델 사용 시 "Client Content will be transferred to such a third party"(Seedream=ByteDance, GPT Image=OpenAI, Nano Banana=Google) | ◎ DPA(2026-07-31): fal = processor, CCPA service provider | ○ https://trust.fal.ai/subprocessors (JS, 본문 [미확인]). 추가 시 15일 전 통지·10일 내 이의 | SCCs Module 2, UK IDTA, DPF 전환 가능. 한국 언급 없음 |
| **Anthropic** | △ 1st-party: `inference_geo` = `"global"`(기본) 또는 `"us"`(1.1배 가격), workspace geo는 `"us"`만. **아시아 없음.** Vertex AI 경유 시 Claude 모델이 Asia Pacific 리전 그룹에 나열. Bedrock 경유 시 서울(ap-northeast-2): Sonnet 5.5/Haiku 5.5/Opus 5.5는 Global 프로파일만, Opus 5·Sonnet 5는 서울 in-region 지원 | ◎ DPA(effective 2025-02-24) 약관에 포함 | ○ https://trust.anthropic.com/subprocessors (JS, 본문 [미확인]) | SCCs Module 2/3, UK·스위스 부록. 한국 없음 |
| **Modal** | △ 컨테이너 리전: `us`/`eu`/`ap` + `ap-northeast`·`ap-southeast`·`ap-south`·`jp`·`au` 등. **한국 없음.** 리전 지정 시 1.15~1.75배. 로그·볼륨·대용량 페이로드는 미국 저장 | ◎ DPA(2025-10-31) | ○ https://trust.modal.com/subprocessors (JS, [미확인]) | SCCs, UK IDTA, 스위스 |
| **RunPod** | △ 상태 페이지 기준 리전: AP-IN-1, AP-JP-1, OC-AU-1, EU-*, EUR-IS/NO-*, US-*, CA-MTL-*. **한국·싱가포르 없음.** 서버리스는 "allow all data centers" 권장(제한 시 GPU 풀 축소) | ◎ DPA: RunPod = processor | ◎ DPA Attachment 2에 14개: AWS, Google Workspace, Google Cloud, HubSpot, Stripe, BetterStack, Cloudflare, PlanetScale, Docker, Datadog, Clerk, Tinybird, DigitalOcean, Snowflake | SCCs Module Two, UK 부록, 스위스, 브라질 SCCs |

### 1.3 콘텐츠 정책 — 상표·브랜드 로고·의류 관련

| 벤더 | 확인된 조항 | 의류 리폼 시안에 대한 함의 |
|---|---|---|
| Google (Generative AI Prohibited Use Policy, 2024-12-17) | "Violates the rights of others, including privacy and intellectual property rights"; 사칭·출처 오인 금지. **상표·로고·의류 특정 조항 없음** | 고객 소유 의류의 브랜드 로고가 입력에 포함되는 것 자체는 금지 아님. 로고를 **새로 합성·복제**하는 프롬프트는 피하고 "기존 로고 보존"만 지시 |
| Google Vertex 이미지 생성 제한 문서(2026-10-21) | 입력 이미지 최대 14장(Gemini 3 Pro Image)/3장(2.5 Flash Image); 안전하지 않은 프롬프트는 FinishReason STOP; 텍스트 렌더링 가이드. 인물·브랜드 조항은 페이지 앞부분 추출 실패 [미확인] | 안전필터 거부 시 재시도·폴백 로직 필요 |
| OpenAI 이미지 생성 문서 | `moderation` 파라미터 `auto`/`low`, 거부 시 `moderation_blocked` + `moderation_details`. Usage Policies 본문은 403 [미확인] | 의류 사진은 보통 통과. 착용 사진(실제 인물)은 moderation 리스크 ↑ |
| BytePlus GenAI AUP(2026-08-31) | 본문 [미확인] | 확인 전 제외 |
| fal.ai AUP | §4.2 "Violates any copyright, trademark, or other intellectual property rights"; §3.3 타인 likeness 무단 사용 금지; **패션 특정 조항 없음**. ToS §6(d) IP 보호 자료는 권리자 허락 후 업로드 | 고객이 자기 옷을 업로드하는 것은 문제 없음. 타사 디자인 '카피' 시안 요청은 금지 영역 |
| Anthropic AUP(effective 2026-11-12 버전) | 제3자 IP 침해·모조품 조장 금지; 생체정보(얼굴인식) 무단 수집 금지; 업종 일률 금지 없음. Vision: 인물 식별 거부 | 인식 단계에서 얼굴 검출 시 식별 요청 금지(검출·블러만) |
| Modal/RunPod | 콘텐츠 정책 별도 미확인(인프라 사업자) | 자체 모델 호스팅 시 콘텐츠 책임은 회사에 귀속 |

---

## 2. 벤더 × 운영 조건 매트릭스 (a-2)

### 2.1 RPM/동시성 한도 · SLA

| 벤더/모델 | 한도(등급별) | 공개 SLA | 출처 |
|---|---|---|---|
| Gemini API 이미지 모델 | **모델별 RPM/IPM 표가 문서에서 제거되어 AI Studio 대시보드(프로젝트별)로 이동** → [미확인·프로젝트 생성 후 확인]. 공개된 것: 10분당 지출 한도 Tier1 $10 / Tier2 $50 / Tier3 $200; Batch 대기 토큰 Nano Banana 2.1(Preview) Tier1 1,000,000 / Tier2 250,000,000 / Tier3 750,000,000, Nano Banana Pro Tier1 2,000,000 / Tier2 270,000,000 / Tier3 1,000,000,000 | 없음 | https://ai.google.dev/gemini-api/docs/rate-limits (updated 2026-10-15) |
| Vertex AI Nano Banana 2.1 | 고정 쿼터 "Not supported"(동적 공유 쿼터), **Provisioned Throughput 지원**, Batch 지원, Standard/Priority PayGo. 이미지 입력 쿼터 34,000,000 RPM(기본모델·해상도별). 프롬프트당 이미지 최대 14장, 출력 토큰 1K 1,120 / 2K 1,680 / 4K 3,780 | Google Cloud SLA(일반) / PT 구매 시 처리량 보장 | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/nano-banana-2-1 ; https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/quotas (updated 2026-10-21) |
| OpenAI gpt-image-2.5 | **이미지 모델별 RPM/IPM 미공개(Limits 페이지)** [미확인]. 사용 등급: Free(월 $100) / Build(크레딧 $5, 월 $500) / Launch($100, 월 $5,000) / Grow($500, 월 $200,000) | 없음(Status 페이지 Images 99.990%) | https://developers.openai.com/api/docs/guides/rate-limits |
| BytePlus ModelArk Seedream 5.0 Pro | [미확인](문서 JS). fal 경유 가격: $0.0675 + 추가 입력 1장당 $0.0045 (≤1536²), $0.135 (≤2048²), 참조 이미지 최대 10장 | [미확인] | https://fal.ai/models/bytedance/seedream/v5/pro/edit |
| fal.ai | 약관상 수치 없음("may limit API calls… excessive or abusive"). 동시성은 계정 설정 | 없음(상태 페이지 Model API 99.97%, Serverless 100%) | https://fal.ai/legal/api-services ; https://status.fal.ai/ |
| Anthropic (Sonnet 5.5/Haiku 5.5 기준) | Start: 1,000 RPM / 2,000,000 ITPM / 400,000 OTPM, 월 $500 상한; Build: 5,000 / 5,000,000 / 1,000,000, 월 $1,000; Scale: 10,000 / 10,000,000 / 2,000,000, 월 $200,000; Custom 협의. 신규 조직은 Evaluation 티어로 더 낮게 시작. 이미지: 요청당 최대 100장(200k 컨텍스트 모델)/600장, 장당 10MB, 8000×8000px | 없음(Priority Tier 별도) | https://platform.claude.com/docs/en/api/rate-limits |
| Modal | Starter: GPU 동시성 10 / 컨테이너 100, 월 $30 크레딧; Team: 50 / 5,000, $250/월; Enterprise 협의. H100 $0.001097/s(≈$3.95/h), A100 80GB $0.000694/s, L40S $0.000542/s | 가격 페이지에 SLA 없음 | https://modal.com/pricing |
| RunPod Serverless | max workers 기본 3(동시성 상한 겸함), idle timeout 5초, FlashBoot 기본 ON, 실행 타임아웃 기본 600초; 3일 무요청 시 max workers 2, 7일 시 0 | ToS: "AS-IS", Community Cloud "does not make any specific uptime warranties" | https://docs.runpod.io/serverless/endpoints/endpoint-configurations ; https://www.runpod.io/legal/terms-of-service |

### 2.2 지연(생성 시간) — Artificial Analysis 이미지 편집 보드

Artificial Analysis 편집 리더보드(https://artificialanalysis.ai/image/leaderboard/editing, 확인일 2026-10-22)는 **ELO·샘플 수·출시월·1,000장당 가격**은 제공했으나, **생성시간 중앙값·p95 차트는 데이터가 추출되지 않아 [미확인]**이다(사이트 정의: "median time the provider takes to generate an image over the past 3 days of measurements"). 아래 표의 지연 열은 공식 문서의 정성 진술만 기재.

| 모델 | 편집 ELO(순위) | 가격(/1,000장, 1024² 기본) | 지연 근거(공식) | 지연 중앙값 / p95 |
|---|---|---|---|---|
| GPT Image 2.5 Sunburst (max) | 1199 (1위) | $210.7 | "Complex prompts may take up to 2 minutes"; JPEG가 PNG보다 빠름; 품질 low~max | [미확인] |
| GPT Image 2.5 Flare (max) | 1181 (2위) | $210.7 | 동일. "fast, high-quality everyday generation" 포지셔닝 | [미확인] |
| Nano Banana 2.1 (`gemini-nano-banana-2.1`) | 1152 (3~6위) | $33.6 | "Flash-level speed and cost"; thinking 비활성화 불가(`thinking_level` minimal/medium/high), interim 이미지 최대 2장 생성(과금 없음·시간 추가) | [미확인] |
| GPT Image 2 (high) | 1136 (6~12위) | $211.0 | 정사각형이 가장 빠름; 토큰 수에 비례 | [미확인] |
| Seedream 5.0 Pro | 1132 (6~13위) | $90.0 | 공식 지연 진술 없음 | [미확인] |
| Nano Banana 2 (`gemini-3.1-flash-image`) | 1124 (8~15위) | $67.0 | 기본 thinking minimal | [미확인] |
| Nano Banana Pro (`gemini-3-pro-image`) | 1106 (15~17위) | $134.0 | "slower by design"(프리미엄) ; A보고서 실측 약 30초 | [미확인] |
| FLUX.2 [klein] 4B (open weights) | 937 (58~62위) | $15.0 (fal: $0.01/MP) | 공식 진술 없음(소형 모델) | [미확인] |
| (참고) Nano Banana 2 Lite | 1054 | $33.6 | "fastest and cheapest", 1K 전용, 다중 참조·멀티턴 비권장 | [미확인] |

**해석**: 품질(ELO) 상위 2개가 OpenAI이지만 1,000장당 $210로 Nano Banana 2.1($33.6)의 6배이며 "최대 2분" 진술이 있어 **동기 첫 장 경로에 부적합**. Nano Banana 2.1은 ELO 3위권·가격 최저군·Flash급 속도로 **기본 라우트 1순위 후보**. Seedream 5.0 Pro는 ELO·가격 모두 중간이지만 정책 미확인.

### 2.3 상태 페이지 장애 이력(최근 6개월, 2026-04 ~ 2026-10-22)

| 벤더 | 확인 범위 | 이미지/생성 관련 장애 | 공개 가동률 |
|---|---|---|---|
| OpenAI (status.openai.com) | 이력 페이지가 2026-07-24부터만 노출(4~6월 [미확인]) | 07-24 gpt-image-2 API 오류·지연 / 08-06 image generation 오류 / 09-04 APAC 리전 오류(image generation 포함) / 09-09 image generation 오류 / 09-16 gpt-image-2.5-flare 오류 / 10-06 복수 제품 오류(Image generations 포함) / 10-14 gpt-image-2.5 flare·sunburst 제한적 가용성 → **약 3개월간 이미지 관련 7건**(지속시간 미표기) | APIs 99.990%, Images 99.990%(기간 미표기) |
| Google Cloud (status.cloud.google.com/summary) | 요약 페이지 | Vertex AI·Gemini·Generative AI: 2026-04~10 **0건**(표시 범위 내). 범위 밖 2026-02-27 global endpoint 429 증가 1h58m | 제품별 이력 페이지 미열람 |
| Gemini API (ai.google.dev) | 별도 상태 페이지 [미확인] | — | — |
| Anthropic (status.claude.com) | Atom 피드 2026-08-24부터 | 08-24 복수 모델 오류(04:50~07:36) / 09-02·09-03 Sonnet 5 오류 / 09-10 API 지연 / 09-22 복수 모델 오류 / 09-29 API 오류(14:00~14:59) / 10-05·10-06 모델 오류 등 → **8~10월 API 관련 약 14건, 대부분 15분~3시간** | 미표기 |
| fal.ai (status.fal.ai) | 이력 2026-08~ | 09-04 fal.run 동기 요청 불가 30분(major) / 09-29 slowness 18분 | API 99.98%, Model API 99.97%, Serverless 100% |
| Modal (status.modal.com) | 2026-07~10 | 07-30 22분 / 08-19 15분 / 08-26 6~11분 / 09-04 Volumes 2h8m / 09-16 14분 / 10-05 7분 / 10-14 Kimi 엔드포인트 / 10-19 2분 | modal.Function 100%, Web Functions 99.982%, Sandboxes 99.989% |
| RunPod (uptime.runpod.io) | 2026-07~10 | 네트워크 장애 다수(08-13 EUR-IS-1 degraded 20h13m, 08-14 US-IL-1 down 5h34m, 09-12 EUR-IS-1 9h39m, 09-22 EUR-IS-2 5h23m 등); 09-06 Serverless 1h25m; 09-17 API 1h | Serverless API 100%, AP-JP-1 100%, US-IL-1 99.729% |
| BytePlus | status.byteplus.com DNS 실패 [미확인] | — | — |

---

## 3. 법적 결론 메모 (b)

### 3.1 근거 조문(법제처 Open API 원문, 법률 제21445호 2026-03-10 일부개정·2026-09-11 시행 / 시행령 대통령령 제36671호 2026-09-11 시행)

**개인정보 보호법 제2조 제1호**
- 가. 성명, 주민등록번호 및 영상 등을 통하여 개인을 알아볼 수 있는 정보
- 나. 해당 정보만으로는 특정 개인을 알아볼 수 없더라도 다른 정보와 쉽게 결합하여 알아볼 수 있는 정보. 이 경우 쉽게 결합할 수 있는지 여부는 다른 정보의 입수 가능성 등 개인을 알아보는 데 소요되는 시간, 비용, 기술 등을 합리적으로 고려하여야 한다.
- 다. (가명정보)

**제28조의8(개인정보의 국외 이전) [본조신설 2023.3.14]**
① 개인정보처리자는 개인정보를 국외로 제공(조회되는 경우를 포함한다)ㆍ처리위탁ㆍ보관(이하 "이전")하여서는 아니 된다. 다만, 다음 각 호의 어느 하나에 해당하는 경우에는 국외로 이전할 수 있다.
1. 정보주체로부터 국외 이전에 관한 별도의 동의를 받은 경우
2. 법률, 조약, 국제협정에 특별한 규정이 있는 경우
3. **정보주체와의 계약의 체결 및 이행을 위하여 개인정보의 처리위탁ㆍ보관이 필요한 경우로서** 가. 제2항 각 호의 사항을 제30조에 따른 개인정보 처리방침에 공개한 경우 / 나. 전자우편 등 대통령령으로 정하는 방법에 따라 제2항 각 호의 사항을 정보주체에게 알린 경우
4. 이전받는 자가 제32조의2 인증 등 보호위원회 고시 인증을 받고 안전조치·권리보장 조치 및 이전국 이행 조치를 모두 한 경우
5. 이전국·국제기구의 보호 수준이 실질적으로 동등하다고 보호위원회가 인정하는 경우
② 제1항제1호 동의 시 미리 알릴 사항: 1. 이전되는 개인정보 항목 2. 이전되는 국가, 시기 및 방법 3. 이전받는 자의 성명(법인은 명칭과 연락처) 4. 이전받는 자의 이용목적 및 보유ㆍ이용 기간 5. 이전을 거부하는 방법, 절차 및 거부의 효과
③ 제2항 사항 변경 시 알리고 동의를 받아야 한다.
④ 단서에 따라 이전하는 경우 이 법의 다른 규정, 제17조~제19조, 제5장을 준수하고 **대통령령으로 정하는 보호조치**를 하여야 한다.
⑤ 이 법을 위반하는 내용의 국외 이전 계약 체결 금지. ⑥ 세부는 대통령령.

**시행령 제29조의7**: 제28조의8 제1항 제3호 나목의 "전자우편 등 대통령령으로 정하는 방법"은 **서면등의 방법**(= 서면, 전자우편, 팩스, 전화, 문자전송 또는 이에 상당하는 방법; 시행령 제17조 제5항).
**시행령 제29조의10(국외 이전 시 보호조치)**: ① 1. 시행령 제30조 제1항 안전성 확보 조치 2. 개인정보 침해에 대한 고충처리 및 분쟁해결 조치 3. 그 밖에 필요한 조치 / ② **이전받는 자와 미리 협의하고 이를 계약내용 등에 반영**해야 한다.
**제28조의9**: 보호위원회의 국외 이전 중지 명령(제28조의8 제1·4·5항 위반 또는 이전국 보호수준 미달로 피해 우려), 7일 내 이의 제기.
**제26조(업무위탁)**: ① 위탁은 문서(시행령 제28조 ①: 목적·범위, 재위탁 제한, 접근 제한 등 안전조치, 관리현황 점검·감독, 손해배상 책임)로 / ② 위탁 업무 내용과 수탁자를 **인터넷 홈페이지에 지속 게재**(시행령 제28조 ②) / ④ 수탁자 교육·감독 (2026.3.10 개정).
**제15조 제1항 제4호**: 정보주체와 체결한 계약 이행을 위하여 필요한 경우 동의 없이 수집·이용 가능.
**제22조**: 동의 사항 구분 고지, ⑤ 선택 동의 거부를 이유로 서비스 제공 거부 금지.
**제30조 제1항**: 처리방침에 3. 제3자 제공, 4. 처리 위탁 사항 포함.

출처: https://www.law.go.kr/DRF/lawService.do?OC=test&target=law&MST=283839&type=HTML (개인정보 보호법, 법령ID 011357) ; https://www.law.go.kr/DRF/lawService.do?OC=test&target=law&MST=289537&type=HTML (시행령, 법령ID 011468). 웹 UI: https://www.law.go.kr/법령/개인정보보호법

### 3.2 옷 사진의 개인정보 해당성 판단

| 시나리오 | 판단 | 근거·조건 |
|---|---|---|
| **A. 옷만 찍힌 사진 단독**(얼굴·신체·배경 식별 요소 없음, EXIF 제거, 파일명·메타데이터에 식별자 없음) | **개인정보에 해당하지 않을 가능성이 높음** | 제2조 제1호 가목(영상 등으로 개인을 알아볼 수 있는 정보) 비해당. 나목의 "쉽게 결합"은 수신자(벤더) 관점에서 다른 정보의 입수 가능성을 합리적으로 고려 → 벤더가 계정·주문정보를 받지 않으면 결합 곤란. **단 PIPC 해석례·결정례 원문은 이번 세션에서 열람하지 못했으므로 [미확인]**이며, 법무 검토로 확정 필요 |
| **B. 사진에 식별 요소 포함**(얼굴, 신체 특징·문신, 명찰·이름 자수, 거울·창문 반사, 집 내부·주소가 보이는 배경, 학교·회사 로고 유니폼, EXIF GPS) | **개인정보(가목 또는 나목)** | 가목 "영상 등" 직접 해당. 착용 사진은 신체 형상 자체가 식별 가능성 ↑. 특정 집단 유니폼+배경은 나목 결합 용이 |
| **C. 회사 내부에서 계정·주문정보(이름·전화·주소·결제)와 결합 저장된 사진** | **개인정보로 취급**(회사 = 개인정보처리자) | 회사 DB에서는 사진이 식별자와 직접 연결되어 나목 "쉽게 결합" 충족. 따라서 수집·보유·파기·안전조치·처리방침 의무는 **서비스 전체에 적용** |
| **D. 벤더에 전송되는 데이터**(사진 파일 + 프롬프트만, 식별자·EXIF 제거, 요청 ID는 랜덤) | **설계에 따라 비식별 처리 가능하나, 보수적으로 "국외 처리위탁"으로 공개** | 벤더가 받는 것은 A와 동일하므로 벤더 측에서는 비식별일 수 있음. 그러나 (1) B 유형 사진을 100% 걸러낼 수 없고, (2) 회사 측에서는 C로 결합 가능하며, (3) 제28조의8 제1항 제3호 가목의 공개 비용이 낮으므로 **처리방침 공개 방식으로 적법성 확보** 권고 |

**결론**: "옷만 찍힌 사진"이라는 제품 설계는 개인정보 리스크를 크게 낮추지만 면제가 아니다. 최소 조치는 ① 클라이언트 측 EXIF·GPS 제거, ② 얼굴·사람 검출 시 반려 또는 블러 후 전송, ③ 벤더 요청에 계정 식별자 미포함(랜덤 요청 ID), ④ 처리방침에 국외 처리위탁 공개, ⑤ 벤더 DPA 체결 및 시행령 제29조의10 보호조치 협의 기록.

### 3.3 국외 이전의 적법 근거 선택

| 경로 | 요건 | 권고 |
|---|---|---|
| 제1항 제1호 **별도 동의** | 제2항 5개 사항 사전 고지 + 구분 동의(제22조). 변경 시 재동의(제3항). 거부 시 서비스 불이익 가능 여부는 **필수 처리인지에 따라** 판단 | 시안 생성이 서비스의 본질이므로 "필수" 동의로 구성 가능하나, **동의 피로·전환율 저하**. 제3호가 가능하면 보조 수단으로만 |
| 제1항 **제3호 계약 이행 위한 처리위탁·보관 + 처리방침 공개(가목) 또는 서면등 통지(나목)** | 시안 생성·옷 인식이 고객과의 서비스 계약 이행에 필요한 **처리위탁**일 것(벤더가 자기 목적으로 쓰지 않을 것 = §1.1 학습 금지 조항으로 뒷받침) + 제2항 각 호 사항을 처리방침에 공개 + 제4항·시행령 제29조의10 보호조치 + 제26조 위탁 문서·홈페이지 공개 | **기본 경로로 채택.** 단, AI 학습 활용(회사 자체 파인튜닝용 데이터 제공)은 계약 이행 범위를 넘으므로 **별도 선택 동의**(제22조 제5항) |
| 제4호 인증 / 제5호 동등성 인정 | 보호위원회 고시 인증·인정 필요 | 현재 미국·싱가포르에 대한 보호위원회 동등성 인정 여부 [미확인]. BytePlus의 APEC CBPR이 고시 인증에 해당하는지 [미확인] |

### 3.4 고지·동의 문구 초안

**(1) 개인정보 처리방침 — "개인정보의 국외 처리위탁" 절 (제28조의8 제1항 제3호 가목 + 제2항 각 호)**

> 회사는 고객이 요청한 리폼 시안 생성 및 의류 인식 서비스를 제공(계약 이행)하기 위하여 아래와 같이 개인정보 처리 업무를 국외 사업자에게 위탁합니다.
>
> | 이전받는 자(연락처) | 이전되는 국가 | 이전 시기·방법 | 이전 항목 | 이용 목적 | 보유·이용 기간 |
> |---|---|---|---|---|---|
> | Google LLC (Gemini API / Google Cloud Vertex AI, 고객지원: cloud.google.com/support) | 미국 및 Google이 설비를 운영하는 국가 [※ Vertex AI 서울 리전 ML 처리 확정 시 "대한민국"으로 수정] | 시안 생성 요청 시 암호화된 네트워크(TLS)로 전송 | 의류 사진(식별정보·위치정보 제거본), 생성 지시문 | AI 의류 인식 및 리폼 시안 이미지 생성 | 처리 목적 달성 즉시 삭제, 단 남용 방지 로그 최대 55일(Gemini API) / 최대 90일(Vertex AI, 분류기 플래그 시) |
> | OpenAI, L.L.C. (Images API) | 미국 | 동일 | 동일 | 고화질 리폼 시안 생성 | 처리 후 즉시 삭제(ZDR 적용 시) 또는 최대 30일 |
> | fal.ai (Features and Labels, Inc.) | 미국 등 | 동일 | 동일 | 리폼 시안 생성 | 요청 기록 미저장(저장 비활성화 적용) |
> | Anthropic, PBC (Claude API) | 미국(처리), 글로벌 라우팅 | 동일 | 의류 사진(식별정보 제거본) | 의류 속성 인식(보조) | 처리 후 30일 이내 삭제 |
> | Modal Labs, Inc. (서버리스 GPU) | 일본·미국 등 | 동일 | 동일 | 자체 리폼 시안 모델 실행 | 입출력 최대 7일, 로그는 미국 저장 |
>
> 고객은 위 국외 처리위탁을 원하지 않을 경우 사진 업로드를 하지 않음으로써 이를 거부할 수 있으며, 이 경우 AI 시안 미리보기 서비스는 제공되지 않습니다(매장 방문 상담은 가능합니다). 회사는 이전받는 자와 개인정보 보호법 시행령 제29조의10에 따른 안전성 확보 조치, 고충처리·분쟁해결 조치를 계약으로 정하고 있습니다.

**(2) 업로드 화면 인라인 고지 (제28조의8 제1항 제3호 나목 보강용 / 동의 아님)**

> 사진은 리폼 시안을 만들기 위해 해외 AI 서비스(Google, OpenAI 등 미국 소재)에서 처리됩니다. 얼굴·주소 등이 보이지 않게 옷만 찍어 주세요. 사진은 시안 생성 후 서버에서 [N]일 뒤 자동 삭제됩니다. 자세한 내용은 개인정보 처리방침(국외 처리위탁)을 확인하세요.

**(3) 선택 동의 — AI 학습 활용 (제22조 제1항·제5항, 제18조 제2항 제1호)**

> [선택] 리폼 시안 품질 향상을 위해 업로드한 의류 사진과 선택한 시안을 회사의 AI 모델 학습에 이용하는 것에 동의합니다. 동의하지 않아도 서비스 이용에 제한이 없으며, 언제든 설정에서 철회할 수 있습니다.
> - 항목: 의류 사진(식별정보 제거본), 생성 시안, 선택·평가 결과 / 목적: 리폼 디자인 추천·시안 생성 모델 개선 / 보유기간: 동의 철회 시 또는 수집일로부터 [2]년

**(4) 제1항 제1호 별도 동의를 택할 경우의 체크박스 문구**

> [필수] 개인정보 국외 이전에 동의합니다. (이전받는 자: Google LLC 외 — 국가: 미국 — 항목: 의류 사진·생성 지시문 — 목적: AI 시안 생성 — 보유기간: 처리 후 즉시 삭제, 남용 방지 로그 최대 55일 — 거부 방법: 사진 업로드 중단, 거부 시 AI 시안 미리보기 불가) [상세 보기]

**(5) 처리방침 "처리 위탁" 절(제26조·시행령 제28조 ②) 추가 행**: 위 국외 사업자 + 국내 수탁자(택배·결제·알림톡)를 홈페이지에 지속 게재.

### 3.5 PIPC 안내서·해석례 확인 현황

- 「생성형 인공지능(AI) 개발·활용을 위한 개인정보 처리 안내서(2025.8.)」: PIPC 게시판(2025-08-22, 개인정보보호정책과) 존재 확인, PDF 첨부. **국외 처리위탁 부분 본문은 PDF 미열람으로 [미확인]** → https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=D010030000&nttId=11439
- 「가명정보 처리 가이드라인(2026.3. 개정)」: 2026-03-31 게시, 서식 10종 → https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=D010030000&nttId=11931
- "얼굴 없는 사물(옷) 사진의 개인정보 해당성" PIPC 해석례·결정례: **검색 불가로 [미확인]**. 다음 단계에서 PIPC 법령해석 사례집 및 개인정보보호 포털(privacy.go.kr) "개인정보 판단기준"을 열람할 것.

---

## 4. 지연 목표 재설정 및 라우팅 제안 (c)

### 4.1 현재 보고서 간 불일치

| 보고서 | 목표 |
|---|---|
| A(생성 기술) | p95 < 30초(상용) / < 5초(자체) — 합격 기준 |
| E(UX) | 첫 안 P50 ≤ 20초, P90 ≤ 45초 [가설]; 30초 초과 시 알림 전환 |
| F(아키텍처) | 첫 시안 25초(p50), 전체 3~4장 45초(p50), p95 90초; PoC 게이트 p50 ≤ 30초 |

### 4.2 매트릭스에서 도출되는 제약
- OpenAI: "복잡한 프롬프트는 최대 2분" 공식 진술 + 7~10월 이미지 관련 장애 7건 → p95를 OpenAI 기준으로 잡으면 90초도 보장 불가.
- Gemini 3.x 이미지: thinking 강제(최대 2장 interim 이미지) → 꼬리 지연 존재하나 `thinking_level=minimal`로 단축 가능(2.1은 minimal/medium/high).
- Artificial Analysis 중앙값·p95 수치 [미확인] → **PoC 실측 없이는 어떤 수치도 근거 없음**.
- 자체 호스팅(Modal/RunPod): 콜드스타트 변수(RunPod idle 5초 기본, FlashBoot; Modal 웜 컨테이너)로 p95는 웜 풀 정책에 좌우.

### 4.3 통일 제안

| 지표 | 목표 | 적용 |
|---|---|---|
| 첫 장 표시(요청 → 1장) | **p50 ≤ 25초, p90 ≤ 45초, p95 ≤ 60초** | 동기 경로(Nano Banana 2.1 1K, `thinking_level=minimal`; 폴백 Nano Banana 2 Lite) |
| 전체 3~4장 | p50 ≤ 45초, p95 ≤ 75초 | 병렬 팬아웃·점진 표시 |
| 하드 타임아웃 | **75초** → 도착분만 표시 + 나머지는 백그라운드·알림 | F의 45초 타임아웃은 "폴백 트리거"로, 75초는 "사용자 대기 종료"로 역할 분리 |
| 알림 전환 | 30초 초과 시 "완성되면 알려드릴게요" 노출(E 유지) | |
| 비동기 고화질 경로 | 목표 없음(최대 3분), 주문 확정 전 정밀 시안·2K/4K 재생성 | GPT Image 2.5 Sunburst xhigh/max, Nano Banana Pro 2K/4K |
| PoC 게이트 | p50 ≤ 25초 **and** p95 ≤ 60초 (모델별 100회 이상, 한국에서 측정, 1K 해상도, 입력 1~3장) | F의 "p50 ≤ 30초" 게이트를 p95까지 확장 |

측정 프로토콜: 서울 리전 서버에서 각 모델 100회 이상 호출, 입력 1장/3장 두 조건, 1K 해상도, 평일 낮·밤 2회차. 수집: TTFB, 전체 지연, 429/5xx 비율, 안전필터 거부율. 보고 양식은 A §10 지표 표와 통일.

### 4.4 라우팅에서 제외(또는 보류)할 벤더·옵션

| 대상 | 사유 | 조건부 복귀 |
|---|---|---|
| Gemini API **무료 티어** | 입력을 학습·사람 검토에 사용 | 복귀 불가(개발 테스트에도 고객 사진 금지) |
| **BytePlus ModelArk 직접 호출** + **fal 경유 Seedream 5.0** | 학습 사용·보관·리전 조항 원문 [미확인]; fal API Services 약관상 제3자 모델은 Client Content가 제3자로 전달됨 | BytePlus DPA·General Terms for AI Services·GenAI AUP 원문 확보 후 "학습 미사용·보관 ≤30일·리전 싱가포르 고정" 확인 시 복귀 |
| **GPT Image 2.5 Sunburst/Flare xhigh·max** (동기 경로) | 최대 2분 진술, 1,000장당 $210, 3개월 7건 장애 | 비동기 고화질 경로에서만 사용; ZDR 승인 획득 전제 |
| **RunPod Community Cloud** | "no specific uptime warranties", 호스트 운영 머신 | Secure Cloud(AP-JP-1)만 허용, 또는 Modal(`jp`) 우선 |
| **Anthropic Fable 5.1/5, Mythos 5.1/5** | 30일 보관 강제·ZDR 불가(Covered Models) | 인식 폴백은 Haiku 5.5 → Sonnet 5.5 순 |
| Vertex AI **global 엔드포인트** (한국 리전 처리를 약속한 경우) | "don't provide any data residency guarantees" | 처리방침에 "미국 등"으로 고지했다면 global 허용(429 감소 이점) |
| fal의 "Pending Enterprise Ready" 표시 모델 | 학습 금지·보안·DPA 의무 미적용(Excluded Models) | Enterprise-ready 전환 확인 후 |

### 4.5 권장 기본 라우팅(요약)

1. 인식: Gemini(Vertex, asia-northeast3 지정, `gemini-3.1-flash-image` 또는 텍스트 멀티모달 모델) → 폴백 Claude Haiku 5.5(`inference_geo` 기본 global, 사진은 식별정보 제거본).
2. 시안 1차(동기): Nano Banana 2.1 1K(`thinking_level=minimal`) ×3 병렬 → 45초 내 미도착분은 Nano Banana 2 Lite로 재시도 → 75초 하드 컷.
3. 시안 2차(비동기, 선택): GPT Image 2.5 Sunburst(ZDR 승인 후) 또는 Nano Banana Pro 2K.
4. 자체 모델(Phase 2~): Modal `jp` 리전 + `X`-free 로그 정책(민감 데이터 stdout 금지), 입출력 7일 자동 삭제 확인.
5. 공통: 클라이언트 EXIF 제거 → 서버 얼굴 검출 → 랜덤 요청 ID → 벤더 호출 → 결과는 회사 스토리지에만 보관(만료 N일) → 벤더 측 저장 비활성화 헤더(fal `X-Fal-Store-IO:0`)·요청-응답 로깅 OFF(Vertex)·ZDR 신청(OpenAI/Anthropic) 체크리스트.

---

## 5. 미확인 항목 및 다음 조치

| 항목 | 상태 | 조치 |
|---|---|---|
| Artificial Analysis 모델별 생성시간 중앙값·p95 | [미확인] 차트 데이터 추출 실패 | 사이트에서 수동 캡처 또는 AA API 키 발급 후 조회; PoC 실측으로 대체 |
| BytePlus 학습 사용·보관·리전·AUP 조항 원문 | [미확인] JS 렌더링 | 브라우저로 직접 열람·PDF 저장(Privacy Policy 2026-06-08, DPA 2026-05-15, AI Services Terms 2026-08-28, GenAI AUP 2026-08-31, Sub-processor List 2026-09-24, Region availability 2026-09-28) |
| OpenAI DPA·Usage Policies·Subprocessor List | [미확인] 403 | 브라우저 열람; Enterprise privacy 페이지 |
| Gemini API·OpenAI 이미지 모델별 RPM/IPM | [미확인] 대시보드 전용 | 프로젝트 생성 후 AI Studio rate-limit 페이지 / OpenAI Limits 페이지 캡처 |
| Vertex AI 서울 리전 ML 처리 보장 모델(Nano Banana 2.1 vs 2) | [확인 필요] 문서 간 불일치 | Data residency 표 수동 확인 + Google Cloud 계정팀 문의 |
| 각사 하위처리자 목록(Google·Anthropic·fal·Modal) | [미확인] Trust Center JS | 브라우저 열람 후 처리방침 부록에 반영 |
| PIPC 생성형 AI 안내서의 국외 처리위탁 해설, 사물 사진 개인정보 해당성 해석례 | [미확인] | PDF 열람·법령해석 사례 검색·법무 검토 |
| 보호위원회의 미국·싱가포르 동등성 인정, BytePlus APEC CBPR의 고시 인증 해당성 | [미확인] | PIPC 고시 확인 |
| OpenAI·Google·Anthropic 2026-04~06 장애 이력 | [미확인] 상태 페이지 노출 범위 밖 | RSS 아카이브 확인 |

## 6. 출처 목록(확인일 2026-10-22)

- Google: https://ai.google.dev/gemini-api/terms · https://ai.google.dev/gemini-api/docs/usage-policies · https://ai.google.dev/gemini-api/docs/pricing · https://ai.google.dev/gemini-api/docs/rate-limits · https://ai.google.dev/gemini-api/docs/image-generation · https://policies.google.com/terms/generative-ai/use-policy · https://business.safety.google/processorterms/ · https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance · https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/abuse-monitoring · https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations · https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency · https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/nano-banana-2-1 · https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/quotas · https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/gemini-image-generation-limitations · https://cloud.google.com/terms/data-processing-addendum · https://status.cloud.google.com/summary
- OpenAI: https://developers.openai.com/api/docs/guides/your-data · https://developers.openai.com/api/docs/guides/image-generation · https://developers.openai.com/api/docs/guides/rate-limits · https://status.openai.com/ · https://status.openai.com/history
- BytePlus: https://www.byteplus.com/en/trust-center · https://docs.byteplus.com/en/legal/docs/privacy-policy · https://docs.byteplus.com/en/docs/legal/data-processing-addendum · https://docs.byteplus.com/en/docs/legal/AI-Services-terms · https://docs.byteplus.com/en/docs/legal/acceptable_use_policy_byteplus_genai · https://docs.byteplus.com/en/docs/legal/sub-processors-list · https://docs.byteplus.com/en/docs/ModelArk/region-availability
- fal.ai: https://fal.ai/legal/terms-of-service · https://fal.ai/legal/api-services · https://fal.ai/legal/privacy-policy · https://fal.ai/legal/data-processing-addendum · https://fal.ai/legal/acceptable-use-policy · https://fal.ai/docs/model-apis/storage · https://status.fal.ai/ · https://status.fal.ai/history/1 · https://fal.ai/models/bytedance/seedream/v5/pro/edit · https://fal.ai/models/fal-ai/flux-2/klein/4b/edit · https://fal.ai/models/fal-ai/nano-banana-2.1/edit
- Anthropic: https://www.anthropic.com/legal/commercial-terms · https://www.anthropic.com/legal/data-processing-addendum · https://www.anthropic.com/legal/aup · https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-personal-data · https://privacy.claude.com/en/articles/8956058-i-have-a-zero-data-retention-agreement-with-anthropic-what-products-does-it-apply-to · https://platform.claude.com/docs/en/manage-claude/api-and-data-retention · https://platform.claude.com/docs/en/manage-claude/data-residency · https://platform.claude.com/docs/en/api/rate-limits · https://platform.claude.com/docs/en/build-with-claude/vision · https://status.claude.com/ · https://status.claude.com/history.atom · https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html
- Modal: https://modal.com/docs/guide/security · https://modal.com/docs/guide/data-residency · https://modal.com/docs/guide/region-selection · https://modal.com/legal/dpa · https://modal.com/legal/privacy-policy · https://modal.com/pricing · https://status.modal.com/
- RunPod: https://www.runpod.io/legal/data-processing-agreement · https://www.runpod.io/legal/terms-of-service · https://www.runpod.io/legal/privacy-policy · https://docs.runpod.io/serverless/endpoints/endpoint-configurations · https://uptime.runpod.io/
- Artificial Analysis: https://artificialanalysis.ai/image/leaderboard/editing · https://artificialanalysis.ai/image/providers
- 법령: https://www.law.go.kr/DRF/lawService.do?OC=test&target=law&MST=283839&type=HTML (개인정보 보호법) · https://www.law.go.kr/DRF/lawService.do?OC=test&target=law&MST=289537&type=HTML (시행령) · https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=D010030000&nttId=11439 · https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=D010030000&nttId=11931
