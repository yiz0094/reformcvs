# A. 리폼 미리보기(시안) 생성 기술 조사 — '리폼 편의점'

- 담당키: `A_generation_tech`
- 기준일: **2026-10-21**
- 작성 목적: "사용자가 찍은 옷 사진 1장 + 회사 리폼 디자인 참조"로 **옷의 원형(형태·색·질감·로고)을 보존하면서 리폼 부위만 바뀐 미리보기**를 생성하는 기술 후보를 전수 조사하고, PoC에서 먼저 검증할 모델·파이프라인·프로토콜을 제안한다.
- 표기 원칙: 공식 문서로 확인된 사실은 그대로, 2차 출처(리셀러·블로그·집계 사이트)만 있는 수치는 **(2차)**, 확인 못 한 항목은 **미확인**으로 표기했다. 가격·모델명은 2026년 들어 분기마다 바뀌고 있으므로 PoC 착수 시점에 재확인이 필요하다.

---

## 0. 요약 (TL;DR)

1. **2026년 10월 현재, "참조 이미지 여러 장 + 자연어 지시"로 부분 편집을 하는 통합 생성·편집 모델이 상용/오픈 양쪽에서 표준이 됐다.** 상용 최상위는 OpenAI **GPT Image 2.5 (Sunburst/Flare, 2026-09-08)**, Google **Nano Banana 2.1 (`gemini-nano-banana-2.1`, 2026-10-06)**, ByteDance **Seedream 5.0 Pro/Lite**, Microsoft **MAI-Image-2.6**, BFL **FLUX 3 Image / FLUX.2** 계열이다. 오픈웨이트는 **FLUX.2 [klein] 4B (Apache 2.0)**, **Qwen-Image-Edit-2511 (Apache 2.0)**, **FLUX 3 Image Klein (FLUX Kommunity License)**, Step1X-Edit v1p2, LongCat-Image-Edit, GLM-Image 등이 있다.
2. **"원형 보존(identity/visual consistency)" 관점에서는 '전체 랭킹 1위'와 '보존력 1위'가 다르다.** GEditBench v2(2026-03)에서는 GPT Image 1.5가 지시 이행(IF) 1위지만 시각적 일관성(VC)은 846으로 최하위권이고, 오픈웨이트 FLUX.2 [klein] 4B가 VC 1,070, GLM-Image가 1,109로 보존력이 가장 높았다. Artificial Analysis 편집 아레나(2026-09 개편)에서는 **Identity-Preserving Edit 보드 1위가 Seedream 5.0 Pro**다. 즉 "지시를 잘 따르는 모델"과 "원본을 안 건드리는 모델"을 구분해 봐야 한다.
3. **어떤 모델도 단독으로 '마스크 밖 픽셀 무변경'을 보장하지 않는다.** GPT Image의 마스크조차 "프롬프트 기반이라 마스크 형태를 정확히 따르지 않을 수 있다"고 공식 문서가 명시한다. 따라서 서비스 파이프라인은 반드시 **(세그멘테이션 마스크) → (생성) → (마스크 밖은 원본 픽셀로 후합성) → (자동 QA/다중 생성 후 선택)** 구조로 설계해야 한다. 이것이 품질을 좌우하는 핵심이며 모델 선택보다 중요하다.
4. **회사 디자인 "학습"은 상용 API로는 불가능하다(파인튜닝 미제공).** 상용 API에서는 "디자인 카드(참조 이미지 세트 + 구조화 프롬프트 + 편집 영역 지정)"로 템플릿화한다. 진짜 학습(LoRA)은 오픈웨이트(FLUX.2 klein 4B, Qwen-Image-Edit-2511, FLUX 3 Image Klein Base)에서만 가능하며, "리폼 전/후 쌍(pair) 데이터"가 필요하다. 예외적으로 Adobe Firefly Services의 Custom Models API가 상용 API 중 유일하게 커스텀 모델 학습을 제공한다.
5. **가상 피팅(VTON) 모델은 이 문제에 직접 맞지 않는다.** VTON은 "사람 이미지 + 옷 이미지 → 입은 사람"이지, "옷 이미지 → 변형된 옷"이 아니다. 다만 (a) 리폼 결과를 모델에 입혀 보여주는 2차 연출, (b) 옷 영역 파싱/마스킹 기술 재사용, (c) '패치워크' 유형에서 다른 옷의 일부를 옮겨오는 부분 참조 등에 제한적으로 활용 가치가 있다. 대부분 비상업 라이선스(CC BY-NC-SA)이고, 상업 가능은 FASHN VTON v1.5(Apache 2.0), Leffa(MIT, 단 데이터셋 조건), FLUX VTO(API) 등이다.
6. **추천 PoC 모델 3개: Nano Banana 2.1, GPT Image 2.5 Sunburst, Seedream 5.0 Pro** (+ 자체 호스팅 기준선으로 FLUX.2 [klein] 4B 또는 Qwen-Image-Edit-2511 1개). 세 상용 모델 모두 한국에서 API 사용 가능(Google/OpenAI는 지원국 목록에 South Korea 명시, BytePlus도 가용 국가에 South Korea 명시).
7. **한국 사업자 주의:** Tencent HunyuanImage 3.0 Instruct의 커뮤니티 라이선스는 **EU·영국·한국을 적용 제외**한다고 보도됨(2차) → 사실상 사용 불가로 간주. Qwen-Image-2.1은 Research License(비상업). FLUX.2 [dev]/[klein] 9B/Kontext dev는 비상업 라이선스(상업 자체호스팅은 BFL 유료 라이선스 필요).

---

## 1. 조사 범위와 방법

- 웹 검색 30회 이상 + 공식 문서(Google AI for Developers, OpenAI developers docs, BFL docs, Hugging Face 모델 카드, GitHub, BytePlus docs, Artificial Analysis, GEditBench v2 프로젝트 페이지 등)를 직접 열람했다.
- 가격은 2026-10 기준 공식 페이지 또는 2026-10에 갱신된 집계 페이지 기준. 리셀러(fal, Atlas Cloud, OpenRouter, APIYI 등) 가격은 공식가와 다를 수 있다.
- 벤치마크는 (1) GEditBench v2(학술, 2026-03), (2) Artificial Analysis Image Editing Arena v2.1(인간 선호 Elo, 2026-09 개편), (3) arena.ai(구 LMArena) Image Edit Arena, (4) GEdit-Bench/KRIS-Bench(모델 카드 자기보고), (5) 커뮤니티 리뷰를 사용했다.

---

## 2. 상용 API 전수 조사 (모델 카드)

### 2.1 Google — Nano Banana 계열 (Gemini API)

| 항목 | 내용 |
|---|---|
| 현행 모델 | **Nano Banana 2.1** (`gemini-nano-banana-2.1`, 2026-10-06 출시, 신규 프로젝트 권장) / Nano Banana Pro (`gemini-3-pro-image`, 프리미엄) / Nano Banana 2 (`gemini-3.1-flash-image`, 이전 세대·2.1로 교체 권장) / Nano Banana 2 Lite (`gemini-3.1-flash-lite-image`, 최저가·멀티레퍼런스 비최적) |
| 단종 | `gemini-2.5-flash-image`는 2026-10-02 종료 |
| 가격(표준/이미지) | 2.1: **$0.0336(1K) / $0.0504(2K) / $0.113(4K)**, Batch 50% 할인. Pro: $0.134(1K·2K) / $0.24(4K). 3.1 Flash: $0.067(1K). Lite: $0.0336(1K) |
| 멀티레퍼런스 | 참조 이미지 **최대 14장**(문서에 모델별 객체/인물/스타일 참조 한도 표가 있음; 2차 보도는 "인물 4 + 객체 10") |
| 마스크 inpainting | **API 문서상 명시적 마스크 파라미터 없음.** 문서는 "대화형으로 마스크를 정의"하는 프롬프트 방식만 안내. 2.1 출시 보도에는 "영역 선택 편집"이 헤드라인이나 Gemini 앱/ComfyUI 노드 기준이며 API 필드명은 **미확인** |
| 해상도 | 1K/2K/4K (2.1은 0.5K 미지원), 다양한 종횡비 |
| 지연시간 | 공식 수치 없음. 2차 측정: Nano Banana 2 1K 평균 15.5초, Pro 30.8초(magichour 5프롬프트 테스트), 다른 2차 자료는 "복잡 프롬프트 10–15초". 2.1은 thinking level(minimal/medium/high)로 품질-지연 트레이드오프 |
| 시드 | 공식 문서 미언급. 2차 자료: Gemini 이미지 모델은 `seed` 미지원(Unknown field 에러) → **재현성 제어 불가로 가정** |
| 워터마크 | 모든 출력에 SynthID 삽입 |
| 파인튜닝 | 없음. Vertex AI Imagen 피사체/스타일 튜닝은 2025-12-31 종료 |
| 한국 가용 | **가능** — Gemini API 가용 지역 목록에 "South Korea" 명시 |
| 벤치마크 | AA Arena v2.1: Nano Banana 2.1 Elo 1,152(공동 3–6위), Pro 1,106. GEditBench v2: Nano Banana Pro 종합 1위(1,096), VC 1,108 |
| 평판 | 아이덴티티 유지 호평 다수(2차). 단, 동일 이미지 2회 생성 시 톤/채도/샤픈 변화(Adobe 커뮤니티 보고), 요청하지 않은 요소 추가(전선 제거 요청에 나무 추가), 작은 영역 선택 편집 시 왜곡(2025-10 보고) |

출처: https://ai.google.dev/gemini-api/docs/pricing , https://ai.google.dev/gemini-api/docs/image-generation , https://ai.google.dev/available_regions , https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations , https://magichour.ai/blog/nano-banana-2-vs-nano-banana-pro-we-benchmarked-both-on-the-same-5-prompts , https://community.adobe.com/bug-reports-403/generate-from-nano-banana-for-the-2nd-time-always-changed-the-image-tone-1483534 , https://help.apiyi.com/de/nano-banana-pro-no-seed-batch-consistency-guide-de.html

### 2.2 OpenAI — GPT Image 2.5 / GPT Image 2

