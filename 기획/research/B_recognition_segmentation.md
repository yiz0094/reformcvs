# B. 의류 인식·분할·분류 및 템플릿 매칭 기술 조사 — '리폼 편의점'

- 작성일: 2026-10-21
- 담당 차원: B_recognition_segmentation (의류 인식·분할·분류·랜드마크·촬영 가이드·템플릿 매칭·온디바이스/서버 판단)
- 조사 방식: 2025~2026년 공식 문서·모델 카드·논문을 웹 검색/열람으로 확인. 확인하지 못한 값은 **[미확인]** 으로 표기.
- 표기: 한국어 본문, 기술 용어·제품명은 영문 병기.

---

## 0. 핵심 결론 (TL;DR)

| 질문 | 결론 |
|---|---|
| 사진 1장으로 의류 종류·색·패턴을 자동 인식할 수 있는가 | **가능.** 2026년 현재 멀티모달 LLM(Gemini / GPT / Claude)의 제로샷 분류 + JSON 구조화 출력이 가장 빠르고 싼 출발점. 학술 벤치마크에서 18개 세부 속성 기준 macro-F1 약 53~64% (모델별), 전용 Fashion-CLIP 선형 분류기(약 21%)의 3배 수준. 단, "가시적 속성"은 70%대, **소재(fabric)는 36~52%로 가장 약함.** |
| 소재·상태(얼룩/손상)까지 자동 판정할 수 있는가 | **부분적으로만.** 사진만으로 섬유 조성 판정은 신뢰도 낮음(학계 데이터셋도 7~33종 분류, 스마트폰 사진 end-to-end 벤치마크 부재). 중고 의류 얼룩·손상 검출은 2025년 최신 연구에서 AP 72% 수준. → **"AI 추정 + 사용자 확인(케어라벨 촬영/선택지)" 하이브리드 UX**로 설계해야 함. |
| 리폼 부위(소매/몸판/칼라/밑단/포켓) 마스크를 자동으로 만들 수 있는가 | **의류 전체 마스크는 매우 안정적**(SAM 2/3, SegFormer 계열). **부위 단위는 "가능하되 불안정"**: Fashionpedia 19개 부위 클래스로 학습된 공개 모델의 부위 박스 mAP가 0.204(의류 본체 0.589) 수준. SAM 3의 텍스트 프롬프트("sleeve")는 유망하지만 의류 부위에서의 정량 성능은 **[미확인]** → 2단계(전체 마스크 → 부위 프롬프트) + 사용자 보정 UI 필수. |
| 어디를 얼마나 자를지 cm로 정의할 수 있는가 | 랜드마크(DeepFashion2 294점 체계, Fashionpedia)로 **좌표 정의는 가능.** 플랫레이 + 기준 물체(신용카드 85.60×53.98 mm, ArUco 마커)로 **cm 환산 시 평균 오차 약 0.75~1.3 cm**(연구 결과, 업계 허용치 ~2 cm)가 보고됨. 단, 수직 촬영·평평한 바닥 조건이 전제. → **"참고 치수"로 쓰고, 최종 재단 치수는 입고 후 작업자 실측**으로 설계. |
| 촬영 방식 | **플랫레이(바닥에 펼쳐 수직 촬영)를 기본**으로, 단색 배경·자연광·앞/뒤 2장 + 선택적 착용샷. 실루엣 오버레이 가이드와 자동 품질 검사(블러/노출/배경 복잡도/의류 점유율/기준물체 검출)를 둔다. |
| 온디바이스 vs 서버 | **품질 검사·실루엣 가이드·간단한 전경 분리만 온디바이스(브라우저)**, 인식·부위 분할·치수·추천은 **서버**. 인식 1건당 VLM 비용은 약 $0.0005~$0.003(모델별), 분할 GPU 비용은 1건당 수 천분의 1달러 수준. |
| 추천 스택 | **1안(속도 우선, 권장):** Gemini 3.x Flash/Flash-Lite(또는 Claude Haiku/Sonnet 5.5) 제로샷 JSON + SAM 3(또는 Gemini 네이티브 segmentation) + 규칙 엔진 + SigLIP 2 임베딩. **2안(정확도·독립성 우선):** Fashionpedia 기반 자체 파인튜닝(RF-DETR-Seg / SegFormer) + SAM 3 + 자체 랜드마크 모델 + VLM은 보조. |

---

## 1. 의류 인식: 종류·소재·색·패턴·상태

### 1.1 접근법 (a) 멀티모달 LLM 제로샷 분류 + 구조화 출력(JSON)

#### 1.1.1 2026-10 기준 주요 모델과 가격 (공식 가격 페이지 확인)

| 벤더 | 모델 | 입력 $/1M tokens | 출력 $/1M tokens | 이미지 토큰 산정 | 비고 |
|---|---|---|---|---|---|
| Google | Gemini 3.8 Flash | $0.75 (2027-01-01부터 $1.50) | $3.75 (→ $7.50) | Gemini 3 계열: `media_resolution` low≈280 / medium≈560 / high≈1,120 tokens/장(기본 1,120) | 네이티브 bounding box·segmentation mask JSON 출력 지원 |
| Google | Gemini 3.5 Flash-Lite | $0.30 | $2.50 | 동일 | 대량 분류·저지연용 |
| Google | Gemini 3.1 Flash-Lite | $0.25 | $1.50 | 동일 | |
| Google | Gemini 3.1 Pro Preview | $2.00 (≤200k) | $12.00 | 동일 | 정확도 최상위 |
| Google | Gemini 2.5 Flash / Flash-Lite | $0.30 / $0.10 | $2.50 / $0.40 | 2.5 계열: ≤384px는 258 tokens, 그 이상은 768×768 타일당 258 tokens | 구세대, 가장 저렴 |
| Google | Gemini Embedding 2 | 이미지 $0.45/1M ≈ **$0.00012/장** | — | 멀티모달 임베딩(텍스트·이미지·비디오·오디오·PDF 공통 공간), 128~3072차원 | 유사도 검색용 |
| OpenAI | GPT-5.5 | $5.00 | $30.00 | **이미지 토큰 산정 규칙 [미확인]**(가격 페이지에 채팅 모델 이미지 별도 요율 없음) | |
| OpenAI | GPT-5.4 / 5.4-mini / 5.4-nano | $2.50 / $0.75 / $0.20 | $15.00 / $4.50 / $1.25 | 동일 | 2026-10 가격 페이지 기준 |
| OpenAI | GPT-5 / 5-mini / 5-nano | $1.25 / $0.25 / $0.05 | $10.00 / $2.00 / $0.40 | 동일 | 구세대, 벤치마크 논문에 등장 |
| Anthropic | Claude Opus 5.5 | $4.00 | $20.00 | 28×28px 패치=1 visual token, `⌈w/28⌉×⌈h/28⌉`; 1000×1000 = 1,296 tokens; Claude 4.7+는 장변 2,576px·최대 4,784 tokens | 좌표/박스 출력 가능(근사치) |
| Anthropic | Claude Sonnet 5.5 | $2.00 | $10.00 | 동일 | |
| Anthropic | Claude Haiku 5.5 | $0.10 | $0.50 | 동일 | 가장 저렴한 Claude |

출처:
- Gemini 가격: https://ai.google.dev/gemini-api/docs/pricing
- Gemini 이미지 토큰/탐지·분할: https://ai.google.dev/gemini-api/docs/image-understanding , media_resolution: https://ai.google.dev/gemini-api/docs/media-resolution
- Gemini Embedding 2: https://ai.google.dev/gemini-api/docs/embeddings
- OpenAI 가격: https://developers.openai.com/api/docs/pricing
- Claude 가격(claude-api 스킬 캐시 2026-10-06) 및 비전 문서: https://platform.claude.com/docs/en/build-with-claude/vision

#### 1.1.2 이미지 1장당 인식 비용 추정 (프롬프트 500 tokens + 출력 JSON 400 tokens 가정)