| 항목 | 내용 |
|---|---|
| 현행 모델 | **GPT Image 2.5** (2026-09-08): `gpt-image-2.5-sunburst`(편집 정밀도 우선, 느림) / `gpt-image-2.5-flare`(속도 우선, GPT Image 2 대비 지연 최대 50% 감소 주장). GPT Image 2 (2026-04-21, 추론 모델 결합). GPT Image 1.5/1 mini는 2026-12-01 퇴역, gpt-image-1은 2026-10-23 퇴역. DALL·E 2/3는 2026-05-12 API 제거 |
| 가격 | 토큰 과금. 2차 집계(CostGoat, 2026-10-20): 2.5 Sunburst/Flare **저품질 $0.005–0.006 → high $0.041–0.053 → max $0.165–0.211/이미지**. 토큰 단가는 "GPT Image 2와 동일, 텍스트 $5 / 이미지 입력 $8 / 이미지 출력 $30 per 1M"(2차) — 출력 $32 표기 자료도 있어 **공식 가격표 재확인 필요**. Batch API 50% 할인 |
| 품질 티어 | low / medium / high / **xhigh / max**(2.5 신설) / auto |
| 멀티레퍼런스 | 입력 이미지 다수 지원(문서 예시 4장, 최대 수 미기재. gpt-image-1 시절 16장) |
| 마스크 inpainting | **지원**(alpha 채널 PNG 마스크). 단 공식 문서: "마스킹은 전적으로 프롬프트 기반이라 **마스크의 정확한 형태를 따르지 않을 수 있음**", 다중 입력 시 마스크는 첫 이미지에만 적용 |
| 해상도 | 1024², 1536×1024, 1024×1536 권장 + 커스텀(16 배수, 1:3~3:1, 최장변 3840, 655,360~8,294,400 픽셀) |
| 지연시간 | 복잡 프롬프트 최대 약 2분(공식). 스트리밍 partial_images 0–3 지원. 2차: GPT Image 2 4K 약 4.2초(Atlas Cloud 벤치, 신뢰도 낮음) |
| input_fidelity | gpt-image-1/1.5 전용 파라미터(high 시 입력 이미지당 추가 과금). gpt-image-2는 "항상 high 고정"(2차) |
| 시드 | 미지원 |
| 파인튜닝 | 없음 |
| 한국 가용 | **가능** — 지원국 목록에 "South Korea" |
| 벤치마크 | **AA Arena v2.1 종합 1위 Sunburst 1,199 / 2위 Flare 1,181**. arena.ai Image Edit(2026-10-06, preliminary): Sunburst 1,524 / Flare 1,481. GEditBench v2: GPT Image 1.5 IF 1,260(1위)이나 **VC 846(최하위권)** |
| 평판 | 2.5에서 "반복 편집 시 인물/옷 보존 크게 개선"(단일 에디토리얼 테스트). 구버전 이슈: 노란 색조(yellow tint), 색상 변경 요청 시 전체 재생성, 과샤픈 |

출처: https://developers.openai.com/api/docs/guides/image-generation , https://en.wikipedia.org/wiki/GPT_Image , https://costgoat.com/pricing/openai-images , https://docs.kanaries.net/articles/gpt-image-2-5 , https://artificialanalysis.ai/image/leaderboard/editing , https://www.llmreference.com/benchmark/lmarena-image-edit , https://community.openai.com/t/gpt-image-1-input-fidelity/1317640 , https://developers.openai.com/api/docs/supported-countries

### 2.3 Black Forest Labs — FLUX 3 Image / FLUX.2 / FLUX.1 Kontext / Fill / VTO

| 모델 | 성격 | 가격 | 참조/마스크 | 비고 |
|---|---|---|---|---|
| **FLUX 3 Image** (2026-10-01경, API ID `flux-3-image`) | 최신 통합 생성·편집 | (2차, BFL 문서 인용) 768²: $0.041 / **1K $0.048** / 1.5K $0.07 / 2K $0.10 / 4K $0.607. 참조 이미지 무료 | 참조 **최대 10장**(번호로 지칭). **바운딩 박스 `[top,left,bottom,right]`(0–1000 그리드)로 특정 요소만 recolor/move/replace/remove, 나머지 무변경** 명시. 마스크 미언급 | `grounding`(웹 검색) 기본 ON → 속도·프라이버시 위해 OFF 권장 |
| **FLUX 3 Image Klein** | 5.6B, 오픈웨이트(Distilled 16스텝 / Base 50스텝·LoRA용) | API 1K **$0.009**, 2K $0.014, 4K $0.036(편집도 동일가) | FLUX 3 Image와 동일 기능(멀티레퍼런스·바운딩 박스) | 라이선스 "FLUX Kommunity License"(조건 **미확인**; 2차: 연매출 $5M 미만 자체호스팅 가능). 프롬프트 업샘플러 필수 |
| FLUX.2 [max] (2025-12-16) | 최고 정밀 | $0.07/MP(2차) | 참조 최대 10장 | API 편집 참조 "API 8장 / 플레이그라운드 10장", 출력 4MP |
| FLUX.2 [pro] (2025-11-25) | 양산용 | 생성 $0.03/MP, **편집 $0.045/MP**(2차) | 동일 | |
| FLUX.2 [flex] | 세밀 제어 | $0.05–0.06/MP(2차) | 동일 | |
| FLUX.2 [klein] 4B / 9B (2026-01-15) | 저가·고속 | $0.014–0.015/이미지(2차) | 멀티레퍼런스 | 4B Apache 2.0, 9B 비상업 |
| FLUX.1 Kontext [pro]/[max] (2025-05) | 1세대 편집 | **$0.04 / $0.08**/이미지(2차) | 단일 참조 중심 | GEditBench v2에서 Kontext dev는 하위권(869) → 구세대 |
| **FLUX.1 Fill [pro]** | 마스크 inpainting/outpainting | 가격 **미확인** | 흑백 마스크 또는 alpha 채널 | 참조 이미지 미지원(문서상) |
| **FLUX VTO v2** | 가상 피팅 | 미확인(Runware 약 $0.0625) | person + garment 필수, 다중 의류는 2×2 그리드 합성 권장 | "원래 옷 흔적 잔존 가능" 명시. **옷만 단독 편집 불가** |

- 라이선스: API 출력물은 상업 이용 가능(BFL 헬프). 오픈웨이트 상업 자체호스팅은 Builder/Platform/Professional/Enterprise 유료 티어(월 1만~10만 장, 도메인/유저 제한, LoRA 권리 포함). **Self-hosted 라이선스는 외부 API 엔드포인트 제공 금지.**
- 한국 가용: 지역 제한 기재 없음(EU/US 리전 선택 가능). **미확인(제한 발견 못 함)**.
- 파인튜닝: FLUX.2 [klein] LoRA 공식 가이드(24GB VRAM, RTX 4090 약 1시간, 약 $0.5), fal FLUX.2 edit trainer(1,000스텝 약 $11.82), FLUX 3 Image Klein Base LoRA. API 측 `flux-2-klein-9b-kv-finetuned`(beta).

출처: https://docs.bfl.ml/flux_3/flux3_image_overview.md , https://docs.bfl.ml/flux_3/flux3_image_klein.md , https://docs.bfl.ml/flux_2/flux2_image_editing.md , https://docs.bfl.ml/flux_1_fill.md , https://docs.bfl.ml/flux_2/flux_vto , https://docs.bfl.ml/quick_start/pricing.md , https://bfl.ai/pricing , https://help.bfl.ai/articles/3670520907-can-i-use-the-api-for-a-commercial-application , https://bfl.ai/legal/self-hosted-commercial-license-terms , https://huggingface.co/blog/black-forest-labs/flux-2-klein-lora , https://invideo.io/blog/flux-ai-image-generator/ , https://www.developersdigest.tech/models/image-generation/black-forest-labs

### 2.4 ByteDance — Seedream 5.0 Pro / Lite, 4.5 (SeedEdit는 Seedream에 통합)

| 항목 | 내용 |
|---|---|
| 계보 | SeedEdit 3.0(2025) → **Seedream 4.0(2025-09-09)부터 생성·편집 통합**, 별도 SeedEdit 라인 종료 |
| 현행 | **Seedream 5.0 Pro**(BytePlus ModelArk 2026-07-08, 2차), **5.0 Lite**(2026-02-24, 2차; 8월 재출시 설도 있음 — 날짜 **미확인**), 4.5(널리 서비스 중) |
| 가격 | Pro: **$0.045(≤2.36MP) / $0.09(초과)**, 참조 1장 무료 + 추가 참조당 $0.003(Atlas Cloud, 2차). 다른 집계는 $0.03(1K)/$0.06(2K). Lite ≈ $0.035. 4.5 edit: fal $0.04 |
| 멀티레퍼런스 | Pro 최대 10장, Lite 최대 14장(2차). fal 4.5 edit: 10장 |
| 마스크 | 명시적 마스크 없음("자연어 국소 편집", "미편집 영역 유지" 주장) |
| 해상도 | 1K/1.5K/2K(4K 표기 자료도 있어 불일치) |
| 지연시간 | 5.0 Lite 3–5초(2차) vs 5–15초(2차, "deep thinking" 포함) 불일치. 4.5 edit fal 플레이그라운드 약 60초 표기 |
| 시드 | fal 호스팅은 seed 지원(일반적) — 공식 API **미확인** |
| 파인튜닝 | 없음(발견 못 함) |
| 한국 가용 | **가능** — BytePlus 국제 가용성 페이지에 South Korea 명시("Restricted Model" 예외), 리전은 Johor(ap-southeast-1)/Dublin(eu-west-1). 계정 등록 국가 불일치 시 `CountryAreaInvalid` 에러 |
| 벤치마크 | **AA 편집 아레나 Identity-Preserving Edit 보드 1위(Seedream 5.0 Pro, 2026-09-02 개편 시점)**, 종합 1,132. GEditBench v2: Seedream 4.5 종합 2위(1,089), VQ 1,142 1위, VC 1,030 |
| 평판 | 다중 참조 일관성·가성비 우위(2차 다수). 4.0 시절 포즈 드리프트, 다인물 합성 시 왜곡 보고. 4.5는 "인물·소형 텍스트·색조 보존"을 명시 타깃 |

출처: https://seed.bytedance.com/en/blog/bytedance-released-image-editing-model-seededit-3-0-enhanced-image-consistency-and-usability-rate , https://www.atlascloud.ai/blog/ai-updates/seedream-5-0-pro-price , https://mer.vin/2026/07/seedream-5-0-pro-api-on-byteplus-precision-image-generation-and-multi-reference-editing/ , https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit , https://docs.byteplus.com/en/docs/ModelArk/availability , https://docs.byteplus.com/en/docs/ModelArk/2191806 , https://alphasignal.ai/news/artificial-analysis-rebuilds-its-image-editing-arena-across-17-specialized

### 2.5 Microsoft — MAI-Image-2.6 / 2.6-Flash

- 2026-09-04 Microsoft Foundry 공개 프리뷰. 참조 이미지 **최대 5장**, "정밀·제어 가능한 image-to-image 편집" 포지셔닝.
- 가격: OpenRouter 토큰 과금(텍스트 $5 / 이미지 입력 $8 / 이미지 출력 **$38** per 1M); APIYI 정액 $0.12(2.6) / $0.06(Flash) (2차).
- 벤치마크: AA 편집 아레나 개편(2026-09-02) 시 MAI-Image-2.6-Preview 종합 1위·17개 보드 중 7개 1위, 2.6-Flash는 Identity-Preserving·Reasoning·Composition 강세(2차). 2026-10 v2.1 스냅샷에서는 GPT Image 2.5에 밀려 종합 1,151(공동 3–6위).
- 한국 가용: Azure 리전 의존 — **미확인**. 모델 카드 PDF는 텍스트 추출 실패.
- 출처: https://ai.azure.com/catalog/models/MAI-Image-2.6 , https://openrouter.ai/microsoft/mai-image-2.6 , https://docs.apiyi.com/en/api-capabilities/mai-image/overview , https://digg.com/ai/1u8diui0

### 2.6 Alibaba — Qwen-Image-3.0 / 3.0 Pro (API 전용)

- Model Studio(싱가포르 리전, 국제) 제공. 입력 이미지 $0.003/장(공식), 출력 1K 약 $0.04 / 2K 약 $0.075(2차). **레이트리밋 1 RPM**(2차) — 서비스용으로는 치명적, 확인 필요. AA v2.1: Qwen-Image-3.0-Pro 1,090.
- 출처: https://www.alibabacloud.com/help/en/model-studio/qwen-image-3-0-pro , https://llmgateway.io/models/qwen-image-3.0-pro

### 2.7 기타 상용

| 서비스 | 요점 | 출처 |
|---|---|---|
| **Reve 2.1 Edit** (2026-07-09) | AA 8월 스냅샷 1,262로 상위권. 가격 약 $0.20/edit(2차, 불일치: "Edit Fast" $0.007) | https://www.eesel.ai/blog/reve-2-1-pricing , https://www.atlascloud.ai/models/reve-ai/reve-2.1/edit |
| **Krea 3 (Ultra/Fast)** | AA v2.1 1,151 / 1,125. API 가격 **미확인** | https://artificialanalysis.ai/image/leaderboard/editing |
| **Ideogram 4.5 / 4.0 / 3.0** | 3.0: Turbo $0.03 / Default $0.06 / Quality $0.09, 캐릭터 참조 가산($0.10–0.20). 4.5는 "다중 턴 편집 드리프트 감소" 마케팅. 편집·이미지 참조는 priority credits 필요. 4.x 가격 **미확인** | http://ideogram.ai/pricing/?pricing_tab=api , https://runtimewire.com/article/ideogram-45-multi-turn-image-editing |
| **Recraft V4 / V4.1 / V4 Styles** | V4 $0.04, V4.1 $0.035, V4.1 Flash $0.007; V4 Styles는 참조 10장 가능하나 "참조의 렌더링 기법을 재현하는 신규 생성"이지 원본 편집이 아님. 마스크 inpainting **미확인** | https://openrouter.ai/recraft/recraft-v4-styles |
| **Runway Gen-4 Image (References)** | 약 8크레딧/1080p ≈ $0.08(2차). Runway 개발자 API는 GPT Image 2도 중개 | https://docs.dev.runwayml.com/ |
| **Adobe Firefly Services (Image Model 5)** | 네이티브 4MP, **Instruct Edit**(자연어 편집), **Custom Models API(피사체/스타일 커스텀 학습 — 상용 API 중 유일)**, Composite API(제품 합성). 크레딧 과금(API 호출당 1–20 크레딧, 2차), 공개 모델 출력 면책(커스텀 모델 출력은 제한, 2차) | https://developer.adobe.com/firefly-services/docs/firefly-api/ , https://redresscompliance.com/adobe-firefly-enterprise-pricing-2026 |
| **Stability AI Stable Image Services** | Inpaint / Search&Replace 5크레딧 = **$0.05**(2025-08 가격표) | https://stability.ai/api-pricing-update-25 |
| **Midjourney** | 2026-08-18 기준 공식 API 없음, ToS(2026-05-27)가 자동화 도구 금지 → 제외 | https://unifically.com/blogs/midjourney-api |
| **Google Vertex AI Virtual Try-On** (`virtual-try-on-preview-08-04`) | 약 $0.06/이미지(2차), 50 RPM, 상태 "deprecating"(2차) | https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/virtual-try-on-preview-08-04 |
| **Kling Kolors Virtual Try-On v1.5** | 약 $0.07/이미지(fal 등) | https://fal.ai/models/fal-ai/kling/v1-5/kolors-virtual-try-on/llms.txt |
| **FASHN API** | $0.075/크레딧(종량), 티어 시 약 $0.049. VTON v1.5 오픈웨이트 Apache 2.0(2026-01) | https://fashn.ai/blog/comparing-the-top-4-open-source-virtual-try-on-viton-models |

---

## 3. 오픈웨이트 전수 조사

| 모델 | 출시 | 파라미터 | 라이선스 | 멀티레퍼런스 | 마스크 | VRAM | 보존력 지표(GEditBench v2 VC / 종합) | 비고 |
|---|---|---|---|---|---|---|---|---|
| **FLUX.2 [klein] 4B** | 2026-01-15 | 4B | **Apache 2.0** | 지원(수 미기재) | 미언급 | ~13GB(RTX 3090/4070+) | **VC 1,070 / 1,031** | 4스텝, "1초 미만" 주장. LoRA 1시간/24GB. 커뮤니티: 반복 편집 시 아이덴티티 손실 보고 |
| FLUX.2 [klein] 9B | 2026-01-15 | 9B | FLUX Non-Commercial | 지원 | 미언급 | — | VC 1,019 / **1,039(오픈 1위)** | 상업 자체호스팅 유료 |
| FLUX.2 [dev] | 2025-11-25 | 32B | FLUX Non-Commercial | 지원 | ControlNet-Union(alibaba-pai)에 inpainting 포함 | 대형 | VC 1,018 / 1,006 | 호스팅 API 없음(로컬 전용) |
| **FLUX 3 Image Klein** (Distilled/Base) | 2026-10 | 5.6B | **FLUX Kommunity License(조건 미확인)** | 10장 + 바운딩 박스 | 바운딩 박스 | RTX 3090 | 벤치 미게재 | Base = LoRA용. 프롬프트 업샘플러 필수 |
| FLUX.1 Kontext [dev] | 2025-06 | 12B | FLUX.1 NC(상업 라이선스 구매 가능) | 단일 | — | — | VC 840 / 869 | 구세대, 비권장 |
| FLUX.1 Fill [dev] | 2024-11 | 12B | FLUX.1 dev NC | — | **마스크 inpainting 전용** | — | — | 상업은 유료 |
| **Qwen-Image-Edit-2511** | 2025-11/12 | 20B | **Apache 2.0** | 지원(예시 2장) | 미언급 | 대형(오프로드 가능) | VC 972 / **1,038(오픈 2위)**, IF 1,095 | "이미지 드리프트 감소·아이덴티티 향상" 공식. LoRA: fal $8/2,000스텝, AI Toolkit <10GB 가능 |
| Qwen-Image-Edit-2509 | 2025-09 | 20B | Apache 2.0 | 1–3장 | — | — | VC 955 / 1,014 | VTON LoRA 커뮤니티 다수 |
| Qwen-Image-Layered (2512) | 2025-12 | 20B | Apache 2.0 | — | — | — | — | 레이어 분해 → 후합성에 유용 |
| **Qwen-Image-2.1** | 2026-09-20 | 7B | **Qwen Research License(비상업, 상업은 별도 계약)** | **최대 10장** | **마킹 주석/별도 마스크로 국소 편집 지원** | 2048² 40스텝 예시 | AA 오픈 1,083 | 기능은 이상적이나 라이선스 걸림 |
| Step1X-Edit v1p2 | 2025-11-26 | 12B | Apache 2.0 | — | — | — | **VC 1,067** / 996 | thinking→editing→reflection 루프(의도치 않은 변경 자가 수정) |
| LongCat-Image-Edit | 2025-12 | 미기재 | Apache 2.0 | 참조 유도 편집 | — | ~18GB(오프로드) | VC 1,017 / 1,001 | "비편집 영역 유지" 강조 |
| GLM-Image | 2026 | 9B AR + 7B diff | MIT | 다중 입력 | — | ~23GB(오프로드) | **VC 1,109(최고)** / 979, IF 787(최저) | 보존은 최고, 지시 이행 최저 |
| OmniGen2 | 2025 | 7B급 | Apache 2.0 | 다중 | — | ~17GB | VC 929 / 888 | "지시를 가끔 안 따름", 객체 변형 자인 |
| BAGEL-7B-MoT | 2025 | 7B 활성/14B | Apache 2.0 | — | — | — | VC 987 / 851(최하) | GEdit-Bench 자가 6.52 |
| HiDream-E1.1 | 2025-07-16 | 17B | MIT(텍스트 인코더 Llama 조건) | — | — | — | 미게재(EmuEdit 7.57) | |
| HunyuanImage 3.0 Instruct | 2026-01-26 | 80B급 | Tencent Hunyuan Community License — **EU·영국·한국 제외**(2차) | — | — | 초대형 | AA 오픈 1,064 | **한국 사업자 사용 불가로 간주** |
| Z-Image (Turbo/Base) | 2025-11 | 6B | Apache 2.0 | — | — | 16GB | — | **Z-Image-Edit 미출시**(2026-08 기준) |
| Bria FIBO-Edit / 1.5 Turbo | 2026 | — | CC BY-NC 4.0(상업 별도) | — | — | — | AA 오픈 "Fibo 2.0" 1,087(모델 존재 **미확인**) | 상업은 계약 필요 |
| SD3.5 Large/Medium + ControlNet | 2024-10 | 8B/2.5B | Stability Community License(연매출 **$1M 미만 무료**) | IP-Adapter 별도 | inpainting 가능 | — | 구세대 | 등록·"Powered by Stability AI" 표시 요구(2차) |
| SDXL inpainting + ControlNet + IP-Adapter | 2023 | 2.6B | OpenRAIL++ | IP-Adapter | 네이티브 inpainting | 8–12GB | 구세대 | 가장 성숙한 마스크/구조 제어 생태계, 품질은 2세대 뒤짐 |