| 모델 | 이미지 토큰 | 1장당 추정 비용 | 월 10,000건 |
|---|---|---|---|
| Claude Haiku 5.5 | 1,296 (1000×1000) | ≈ $0.0004 | ≈ $4 |
| Gemini 3.5 Flash-Lite | 1,120 (high) | ≈ $0.0015 | ≈ $15 |
| Gemini 3.8 Flash | 1,120 | ≈ $0.0027 | ≈ $27 |
| GPT-5.4-mini | ~1,000 가정 [미확인] | ≈ $0.003 | ≈ $30 |
| Claude Sonnet 5.5 | 1,296 | ≈ $0.0076 | ≈ $76 |
| Gemini 3.1 Pro Preview | 1,120 | ≈ $0.008 | ≈ $80 |

- 실측 참고치(논문, 18개 속성 추출, 5,000장): Gemini 2.5 Flash-Lite 약 **$0.58/1,000장**, Gemini 2.5 Flash 약 $2.97/1,000장, GPT-5 Mini 약 $4.15/1,000장, Gemini 2.5 Pro 약 $12.89/1,000장, GPT-5 약 $26.24/1,000장. 출처: https://arxiv.org/html/2601.15711
- 즉 인식 단계의 VLM 비용은 **서비스 원가에서 무시할 수준**이며, 비용보다 정확도·지연·안정성으로 선택해야 한다.

#### 1.1.3 정확도 근거 (학술 벤치마크)

| 연구 | 데이터 | 결과 |
|---|---|---|
| "Can GPT-4o mini and Gemini 2.0 Flash Predict Fine-Grained Fashion Product Attributes?" (2025) | DeepFashion-MultiModal, 18개 속성 | Gemini 2.0 Flash macro-F1 **56.79%**, GPT-4o-mini **43.28%**; temperature=0이 더 좋음; "파인튜닝 시스템/사람 주석의 완전한 대체는 아직 아님". 출처: https://arxiv.org/abs/2507.09950 |
| "Zero-Shot Product Attribute Labeling with VLMs" (WACV 2026 workshop) | 동일 데이터 5,000장, 9개 VLM | Tier-1 macro-F1: Gemini 2.5 Pro **64.0**, GPT-5 61.1, Gemini 2.5 Flash 59.9, GPT-5 Mini 58.0, GPT-4.1-mini 56.4, GPT-5 Nano 53.7, Gemini 2.5 Flash-Lite 53.2. Fashion-CLIP + 로지스틱 회귀 베이스라인 ≈ 21%. **가시 속성 분류(Tier 3)는 70.8%**(Gemini 2.5 Flash)까지 올라가지만, **"해당 속성이 적용되는가(NA) 판단"은 평균 24.7%로 병목.** 속성군별: **소재(fabric) F1 0.36~0.52로 최난**, 패턴 중간, 형태(shape) 최상(outer_cardigan 78.2%). "효율 모델이 플래그십 성능의 90% 이상을 훨씬 낮은 비용으로 달성". 출처: https://arxiv.org/html/2601.15711 |

시사점:
1. **카테고리·실루엣·소매 길이·넥라인·색·패턴** 같은 "보이는 것"은 VLM 제로샷으로 실무 투입 가능한 수준.
2. **소재·혼용률·상태**는 VLM이 자신 있게 틀리는 영역 → confidence를 함께 출력하게 하고 임계값 이하면 사용자에게 묻는다.
3. 2026-10 현재 최신 세대(Gemini 3.x, GPT-5.4/5.5, Claude 5.5)는 위 논문의 2.5/5 세대보다 신형이므로 수치는 **하한선**으로 보되, 자체 PoC 측정이 필요하다.

#### 1.1.4 구조화 출력(JSON) 지원 현황

| 벤더 | 방식 | 비고 |
|---|---|---|
| Gemini | `response_format` / `responseSchema`(JSON Schema, enum) | 이미지 입력과 함께 사용 가능. Google Search 도구 동시 사용 시 strict schema 불가 보고 있음(포럼). 출처: https://ai.google.dev/gemini-api/docs/image-understanding , https://discuss.ai.google.dev/t/gemini-3-slow-and-2-5-strict-json/126956 |
| OpenAI | Structured Outputs(JSON Schema) | 공식 가격 페이지에서 이미지 별도 요율은 없음. 이미지 토큰 산정 **[미확인]** |
| Claude | `output_config.format`(JSON schema) + `strict: true` 툴 | 이미지 후 텍스트 순서가 권장. HEIC 미지원(JPEG/PNG/GIF/WebP만) → 클라이언트 변환 필요. 출처: https://platform.claude.com/docs/en/build-with-claude/vision |

#### 1.1.5 포맷·전처리 주의 (아이폰 HEIC)
- Gemini: PNG/JPEG/WEBP/HEIC/HEIF 지원, 요청당 인라인 20MB 제한. 출처: https://ai.google.dev/gemini-api/docs/image-understanding
- Claude: JPEG/PNG/GIF/WebP만, 장당 10MB(base64), 최대 8000×8000px. 출처: https://platform.claude.com/docs/en/build-with-claude/vision
- → 브라우저에서 캔버스로 **JPEG 재인코딩 + EXIF 회전 보정 + 장변 2,000px 이하 리사이즈**를 표준 전처리로 둔다(토큰 비용·지연 동시 절감).

#### 1.1.6 지연시간(latency)
- 공식 이미지 입력 지연 벤치마크는 없음 **[미확인]**. 3rd-party 게이트웨이 통계: Gemini 2.5 Flash TTFT 약 1.6~2.7초(2025-10, 텍스트 중심). 출처: https://langdb.ai/app/models/analytics/gemini/gemini-2.5-flash
- Gemini 3.1 Flash-Lite 개발자 보고: 소형 분류 요청 대부분 약 0.6초, 그러나 약 1/4은 15~20초 tail. 출처: https://discuss.ai.google.dev/t/gemini-3-1-flash-lite-is-very-slow-and-inconsistent/143754
- → 설계 목표: 인식 응답 p50 ≤ 3초, p95 ≤ 8초, **타임아웃·재시도·폴백 모델(2벤더)** 필수.

#### 1.1.7 오픈소스 VLM(자체 호스팅) 대안
- Qwen3-VL: Apache-2.0, 2B~32B dense + MoE(30B-A3B, 235B-A22B), 2D grounding·OCR 32개 언어·256K 컨텍스트. 출처: https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct , https://llm-stats.com/models/qwen3-vl-32b-instruct
- 장점: 데이터 외부 반출 없음, 고정 비용. 단점: GPU 운영 부담, 제로샷 정확도는 API 플래그십보다 낮을 가능성(**[미확인]** — 자체 벤치 필요). PoC 후반에 검토.

### 1.2 접근법 (b) 전용 패션 분류/검출 모델