보조 모델:
- **세그멘테이션**: Meta **SAM 3**(2025-11-19, "SAM License" — 비표준, gated, 파인튜닝 허용, 소송 시 라이선스 종료 조항), `mattmdjaga/segformer_b2_clothes`(ATR 18클래스, mIoU 0.69 — 상의/치마/바지/드레스/벨트 등), Grounded-SAM(DPDEdit 논문이 패션 편집 영역 지정에 사용). 학계는 "SAM이 유연한 의류 일반화가 약해 패션 특화 파인튜닝 필요"라고 지적.
- **구조 제어(ControlNet)**: `InstantX/Qwen-Image-ControlNet-Union`(canny/soft edge/depth/pose, 권장 scale 0.8–1.0), `alibaba-pai/FLUX.2-dev-Fun-Controlnet-Union`(canny/HED/depth/pose/MLSD/scribble/gray + inpainting, scale 0.65–0.80), InstantX FLUX.1-dev ControlNet Union.

출처: https://huggingface.co/black-forest-labs/FLUX.2-klein-4B , https://huggingface.co/Qwen/Qwen-Image-Edit-2511 , https://huggingface.co/Qwen/Qwen-Image-2.1 , https://huggingface.co/stepfun-ai/Step1X-Edit-v1p2 , https://huggingface.co/meituan-longcat/LongCat-Image-Edit , https://huggingface.co/zai-org/GLM-Image , https://github.com/VectorSpaceLab/OmniGen2 , https://huggingface.co/ByteDance-Seed/BAGEL-7B-MoT , https://huggingface.co/HiDream-ai/HiDream-E1-1 , https://comfyui-wiki.com/en/news/2025-09-27-tencent-open-source-hunyuan-image-3-0 , https://invideo.io/blog/open-source-image-models-licenses/ , https://huggingface.co/briaai/Fibo-Edit , https://huggingface.co/InstantX/Qwen-Image-ControlNet-Union , https://hackernoon.com/a-guide-to-flux2-dev-fun-controlnet-union , https://huggingface.co/mattmdjaga/segformer_b2_clothes , https://blog.roboflow.com/what-is-sam3/ , https://arxiv.org/abs/2409.01086 , https://zhangqijiang07.github.io/gedit2_web/

---

## 4. 후보 비교표 (a)~(h)

범례: ◎ 우수 / ○ 보통 / △ 약함 / ✕ 불가 / ? 미확인. "보존력"은 GEditBench v2 VC·AA Identity 보드·커뮤니티 리뷰를 종합한 정성 평가.

| 모델 | (a) 원형 보존력 | (b) 멀티레퍼런스(내 옷 + 회사 시안) | (c) 마스크 부분편집 | (d) 지연 | (e) 비용/장 | (f) 상업 라이선스 | (g) 파인튜닝/LoRA | (h) 한국 API |
|---|---|---|---|---|---|---|---|---|
| Nano Banana 2.1 | ○~◎ (Pro는 VC 1,108) | ◎ 최대 14장 | △ 프롬프트형(API 마스크 필드 미확인) | ○ 수 초~15초 | **$0.034(1K)** | ◎ API 출력 상업 OK, SynthID | ✕ | ◎ |
| Nano Banana Pro | ◎ | ○ (모델별 한도 상이) | △ | △ 약 30초 | $0.134 | ◎ | ✕ | ◎ |
| GPT Image 2.5 Sunburst | ○ (2.5에서 개선 주장; 1.5는 VC 최하) | ◎ 다수(상한 미기재) | **○ alpha 마스크 지원(형태 비보장)** | △ 최대 2분 | $0.04–0.05(high)~$0.21(max) | ◎ | ✕ | ◎ |
| GPT Image 2.5 Flare | ○ | ◎ | ○ | ○ | 동일 | ◎ | ✕ | ◎ |
| Seedream 5.0 Pro | **◎ AA Identity 1위** | ◎ 10장(+$0.003/장) | △ 자연어 국소편집 | ○ (수치 불일치) | $0.045 | ◎ (BytePlus 약관) | ✕ | ◎ (South Korea 명시) |
| Seedream 5.0 Lite | ○ | ◎ 14장 | △ | ◎ 3–5초(2차) | ~$0.035 | ◎ | ✕ | ◎ |
| MAI-Image-2.6 / Flash | ○~◎ (Flash Identity 강세) | ○ 5장 | ? | ? | ~$0.12 / $0.06(2차) | ○ 프리뷰 | ✕ | ? |
| FLUX 3 Image | ? (신규, 벤치 미게재) | ◎ 10장 + **바운딩 박스** | △ 바운딩 박스(마스크 아님) | ? | $0.048(1K) | ◎ | △ (API finetune 베타) | ○ (제한 미발견) |
| FLUX.2 [pro] edit | ○ (dev VC 1,018) | ○ 8장(API) | ✕ (Fill pro 별도) | ○ | $0.045/MP | ◎ | ✕ (API) | ○ |
| FLUX.1 Fill [pro] | ◎ (마스크 밖 보존 구조적) | ✕ | **◎ 흑백/alpha 마스크** | ○ | ? | ◎ | ✕ | ○ |
| FLUX.2 [klein] 4B (자체호스팅) | **◎ VC 1,070(오픈 최상위권)** | ○ | △ (ControlNet/Fill 조합 필요) | ◎ 1초 미만 | GPU 비용만 | **◎ Apache 2.0** | **◎ LoRA 1h/24GB** | ◎ (자체) |
| Qwen-Image-Edit-2511 (자체호스팅) | ○ VC 972, 드리프트 개선 | ○ | △ (ControlNet-Union 조합) | △ 20B | GPU 비용 | **◎ Apache 2.0** | **◎ fal $8/2k스텝** | ◎ |
| FLUX 3 Image Klein (자체) | ? | ◎ 10장 + 바운딩 박스 | △ | ◎ | $0.009(API) | △ Kommunity License(조건 미확인) | ◎ Base LoRA | ◎ |
| Qwen-Image-2.1 | ◎(추정, 10장+마스크) | ◎ 10장 | **◎ 마스크/주석** | ○ 7B | GPU | **✕ Research License** | ◎ | — |
| Step1X-Edit v1p2 | ◎ VC 1,067 | △ | ✕ | △ 12B+반성 루프 | GPU | ◎ Apache | ○ | ◎ |
| GLM-Image | ◎ VC 1,109 / IF 최하 | ○ | ✕ | △ 23GB | GPU | ◎ MIT | ○ | ◎ |
| HunyuanImage 3.0 Instruct | ○ | ○ | ✕ | ✕ 80B급 | GPU | **✕ 한국 제외(2차)** | — | ✕ |
| SDXL/SD3.5 inpainting + ControlNet + IP-Adapter | ◎ (마스크 밖 구조 보존) | △ IP-Adapter 1~2장 | ◎ | ◎ | GPU | ◎/○($1M 조건) | ◎ | ◎ |
| Adobe Firefly Image 5 (Instruct Edit + Custom Models) | ○ | ○ | ◎ Fill(마스크) | ○ | 크레딧(미확인) | ◎ 면책 | **◎ Custom Models API** | ○ |
| Stability Inpaint / Search&Replace | ○ | ✕ | ◎ | ◎ | $0.05 | ◎ | ✕ | ○ |

---

## 5. 벤치마크·평판 (identity preservation 관점)

### 5.1 GEditBench v2 (2026-03-26 기준, 1,200 샘플, 23개 태스크)

| 순위 | 모델 | IF(지시 이행) | VQ(품질) | **VC(시각적 일관성=보존)** | 종합 | 아레나 Elo |
|---|---|---|---|---|---|---|
| 1 | Nano Banana Pro | 1,126 | 1,066 | **1,108** | 1,096 | 1,251 |
| 2 | Seedream 4.5 | 1,111 | 1,142 | 1,030 | 1,089 | 1,196 |
| 3 | GPT Image 1.5 | **1,260** | 1,149 | **846** | 1,071 | 1,270 |
| 4 | FLUX.2 [klein] 9B | 1,083 | 1,025 | 1,019 | 1,039 | 1,166 |
| 5 | Qwen-Image-Edit-2511 | 1,095 | 1,060 | 972 | 1,038 | 1,164 |
| 6 | FLUX.2 [klein] 4B | 1,007 | 1,019 | **1,070** | 1,031 | 1,107 |
| 7 | FLUX.2 [dev] Turbo | 1,068 | 936 | 1,064 | 1,021 | 1,153 |
| 8 | Qwen-Image-Edit-2509 | 1,033 | 1,062 | 955 | 1,014 | 1,142 |
| 12 | Step1X-Edit v1p2 | 909 | 1,007 | 1,067 | 996 | 1,093 |
| 13 | GLM-Image | 787 | 1,023 | **1,109** | 979 | 930 |
| 15 | FLUX.1 Kontext [dev] | 849 | 900 | 840 | 869 | 1,017 |
| 16 | BAGEL | 820 | 694 | 987 | 851 | 915 |

해석: **IF와 VC는 트레이드오프 경향**이 뚜렷하다(GPT Image 1.5: IF 최고·VC 최저, GLM-Image: 반대). 리폼 미리보기는 "지시를 적당히 따르되 원본을 반드시 보존"해야 하므로, 종합 순위보다 VC가 중요하며 **VC가 낮은 모델은 반드시 마스크 후합성으로 보완**해야 한다. 벤치마크 저자들도 "작은 얼굴에서 어려움"을 질적 실패 사례로 꼽는데, 이는 옷의 **작은 로고/라벨/프린트**에 그대로 적용될 가능성이 높다.
출처: https://zhangqijiang07.github.io/gedit2_web/ , https://arxiv.org/html/2603.28547v1

### 5.2 Artificial Analysis Image Editing Arena v2.1 (2026-10 스냅샷)