| 자산 | 내용 | 라이선스 | 비고 |
|---|---|---|---|
| DeepFashion2 (CUHK, CVPR 2019) | 491K 이미지, 13개 카테고리(short/long sleeve top, short/long sleeve outwear, vest, sling, shorts, trousers, skirt, 4종 dress), 총 **294개 랜드마크**, 마스크, 검출 AP 0.638 / 랜드마크 AP 0.605(visible) / 세그 AP 0.640 | README에 라이선스 명시 없음, Google Form 작성 후 비밀번호 발급. 동일 연구실의 DeepFashion은 **비상업 연구 한정 계약**. → **상용 학습 데이터로 사용 여부 [미확인], 법무 검토 필수** | 출처: https://github.com/switchablenorms/DeepFashion2 , https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion/DeepFashionAgreement.pdf |
| Fashionpedia (Google/Cornell, ECCV 2020) | 48K 이미지, 27개 의류 카테고리 + **19개 부위(collar, lapel, sleeve, pocket, neckline, zipper, hem 등)** + 294개 세부 속성, 인스턴스 마스크 | **CC BY 4.0**(HF 데이터 카드 기준; GitHub LICENSE 직접 확인 권장) | 출처: https://huggingface.co/datasets/detection-datasets/fashionpedia , https://pypi.org/project/fashionpedia/1.0/ |
| resoa/garment-detector-seg | RF-DETR-Seg-Small(DINOv2 백본, 33.6M)을 Fashionpedia 46클래스로 8 epoch 학습. 박스 mAP: 의류 본체 **0.589**, 액세서리 0.534, **부위 0.204**; mask mAP@[.5:.95] 0.352 | Apache 2.0 | **플랫레이·옷걸이 사진에서 정확도 하락, 32px 미만 트림 누락** 명시. 출처: https://huggingface.co/resoa/garment-detector-seg |
| RF-DETR / RF-DETR-Seg (Roboflow, 2025) | 실시간 DETR 계열, COCO 60 AP 돌파(벤더 보고), Nano~2XL 6종 Seg 체크포인트 | Apache 2.0(XL/2XL 검출 모델은 PML 1.0) | 자체 파인튜닝 베이스로 적합. 출처: https://pypi.org/project/rfdetr/ , https://rfdetr.roboflow.com/1.3.0 |
| Ultralytics YOLO 계열 | 사용 편의 최고 | **AGPL-3.0**; 상용·비공개 서비스는 Enterprise License 필요 | 출처: https://www.ultralytics.com/license |

소재 인식 전용 데이터·연구:
- TextileClass-7(cotton/cotton mix/denim/polyester/silk/viscose/wool, 실사진), TextileNet(76만 장, 33 fibre/27 fabric, 재활용 목적), 현미경 이미지 기반 천연/합성 분류(ViT-B/16 0.998 — 현미경 조건). **스마트폰 사진 end-to-end 소재 분류 벤치마크는 2025년 기준 부재.** 2026년 연구는 섬유 데이터셋의 near-duplicate로 인한 평가 과대 문제를 경고. 출처: https://data.mendeley.com/datasets/m2h53zr39s , https://arxiv.org/abs/2003.07725 , https://ceur-ws.org/Vol-4164/paper4.pdf
- 결론: **소재는 "데님/니트/우븐/가죽" 수준의 거친 분류만 자동**, 혼용률은 케어라벨 OCR(VLM이 잘함) 또는 사용자 선택으로 받는다.

상태(얼룩/손상/늘어남) 인식:
- Tabernik & Skočaj (ERK 2025): 중고 의류 12,000장 이진 결함(얼룩·찢어짐) 데이터, SuperSimpleNet이 **AP 72%**로 최고; 의류 다양성·미세/가려진 결함이 난점. 출처: https://vicos.si/publications/tabernik2025erk/
- Second-Hand Fashion 데이터셋(RISE/Wargön/Myrorna, 약 32,000벌, 얼룩 None/Minor/Major 라벨). 출처: https://zenodo.org/records/12518734
- thredUP는 AI로 식별·가격을 매기되 **얼룩·찢어짐은 사람이 물리 검사**(2차 출처). 출처: https://getcoai.com/video/how-thredup-resells-17-million-garments-every-year-ai-in-action/
- 결론: 상태는 **"의심 영역 플래그 + 사용자 확인 + 입고 검수"** 3중 구조. 자동 판정으로 가격·가능 여부를 확정하지 않는다.

### 1.3 접근법 (c) CLIP/SigLIP 임베딩 + 최근접(kNN)

| 모델 | 특징 | 라이선스 | 출처 |
|---|---|---|---|
| SigLIP 2 (Google DeepMind, 2025-02) | ViT-B(86M)/L(303M)/So400m(400M)/g(1B), 다국어, 제로샷 분류·검색·dense feature 개선, NaFlex(가변 해상도) | Apache-2.0(HF 모델 카드) | https://arxiv.org/abs/2502.14786 , https://huggingface.co/google/siglip2-so400m-patch14-384 |
| Marqo-FashionSigLIP | ViT-B-16-SigLIP를 패션 데이터로 GCL 파인튜닝, 7개 패션 벤치마크 평균 text→image Recall@1 0.121(FashionCLIP2.0 0.077, base SigLIP 0.111), category→product MRR 0.812 | Apache-2.0 | https://github.com/marqo-ai/marqo-FashionCLIP , https://www.marqo.ai/blog/search-model-for-fashion ; "FashionSigLIP 2"는 벤더 언급만 있고 공개 카드 **[미확인]** |
| Gemini Embedding 2 | 멀티모달 단일 공간, 128~3072차원, 이미지 $0.00012/장 | API | https://ai.google.dev/gemini-api/docs/embeddings |
| DINOv2/DINOv3 | 텍스트 없이 시각 유사도(형태·질감)에 강함, Transformers.js 지원 | — | https://huggingface.co/docs/transformers.js/index |

평가:
- 임베딩은 **"우리 디자인 카탈로그와의 유사도"·"비슷한 의류 검색"·중복 탐지**에 적합. 세부 속성 추출용 선형 분류기는 VLM 대비 크게 열세(21% vs 64% F1, 상기 논문).
- 벡터 DB: 디자인 수백~수천 개 규모면 **PostgreSQL + pgvector**로 충분(500만 벡터 이하는 단일 Postgres 권장 의견). Qdrant는 복잡한 payload 필터·수평 확장이 필요할 때. 출처: https://www.tigerdata.com/blog/pgvector-vs-qdrant , https://zilliz.com/comparison/qdrant-vs-pgvector

### 1.4 세 접근법 비교

| 기준 | (a) VLM 제로샷 + JSON | (b) 전용 패션 모델(파인튜닝) | (c) 임베딩 + kNN |
|---|---|---|---|
| 카테고리/형태 정확도 | 높음(가시 속성 F1 ~70%) | 데이터 있으면 가장 높음(DeepFashion2 검출 AP 0.64) | 중간(카테고리 MRR 0.81) |
| 소재/상태 | 낮음~중간(소재 F1 0.36~0.52) | 데이터 확보 어려움 | 낮음 |
| 구축 난이도 | **최저**(프롬프트+스키마) | 높음(라벨링·학습·배포) | 낮음(임베딩+DB) |
| 1건 비용 | $0.0004~$0.008 | GPU 추론 ≈ $0.001 미만 | ≈ $0.0001 |
| 지연 | 1~5초(tail 10초+) | 수십~수백 ms | 수십 ms |
| 통제성/재현성 | 낮음(모델 업데이트·비결정성) | 높음 | 높음 |
| 설명 가능성 | 높음(이유 텍스트) | 낮음 | 낮음 |
| 라이선스 리스크 | 낮음(API 약관) | 데이터셋 라이선스 주의(DeepFashion2) | 낮음(Apache 2.0) |

**권장: 하이브리드.** 1차 인식은 (a), 카탈로그 매칭·추천은 (c), 트래픽이 커지고 자체 라벨 데이터(사용자 업로드 + 작업자 검수 결과)가 쌓이면 (b)로 점진 대체.

---

## 2. 의류 영역 분할(segmentation)

### 2.1 SAM 계열

| 모델 | 발표 | 프롬프트 | 성능/속도 | 라이선스 | 출처 |
|---|---|---|---|---|---|
| SAM 2 / 2.1 (Meta) | 2024-07 / 2024-09 | 점·박스·마스크(객체당 1개) | A100 기준 tiny 91 FPS ~ large 39.5 FPS; 38.9M~224.4M | **Apache 2.0** | https://github.com/facebookresearch/sam2 |
| **SAM 3** (Meta) | **2025-11-19** | **텍스트 명사구("sleeve", "pocket") + 이미지 예시(exemplar) + 점/박스**, 모든 인스턴스 동시 검출(Promptable Concept Segmentation) | 848M 파라미터(검출기+추적기, 공유 인코더); LVIS 제로샷 mask AP 47.0(이전 최고 38.5), COCO box AP 53.5, SA-Co 벤치마크 2배 향상; Meta 보고 H200 30ms/장(100+ 객체) | **SAM License**(Meta 자체 라이선스: 비독점·로열티 무료·상업 금지 조항 없음, 군사/ITAR 금지, 파생물에 동일 약관 첨부, 가중치는 HF gated 신청) | https://github.com/facebookresearch/sam3 , https://raw.githubusercontent.com/facebookresearch/sam3/main/LICENSE , https://docs.ultralytics.com/models/sam-3/ , https://blog.roboflow.com/what-is-sam3/ |
| SAM 3.1 (Object Multiplex) | 2026-03-27 | 동일 | 다중 객체 공유 메모리로 "정확도 손실 없이 훨씬 빠름"(Meta 주장) | SAM License | https://github.com/facebookresearch/sam3 |
| EdgeSAM / EdgeTAM / SlimSAM | 2023~2025 | 점·박스 | EdgeSAM iPhone 14에서 30 FPS+ (논문) | 각기 확인 필요 **[미확인]** | https://arxiv.org/abs/2312.06660 |