종합: GPT Image 2.5 Sunburst 1,199 > Flare 1,181 > Nano Banana 2.1 1,152 ≈ MAI-Image-2.6 1,151 ≈ Krea 3 Ultra 1,151 > MAI-2.6-Flash 1,143 > GPT Image 2(high) 1,136 > Seedream 5.0 Pro 1,132 > Muse Image 1,129 > ... > Nano Banana Pro 1,106 > HunyuanImage 3.5 Preview 1,093 > Qwen-Image-3.0-Pro 1,090. 오픈웨이트: "Fibo 2.0" 1,087(미확인), Qwen-Image-2.1 1,083, HunyuanImage 3.0 Instruct 1,064.
2026-09-02 개편(7개 편집 행위 × 10개 유스케이스 = 17 보드)에서 **Identity-Preserving Edit 1위 = Seedream 5.0 Pro("얼굴·외형·의상(outfit) 유지")**, Object-Level Edit·Composition 1위 = GPT Image 2(high), Enhancement 1~4위 = MAI 계열. 유스케이스 보드에 **Retail**이 있으므로 PoC 시점에 해당 보드를 직접 확인할 것.
출처: https://artificialanalysis.ai/image/leaderboard/editing , https://alphasignal.ai/news/artificial-analysis-rebuilds-its-image-editing-arena-across-17-specialized , https://benchmarklist.com/arenas/artificial_analysis_image_editing/

### 5.3 arena.ai (구 LMArena) Image Edit Arena

2026-10-06 preliminary: gpt-image-2.5-sunburst 1,524(59,825표) > flare 1,481. 2026-05-22 스냅샷(47모델, 2,676만 표)에서도 OpenAI·xAI·Google이 상위, Alibaba·ByteDance 1,300대. 출처: https://www.llmreference.com/benchmark/lmarena-image-edit , https://arena.ai/leaderboard/image-edit (직접 접근 403)

### 5.4 다중 턴/반복 편집 드리프트 연구 (2026)

- **Agent Banana (arXiv 2602.09084)**: "Prior-Induced Editing Drift(PIED)" — 편집 턴이 누적되면 비편집 영역이 생성기 선호 텍스처/스타일로 서서히 이동. PSNR을 부풀릴 수 있음. 해법은 레이어 분해 + 마스킹 + 국소 편집(포토샵식).
- **Banana100 (arXiv 2604.03400)**: 100회 반복 편집 열화 데이터셋, 21개 NR-IQA 지표 모두 열화를 감지 못함 → **자동 QA 지표 설계 시 일반 화질 지표 무용**.
- **EdiVal-Agent (2509.13399)**: 일부 모델은 여러 턴 후 과노출.
- 시사점: 리폼 미리보기에서 "디자인 A 적용 → 색 바꿔 → 기장 줄여" 같은 연쇄 편집을 허용하려면 **항상 원본에서 재편집(스택이 아닌 재생성) + 마스크 밖 원본 복원**이 필요.
출처: https://arxiv.org/abs/2602.09084 , https://arxiv.org/abs/2604.03400 , https://www.alphaxiv.org/overview/2509.13399

### 5.5 커뮤니티/리뷰 요약

| 모델 | 긍정 | 부정(실패 보고) |
|---|---|---|
| Nano Banana(2/Pro/2.1) | 동일 인물·제품 반복 편집 시 아이덴티티 유지 호평; 포토샵 연동 시 "원본 조명·색 매칭" | 2회차 생성에서 톤/채도/샤픈 변화; 요청 안 한 객체 추가; 작은 선택 영역 편집 시 늘어짐·왜곡; 텍스트 약함 |
| GPT Image 1.5/2/2.5 | 2.5: 반복 편집에서 인물·옷 유지 개선(단일 테스트); 텍스트·공간 논리 최상 | 노란 색조 경향, 색 변경 요청 시 전체 재생성, 과샤픈, 마스크가 형태를 정확히 못 따름(공식 명시) |
| Seedream 4.5/5.0 | 다중 참조 일관성·가성비·소형 텍스트·색조 보존 타깃 | 다인물 합성 시 왜곡/늘어짐, 4.0 포즈 드리프트, 복합 지시 시 변동성(Lite) |
| FLUX.2 klein | 1초 미만 속도, Apache, LoRA 용이 | ComfyUI 사용자: 반복/복원 워크플로에서 아이덴티티 손실·해부 드리프트; "상표 픽셀 유지하며 조명 바꿔" 같은 모순 지시에 약함 |
| Qwen-Image-Edit-2511 | 공식 "드리프트 감소·아이덴티티 향상", 커뮤니티 LoRA 내장 | 독립 측정 부재; 구버전은 색조·피부톤 이동 보고(비디오 키프레임 사례) |
| OmniGen2 / BAGEL | Apache, 경량 | 모델 카드 자인: "지시를 가끔 무시", "객체가 원본과 달라짐"; GEditBench v2 최하위 |

출처: https://lindsaymarsh.substack.com/p/is-googles-new-nano-banana-really , https://ihnatko.com/whats-a-nano-banana-anyway/ , https://community.adobe.com/questions-700/nano-banan-issue-670360 , https://community.openai.com/t/gpt-image-1-5-decreased-image-render-quality/1371885 , https://medium.com/@302.AI/seedream-4-5-vs-nano-banana-pro-can-the-sota-be-replaced-99056bee667d , https://aireiter.com/blog/flux-2-klein-prompt-guide-image-editing-consistency , https://hackernoon.com/the-image-editor-that-finally-stops-face-drift-inside-qwen-image-edit-2511

---

## 6. 가상 피팅(VTON) 모델의 적합성 평가

### 6.1 모델 현황 (FASHN 비교표 2026-10 갱신 + 자체 조사)