SAM 3 한계(문서 명시): 단순 명사구에 최적, 긴 참조 표현·복합 추론은 MLLM(SAM 3 Agent) 결합 필요, **희귀·세분화 개념에서 성능 저하 가능**, YOLO 대비 크고 느림. 부위(part) 분할 성능은 공식 문서에 언급 없음 **[미확인]**. 출처: https://docs.ultralytics.com/models/sam-3/

호스팅 옵션:
- Roboflow Serverless Hosted API가 SAM 3(텍스트 프롬프트/시각 프롬프트 2개 엔드포인트)를 제공, 2026-09-18부터 이미지당 과금으로 전환. SAM 3 이미지당 단가 **[미확인]**. 출처: https://blog.roboflow.com/making-it-easier-cheaper-to-deploy-with-roboflow/ , https://docs.roboflow.com/deploy/supported-models/sam3
- Replicate 등 초단위 GPU 과금(T4 $0.000225/s ~ H100 $0.001525/s). SAM 3 전용 모델 페이지 **[미확인]**; 3초/장 가정 시 H100 ≈ $0.0046/장. 출처: https://www.spheron.network/blog/replicate-pricing-2026-per-second-cost/
- Ultralytics 패키지로 SAM 3 실행 시 **패키지가 AGPL-3.0**이므로 상용 서비스는 Enterprise 라이선스 또는 Meta 공식 레포 직접 사용.

### 2.2 오픈 보캐뷸러리 검출 + SAM (Grounded-SAM 계열)

| 구성 | 내용 | 라이선스 | 출처 |
|---|---|---|---|
| Grounding DINO (원본) | 텍스트 → 박스, COCO 제로샷 52.5 AP | Apache 2.0 | https://github.com/IDEA-Research/Grounded-SAM-2 |
| Grounding DINO 1.5/1.6 Pro, DINO-X | 1.6 Pro COCO 제로샷 55.4 AP(벤더 보고). **클라우드 API 토큰 필수**(DeepDataSpace), 가격·쿼터 **[미확인]**(공식 대시보드 확인 필요) | API 약관 | https://github.com/IDEA-Research/Grounded-SAM-2 |
| Grounded-SAM-2 파이프라인 | Grounding DINO/DINO-X/Florence-2 + SAM 2 | Apache 2.0 + BSD-3 등 | 동일 |
| OWLv2 (Google) | 제로샷 텍스트 조건 검출, ~0.2B | Apache 2.0 | https://huggingface.co/google/owlv2-base-patch16-ensemble |
| Florence-2 (Microsoft) | 검출·phrase grounding·referring segmentation, 230M/770M | MIT | https://playground.roboflow.com/models/compare/florence-2-vs-owl-vit |
| YOLOE (2025-03) | 오픈 프롬프트 검출/분할 | **AGPL-3.0** | https://playground.roboflow.com/models/compare/florence-2-vs-yoloe |
| Gemini 네이티브 | 프롬프트만으로 box_2d(0~1000 정규화) + 폴리곤 mask + label JSON 반환, 분할 시 thinking 최소 권장 | API | https://ai.google.dev/gemini-api/docs/image-understanding |

→ SAM 3가 텍스트 프롬프트를 직접 받으므로 "검출기 + SAM 2" 2단 구조의 필요성이 줄었다. 단, 부위 단위 정확도는 PoC로 비교해야 한다.

### 2.3 의류 파싱(human parsing / cloth segmentation) 모델 — 착용 사진 기준

| 모델 | 클래스 | 성능 | 라이선스 | 비고 | 출처 |
|---|---|---|---|---|---|
| mattmdjaga/segformer_b2_clothes | ATR 18클래스(Upper-clothes, Skirt, Pants, Dress, Belt, Scarf, Bag … ) | mIoU 0.69, mAcc 0.80; Belt 0.35·Scarf IoU 0.29 등 소형 클래스 약함 | 모델 카드 확인 필요 **[미확인]** | 가볍고(≈25~27M) 널리 쓰임 | https://huggingface.co/teerapongsungsut/segformer_b2_clothes (미러) |
| fashn-ai/fashn-human-parser | SegFormer-B4, 18클래스(top/dress/skirt/pants/belt/scarf + 신체/액세서리) | 수치 미공개 | **NVIDIA Source Code License 상속** — 상용 전 검토 | 가상 피팅 용도, 단일 인물 전제 | https://huggingface.co/fashn-ai/fashn-human-parser |
| SCHP (Self-Correction Human Parsing) | LIP(20) / ATR(18) / Pascal-Person-Part | ATR mIoU 82.29 | 포크 README에 MIT 표기, 원본 확인 필요 | 2019~2020 모델 | https://awesome.ecosyste.ms/projects/github.com%2FGoGoDuck912%2FSelf-Correction-Human-Parsing |
| MediaPipe Image Segmenter(multiclass selfie) | background/hair/body-skin/face-skin/**clothes(4)**/accessories | 256×256, 실시간, 브라우저/모바일 | Apache 2.0 | iOS Safari GPU delegate에서 클래스 인덱스 뒤바뀜 이슈 보고 | https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter , https://github.com/google-ai-edge/mediapipe/issues/6142 |
| Meta Sapiens | 28 신체 부위 | — | **CC BY-NC 4.0**(상용 불가; Sapiens2는 별도 라이선스 **[미확인]**) | 제외 권장 | https://huggingface.co/facebook/sapiens |

공통 한계: **모두 "사람이 입은 사진" 전제.** 플랫레이·옷걸이 사진에서는 클래스가 깨지거나 전체를 하나로 뭉침. → 플랫레이 흐름에서는 SAM 3/SAM 2 + 전경 분리로 전체 마스크를 얻고, 부위는 별도 전략.

### 2.4 부위 단위 분할(소매/몸판/칼라/밑단/포켓) 가능성 평가

| 부위 | 공개 모델 근거 | 자동 생성 가능성 | 권장 전략 |
|---|---|---|---|
| 의류 전체(전경) | SAM 2/3, SegFormer, RMBG류 | **매우 높음**(mask AP 0.64, SAM 제로샷) | 자동 + 가장자리만 사용자 미세 조정 |
| 소매(sleeve) | Fashionpedia 부위 클래스, resoa 모델 부위 mAP 0.204(전체), SAM 3 "sleeve" **[미확인]** | 중간(긴소매·대비 뚜렷하면 양호, 같은 색 몸판과 경계 모호) | SAM 3 텍스트/exemplar → 실패 시 어깨점·소매끝 랜드마크로 기하학적 절단선 생성 |
| 칼라/넥라인 | Fashionpedia(collar, lapel, neckline) | 중간~낮음(작고 접힘) | SAM 3 + 사용자 점 프롬프트 |
| 밑단(hem) | 랜드마크(밑단 좌/우) + 마스크 하단 경계 | 높음(기하학적으로 정의 가능) | 마스크 하단에서 N cm 띠로 정의 |
| 포켓 | Fashionpedia(pocket), SAM 3 "pocket" | 중간(패치 포켓 양호, 심 포켓 낮음) | SAM 3 + 사용자 확인 |
| 지퍼/버튼/트림 | resoa 모델 zipper 0.10, 32px 미만 누락 | 낮음 | 고해상도 크롭 재인식 또는 사용자 지정 |

핵심 설계 원칙: **"자동 마스크는 제안(proposal), 사용자가 점 클릭/드래그로 확정"**. SAM 계열의 점·박스 프롬프트가 바로 이 UX에 맞는다(온디바이스 SAM 디코더로 즉시 반응 가능 — 2.6절).

### 2.5 배경 제거·전경 마스크 라이선스 주의
- BRIA RMBG-2.0: **CC BY-NC 4.0, 상용은 BRIA와 별도 계약.** BiRefNet 아키텍처 기반이지만 BiRefNet 자체 라이선스는 별도 확인 필요 **[미확인]**. 출처: https://github.com/Bria-AI/RMBG-2.0
- 대안: SAM 2/3 박스 프롬프트(의류 bbox) → 마스크, 또는 Gemini 네이티브 mask, 또는 Fashionpedia 학습 RF-DETR-Seg.

### 2.6 온디바이스 분할 가능성 (6절과 연계)
- Transformers.js v4(2026-03-30, WebGPU 런타임 C++ 재작성; 최신 v4.3.1 2026-10-07)가 SAM/SAM 2/SAM 3, SegFormer, OWL-ViT/OWLv2, Grounding DINO, RF-DETR, CLIP/SigLIP, DINOv2/v3, Depth Anything 아키텍처를 지원. 다만 `mask-generation` 파이프라인은 "미지원" 표기(SAM은 image-segmentation 경로 사용). 출처: https://github.com/huggingface/transformers.js/releases , https://huggingface.co/docs/transformers.js/index
- 2026년 중반 기준 Android Chrome WebGPU는 플래그/OS 게이트, iOS Safari는 제한적(Safari 26+에서 WebGPU 지원 추가). 출처: https://newreleases.io/project/github/huggingface/transformers.js/release/4.3.0 , https://noqta.tn/en/blog/webgpu-ia-navigateur-inference-locale-sans-serveur-2026
- 실용 패턴: **서버에서 SAM 이미지 임베딩 1회 계산 → 가벼운 마스크 디코더만 브라우저에서 실행**(Xenova segment-anything-webgpu 데모 패턴)하여 점 클릭 즉시 마스크 갱신. 출처: https://huggingface.co/spaces/Xenova/segment-anything-webgpu

---

## 3. 키포인트/랜드마크 검출과 치수(cm) 추정

### 3.1 랜드마크로 "어디를 얼마나 자를지" 정의하기
- DeepFashion2: 13개 카테고리별 상이한 랜드마크(예: long sleeve outwear 39점, vest 15점, 총 294점), 랜드마크 AP 0.605(가시) / 0.529(가시+가림). 2020 챌린지 1위(Aggregation & Finetuning)는 81개 통합 랜드마크로 AP 0.590. 출처: https://github.com/switchablenorms/DeepFashion2 , https://arxiv.org/abs/2005.00419
- MMPose가 DeepFashion2 / Fashion Landmark(FLD) 데이터 파이프라인(`deepfashion2_to_coco.py`)을 제공 → HRNet/RTMPose 계열 학습 가능. COCO JSON이므로 Ultralytics JSON2YOLO로 YOLO-pose 변환도 가능(라이선스 AGPL 주의). 출처: https://mmpose-ly015.readthedocs.io/en/latest/tasks/2d_fashion_landmark.html
- GarmentIQ(ETH Zurich, 2025-06 프리프린트, CC BY 4.0): 분류(95.76%) + BiRefNet 분할 + HRNet 랜드마크로 9개 카테고리 템플릿-프리 치수 측정 파이프라인. 피어리뷰 전. 출처: https://archive.gd.edu.kg/abs/20250525121523/
- 리폼 절단선 정의 방식(제안):
  - `crop_sleeve`: 어깨점(shoulder_L/R)–소매끝(cuff_L/R) 벡터 위에서 `ratio` 또는 `cm` 오프셋으로 절단선 → 마스크와 교차하여 띠(band) 폴리곤 생성.
  - `crop_hem`: 밑단 좌/우 랜드마크를 잇는 선을 기준으로 위쪽 `cm`만큼 띠.
  - `neckline_change`: 넥 중심·어깨점으로 V/라운드 템플릿 곡선을 매핑.
  - 모든 절단선은 **픽셀 좌표 + (가능 시) cm 추정치 + 신뢰도**로 저장하고, 작업 지시서에는 "참고 치수"로 표기.

### 3.2 플랫레이 사진에서 실제 치수(cm) 추정
| 방법 | 근거 | 정확도 | 조건/한계 |
|---|---|---|---|
| 기준 물체(신용카드 ISO/IEC 7810 ID-1: 85.60×53.98 mm) | Tailored 앱(최대 6개 치수, 신용카드 또는 인쇄 도트 카드 필수), 관련 특허(US9396555 등) | 앱 평점 2.5~2.7/5 — 실사용 정확도 데이터 빈약 | 카드가 의류와 같은 평면·수직 촬영 필요 |
| ArUco 마커 + 보정 신경망 | Annals of CSIS 논문: 마커로 px→cm 환산, 카메라 거리 변동 오차를 NN으로 보정 | 수치 미열람 **[미확인]** | 인쇄 마커 배포 필요(택배 안내지에 인쇄 가능) |
| 분할 + 키포인트 기반 측정(KTU) | 블레이저 **1.27 cm**, 드레스 **0.75 cm**, 스커트 **1.01 cm** 평균 오차; 업계 허용 오차 약 2 cm 언급 | 양호 | 통제된 촬영 조건 |
| 단안 깊이(Depth Anything) + Keypoint R-CNN | ECU 2024 석사논문(초기 결과만) | **[미확인]** | 야외 촬영 대응 연구 단계 |
| Stitch Fix | 눈금 보드 위 촬영 + 키포인트 | 사내 | 전용 보드 필요 |

출처: https://apps.apple.com/us/app/-/id6673894318 , https://patents.google.com/patent/US9396555 , https://annals-csis.org/Volume_32/drp/pdf/8.pdf , https://epubl.ktu.edu/object/elaba:128838697/128838697.pdf , https://multithreaded.stitchfix.com/blog/2016/09/30/photo-based-clothing-measurement/ , https://thescholarship.ecu.edu/items/7a31dc61-8270-42da-926c-0cd169e2e664

결론: **±1~2 cm 수준의 참고 치수**는 달성 가능하나, 원근 왜곡·주름·카드 위치에 민감. 서비스 설계상 (1) 치수는 "예상"으로 표시, (2) 주문 시 사용자가 줄자 사진 또는 수치 입력 선택 가능, (3) **최종 재단은 입고 후 작업자 실측**으로 확정하고 변경 시 고객 동의 플로우를 둔다.

---

## 4. 촬영 가이드 설계

### 4.1 촬영 방식 비교 (인식·분할·생성·치수 관점)

| 항목 | 플랫레이(바닥 펼침, 수직 촬영) | 착용(on-model) | 옷걸이/마네킹 |
|---|---|---|---|
| 카테고리·색·패턴 인식 | 좋음(전체 형태·라벨 노출) | 좋음(단, 가림·포즈 영향) | 보통(접힘·그림자) |
| 전체 마스크 | 매우 좋음(배경 단순 시) | 좋음(human parsing 모델 풍부) | 보통 |
| 부위 분할 | 좋음(변형 적음, 소매 펼침) | 보통(팔 겹침·가림) | 보통 |
| 랜드마크·치수 | **최적**(평면, 기준물체 배치 가능) | 어려움(신체 치수와 혼동) | 중간(수직 늘어짐) |
| 리폼 미리보기 생성(차원 A 연계) | 좋음(가상 피팅 API들이 flat-lay 전용 모드 제공) | 가장 설득력 있는 미리보기 | 보통 |
| 사용자 난이도 | 낮음(바닥·침대 위) | 중간(타인 촬영 필요) | 낮음 |
| 공개 모델 호환 | 의류 파싱 모델은 약함, SAM/VLM 강함 | 대부분 모델이 학습된 도메인 | 약함 |