| 모델 | 출시 | 라이선스 | 특징 | 본 과제 적합도 |
|---|---|---|---|---|
| CatVTON | 2024-07 (ICLR'25) | CC BY-NC-SA 4.0 | <8GB, 약 11초, 의류 형태 보존 강함 | 비상업 → 연구용 |
| IDM-VTON | 2024-03 (ECCV'24) | CC BY-NC-SA 4.0 | 텍스처·색 재현 최고(2025 테스트), 자동 마스크는 상의만 | 비상업 |
| OOTDiffusion | 2024-03 | CC BY-NC-SA 4.0 | 2-UNet, 2025 테스트 최하(46초) | 비상업·구세대 |
| Leffa | 2024-12 (CVPR'25) | MIT(가중치는 VITON-HD/DressCode 학습 → 데이터셋 조건 확인) | 피팅+포즈 전이, 6초 | 조건부 상업 |
| FitDiT | 2024-11 | CC BY-NC-SA 4.0, 가중치 신청제 | DiT 기반 세부 디테일 | 비상업 |
| **FASHN VTON v1.5** | 2026-01 | **Apache 2.0** | 972M, 마스크 프리, 픽셀 공간, 플랫레이/착장 참조 모두 | 상업 가능, 상의/하의/원피스 |
| OmniTry | 2025-08 | Apache 2.0 LoRA(기반 FLUX.1-Fill-dev는 NC) | 액세서리·주얼리 마스크 프리 | 기반 모델 라이선스 걸림 |
| Qwen-Image-Edit-2509 + VTON LoRA | 2025 | Apache 2.0(LoRA별 확인) | 20B, 프롬프트 제어 | 상업 가능, 무거움 |
| **FLUX VTO v2** (API) | 2026 | API 출력 상업 OK | 사람+의류(그리드로 다수), <4초(2차), 로고·스티치 보존 강조 | 사람 필수 |
| Kling Kolors VTO v1.5 (API) | 2024~ | API | 약 $0.07 | 사람 필수 |
| Google Vertex VTO preview-08-04 | 2025 | API | 약 $0.06(2차), deprecating(2차) | 사람 필수 |
| 최신 연구 | 2026 | — | OpenVTON-Bench(2601.22725), OmniVTON++(2602.14552), FitVTON(2606.12012, 사이즈 제어), CtrlVTON(2607.09362, 인스턴스 프롬프트 세그), TAMF-VTON(2607.14807) | 연구 추적 |

### 6.2 결론: 직접 적합하지 않음, 부분 재사용 가능

- **문제 정의 차이**: VTON은 입력 (사람 P, 의류 G) → 출력 "P가 G를 입은 이미지". 우리는 입력 (의류 G, 디자인 D) → 출력 "G의 일부가 D로 바뀐 G'". VTON은 **의류를 변형하지 않고 옮겨 입히는** 것이 목표라서 "소매 제거·크롭·염색·자수 추가" 같은 변형 연산이 없다.
- **재사용 가능한 부분**
  1. **2차 연출(옷 → 착장 미리보기)**: 리폼 결과 G'를 FLUX VTO/FASHN으로 모델에 입혀 "착용 시 느낌"을 추가 제공. 전환율 관점에서 가치 있으나 1차 핵심은 아님.
  2. **의류 파싱/마스크 기술**: VTON 파이프라인의 human/cloth parsing(ATR·LIP 기반 SegFormer, DensePose 등)을 **옷 단독 사진의 부위 세그멘테이션**(소매·칼라·밑단·프린트 영역)에 전용. 다만 대부분 "사람 착장" 데이터로 학습돼 옷걸이/바닥 플랫레이 사진에서는 성능 저하 가능 → 자체 소량 파인튜닝 또는 SAM 3 프롬프트 세그 병행.
  3. **"패치워크/하프앤하프" 유형**: 다른 옷의 영역을 가져와 합치는 작업은 VTON의 "garment warping + 합성" 논리와 유사. 하지만 2026 통합 편집 모델(멀티레퍼런스)이 더 범용적이라 VTON 전용 모델을 쓸 이유는 약함.
  4. **사용자가 입은 상태로 찍은 경우**: 사용자가 옷을 입고 촬영하면 VTON 연구의 "try-off(착장 → 플랫 의류 복원, IGR 2412.11513, Voost)" 기법으로 의류 원형을 복원한 뒤 편집하는 경로가 생긴다. 다만 촬영 가이드로 "옷만 평평하게/옷걸이에 걸어 촬영"을 유도하는 편이 훨씬 싸고 안정적.
- **라이선스 리스크**: 유명 학술 VTON(CatVTON·IDM-VTON·OOTD·FitDiT·StableVITON)은 전부 CC BY-NC-SA → 상업 서비스에 직접 탑재 불가.

출처: https://fashn.ai/blog/comparing-the-top-4-open-source-virtual-try-on-viton-models , https://docs.bfl.ml/flux_2/flux_vto , https://arxiv.org/pdf/2601.22725 , https://arxiv.org/pdf/2606.12012 , https://arxiv.org/pdf/2607.09362 , https://arxiv.org/pdf/2412.11513

---

## 7. 파이프라인 설계 옵션 비교

목표 함수: **(마스크 밖 픽셀 변화 ≈ 0) ∧ (마스크 안은 회사 디자인 D에 충실) ∧ (경계가 자연스러움) ∧ (p95 지연 < 30초) ∧ (장당 원가 < 200원)**.

### 옵션 (i) 범용 편집 모델에 프롬프트 + 레퍼런스만

- 구성: [내 옷 사진, 회사 시안 1~3장] + 구조화 프롬프트 → Nano Banana 2.1 / GPT Image 2.5 / Seedream 5.0 Pro 1회 호출.
- 품질: 지시 이행은 최상. 그러나 **보존은 보장 안 됨**(톤 드리프트, 요청 외 변경, 로고 재해석). GEditBench v2 VC·커뮤니티 보고가 이를 뒷받침.
- 비용: $0.034–0.05/장(1K), 개발 난이도 **최저(1~2주)**.
- 판단: **PoC 0단계·데모용**으로는 충분, 서비스 단독 사용은 위험.

### 옵션 (ii) 세그먼트 마스크 + inpainting

- 구성: 의류 파싱(SegFormer-clothes/SAM 3) → 리폼 유형별 마스크 규칙(예: "소매 제거"=소매 영역, "크롭"=밑단 아래 영역, "자수"=지정 좌표 박스) → 마스크 inpainting(FLUX.1 Fill pro, GPT Image 2.5 마스크, Stability Inpaint, 자체 FLUX.2-dev-Fun-ControlNet inpainting) → **마스크 밖은 원본 픽셀로 복원(알파 블렌딩 + 경계 페더링)**.
- 품질: 보존은 구조적으로 보장. 단점은 (1) 마스크 품질이 곧 결과 품질, (2) inpainting 전용 모델(Fill)은 **멀티레퍼런스를 못 받아** 회사 디자인 스타일을 텍스트로만 전달 → 디자인 충실도 하락, (3) 형태가 바뀌는 리폼(크롭·조끼화)은 "지우고 배경 채우기"가 필요해 inpainting이 오히려 적합(옷을 '없애는' 작업은 Fill/Eraser가 강함).
- 비용: 파싱(자체 GPU, 수 ms) + inpainting $0.04–0.05. 개발 난이도 **중(4~6주)**.
- 판단: "제거형 리폼(크롭·소매 제거·디스트레스)"의 핵심 경로.

### 옵션 (iii) ControlNet(depth/canny/lineart)로 구조 고정 + 스타일 주입

- 구성: 자체 호스팅 FLUX.2 [dev]/[klein] 또는 Qwen-Image-Edit + ControlNet-Union(canny/depth) + IP-Adapter/레퍼런스 주입 + (회사 디자인 LoRA).
- 품질: **실루엣·주름·봉제선을 그대로 고정**하므로 염색/프린트/자수 같은 "표면 변경형"에 최적. 반면 **형태를 바꾸는 리폼(크롭·조끼화·실루엣 변경)과는 상충**(구조를 고정하면 형태를 못 바꿈) → 마스크 영역만 ControlNet 가중치를 낮추는 부분 제어 필요.
- 비용: GPU 원가(klein 4B 기준 A10G/L4급에서 1~3초, 장당 수 원). 개발 난이도 **높음(8~12주, ComfyUI/Diffusers 엔지니어 필요)**. FLUX.2 [dev] 상업 자체호스팅은 유료 라이선스, klein 4B·Qwen-Edit-2511은 Apache.
- 판단: 2안(중장기 자체 스택)의 핵심.

### 옵션 (iv) 조합/2단계 — "Guarded Edit" (권장)

```
[입력] 사용자 옷 사진 (촬영 가이드: 옷만, 단색 배경, 정면)
  ├─ 1. 전처리: 배경 제거/정규화, 의류 분류(상의/하의/아우터), 부위 파싱 → 부위 마스크 세트
  ├─ 2. 디자인 매칭: 회사 "디자인 카드"(참조 이미지 3~5장 + 적용 부위 + 프롬프트 템플릿 + 금지사항)
  ├─ 3. 생성(병렬 N=3~4): 멀티레퍼런스 편집 모델(상용) 또는 자체 모델
  │      프롬프트: "이미지1의 옷을 그대로 유지하되 [부위]만 이미지2의 디자인으로 … 로고·색·주름·배경은 변경 금지"
  │      (FLUX 3 Image면 바운딩 박스로 부위 지정, GPT Image면 alpha 마스크 동봉)
  ├─ 4. 후합성(compositing): 결과를 원본에 정합(ECC/SIFT 호모그래피) → 리폼 마스크(페더 8~16px) 안만 채택
  │      → 마스크 밖은 원본 픽셀 100% 복원, 색조 보정(마스크 밖 ΔE 모니터)
  │      → 형태 변경형(크롭/조끼)은 "제거 마스크"로 배경 inpaint 후 합성
  ├─ 5. 자동 QA: 마스크 밖 LPIPS/SSIM/ΔE2000 임계치, 로고 영역 특징 매칭(SIFT/OCR), 디자인 충실도(CLIP-I/DINO vs 디자인 카드),
  │      VLM 심판(Gemini/GPT 비전)으로 "요청 외 변경 여부" 체크 → N개 중 최상 선택, 전부 실패 시 재생성/저해상 폴백
  └─ 6. (선택) 2차 연출: FLUX VTO/FASHN으로 모델 착장 컷 생성
```
- 품질: 보존 보장 + 상용 모델의 디자인 표현력 결합. 가장 현실적.
- 비용: N=3 기준 $0.10–0.15/요청(상용) 또는 GPU 원가(자체). 개발 난이도 **중상(6~10주)**.
- 핵심 리스크: 정합(alignment). 편집 모델이 출력을 미세하게 확대/이동/재구성하면 후합성 경계가 어긋남 → 출력 크기 고정, 종횡비 고정, 필요시 호모그래피 정합, 경계 페더링과 Poisson 블렌딩으로 완화.

### 옵션 비교 요약

| 옵션 | 보존력 | 디자인 충실도 | 형태 변경형 리폼 | 비용/장 | 난이도 | 권장 용도 |
|---|---|---|---|---|---|---|
| (i) 프롬프트+레퍼런스 | △~○ | ◎ | ○ | $0.03–0.05 | 하 | PoC 0단계, 데모 |
| (ii) 마스크+inpainting | ◎ | △~○ | ◎(제거형) | $0.04–0.05 | 중 | 제거형 리폼 |
| (iii) ControlNet+스타일 | ◎(표면형) | ○~◎(LoRA 시) | △ | GPU 원가 | 상 | 2안 자체 스택 |
| **(iv) Guarded Edit** | **◎** | **◎** | **○~◎** | $0.10–0.15 (N=3) | 중상 | **1안 서비스** |

---

## 8. 리폼 유형별 AI 표현 난이도

| 리폼 유형 | 난이도 | 이유 | 권장 기법 |
|---|---|---|---|
| **염색/탈색(단색)** | 하 | 표면 색만 바뀌고 구조 불변. hex 코드 지정 지원(FLUX.2 패션 가이드). 단, 원단 질감·주름·봉제선 색까지 자연스럽게 바꿔야 하며, 로고/프린트는 보존 필요 | 옵션(iii) ControlNet depth/canny + 색 지시, 또는 HSV 공간 직접 변환(비생성) + 생성은 보조 |
| **타이다이/블리치 패턴** | 중 | 무작위 패턴을 원단 주름·형태에 맞춰 "입혀야" 함. 생성 모델이 패턴을 평면 스티커처럼 붙이거나 주름을 무시하는 경향 | 디자인 LoRA + depth ControlNet, 혹은 회사 실제 타이다이 샘플 레퍼런스 다수 |
| **자수/패치/와펜 추가** | 중 | 국소 추가라 마스크 친화적. 어려운 점: 자수 실의 입체감·광택, 원단 위에 "박힌" 느낌, 정확한 위치·크기 | 바운딩 박스(FLUX 3) 또는 마스크 inpainting + 와펜 참조 이미지; 소형 와펜은 2D 합성(호모그래피 + 그림자)로도 충분 |
| **프린트(실크스크린/DTF) 추가** | 중 | 텍스트·로고 정확도가 관건. GPT Image 계열이 텍스트 최상, Nano Banana도 양호. 주름 왜곡 반영이 어려움 | 디자인 PNG를 **2D 워핑 합성**(주름 displacement map 기반) 후 생성 모델로 "블렌딩"만 수행 |
| **기장 크롭** | 중상 | "제거 + 새 밑단 마감(시접, 단처리, 러프 컷) 생성 + 배경 채우기". 형태 변경이라 보존형 모델과 상충 | 제거 마스크 + inpainting(Fill/Eraser) → 밑단 디테일은 회사 마감 샘플 참조 |
| **소매 제거(조끼화)** | 중상 | 크롭과 동일 논리 + 암홀 마감(바이어스 테이프 등) 생성. 소매 안쪽 안감·몸판 측면이 드러나는 구조 추론 필요 | 소매 마스크 제거 + inpaint + 암홀 마감 레퍼런스 |
| **디스트레스/찢기/워싱** | 중 | 텍스처 추가형. 찢긴 구멍 아래 "속(피부/안감/배경)"의 추론, 올풀림의 미세 디테일. 모델이 과장·비현실적 패턴 생성 경향 | 디자인 LoRA(회사 디스트레스 스타일) + 마스크. 워싱(전체 톤 변화)은 염색과 유사하게 쉬움 |
| **다른 옷과 합치기(패치워크/하프앤하프)** | 상 | 두 옷의 비율·봉제선·원단 두께 차이를 물리적으로 그럴듯하게 결합해야 함. 멀티레퍼런스 필수. 모델이 둘을 "섞어 버리거나" 한쪽 정체성 상실 | 멀티레퍼런스 모델(Seedream 5.0 Pro/Nano Banana 2.1/FLUX 3) + 좌우 분할 마스크 + 후합성. 사용자 옷 2장 촬영 필요 |
| **실루엣 변경(와이드→슬림, 오버핏→레귤러)** | 상 | 옷 단독 사진에서는 "입었을 때 핏"이 보이지 않아 미리보기 의미가 약함. 사람 착장 컷이 필요 → VTON 영역. 플랫 사진에서는 외곽선 축소만 가능(단순 와핑) | 옵션: (a) 외곽 워핑(비생성), (b) VTON으로 모델 착장 비교 컷 |
| **지퍼/단추/디테일 교체** | 중 | 소형 금속 부품의 광택·반사·정확한 개수·간격. 작은 객체는 생성 모델 약점("작은 얼굴" 실패와 동류) | 바운딩 박스/마스크 + 부품 참조 이미지; 교체 부품이 규격품이면 2D 합성 |

일반 원칙: **"표면 변경형(색·패턴·프린트·자수)"은 쉽고, "구조 변경형(크롭·조끼·실루엣·합치기)"는 어렵다.** 후자는 inpainting(제거)과 마감 디테일 생성을 분리하고, 사람이 검수하는 "스태프 확인 후 최종 시안" 단계를 UX에 넣는 편이 안전하다.

---

## 9. 실패 모드와 완화책

| 실패 모드 | 발생 원인/근거 | 완화책 |
|---|---|---|
| **색 변형(톤·채도·WB 드리프트)** | 전체 재생성 구조(autoregressive/diffusion 모두). GPT Image 노란 색조, Nano Banana 2회차 톤 변화 보고 | 마스크 밖 원본 픽셀 복원; 마스크 안은 원본 히스토그램 매칭/ΔE 보정; 프롬프트에 "preserve exact colors/hex" 명시; 자동 QA에 마스크 밖 ΔE2000 임계치 |
| **로고/프린트/라벨 왜곡** | 소형 고주파 디테일은 모델이 재해석. GEditBench v2 "작은 얼굴" 실패와 동류 | 로고 영역을 보호 마스크로 지정해 원본 복원; 필요 시 로고 영역 SIFT 매칭으로 자동 검출; 해상도 2K 이상 생성 후 다운샘플 |
| **비현실적 봉제선/마감** | 모델이 의류 구조(시접·바이어스·오버로크)를 모름 | 회사 마감 샘플 레퍼런스(디자인 카드에 포함); 디스클레이머("실제 마감은 다를 수 있음"); 스태프 검수 단계 |
| **배경 변형/그림자 재생성** | 전체 재생성 | 배경 제거 후 단색 캔버스에서 편집 → 원래 배경 재합성; 촬영 가이드로 단색 배경 유도 |
| **재생성 시 비일관성(같은 요청, 다른 결과)** | Gemini·GPT Image는 seed 미지원; 확률적 생성 | (a) 결과 캐싱(요청 해시 → 이미지), (b) seed 지원 모델(FLUX/Seedream-fal/Qwen)은 seed 고정, (c) "이전 결과를 참조 이미지로 재투입"(Nano Banana는 `previous_interaction_id` 멀티턴) |
| **요청 외 변경(객체 추가/삭제, 확대/크롭, 종횡비 변경)** | 모델의 '미학적 개입'; 보도된 사례 다수 | 출력 크기·종횡비 고정; 정합 후 후합성; VLM 심판으로 "변경 영역 목록" 추출해 허용 영역 밖 변화 시 폐기 |
| **마스크 무시/경계 번짐** | GPT Image: "마스크 형태를 정확히 따르지 않을 수 있음" 공식 명시; Nano Banana API 마스크 미확인 | 마스크는 '힌트'로만 쓰고 후합성이 최종 보장; 페더 8–16px; 경계 Poisson 블렌딩 |
| **옷걸이/손/마네킹 왜곡** | 사람·손은 생성 모델 고전적 약점 | 촬영 가이드: 손 없이 플랫레이 또는 옷걸이; 옷걸이는 보호 마스크 또는 배경 제거 시 함께 제거 |
| **다중 턴 드리프트(PIED)** | Agent Banana·Banana100 연구 | 연쇄 편집도 항상 원본 기준으로 재생성(스택 금지); 편집 이력은 "디자인 파라미터"로 저장 |
| **디자인 충실도 부족(회사 시안과 다름)** | 텍스트만으로 스타일 전달 한계 | 멀티레퍼런스 3–5장 + "디자인 카드" 템플릿; 중장기 LoRA |
| **지연 변동(p95 폭증)** | GPT Image 최대 2분, 상용 API 큐 | 병렬 N 생성 + 먼저 통과한 것부터 표시; 스트리밍 partial image(GPT); 저해상 프리뷰 → 고해상 후속; 타임아웃 시 Lite 모델 폴백 |
| **안전 필터 오탐** | 의류(속옷·수영복·피부 노출) | 플랫레이 촬영 유도; 필터 완화 파라미터(BFL `safety_tolerance`); 오탐 시 대체 모델 라우팅 |
| **워터마크/메타데이터** | SynthID(Google), C2PA(OpenAI, 확인 필요) | 서비스 고지; 제거 시도 금지(약관) |

---

## 10. 회사 디자인 "학습/템플릿화" 전략

### 10.1 상용 API 경로 — "디자인 카드" 템플릿 (학습 불가, 컨텍스트 주입)

- 상용 모델(Google/OpenAI/ByteDance/BFL API)은 **파인튜닝을 제공하지 않는다**. 대신 다음을 디자인별로 구조화해 저장한다.
  1. 참조 이미지 3–5장(리폼 결과물 클로즈업·전체·디테일, 흰 배경)
  2. 적용 부위 규칙(상의 앞판 중앙 / 소매 / 밑단 …) → 마스크·바운딩 박스 자동 생성 규칙
  3. 프롬프트 템플릿(변경할 것 / 유지할 것 / 금지 사항 / 재질·색 hex)
  4. 호환 의류 조건(상의/후드/데님 등), 금지 조건(니트에는 자수 불가 등)
  5. 모델별 파라미터(해상도·quality·thinking level)와 QA 임계치
- Nano Banana 2.1(참조 14장)·Seedream 5.0 Pro(10장)·FLUX 3 Image(10장)·GPT Image 2.5가 모두 충분한 참조 슬롯을 제공해 "디자인 카드" 방식이 현실적이다.
- 예외: **Adobe Firefly Services Custom Models API**는 스타일/피사체 커스텀 모델을 학습해 asset ID로 호출 가능(상용 API 중 유일). 크레딧 비용·면책 범위(커스텀 출력은 제한)는 계약 확인 필요.

### 10.2 오픈웨이트 경로 — 디자인별 LoRA (진짜 "학습")

| 기반 모델 | 라이선스 | 학습 데이터 | 비용/시간(2차) | 비고 |
|---|---|---|---|---|
| FLUX.2 [klein] 4B Base | Apache 2.0 | **편집 LoRA: before/after 쌍 + 지시문** | 24GB GPU 약 1시간, ≈$0.5 | 공식 HF 가이드 존재 |
| FLUX 3 Image Klein Base | Kommunity License(확인) | 동일 | — | 바운딩 박스 기능 유지 |
| Qwen-Image-Edit-2511 | Apache 2.0 | before/after 쌍(Scenario: 10–20쌍부터) | fal 트레이너 $8/2,000스텝; AI Toolkit 로컬 <10GB | 커뮤니티 VTON LoRA 사례 풍부 |
| FLUX.1 Kontext dev | NC(상업 라이선스 구매) | `_start/_end` 쌍 | fal/Replicate 트레이너 | 구세대, 비권장 |
| FLUX.2 [dev] 32B | NC(유료) | fal FLUX.2 edit trainer ≈$11.82/1,000스텝 | — | 품질 높으나 라이선스·VRAM 부담 |

- **데이터 준비가 병목**: 회사가 이미 리폼한 옷의 "리폼 전 사진"이 없으면 쌍을 만들 수 없다. 해결책: (a) 앞으로 모든 리폼 작업에서 **전/후 동일 조건 촬영**을 업무 프로세스화, (b) Scenario가 권장하듯 "후 → 전"을 편집 모델로 역생성해 합성 쌍 제작, (c) 디자인당 최소 10–20쌍, 품질용 50쌍 이상.
- 학습 목표는 "회사 스타일"이지 "특정 옷"이 아니므로, 다양한 옷 위에 같은 디자인이 적용된 쌍을 모아야 일반화된다.

---

## 11. 추천안

### 1안 (서비스 1차 버전, 3~4개월): 상용 멀티레퍼런스 편집 API + Guarded Edit 파이프라인

- 생성 엔진: **Nano Banana 2.1**(기본, 가성비·14장 참조·한국 가용) + **Seedream 5.0 Pro**(Identity 1위, 멀티레퍼런스 합치기 유형) + **GPT Image 2.5 Sunburst**(마스크 지원·텍스트/프린트 유형)를 **리폼 유형별로 라우팅**. 단일 벤더 종속을 피하고 폴백 확보.
- 보존 보장: 자체 파싱(SegFormer-clothes 파인튜닝 또는 SAM 3) → 마스크 → 후합성 → 자동 QA(N=3 중 선택).
- 디자인 템플릿: "디자인 카드" 방식.
- 예상 원가: N=3 기준 요청당 약 $0.10–0.15(약 140–210원, 1K 기준). 월 1만 요청 ≈ $1,000–1,500 + GPU 소형 인스턴스(파싱·QA).
- 리스크: API 가격/모델 교체 주기(분기 단위), seed 미지원, 마스크 비보장(후합성으로 흡수).

### 2안 (6~12개월, 비용·차별화): 자체 호스팅 오픈웨이트 + 디자인별 LoRA

- 기반: **FLUX.2 [klein] 4B(Apache)** 또는 **Qwen-Image-Edit-2511(Apache)**; FLUX 3 Image Klein은 Kommunity License 조건 확인 후.
- 구성: ControlNet-Union(depth/canny) + 디자인 LoRA + 마스크 inpainting + 동일 후합성/QA.
- 장점: 장당 원가 수 원, seed 고정으로 재현성, 회사 디자인 "진짜 학습", 데이터 외부 유출 없음. 단점: ML 엔지니어·GPU 운영, 상용 대비 지시 이행력 열세(GEditBench v2 기준 오픈 1위 klein 9B 1,039 vs Nano Banana Pro 1,096).
- 트리거: 1안 운영 데이터(요청 분포·실패 유형·전/후 쌍)가 쌓이면 착수.

### PoC에서 먼저 테스트할 모델 3개 (+1)

1. **Nano Banana 2.1** (`gemini-nano-banana-2.1`) — 비용·참조 수·한국 가용·Google 일관성 평판.
2. **GPT Image 2.5 Sunburst** — 편집 아레나 1위, alpha 마스크 입력, 텍스트/프린트 최강.
3. **Seedream 5.0 Pro** (BytePlus ModelArk) — Identity-Preserving Edit 1위, 멀티레퍼런스 10장, 저가.
4. (+1 자체 호스팅 기준선) **FLUX.2 [klein] 4B** — Apache, 오픈 중 VC 최상위, 1초 미만, LoRA 1시간. (대안: Qwen-Image-Edit-2511)
- 보조: FLUX 3 Image(바운딩 박스 영역 편집이 본 과제에 특히 유망, 벤치 미게재라 소규모 추가 테스트), FLUX.1 Fill pro(제거형 리폼 inpainting).

### 테스트 프로토콜 (PoC 2~3주)

- **데이터**: 옷 사진 10장(상의 4·하의 2·아우터 2·데님 1·니트 1; 로고/프린트 있는 것 3장 이상 포함; 플랫레이 5 + 옷걸이 5; 단색 배경, 2K 이상, 동일 조명) × 회사 디자인 5개(염색 1, 자수/와펜 1, 프린트 1, 크롭 or 소매 제거 1, 패치워크 1 — 난이도 스펙트럼 커버) × 모델 3(+1) × 샘플 3회 = 450(600)장. 비용 상용 기준 약 $20–40.
- **변수 통제**: 동일 프롬프트 템플릿(한국어/영어 2종), 동일 해상도(1K와 2K 각각), 참조 이미지 세트 동일, quality 티어 고정(GPT high, Nano Banana thinking medium), 가능한 모델은 seed 고정.
- **파이프라인 변형**: (A) 프롬프트+레퍼런스 원샷, (B) A + 마스크 후합성, (C) 마스크 inpainting 전용(Fill pro/GPT 마스크). 각 모델에 A·B 필수, C는 제거형 리폼에만.
- **자동 지표**: 마스크 밖 LPIPS/SSIM/ΔE2000(보존), 로고 영역 SIFT 매칭률/OCR 일치(디테일 보존), 마스크 안 CLIP-I·DINOv2 유사도 vs 디자인 카드(충실도), 정합 오프셋(픽셀), 지연 p50/p95, 장당 비용, 안전필터 거부율, 실패 유형 태깅(§9 분류).
- **인간 평가**: 회사 디자이너 3명 + 일반인 5명이 5점 척도로 (1) 원래 내 옷으로 보이는가, (2) 회사 디자인이 맞게 적용됐는가, (3) 실제 리폼 결과로 믿을 만한가, (4) 주문 의향. 쌍대 비교(pairwise)로 모델 Elo 산출.
- **합격 기준(예시)**: 보존 — 마스크 밖 ΔE2000 평균 < 2.0, LPIPS < 0.05; 충실도 — 디자이너 평가 ≥ 3.5/5; 지연 p95 < 30초(상용) / < 5초(자체); 실패율(3샘플 모두 불합격) < 10%.
- **산출물**: 모델×유형 히트맵, 유형별 라우팅 테이블, 실패 사례집, 디자인 카드 v0.1, 원가 모델.

---

## 12. 미해결 질문 (클라이언트/기획 확인 필요)

1. 사용자 촬영 조건을 어디까지 강제할 수 있는가? (옷만 플랫레이 vs 입은 상태 허용) — 파이프라인 난이도가 2배 이상 달라짐.
2. 회사 디자인 자산의 상태: 리폼 "전/후 쌍" 사진이 있는가, 디자인 수는 몇 개이며 부위·호환 의류 규칙을 문서화할 수 있는가?
3. 리폼 유형별 매출 비중(염색/자수/크롭/패치워크 …) — AI 표현 난이도와 교차해 1차 출시 범위를 정해야 함.
4. "미리보기 ≠ 실제 결과"에 대한 고지·환불 정책, 스태프 검수 단계를 넣을지(검수 넣으면 품질 기준을 낮출 수 있음).
5. 데이터 거버넌스: 사용자 사진을 해외 API(Google/OpenAI/BytePlus)로 전송하는 것에 대한 개인정보 처리방침·동의 문구; 자체 호스팅 전환 시점.
6. 예산: 월 예상 요청 수와 장당 허용 원가(상용 N=3 기준 약 150–200원 vs 자체 GPU 고정비).
7. 라이선스 검토 대상: BFL Kommunity License(FLUX 3 Image Klein) 실제 조건, BytePlus ModelArk "Restricted Model" 해당 여부, Adobe Custom Models 면책 범위.
8. 재현성 요구: 같은 옷+디자인에 항상 같은 시안을 보여줘야 하는가(캐싱으로 충분한가)?

---

## 13. 주요 출처 (전체)

- Google: https://ai.google.dev/gemini-api/docs/pricing · https://ai.google.dev/gemini-api/docs/image-generation · https://ai.google.dev/available_regions · https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations · https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/virtual-try-on-preview-08-04
- OpenAI: https://developers.openai.com/api/docs/guides/image-generation · https://developers.openai.com/api/docs/supported-countries · https://en.wikipedia.org/wiki/GPT_Image · https://costgoat.com/pricing/openai-images · https://docs.kanaries.net/articles/gpt-image-2-5 · https://community.openai.com/t/gpt-image-1-input-fidelity/1317640
- BFL: https://docs.bfl.ml/flux_3/flux3_image_overview.md · https://docs.bfl.ml/flux_3/flux3_image_klein.md · https://docs.bfl.ml/flux_2/flux2_image_editing.md · https://docs.bfl.ml/flux_1_fill.md · https://docs.bfl.ml/flux_2/flux_vto · https://docs.bfl.ml/quick_start/pricing.md · https://docs.bfl.ml/guides/usecases_editing_clothing_tryon.md · https://bfl.ai/pricing · https://help.bfl.ai/articles/3670520907-can-i-use-the-api-for-a-commercial-application · https://bfl.ai/legal/self-hosted-commercial-license-terms · https://huggingface.co/black-forest-labs/FLUX.2-klein-4B · https://huggingface.co/blog/black-forest-labs/flux-2-klein-lora · https://invideo.io/blog/flux-ai-image-generator/ · https://www.developersdigest.tech/models/image-generation/black-forest-labs · https://blog.fal.ai/training-flux-2-loras
- ByteDance/BytePlus: https://seed.bytedance.com/en/blog/bytedance-released-image-editing-model-seededit-3-0-enhanced-image-consistency-and-usability-rate · https://docs.byteplus.com/en/docs/ModelArk/availability · https://docs.byteplus.com/en/docs/ModelArk/2191806 · https://www.atlascloud.ai/blog/ai-updates/seedream-5-0-pro-price · https://mer.vin/2026/07/seedream-5-0-pro-api-on-byteplus-precision-image-generation-and-multi-reference-editing/ · https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit
- Microsoft/Alibaba/기타 상용: https://ai.azure.com/catalog/models/MAI-Image-2.6 · https://openrouter.ai/microsoft/mai-image-2.6 · https://www.alibabacloud.com/help/en/model-studio/qwen-image-3-0-pro · https://www.eesel.ai/blog/reve-2-1-pricing · http://ideogram.ai/pricing/?pricing_tab=api · https://openrouter.ai/recraft/recraft-v4-styles · https://developer.adobe.com/firefly-services/docs/firefly-api/ · https://stability.ai/api-pricing-update-25 · https://unifically.com/blogs/midjourney-api · https://fal.ai/models/fal-ai/kling/v1-5/kolors-virtual-try-on/llms.txt
- 오픈웨이트: https://huggingface.co/Qwen/Qwen-Image-Edit-2511 · https://huggingface.co/Qwen/Qwen-Image-2.1 · https://huggingface.co/stepfun-ai/Step1X-Edit-v1p2 · https://huggingface.co/meituan-longcat/LongCat-Image-Edit · https://huggingface.co/zai-org/GLM-Image · https://github.com/VectorSpaceLab/OmniGen2 · https://huggingface.co/ByteDance-Seed/BAGEL-7B-MoT · https://huggingface.co/HiDream-ai/HiDream-E1-1 · https://comfyui-wiki.com/en/news/2025-09-27-tencent-open-source-hunyuan-image-3-0 · https://invideo.io/blog/open-source-image-models-licenses/ · https://huggingface.co/briaai/Fibo-Edit · https://huggingface.co/InstantX/Qwen-Image-ControlNet-Union · https://hackernoon.com/a-guide-to-flux2-dev-fun-controlnet-union · https://fal.ai/models/fal-ai/qwen-image-edit-trainer/llms.txt · https://help.scenario.com/en/articles/building-training-sets-for-flux-kontext
- 세그멘테이션: https://blog.roboflow.com/what-is-sam3/ · https://huggingface.co/mattmdjaga/segformer_b2_clothes · https://arxiv.org/abs/2409.01086 (DPDEdit)
- 벤치마크: https://zhangqijiang07.github.io/gedit2_web/ · https://arxiv.org/html/2603.28547v1 · https://artificialanalysis.ai/image/leaderboard/editing · https://alphasignal.ai/news/artificial-analysis-rebuilds-its-image-editing-arena-across-17-specialized · https://www.llmreference.com/benchmark/lmarena-image-edit · https://arxiv.org/abs/2602.09084 · https://arxiv.org/abs/2604.03400 · https://www.alphaxiv.org/overview/2509.13399
- VTON: https://fashn.ai/blog/comparing-the-top-4-open-source-virtual-try-on-viton-models · https://arxiv.org/pdf/2601.22725 · https://arxiv.org/pdf/2606.12012 · https://arxiv.org/pdf/2607.09362 · https://arxiv.org/pdf/2412.11513
- 커뮤니티: https://lindsaymarsh.substack.com/p/is-googles-new-nano-banana-really · https://ihnatko.com/whats-a-nano-banana-anyway/ · https://community.adobe.com/bug-reports-403/generate-from-nano-banana-for-the-2nd-time-always-changed-the-image-tone-1483534 · https://community.openai.com/t/gpt-image-1-5-decreased-image-render-quality/1371885 · https://medium.com/@302.AI/seedream-4-5-vs-nano-banana-pro-can-the-sota-be-replaced-99056bee667d · https://aireiter.com/blog/flux-2-klein-prompt-guide-image-editing-consistency · https://magichour.ai/blog/nano-banana-2-vs-nano-banana-pro-we-benchmarked-both-on-the-same-5-prompts