근거: FASHN API `garment_photo_type`(model/flat-lay/auto; flat-lay는 ghost mannequin 포함, 넥라벨·사이즈택 제외 처리), Alibaba AIDC는 "흰 배경 flat-lay가 최적", Google Merchant Center 가상 피팅은 최소 512px·권장 1024px 이상·한 벌만·주름 적게, Walmart(Zeekit)는 "부자연스럽게 눌린 flat 이미지 미처리". 출처: https://docs.fashn.ai/guides/tryon-parameters-guide , https://docs.aidc-ai.com/aidge-resource/api-reference/e-commerce-virtual-model/virtual-tryon , https://support.google.com/merchants/answer/14096369

**권장: 플랫레이 2장(앞/뒤) 기본 + 선택 착용 1장.** 플랫레이는 인식·분할·치수 모두에 유리하고, 착용샷은 미리보기 설득력과 핏 정보(늘어남 등)에 쓴다.

### 4.2 촬영 조건 가이드(사용자 화면 문구용)
1. 배경: 단색(흰/회색/검정, 의류와 대비), 바닥·침대·책상. 무늬 러그·나무결은 피함.
2. 조명: 낮 자연광 또는 균일한 실내등, 플래시 금지(반사·색 왜곡). 그림자가 의류 밖으로 길게 지지 않게.
3. 구도: 의류 전체가 프레임의 60~85%를 차지, 수직(바닥과 평행) 촬영, 소매·밑단 펼치기, 단추/지퍼 잠근 상태.
4. 기준 물체: 신용카드/교통카드 1장을 의류 옆(겹치지 않게) 같은 평면에 두기(치수 추정용, 선택).
5. 해상도: 장변 1,500~2,000px면 충분(업로드 전 자동 리사이즈). 과도한 압축 금지.
6. 추가: 케어라벨(혼용률·세탁 표시) 근접 1장(소재 보정), 얼룩/손상 근접 1장(선택).

### 4.3 가이드 오버레이(실루엣 가이드) UX
- 카메라 뷰에 카테고리별 반투명 실루엣(상의/하의/원피스/아우터) 표시 → 사용자가 의류를 맞추면 랜드마크 초기 추정이 안정됨(향후 템플릿 정합에도 유리).
- 수평계(기기 자이로)로 수직 촬영 유도: 기울기 > 8°면 경고.
- 촬영 직후 1초 내 "자동 품질 검사" 결과를 체크리스트로 표시하고 재촬영 유도.

### 4.4 자동 품질 검사(온디바이스, 캔버스/WebGL로 즉시)
| 검사 | 방법 | 임계값(초기값, 기기별 튜닝) | 근거 |
|---|---|---|---|
| 블러 | Laplacian variance(그레이스케일, 의류 영역 한정) | < 100 → 흐림 경고(OpenCV 관례), 기기별 보정 | https://www.pyimagesearch.com (관례), https://medium.com/revolut/canvas-based-javascript-blur-detection-b92ab1075acf |
| 노출 | 휘도 히스토그램: 0~5 또는 250~255 픽셀 비율 > 5% → 과소/과다 노출; 평균 휘도 범위 60~190 | 설계 제안(출처 없음) | — |
| 배경 복잡도 | Edge density(엣지 픽셀 비율), Subband Entropy / Feature Congestion(Rosenholtz 2007) | 의류 외부 영역 edge density > 0.08 → "배경이 복잡합니다" | https://dspace.mit.edu/handle/1721.1/37593 |
| 의류 점유율 | 온디바이스 간이 전경 분리(MediaPipe/소형 SegFormer) 또는 색 기반 → bbox 면적비 | 0.4~0.9 범위 밖이면 경고 | — |
| 기준 물체 | 카드 비율(1.586:1) 사각형 검출 또는 ArUco 검출 | 미검출 시 "치수 추정 불가, 계속 진행 가능" | https://annals-csis.org/Volume_32/drp/pdf/8.pdf |
| 기울기 | DeviceOrientation API | > 8° 경고 | — |
| 포맷/회전 | EXIF orientation 적용 후 JPEG 재인코딩, HEIC 변환 | — | Claude HEIC 미지원 |

서버 측 2차 검사: VLM에 `quality: {is_garment, single_item, fully_visible, occlusion, folded, background_ok}` 필드를 함께 요구하여 사람이 보기 전 자동 반려 사유를 만든다.

---

## 5. 템플릿 매칭/추천 설계

### 5.1 2단 구조: 규칙 엔진(필터) → 임베딩/점수(랭킹)
1. **하드 필터(규칙 엔진):** 인식 결과(카테고리·소매 길이·클로저·소재군·부위 존재 여부·치수)로 "적용 불가" 디자인을 제거. 예: `crop_sleeve`는 `sleeve_length ∈ {long, three_quarter}` 필수; `patch_pocket_add`는 `material_group ∉ {sheer, leather_thin}`; `tie_dye`는 `base_color_lightness > 0.6 & material_group ∈ {cotton, cotton_blend}`.
2. **소프트 점수(랭킹):** (i) 임베딩 유사도: 사용자 의류 임베딩 vs 각 디자인의 "원본 의류 예시 임베딩"(디자인별로 과거 작업한 원본 사진 N장 평균) — SigLIP 2/Marqo-FashionSigLIP; (ii) 속성 일치 가중합(색 조화, 패턴 충돌, 핏); (iii) 비즈니스 가중(마진, 리드타임, 재고 부자재, 시즌); (iv) 개인화(선택 이력).
3. **설명 생성:** VLM으로 "이 디자인이 어울리는 이유" 1문장(선택).

### 5.2 디자인 '적용 조건' 메타데이터 스키마(제안)
```json
{
  "design_id": "RF-2026-017",
  "name": "크롭 소매 + 밑단 프린지",
  "version": 3,
  "operations": [
    {"type": "crop_sleeve", "target_part": "sleeve", "params": {"cut_from": "shoulder", "ratio_range": [0.35, 0.6], "min_cm": 8}},
    {"type": "fringe_hem", "target_part": "hem", "params": {"band_cm": 5, "add_material": "fringe_tape_black"}}
  ],
  "applicability": {
    "categories": ["long_sleeve_top", "long_sleeve_outwear", "sweatshirt"],
    "required_parts": ["sleeve", "hem"],
    "sleeve_length": ["long", "three_quarter"],
    "material_groups_allow": ["cotton", "cotton_blend", "fleece", "denim"],
    "material_groups_deny": ["sheer", "silk", "leather"],
    "closure": ["none", "zip", "button"],
    "pattern_allow": ["solid", "stripe", "logo"],
    "color_lightness_range": [0.0, 1.0],
    "min_dimensions_cm": {"sleeve_length": 45, "body_length": 50},
    "condition_deny": ["major_stain_on_target", "hole_on_target"],
    "fit_types": ["regular", "oversized"]
  },
  "preview": {
    "generator": "A차원 파이프라인 ID",
    "reference_images": ["s3://designs/RF-2026-017/ref_01.jpg"],
    "mask_strategy": "sleeve_band+hem_band",
    "prompt_template_id": "tpl_crop_fringe_v3"
  },
  "pricing": {"base_krw": 39000, "per_extra_cm_krw": 0},
  "lead_time_days": 7,
  "difficulty": 2,
  "tags": ["y2k", "street", "summer"],
  "embedding": {"model": "siglip2-so400m", "vector_ref": "pgvector://designs/RF-2026-017"}
}
```

### 5.3 매칭 점수(초안)
`score = 0.45·attr_match + 0.30·cos_sim(embedding) + 0.15·business + 0.10·personal`, 하드 필터 통과 디자인만 계산. 임계값 미만이면 "추천 없음, 상담 요청" 경로.

### 5.4 "우리 디자인 학습"의 현실적 의미
- 인식/매칭 측면에서 "학습"은 (1) 디자인별 적용 조건 메타데이터 작성, (2) 과거 작업 전/후 사진으로 임베딩 레퍼런스 구축, (3) 작업자가 승인/수정한 마스크·랜드마크를 저장해 점진적 파인튜닝 데이터로 축적 — 이 세 가지이며, 거대 모델 재학습이 아니다. (미리보기 생성 모델의 학습/LoRA는 A차원 보고서 범위.)

---

## 6. 온디바이스(브라우저) vs 서버 처리

| 단계 | 권장 위치 | 이유 | 응답 시간 목표 |
|---|---|---|---|
| 촬영 가이드·기울기·품질 검사 | 온디바이스 | 즉시 피드백, 비용 0 | < 300 ms |
| 리사이즈·HEIC→JPEG·EXIF 보정 | 온디바이스 | 업로드 크기·토큰 절감 | < 500 ms |
| 간이 전경 분리(점유율 검사용) | 온디바이스(MediaPipe/소형 SegFormer, WebGPU 가능 시) | 실패해도 서버가 보완 | < 1 s |
| 카테고리·속성 인식(VLM JSON) | 서버(API) | 정확도·스키마 통제 | p50 3 s / p95 8 s |
| 전체·부위 마스크(SAM 3) | 서버 GPU | 848M 모델, GPU 필요 | 1~3 s (워밍 상태) |
| 마스크 대화형 보정 | 하이브리드(서버 임베딩 1회 + 브라우저 디코더) | 클릭 즉시 반응 | < 200 ms/클릭 |
| 랜드마크·치수 | 서버 | 모델 일관성 | 1 s |
| 추천(필터+벡터) | 서버(Postgres+pgvector) | 데이터 접근 | < 300 ms |

- WebGPU 현황: Transformers.js v4(2026-03)로 브라우저 추론이 크게 개선됐지만, **Android Chrome 일부·iOS Safari는 제한**(Safari 26+에서 지원 추가) → 온디바이스는 "있으면 쓰고 없으면 서버" 폴백 구조. 출처: https://github.com/huggingface/transformers.js/releases
- 비용(월 10,000건 가정): VLM 인식 $4~$80(모델별), SAM 3 분할 GPU ≈ $10~$50(서버리스 초단위 과금 시, 콜드스타트 제외), 임베딩 ≈ $1~2, 벡터 DB는 기존 Postgres에 포함. **인식·분할 합산 1건당 약 $0.002~$0.015(약 3~20원)** 수준으로 추정(가격 변동·벤더별 상이, PoC에서 실측).
- 개인정보: 착용 사진은 얼굴 포함 가능 → 온디바이스에서 얼굴 블러 후 업로드 옵션, API 벤더의 학습 미사용 정책 확인(Anthropic은 업로드 이미지를 학습에 사용하지 않음 명시. 출처: https://platform.claude.com/docs/en/build-with-claude/vision ).

---

## 7. 추천 스택과 PoC 순서

### 7.1 1안 — API 중심, 2~3개월 내 PoC (권장)
| 구성 | 선택 | 대안/폴백 |
|---|---|---|
| 인식(JSON) | Gemini 3.8 Flash(정확도) / 3.5 Flash-Lite(비용·속도), `responseSchema` + enum, temperature 0 | Claude Sonnet 5.5 / Haiku 5.5(`output_config.format`), GPT-5.4-mini |
| 전체·부위 마스크 | SAM 3(Meta 공식 레포, SAM License) 자체 GPU 또는 Roboflow Hosted | Gemini 네이티브 segmentation(JSON mask), SAM 2.1(Apache 2.0) |
| 대화형 보정 | SAM 이미지 임베딩 서버 + 브라우저 디코더(Transformers.js) | 서버 왕복 |
| 랜드마크·치수 | 1단계: VLM 좌표 출력(근사) + 카드 기준 스케일; 2단계: MMPose(HRNet/RTMPose) Fashionpedia/자체 데이터 학습 | GarmentIQ 파이프라인 참고 |
| 임베딩·추천 | SigLIP 2 So400m 또는 Marqo-FashionSigLIP(Apache 2.0) + Postgres pgvector + 규칙 엔진 | Gemini Embedding 2 |
| 온디바이스 | 캔버스 품질검사 + MediaPipe Image Segmenter | — |

### 7.2 2안 — 자체 모델 중심(정확도·독립성·비용 고정)
| 구성 | 선택 |
|---|---|
| 검출·분할·부위 | RF-DETR-Seg(Apache 2.0) Fashionpedia 46클래스 + 자체 플랫레이 데이터 파인튜닝(resoa 카드가 플랫레이 약점을 명시 → 자체 데이터 1,000~3,000장 필요) |
| 정밀 마스크 | SAM 3 exemplar 프롬프트(부위별 예시 이미지) |
| 랜드마크 | MMPose HRNet, Fashionpedia/자체 주석(DeepFashion2는 라이선스 확인 전 미사용) |
| 속성·소재·상태 | 자체 분류 헤드 + VLM 보조(저신뢰 시) |
| 호스팅 VLM | Qwen3-VL-8B/32B(Apache 2.0) |
| 비용 | GPU 상시 1~2대(L4/A10 급), 라벨링 인건비 |

### 7.3 PoC 순서(제안, 총 8~10주)
1. **주 1~2: 데이터 수집 규약** — 회사 보유 리폼 전/후 사진 + 신규 플랫레이 촬영 300벌(앞/뒤/라벨/카드), 카테고리·부위·조건 라벨 시트.
2. **주 2~3: VLM 인식 벤치** — Gemini 3.8 Flash / 3.5 Flash-Lite / Claude Haiku·Sonnet 5.5 / GPT-5.4-mini에 동일 스키마로 300장 → 카테고리·소매·클로저·색·패턴·소재군·상태 각각 정확도·p95 지연·비용 측정. 합격선: 카테고리 ≥ 95%, 가시 속성 ≥ 85%, 소재군 ≥ 70%.
3. **주 3~5: 분할 벤치** — SAM 3 텍스트("sleeve/collar/pocket/hem") vs SAM 3 exemplar vs Gemini mask vs RF-DETR-Seg(Fashionpedia)로 부위 IoU 측정. 합격선: 전체 mask IoU ≥ 0.95, 소매 IoU ≥ 0.80, 포켓 ≥ 0.70; 미달 부위는 "사용자 클릭 보정" 전제로 설계.
4. **주 5~6: 치수 PoC** — 카드 기준 50벌 실측 대조, 오차 분포(p50/p90) 보고; ±2 cm 내 비율 목표 80%.
5. **주 6~8: 규칙 엔진 + 추천** — 디자인 20개에 적용 조건 메타데이터 작성, 300장에 대해 추천 정합성(디자이너 평가 top-3 적중률 ≥ 70%).
6. **주 8~10: 촬영 가이드 UX 테스트** — 사용자 10명 재촬영률·실패 사유 집계, 임계값 튜닝. 이후 A차원(미리보기 생성)과 통합.

---

## 8. 인식 결과 JSON 스키마 예시

```json
{
  "schema_version": "1.0",
  "image": {
    "id": "img_8f3a",
    "views": ["front", "back"],
    "capture_mode": "flat_lay",
    "width_px": 1536, "height_px": 2048,
    "quality": {
      "blur_score": 212.4, "exposure": "ok", "background_complexity": 0.03,
      "garment_coverage": 0.68, "tilt_deg": 3.1,
      "reference_object": {"type": "credit_card", "detected": true, "px_per_cm": 18.7, "confidence": 0.93},
      "passed": true, "issues": []
    }
  },
  "garment": {
    "category_l1": "top",
    "category_l2": "long_sleeve_top",
    "category_l3": "sweatshirt",
    "category_confidence": 0.97,
    "fit": "oversized",
    "sleeve_length": "long",
    "neckline": "crew",
    "closure": "none",
    "colors": [{"name": "navy", "hex": "#1F2A44", "ratio": 0.88}, {"name": "white", "hex": "#F4F4F4", "ratio": 0.12}],
    "pattern": "logo_print",
    "material_group": "cotton_blend",
    "material_confidence": 0.58,
    "material_source": "vision",
    "care_label": {"detected": false, "composition": null},
    "features": ["ribbed_cuff", "ribbed_hem", "chest_print"],
    "condition": {
      "overall": "good",
      "issues": [{"type": "stain", "severity": "minor", "bbox": [812, 1310, 905, 1388], "confidence": 0.61}],
      "stretch": "none"
    }
  },
  "segmentation": {
    "garment_mask": {"format": "rle", "iou_est": 0.97, "source": "sam3"},
    "parts": [
      {"name": "sleeve_left", "mask": {"format": "rle"}, "confidence": 0.86, "source": "sam3_text"},
      {"name": "sleeve_right", "mask": {"format": "rle"}, "confidence": 0.84, "source": "sam3_text"},
      {"name": "body", "mask": {"format": "rle"}, "confidence": 0.9, "source": "derived"},
      {"name": "hem_band", "mask": {"format": "polygon"}, "confidence": 0.8, "source": "landmark_derived"},
      {"name": "collar", "mask": null, "confidence": 0.41, "source": "sam3_text", "needs_user_confirmation": true}
    ]
  },
  "landmarks": {
    "schema": "fashionpedia_top_v1",
    "points": {
      "shoulder_left": [402, 388], "shoulder_right": [1130, 392],
      "cuff_left": [118, 1240], "cuff_right": [1420, 1251],
      "hem_left": [430, 1880], "hem_right": [1105, 1884],
      "neck_center": [768, 352]
    },
    "confidence": 0.82
  },
  "measurements_cm": {
    "scale_source": "credit_card",
    "chest_width": {"value": 58.4, "ci_cm": 1.5},
    "body_length": {"value": 72.1, "ci_cm": 1.5},
    "sleeve_length": {"value": 61.0, "ci_cm": 2.0},
    "reliability": "reference",
    "note": "최종 치수는 입고 후 실측으로 확정"
  },
  "eligibility_flags": {
    "single_garment": true, "fully_visible": true, "occluded_parts": [],
    "needs_user_input": ["material_composition", "collar_confirm"]
  },
  "provenance": {
    "recognizer": {"vendor": "google", "model": "gemini-3.8-flash", "prompt_version": "rec_v7", "latency_ms": 2840},
    "segmenter": {"model": "sam3", "version": "3.1", "latency_ms": 1420},
    "timestamp": "2026-10-21T09:12:33+09:00"
  }
}
```

---

## 9. 미확인 사항·리스크 목록
1. DeepFashion2 상용 학습 사용 가능 여부(라이선스 미명시, 동일 연구실 DeepFashion은 비상업 한정) — **법무 확인 전 사용 금지.**
2. SAM 3의 의류 부위(소매/칼라/포켓) 텍스트 프롬프트 정량 성능 — 공개 벤치 없음, PoC 필수.
3. Grounding DINO 1.6 / DINO-X API 가격·쿼터 — 공식 대시보드 확인 필요.
4. Roboflow Hosted SAM 3 이미지당 단가, Replicate SAM 3 실행 시간 — 미확인.
5. OpenAI 채팅 모델 이미지 토큰 산정 규칙 — 가격 페이지에 명시 없음.
6. Gemini 무료/유료 등급 RPM·RPD — 2026-04 이후 프로젝트별 상이, 콘솔에서 확인.
7. segformer_b2_clothes 원본 모델 카드 라이선스, BiRefNet 라이선스, EdgeSAM/SlimSAM 라이선스 — 각 저장소 확인 필요.
8. "Marqo FashionSigLIP 2" 공개 여부·라이선스 — 벤더 언급만 존재.
9. 플랫레이 도메인에서 공개 의류 파싱 모델 성능 — 대부분 착용 사진 학습, 플랫레이 수치 없음.
10. 상태(얼룩/손상) 자동 판정의 법적·CS 리스크 — 자동 판정 결과를 가격/거절 근거로 쓰지 말 것.

---

## 10. 주요 출처(요약)
- Gemini 가격/이미지/임베딩/해상도: https://ai.google.dev/gemini-api/docs/pricing , https://ai.google.dev/gemini-api/docs/image-understanding , https://ai.google.dev/gemini-api/docs/media-resolution , https://ai.google.dev/gemini-api/docs/embeddings
- OpenAI 가격: https://developers.openai.com/api/docs/pricing
- Claude 비전·가격: https://platform.claude.com/docs/en/build-with-claude/vision
- VLM 패션 속성 벤치마크: https://arxiv.org/abs/2507.09950 , https://arxiv.org/html/2601.15711
- SAM 3: https://github.com/facebookresearch/sam3 , https://raw.githubusercontent.com/facebookresearch/sam3/main/LICENSE , https://docs.ultralytics.com/models/sam-3/ , https://blog.roboflow.com/what-is-sam3/
- SAM 2: https://github.com/facebookresearch/sam2
- Grounded-SAM-2 / Grounding DINO: https://github.com/IDEA-Research/Grounded-SAM-2
- OWLv2: https://huggingface.co/google/owlv2-base-patch16-ensemble ; Florence-2/YOLOE: https://playground.roboflow.com/models/compare/florence-2-vs-yoloe
- Fashionpedia 모델: https://huggingface.co/resoa/garment-detector-seg ; 데이터: https://huggingface.co/datasets/detection-datasets/fashionpedia
- DeepFashion2: https://github.com/switchablenorms/DeepFashion2 , https://arxiv.org/abs/2005.00419 ; DeepFashion 계약: https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion/DeepFashionAgreement.pdf
- RF-DETR: https://pypi.org/project/rfdetr/ ; Ultralytics 라이선스: https://www.ultralytics.com/license
- 의류 파싱: https://huggingface.co/fashn-ai/fashn-human-parser , https://huggingface.co/teerapongsungsut/segformer_b2_clothes , https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter , https://huggingface.co/facebook/sapiens
- 배경 제거 라이선스: https://github.com/Bria-AI/RMBG-2.0
- SigLIP 2: https://arxiv.org/abs/2502.14786 , https://huggingface.co/google/siglip2-so400m-patch14-384 ; Marqo: https://github.com/marqo-ai/marqo-FashionCLIP
- Qwen3-VL: https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct
- 치수: https://epubl.ktu.edu/object/elaba:128838697/128838697.pdf , https://annals-csis.org/Volume_32/drp/pdf/8.pdf , https://apps.apple.com/us/app/-/id6673894318 , https://patents.google.com/patent/US9396555 , https://archive.gd.edu.kg/abs/20250525121523/
- 소재·상태: https://data.mendeley.com/datasets/m2h53zr39s , https://vicos.si/publications/tabernik2025erk/ , https://zenodo.org/records/12518734
- 촬영 가이드: https://docs.fashn.ai/guides/tryon-parameters-guide , https://support.google.com/merchants/answer/14096369 , https://docs.aidc-ai.com/aidge-resource/api-reference/e-commerce-virtual-model/virtual-tryon
- 품질 검사: https://medium.com/revolut/canvas-based-javascript-blur-detection-b92ab1075acf , https://dspace.mit.edu/handle/1721.1/37593
- 온디바이스: https://github.com/huggingface/transformers.js/releases , https://huggingface.co/docs/transformers.js/index , https://huggingface.co/spaces/Xenova/segment-anything-webgpu
- 벡터 DB: https://www.tigerdata.com/blog/pgvector-vs-qdrant
- 호스팅 가격: https://blog.roboflow.com/making-it-easier-cheaper-to-deploy-with-roboflow/ , https://www.spheron.network/blog/replicate-pricing-2026-per-second-cost/
