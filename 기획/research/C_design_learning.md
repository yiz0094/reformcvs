# C. 디자인 학습·템플릿화 리서치 — 회사 리폼 디자인을 "어떤 옷에도 적용되는 템플릿"으로 만드는 방법

- 프로젝트: 리폼 편의점 (AI 의류 리폼 시안 서비스)
- 담당 차원: C_design_learning
- 작성일: 2026-10-21 (모든 가격·모델·라이선스는 이 날짜 기준 웹 검색으로 확인. 확인 못 한 항목은 **미확인**으로 표기)
- 관련 문서: A_generation_tech.md(생성 기술), B_recognition_segmentation.md(인식·세그멘테이션)

---

## 0. 한눈에 보는 결론 (Executive Summary)

1. **"디자인 학습"은 세 층으로 나눠서 봐야 한다.**
   - (A) 학습 없음: 레퍼런스 이미지 + 지시 프롬프트로 멀티 레퍼런스 편집 모델(Nano Banana Pro/2.1, GPT-Image-2, Seedream 5.0, FLUX.2/FLUX.3 Klein, Qwen-Image-Edit)에 바로 적용.
   - (B) LoRA 학습: before/after 페어로 편집 모델(Qwen-Image-Edit-2509/2511, FLUX.2 [dev]/[klein], FLUX.1 Kontext, FLUX.3 Image Klein Base)에 "리폼 변환 자체"를 학습.
   - (C) 구조화 템플릿: 디자인을 **작업 연산(operation)** 단위(크롭·패치·염색·자수·절개)로 분해하고, 마스크(SAM 3) + 파라미터 + 생성 모델(inpaint/edit)로 조합.
2. **2026-10-21 기준 가장 현실적인 권장 경로는 "C를 뼈대로, A를 초기 렌더러로, B를 데이터가 쌓인 뒤 품질 부스터로"** 쓰는 하이브리드다. 이유:
   - 리폼 시안은 "원형 보존 + 국소 변경"이 생명인데, 무학습 편집 모델은 레퍼런스 수가 4개 이상이면 일관성이 급락한다는 실측이 있다(UniRef-Image-Edit 논문: Qwen-Image-Edit-2511이 4~6장 입력에서 0.0271점으로 붕괴, Seedream 4.0 0.4739, Nano Banana는 2~3장에서 최고 0.6382 — https://arxiv.org/html/2602.14186).
   - LoRA 학습은 이제 상품화됐다. fal.ai의 FLUX.2 [dev] Edit Trainer는 페어당 레퍼런스 최대 4장, 15~50페어 권장, 1,000스텝·레퍼런스 1장 기준 **$11.82**(https://fal.ai/models/fal-ai/flux-2-trainer-v2/edit). Qwen-Image-Edit-2509 트레이너는 **$4/1,000스텝**(https://fal.ai/models/fal-ai/qwen-image-edit-2509-trainer/llms.txt). 디자인 200개를 전부 LoRA로 만들어도 학습비는 수천 달러 수준이며, **진짜 병목은 before/after 페어 데이터 확보**다.
   - 작업지시서 일관성(시안 → 실제 작업)은 "이미지에서 역추출"보다 **"파라미터가 먼저, 이미지는 렌더링"** 구조(C)가 압도적으로 유리하다.
3. **before/after 페어가 핵심인 이유**: 편집 LoRA는 "입력 → 출력의 변환"을 배우는 것이지 "결과물의 모양"을 배우는 게 아니다. after만 있으면 원형 보존을 가르칠 수 없다. 회사가 실제 리폼을 수행하므로 **모든 주문이 자동으로 페어 데이터가 되는 플라이휠**을 설계해야 한다.
4. **라이선스 지뢰**: Qwen-Image-Edit(2511까지)는 Apache 2.0(상업 OK), FLUX.2 [klein] 4B는 Apache 2.0, 반면 FLUX.2 [dev]와 [klein] 9B는 비상업 라이선스(LoRA 파생물 포함), FLUX.3 Image Klein은 연매출 $5M 미만 조건부 상업(Kommunity License), Qwen-Image-2.1은 연구 전용 라이선스. 자체 호스팅 시 반드시 이 매트릭스를 따라야 한다(§1.2.2).
5. **품질 평가는 "마스크 밖 변화량 = 원형 보존 점수"를 1등 KPI로**, 디자이너 승인 루프를 2등 KPI로 두고, 자동 지표(LPIPS/PSNR 마스크 외, DINOv3/DreamSim 유사도, VLM 판정)는 게이트 역할만 시킨다.

---

## 1. 세 가지 접근 심층 비교

### 1.1 접근 A — 학습 없음: 레퍼런스 이미지 + 프롬프트 (few-shot / in-context editing)

**원리**: "사용자 옷 사진(image 1) + 회사 디자인 레퍼런스(image 2~N) + 지시문" → 멀티 레퍼런스 편집 모델이 한 번에 합성. 회사 디자인은 "데이터베이스의 이미지 세트 + 프롬프트 템플릿"으로만 관리.

**2026-10-21 기준 사용 가능한 모델** (API/오픈웨이트):

| 모델 | 제공 | 레퍼런스 한도 | 가격(1K 출력 기준) | 특이점 | 출처 |
|---|---|---|---|---|---|
| Nano Banana Pro (gemini-3-pro-image) | Google API | 총 14장(객체 6, 캐릭터 5, 스타일 3) | $0.134 (1K/2K), $0.24 (4K); Batch/Flex 50% | 스타일 레퍼런스는 Pro만 지원, 텍스트 렌더링 강함, SynthID 워터마크 | https://ai.google.dev/gemini-api/docs/pricing (2026-10-19 갱신), https://ai.google.dev/gemini-api/docs/image-generation |
| Nano Banana 2.1 (gemini-nano-banana-2.1) | Google API | 총 14장(객체 10, 캐릭터 4) | $0.0336 (1K), $0.0504 (2K), $0.113 (4K) | 현재 Google 권장 워크호스, 입력 이미지 과금 약 $0.0011/장(Pro 기준) | 위와 동일 |
| Nano Banana 2 / 2 Lite | Google API | 14 / Lite는 멀티레퍼런스 비권장 | $0.067 / $0.0336 (1K) | 2.5 Flash Image(구 Nano Banana)는 2026-10-02 종료 | 위와 동일 |
| GPT-Image-2 (gpt-image-2) | OpenAI API | 최대 16장(서드파티 보고, **미확인**) | 1024² low $0.006 / medium $0.053 / high $0.211 (서드파티 집계) | 2026-04-21 출시, 마스크 인페인팅 지원 | https://datanorth.ai/news/openai-launches-gpt-image-2-with-99-text-accuracy, https://gate.ai/blog/gpt-image-2-openai-specs-pricing-api-use-cases |
| GPT Image 1.5 | OpenAI API | – | high 1024² $0.133 (공식) | 레거시로 전환 중 | https://developers.openai.com/api/docs/models/gpt-image-1.5 |
| Seedream 5.0 Pro / Lite | ByteDance(ModelArk), fal 등 | 최대 10장 | $0.045 (1.5K) / $0.09 (2K), 추가 레퍼런스 +$0.003 (서드파티, **미확인**) | 2026-07-08 출시(보도) | https://tech-insider.org/?p=20596, https://evolink.ai/blog/how-to-use-seedream-5-0-pro-multi-reference-image-generation |
| Seedream 4.5 | fal/Replicate/OpenRouter | 최대 14장(벤더 주장) | 약 $0.04/장 | – | https://openrouter.ai/bytedance-seed/seedream-4.5/pricing |
| FLUX.2 [dev] / [pro] / [max] | BFL, fal | 최대 10 소스(docs) | pro: 입력 $0.015/MP + 출력 첫 MP $0.03; max: 입력 $0.03/MP + 첫 MP $0.07 | 레퍼런스가 입력 MP로 과금됨 → 멀티레퍼런스는 비쌈 | https://docs.bfl.ai/flux_2, https://openrouter.ai/black-forest-labs/flux.2-pro/providers, https://docs.bfl.ai/quick_start/pricing.md |
| FLUX.3 Image Klein | BFL API + 오픈웨이트 | 최대 10장 | $0.009 (1K), 편집도 동일가 | 2026-10-15 출시, 5.6B, 바운딩 박스 가이드(하드 마스크 아님), 프롬프트 업샘플러 필수 | https://www.eesel.ai/blog/flux-3-klein, https://braindetox.kr/en/posts/flux_3_image_klein_open_weights_2026.html |
| Qwen-Image-Edit-2511 | 오픈웨이트(Apache 2.0), fal 등 | 공식 한도 **미기재**(예제 2~3장, Replicate는 1~3장 권장) | fal 기본 약 $0.03/장, LoRA 엔드포인트 $0.035/MP | 2025-12-22 출시, 20B, 일관성 강화, 커뮤니티 LoRA 내장 | https://huggingface.co/Qwen/Qwen-Image-Edit-2511, https://docs.qwenlm.ai/qwen-image-edit-2511/index.html |
| Qwen-Image-2.1 | 오픈웨이트(Qwen Research License) | 최대 10장, 원·낙서·마스크로 국소 편집 | 자체 호스팅 | 2026-09-20 출시, 7B. **상업 이용은 별도 계약 필요** | https://huggingface.co/Qwen/Qwen-Image-2.1, https://datanorth.ai/news/qwen-releases-qwen-image-2-1 |
| Qwen-Image 2.0 / 2.0 Pro | API 전용(클로즈드) | – | $0.075/장(서드파티) | 오픈웨이트 없음 | https://invideo.io/blog/qwen-image-ai-generator/ |
| Imagen 3 Customization (Vertex) | Google Cloud | 1~4장, subject/style | – | 레퍼런스 ID를 프롬프트에 `[$referenceId]`로 명시 | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/instruct-customization |

**무학습 멀티레퍼런스 편집의 실측 한계 (UniRef-Image-Edit, 2026-02)**
- MultiCom-Bench(사람·물체 합성 200세트, Gemini 3 Flash 판정): 2~3장 입력에서는 Nano Banana 0.6382 > UniRef 0.6180; 4~6장 입력에서는 Seedream 4.0 0.4739 > UniRef-MSGRPO 0.4616, **Qwen-Image-Edit-2511은 0.0271로 사실상 실패**.
- GEdit-Bench(단일 이미지 편집) 영어: Seedream 4.0 7.68 ≥ UniRef 7.65 > Qwen-Image-Edit-2509 7.54.
- ImgEdit-Bench: Qwen-Image-Edit-2509 = Nano Banana 4.35 > UniRef 4.28.
- 출처: https://arxiv.org/html/2602.14186
- 시사점: **"사용자 옷 1장 + 디자인 레퍼런스 1~2장"까지는 무학습으로 충분히 승부 가능하지만, 레퍼런스가 많아질수록(디자인의 앞/뒤/디테일 컷을 전부 넣는 식) 오히려 품질이 떨어진다.** 레퍼런스는 큐레이션된 1~2장 + 텍스트로 압축한 "디자인 카드"가 낫다.

**실무자 팁(의류 적용)**
- Nano Banana로 로고를 다른 사진의 티셔츠에 "천의 주름을 따라 인쇄된 것처럼" 올릴 수 있고, 원래 피사체의 그림자·조명 방향을 유지하라고 명시해야 한다(https://www.kdnuggets.com/nano-banana-practical-prompting-usage-guide).
- 원단 테스트에서는 "빈 모델에 패턴을 올리면 스케일이 지나치게 커지고 왜곡"되었고, "이미 입혀진 3D 모델"처럼 스케일 단서가 있을 때 더 잘 됐다(https://thematerialbrief.beehiiv.com/p/i-tested-google-s-nano-banana-ai-on-fabrics). → **패치·자수의 물리 치수(cm)를 옷의 픽셀 스케일로 변환해 바운딩 박스로 넘겨주는 전처리(C의 요소)가 A의 품질을 크게 올린다.**

**장단점 요약**
- 장점: 디자인 등록 즉시 사용(학습 0일), 디자인 수 무한 확장, 유지보수는 프롬프트/레퍼런스 관리뿐, 최신 모델 교체가 쉬움.
- 단점: 디자인 고유의 "손맛"(스티치 패턴, 워싱 톤, 특정 절개 방식) 재현이 불안정, 시드별 편차 큼, 원형 보존이 프롬프트 의존적, API 종속(모델 종료 리스크: Gemini 2.5 Flash Image가 1년여 만에 종료됨), 워터마크/정책 제약.

### 1.2 접근 B — LoRA / 파인튜닝으로 "변환"을 학습

**원리**: 각 디자인(또는 디자인 패밀리)의 before/after 페어(필요 시 레퍼런스 추가)로 편집 모델에 LoRA를 학습. 추론 시 "사용자 옷 + 트리거 지시문(+LoRA)"으로 생성.

#### 1.2.1 2026-10-21 기준 "편집 모델 LoRA 학습" 지원 매트릭스

| 베이스 모델 | 라이선스(웨이트) | 관리형 트레이너 | 로컬 툴 | 멀티 레퍼런스 학습 | 비고 |
|---|---|---|---|---|---|
| **Qwen-Image-Edit-2509** (Plus) | Apache 2.0 | fal `qwen-image-edit-2509-trainer` **$4/1,000스텝**, 기본 1,000스텝, LR 1e-4, `ROOT_start/_start2…/_end` | ai-toolkit (control 폴더 최대 3개, 32GB 예제 config) | O (start2, start3…) | 추론: fal `qwen-image-edit-plus-lora` $0.035/MP, LoRA 최대 3개, image_urls 리스트 |
| **Qwen-Image-Edit-2511** | Apache 2.0 | fal 2511 트레이너는 **deprecated**(2026-10 확인) | ai-toolkit 지원 | O | 추론: fal `qwen-image-edit-2511/lora` $0.035/MP |
| **Qwen-Image-2.1 / Turbo** | Qwen Research License(비상업) | – | ai-toolkit("control 이미지가 있으면 편집 학습") | O | 상업 사용 불가 → 연구/비교용만 |
| **FLUX.2 [dev]** (32B) | FLUX Non-Commercial (출력물은 상업 OK) | fal `flux-2-trainer-v2/edit`: 0.0056×steps×배수(1장 2.11, 2장 3.44, 3장 5.09, 4장 6.95) → 1,000스텝·1장 **$11.82**; 권장 15~50페어, ≥1024px | ai-toolkit(FLUX.2-dev), Diffusers | O (최대 4장) | 추론: fal `flux-2/lora` $0.021/MP(T2I). 자체 호스팅 상업은 BFL 라이선스 필요 |
| **FLUX.2 [klein] 4B Base** | **Apache 2.0** | fal `flux-2-klein-4b-base-trainer/edit` (0.0046×steps×배수, $9.71/1,000스텝·1장) — **deprecated 표시**; Civitai: `isEditTraining`, main/control_1~3, 2,000스텝 500 Buzz, 4B edit 5~15분 | ai-toolkit, Diffusers (12GB VRAM) | O (control 3개) | **상업 자체호스팅 가능한 유일한 FLUX.2 계열** |
| **FLUX.2 [klein] 9B Base** | FLUX Non-Commercial v2.1(파생물=LoRA도 비상업) | Civitai 1,000 Buzz/2,000스텝 | ai-toolkit (22GB VRAM) | O | 추론: fal `flux-2/klein/9b/base/edit/lora` $0.02/MP(입+출), 입력 최대 4장, LoRA 3개 |
| **FLUX.3 Image Klein Base** | FLUX Kommunity License(연매출 <$5M 상업 OK) | **미확인**(출시 6일차) | ai-toolkit 목록에 "FLUX.3 Image Klein" 등재 | 베이스가 10장 레퍼런스 지원 | Base로 학습한 LoRA를 Distilled에 scale 0.75로 로드 권장 |
| **FLUX.1 Kontext [dev]** | FLUX Non-Commercial(자체호스팅 상업 = BFL Self-Serve $999/월) | fal `flux-kontext-trainer` **$2.5/1,000스텝**; Replicate `fast-flux-kontext-trainer` 8×H100 $0.0122/초, 10~20페어 권장 | ai-toolkit (24GB, 1024는 OOM 가능) | X (단일 입력) | 2025년 표준이었으나 멀티레퍼런스 불가로 2026년엔 후순위 |
| **SDXL / SD1.5 + ControlNet/IP-Adapter** | OpenRAIL | Kohya/ai-toolkit | O | 간접(IP-Adapter) | 편집 전용 구조가 아니라 "인페인팅 + 스타일 LoRA" 조합으로만 활용. 품질·지시 추종이 2026년 기준 열세 |
| **Scenario (SaaS)** | – | Flux 2 Edit(Dev/Klein 9B/4B), Qwen Edit, Kontext 지원; 5~15페어 권장(최소 5, 플랜별 최대 12/25/50), 기본 LR 1e-4·repeats 20·epochs 10, 30~45분 | – | – | 디자이너 친화 UI. BACKWARD 데이터 생성 가이드 제공 |
| **Kohya sd-scripts** | – | – | FLUX.1 ControlNet 학습은 포크에 존재; Kontext/FLUX.2/Qwen-Edit 페어 학습 공식 지원 **미확인** | – | 2026년 편집 LoRA의 사실상 표준 툴은 **ai-toolkit(MIT)** |

출처: https://fal.ai/models/fal-ai/flux-2-trainer-v2/edit, https://fal.ai/models/fal-ai/flux-2-trainer-v2/edit/llms.txt, https://fal.ai/models/fal-ai/qwen-image-edit-2509-trainer/llms.txt, https://fal.ai/models/fal-ai/qwen-image-edit-2511-trainer, https://fal.ai/models/fal-ai/flux-2-klein-4b-base-trainer/edit, https://fal.ai/models/fal-ai/flux-kontext-trainer/llms.txt, https://replicate.com/replicate/fast-flux-kontext-trainer/readme, https://github.com/ostris/ai-toolkit, https://raw.githubusercontent.com/ostris/ai-toolkit/main/config/examples/train_lora_qwen_image_edit_2509_32gb.yaml, https://raw.githubusercontent.com/ostris/ai-toolkit/main/config/examples/train_lora_flux_kontext_24gb.yaml, https://developer.civitai.com/orchestration/recipes/training-flux2-klein, https://docs.bfl.ai/flux_2/flux2_klein_training.md, https://help.bfl.ai/articles/7108141705-can-i-run-or-fine-tune-flux-2-klein-locally, https://help.scenario.com/articles/6252966037-train-an-edit-lora-overview, https://fal.ai/models/fal-ai/qwen-image-edit-plus-lora/llms.txt, https://fal.ai/models/fal-ai/flux-2/klein/9b/base/edit/lora/llms.txt

#### 1.2.2 라이선스 매트릭스 (자체 호스팅 상업 서비스 기준)

| 모델 | 웨이트 라이선스 | LoRA(파생물) 상업 배포 | 생성물 상업 이용 | 비고 |
|---|---|---|---|---|
| Qwen-Image-Edit ~2511, Qwen-Image-2512 | Apache 2.0 | O | O | 가장 안전 |
| Qwen-Image-2.1 | Qwen Research License | X(별도 계약) | – | 연구 평가용 |
| FLUX.2 [klein] 4B | Apache 2.0 | O | O | 가장 안전한 FLUX |
| FLUX.2 [klein] 9B / FLUX.2 [dev] | FLUX Non-Commercial v2.1 | X(파생물 포함 비상업·비프로덕션) | O(단, 경쟁 모델 학습 금지, 콘텐츠 필터 의무) | 상업은 BFL Platform/Professional 티어(가격 비공개, 영업 문의) 또는 API 사용 |
| FLUX.1 Kontext [dev], FLUX.1 [dev] 계열 | FLUX Non-Commercial | Self-Serve Dev License $999/월(10만 장 포함, 초과 $0.01/장), API 재판매 불가 | O | help.bfl.ai 2025-09-19 갱신 기준 |
| FLUX.3 Image Klein | FLUX Kommunity License | 연매출 $5M 미만 조건부 O | 조건부 O | 콘텐츠 필터·AI 고지 의무 |
| SAM 3 | SAM License | 추론·파인튜닝 코드 공개 | – | 마스크 생성용 |
| DINOv3 | DINOv3 License(커스텀, 상업 허용 보도) | – | – | 임베딩/유사도용 |

출처: https://huggingface.co/black-forest-labs/FLUX.2-klein-base-9B/blob/main/LICENSE.md, https://huggingface.co/black-forest-labs/FLUX.2-dev, https://bfl.ai/pricing/licensing, https://help.bfl.ai/articles/9272590838-self-serve-dev-license-overview-pricing, https://huggingface.co/Qwen/Qwen-Image-Edit-2511, https://huggingface.co/Qwen/Qwen-Image-2.1, https://www.eesel.ai/blog/flux-3-klein, https://ai.meta.com/sam3/, https://the-decoder.com/?p=26498

#### 1.2.3 LoRA 접근의 변형들

- **디자인별 LoRA(1 design = 1 LoRA)**: 재현 충실도 최고. 디자인 수만큼 학습·검증·배포 파이프라인 반복. 추론 시 LoRA 스왑 필요.
- **디자인 패밀리/스타일 통합 LoRA(1 LoRA = N designs, 트리거 워드로 구분)**: 운영 단순. 그러나 개념 간 간섭 문제가 알려져 있다. 즉석 병합 방식은 "소수의 개념"에 한정되며, BlockLoRA는 15개 개념, LoRACLR는 12개 LoRA 병합을 보고(https://arxiv.org/abs/2503.08575, https://arxiv.org/abs/2412.09622). 한 LoRA에 수십 개 디자인을 트리거 워드로 넣는 것은 **검증 전까지 위험**. 현실적 상한은 패밀리당 5~15개 정도로 가정.
- **단일 페어에서 LoRA 생성(LoRA of Change)**: before/after 한 쌍으로 "변화"를 LoRA로 추출하는 연구(https://arxiv.org/abs/2411.19156). 양방향 손실(LoRA Reverse)로 페어 데이터만으로 학습. 아직 연구 단계이지만 "디자인 1개당 페어 몇 장"이라는 제약을 완화할 가능성 → 2027년 이후 옵션으로 추적.
- **IC-LoRA(In-Context LoRA)**: 20~100 샘플로 "이미지 세트 생성" 학습(https://arxiv.org/html/2410.23775v3). 디자인 카탈로그(앞/뒤/디테일 세트) 생성에 응용 가능.

**장단점 요약**
- 장점: 디자인 고유 디테일 재현, 프롬프트 민감도 감소, 일관성 높음(같은 디자인은 늘 같은 방식으로), 자체 호스팅 시 API 종속 탈피.
- 단점: 페어 데이터 필요(디자인당 20~40장 촬영/합성), 모델 세대 교체 시 전량 재학습(Scenario: "LoRA는 패밀리 간 호환 안 됨"), 디자인 변경 시 재학습, 추론 인프라에 LoRA 로딩 관리 필요.

### 1.3 접근 C — 구조화 템플릿(작업 연산 분해) + 생성 모델

**원리**: 리폼 디자인을 사람이 실제로 하는 작업 단위로 분해한다.

```
Design = [ op_1, op_2, ... ]  where op ∈ {CROP, PATCH, EMBROIDERY, DYE, BLEACH, CUT_OPEN, REMOVE_PART, ADD_PART, PRINT, DISTRESS, RECONSTRUCT}
op = { target_region (의류 파트: sleeve/hem/collar/chest/back...), geometry (위치·크기·각도, 의류 좌표계), asset (패치/자수 도안/원단 레퍼런스), params (색, 폭, 길이, 스티치) }
```

추론 파이프라인:
1. 의류 인식 + 파트 세그멘테이션(B 문서): SAM 3는 "sleeve", "collar" 같은 명사구 텍스트 프롬프트로 모든 인스턴스 마스크를 반환(https://ai.meta.com/sam3/, 2025-11-19 출시). 의류 파트 파싱은 추가 파인튜닝 또는 랜드마크 모델 보강 필요.
2. 디자인의 op 리스트를 사용자 옷의 좌표계로 투영 → 각 op별 **마스크 + 지시 프롬프트 + 에셋 이미지** 생성.
3. 생성: 마스크 기반 인페인팅/편집(FLUX.1 Fill + LoRA $0.035/MP(fal), FLUX.2 Fill Pro $0.045/edit(서드파티 보고), Qwen-Image InstantX Inpainting ControlNet, Qwen-Image-2.1의 마스크/낙서 국소 편집, GPT-Image-2 마스크 인페인팅, FLUX.3의 바운딩 박스). 마스크 밖은 **원본 픽셀로 컴포지트**(ComfyUI `SetLatentNoiseMask` + `ImageCompositeMasked` 패턴) → 원형 보존을 구조적으로 보장.
4. 결과 이미지 + op 리스트(=작업지시서 초안)를 함께 저장.

출처: https://fal.ai/models/fal-ai/flux-lora-fill/llms.txt, https://www.sozee.ai/resources/ai-inpainting-api-comparison/, https://huggingface.co/InstantX/Qwen-Image-ControlNet-Inpainting, https://www.comfy.org/workflows/image_qwen_image_instantx_inpainting_controlnet-a2b580c03e30, https://huggingface.co/Qwen/Qwen-Image-2.1

**관련 연구(패션 국소 편집)**
- FashionTailor(AAAI 2025): "의류 구조 편집(CSE)" 태스크 정의, 600만 페어 StructureFashion 데이터셋, 외형 유지하며 국소 구조 변경(https://mlanthology.org/aaai/2025/hou2025aaai-fashiontailor).
- DPDEdit: Grounded-SAM으로 편집 영역 예측 + 원단 텍스처 이미지 입력(https://arxiv.org/abs/2409.01086v2).
- MuGa-VTON(2025-08): 소매 걷기·셔츠 넣기 같은 국소 편집에서 구조·텍스처 연속성 유지(https://arxiv.org/pdf/2508.08488).
- DashTailor: "의류 아이템별 LoRA 학습은 비현실적"이라며 FLUX Fill 기반 무학습 전이 + 저강도 리터치 사용(https://insiders.dashverse.ai/dashtailor-training-free-clothing-and-object-transfer-for-ai-comics/).

**장단점 요약**
- 장점: 원형 보존을 **구조적으로 보장**(마스크 밖은 원본), 작업지시서와 시안이 같은 데이터에서 나와 **일관성 100%**, 디자인 추가 = 데이터 입력(학습 불필요), 가격/소요시간 자동 산출 가능, 재현성 높음.
- 단점: "op로 분해되지 않는" 전체적·예술적 리폼(리컨스트럭션, 복합 패치워크)은 표현 한계, 파트 세그멘테이션 품질에 종속, 마스크 경계에서 어색함(봉제선·그림자) 가능, 초기 모델링(디자이너가 op로 설명) 공수.

### 1.4 종합 비교표

| 축 | A 무학습 멀티레퍼런스 | B LoRA 학습 | C 구조화 템플릿+생성 |
|---|---|---|---|
| 시안 품질(디테일 충실도) | 중~상(디자인 의존, 편차 큼) | 상(학습 디자인에 한함) | 중~상(op로 표현 가능한 범위) |
| 원형 보존 | 프롬프트 의존, 레퍼런스 4장+에서 급락 | 학습 데이터가 가르친 만큼 | **구조적 보장(마스크 외 원본)** |
| 디자인당 초기 비용 | 0(레퍼런스 큐레이션만) | 페어 20~40장 + 학습 $4~20 + 검수 | op 정의 + 에셋 제작(디자이너 1~3시간) |
| 1건 추론 비용 | $0.03~0.13(Nano Banana 2.1~Pro), FLUX.3 $0.009 | $0.035~0.07/MP급(fal LoRA 엔드포인트) | 세그 + 인페인트 1~3회 ≈ $0.05~0.15 |
| 디자인 50→200 확장성 | 선형(관리만) | 학습·검증 파이프라인 200회, LoRA 스왑 운영 | 선형(데이터 입력), 파트 분할 모델은 공유 |
| 일관성(같은 디자인·다른 옷) | 중 | 상 | **최상(파라미터 기반)** |
| 작업지시서 변환 | 역추출 필요(VLM/마스크 diff) | 역추출 필요 | **불필요(파라미터가 원천)** |
| 유지보수 | 모델 교체 쉬움, API 종료 리스크 | 모델 세대 교체 시 전량 재학습 | 세그 모델/인페인터 교체 가능, op 스키마는 불변 |
| 라이선스 리스크 | API 약관(워터마크, 콘텐츠 정책) | 베이스 모델 라이선스(§1.2.2) | 동일 + SAM License |
| 구현 난이도 | 하 | 중 | 상(좌표계·마스크·합성) |

### 1.5 리폼 유형별 권장 접근

| 리폼 유형 | 특성 | 1차 권장 | 보조 | 근거 |
|---|---|---|---|---|
| 부분/전체 염색·탈색·색상 변경 | 파라미터(색)로 완전 기술 가능 | **C**(마스크+색 변환 또는 마스크 인페인트) | A | 결정론적, 색 정확도 중요 |
| 패치/와펜/프린트 부착 | 위치·크기·에셋으로 기술 가능 | **C**(에셋+바운딩 박스 인페인트) | A(블렌딩), B(스티치 질감) | 스케일 단서 제공 시 품질↑ |
| 자수(로고·레터링) | 텍스트 렌더링+스티치 질감 | **A**(Nano Banana Pro 텍스트 강점) + C(위치) | B(자수 질감 LoRA) | Pro는 텍스트 정확, 스타일 레퍼런스 지원 |
| 기장 수선·크롭탑·반바지화 | 기하 변경, 배경 복원 필요 | **C**(마스크 제거+배경 인페인트) | A | 마스크 외 보존 핵심 |
| 소매 분리(베스트화)·칼라 제거·구조 변경 | 봉제 구조가 바뀜, 그럴듯함 필요 | **B**(디자인 패밀리 LoRA) + C(영역) | A | 학습 없이는 봉제선 표현 불안정 |
| 워싱·디스트레스·빈티지 가공 | 전역 질감 | **B**(스타일 LoRA) | A | 디자인 고유 톤 재현 |
| 두 옷 결합·패치워크·리컨스트럭션 | 멀티 입력, 창의적 | **A**(멀티레퍼런스 2~3장) → 데이터 쌓이면 B(멀티레퍼런스 LoRA) | – | FLUX.2 edit trainer 4장 레퍼런스 학습 가능 |
| 지퍼·단추·끈 등 부자재 추가 | 작은 객체 | **C** + A | – | 작은 영역 인페인트 |

---

## 2. 편집 모델 파인튜닝에 필요한 데이터

### 2.1 before/after 페어가 핵심인 이유

- 편집 LoRA는 조건부 매핑 f(before, instruction) → after 를 배운다. after만으로는 "무엇을 그대로 두어야 하는지"를 배울 수 없다. fal의 Kontext 트레이너와 FLUX.2 edit 트레이너 모두 입력을 `ROOT_start`(원본) / `ROOT_end`(결과) 페어로 정의한다(https://blog.fal.ai/announcing-flux-1-kontext-dev-inference-training/, https://fal.ai/models/fal-ai/flux-2-trainer-v2/edit).
- Scenario는 "before 이미지를 after로 변환하는 forward 방식은 거의 잘 안 되고, after에서 before를 만드는 BACKWARD 방식이 정렬을 보장한다"고 명시(https://help.scenario.com/articles/3604099375-building-edit-lora-training-sets).
- 연구적으로도 일반화 편집 모델은 "quad data(페어+쿼리+타깃)"가 필요하지만 희소해서, 페어만으로 학습하는 기법(LoRA Reverse)이 제안됐다(https://arxiv.org/abs/2411.19156).
- **리폼 편의점의 구조적 강점**: 회사가 실제 리폼을 수행하므로, 모든 주문이 (고객 before 사진/입고 촬영 → 출고 촬영) 진짜 페어를 만든다. 이 플라이휠을 1일차부터 설계해야 한다(§6).

### 2.2 디자인(개념)당 필요 수량 — 출처별 가이드

| 출처 | 권장 수량 | 맥락 |
|---|---|---|
| Replicate fast-flux-kontext-trainer | 10~20 페어, ~1024px | Kontext 편집 LoRA |
| Scenario Edit LoRA | 5~15 페어(최소 5, 플랜 최대 12/25/50), "깨끗한 7페어 > 약한 15페어" | Flux 2 Edit/Qwen Edit/Kontext |
| fal FLUX.2 [dev] Edit Trainer V2 | 15~50 페어, 많을수록 특화↑ | 멀티레퍼런스 편집 |
| fal FLUX.2 블로그(2025-11-25) | 최소 20세트 | 아파트 스테이징 예시 |
| RunComfy ai-toolkit Qwen-Edit 가이드 | 60~200+ (광범위 스타일화·다중 피사체 융합) | 검색 스니펫 기준, 벤더 자료 |
| IC-LoRA | 태스크당 20~100 | 이미지 세트 생성 |
| Spheron FLUX.2 스타일 LoRA(T2I) | 15~30장, 30~40장 초과 시 과적합 위험 | 텍스트→이미지 스타일 |

출처: https://replicate.com/replicate/fast-flux-kontext-trainer/readme, https://help.scenario.com/articles/6252966037-train-an-edit-lora-overview, https://fal.ai/models/fal-ai/flux-2-trainer-v2/edit, https://blog.fal.ai/training-flux-2-loras, https://www.runcomfy.com/trainer/ai-toolkit/qwen-image-edit-2509-lora-training, https://arxiv.org/html/2410.23775v3, https://www.spheron.network/blog/fine-tune-flux2-wan-lora-cost-gpu-cloud-2026/

**리폼 편의점 권장(의견)**: 디자인 1개당
- 학습 페어 **20~40**: 의류 카테고리·색·소재가 다양하도록(같은 디자인을 검정 후드·회색 맨투맨·청자켓·흰 티 등 최소 8종 이상에 적용).
- 홀드아웃 테스트 페어 **5~10**(학습에 미포함, 자동 지표 + 디자이너 평가용).
- 디자인 패밀리 통합 LoRA를 시도할 경우 패밀리당 80~150 페어.
- 레퍼런스가 필요한 디자인(패치 에셋 등)은 페어마다 `start2`(에셋 이미지)를 고정으로 포함(FLUX.2 edit trainer 형식).

### 2.3 촬영 규격 (before/after 동일 조건이 생명)

| 항목 | 규격 | 이유 |
|---|---|---|
| 구도 | 플랫레이(상단 90°) 기본 + 행거 정면 1컷. before/after **동일 지그/삼각대 위치** | Scenario: 편집 툴이 구도를 바꾸면 정렬이 깨짐 |
| 배경 | 무채색(중회색/흰색) 무늬 없는 천 또는 보드 | 세그멘테이션·마스크 외 보존 점수 안정 |
| 조명 | 확산광 2등, 그림자 최소, 색온도 고정(5000~5500K), 컬러 체커 1컷 | 염색 디자인은 색 정확도가 KPI |
| 해상도 | 원본 3000px 이상 장변 저장, 학습용 1024~1536 리사이즈 | fal/BFL 모두 ≥1024px 권장 |
| 프레이밍 | 옷 전체 + 여백 10%, 옷 중심 정렬, 구김 펴기 | 좌표계 투영(C)과 페어 정렬에 필요 |
| 뷰 세트 | 앞/뒤/디테일(리폼 부위 클로즈업) | 디테일 컷은 레퍼런스(A)·에셋(C)용, 학습 페어는 앞/뒤만 |
| 메타데이터 | 의류 카테고리, 소재, 색, 사이즈, 디자인 ID, op 리스트, 촬영 장비 | 데이터 모델(§4)과 1:1 |
| "현실 입력" 세트 | 별도로 **휴대폰 촬영·생활 조명·바닥/침대 배경**의 before 10~20장 | Scenario: before는 "실제 사용자가 줄 법한 입력"이어야 함. 학습 before의 일부(30~50%)는 폰 촬영본으로 섞을 것 |

출처: https://help.scenario.com/articles/3604099375-building-edit-lora-training-sets, https://docs.bfl.ai/flux_2/flux2_klein_training.md

### 2.4 라벨링: 프롬프트 템플릿 · 트리거 워드

- 한 디자인의 모든 페어는 **동일한 지시문 패턴**: `[동사] [변환 설명] [트리거 워드]`. 예: `Apply the RFM_D017 crop-and-patch reform: cut the hem to waist length and sew the RFM_D017 chest patch, keep everything else unchanged`. Scenario는 "트리거 워드는 전부 쓰거나 전부 안 쓰거나"를 강조(https://help.scenario.com/articles/3604099375-building-edit-lora-training-sets).
- BFL klein 가이드: 캡션은 "가르치려는 개념/스타일 **제외하고** 보이는 모든 것"을 서술 + 트리거 워드(https://docs.bfl.ai/flux_2/flux2_klein_training.md). 편집 학습에서는 "무엇을 바꾸는지"만 쓰고 옷의 종류는 템플릿 변수로(`{garment}`) 넣어 다양성 확보.
- 트리거 워드는 사전에 없는 토큰(`RFM_D017`)으로 디자인 ID와 동일하게 → 데이터 모델의 `trigger_word`와 1:1.
- 네거티브/보존 문구를 캡션 끝에 고정: `preserve original fabric color, texture, logo, fit and background`.
- 페어마다 `ROOT.txt` 생성은 자동화(데이터 모델에서 렌더링). fal 트레이너는 캡션 파일 또는 `default_caption` 중 하나가 없으면 실패.

### 2.5 데이터 증강

- 페어에 **동일하게** 적용: 수평 플립(단, 좌우 비대칭 디자인·텍스트 자수는 금지), 동일 크롭 박스, 밝기/색온도 소폭 지터(염색 디자인은 after의 색 변경 금지 → 색 지터는 before/after 동일 값으로만).
- LoRA of Change는 A/A' 페어를 함께 플립하고, 페어 순서(A→A', A'→A)를 뒤바꿔 양방향 학습(https://arxiv.org/abs/2411.19156). 역방향 샘플은 "리폼 제거" LoRA 부산물도 만들어 BACKWARD 데이터 생성에 재활용 가능.
- ai-toolkit 예제 config에는 이미지 증강이 기본 없고 caption dropout 5%만 존재(https://raw.githubusercontent.com/ostris/ai-toolkit/main/config/examples/train_lora_flux_kontext_24gb.yaml) → 증강은 **데이터 준비 단계에서 오프라인 생성**이 안전.
- 배경 치환 증강: before/after 모두 동일 배경 합성(SAM 3 마스크 사용)으로 "바닥·침대·옷걸이" 다양성 확보.
- 해상도 버킷: ai-toolkit은 512/768/1024 멀티 해상도 버킷 지원 → 폰 사진의 다양한 비율 대응.

### 2.6 합성 데이터로 페어 만들기 (BACKWARD 방식)

- Scenario 권장 절차: 큐레이션된 after(최종 품질) → 편집 모델로 리폼을 "되돌려" before 생성(패치 제거, 기장 복원, 염색 제거). 도구: Gemini 3.x(Nano Banana), Seedream Edit, Qwen Edit, Flux Kontext, GPT Image 2(주변 컨텍스트 보존 강점). 복잡한 경우 **다단계**(AFTER → 중간 → BEFORE). 체크리스트: 같은 장면·피사체·구도, 같은 변환 유형, before가 "현실적 입력"일 것, ≥1024px, 실패 페어는 버림(https://help.scenario.com/articles/3604099375-building-edit-lora-training-sets).
- fal의 Kontext 사례: Kontext Max는 브로콜리 헤어를 "제거"는 되지만 "추가"는 못 했기에, 제거 방향으로 페어를 만들고 학습 시 순서를 뒤집음(https://blog.fal.ai/announcing-flux-1-kontext-dev-inference-training/). → 리폼도 "제거(복원)"가 "추가"보다 쉬운 경우가 많다(패치 제거, 색 제거).
- 주의: 기장 크롭은 되돌리기(아웃페인팅으로 길이 복원)가 그럴듯하지 않을 수 있음 → 이런 디자인은 **진짜 페어(실제 주문)** 우선.
- 합성 페어는 반드시 디자이너 검수(정렬·현실성) 후 사용. 합성:실제 비율은 초기 7:3 → 6개월 후 3:7 목표.

### 2.7 회사가 이미 가진 "after만 있는" 리폼 결과물 사진 활용법

| 활용 | 방법 | 접근 |
|---|---|---|
| 레퍼런스 세트 | 디자인 카드의 `reference_images`로 등록(앞/뒤/디테일 1~3장 큐레이션) | A |
| BACKWARD 합성 before | §2.6으로 before 생성 → 디자이너 검수 → 학습 페어 | B |
| 스타일/질감 LoRA(T2I) | 디자인별 after 20~40장으로 FLUX.2 klein 4B/Qwen-Image T2I LoRA → 패치·자수·워싱 **에셋 생성**과 인페인트 프롬프트 강화 | C, B |
| 검색/추천 임베딩 | DINOv3/CLIP 임베딩으로 "이 옷에 어울리는 디자인" 추천 인덱스 | 추천 |
| 평가 기준 이미지 | 생성 결과 vs after 기준 이미지의 DreamSim/DINO 유사도(리폼 부위 크롭) | 평가 |
| op 역설계 | 디자이너가 after 사진을 보며 op 리스트 작성(C 템플릿 초기화) | C |

---

## 3. 학습 인프라 · 비용 (2026-10-21 검색 기준)

### 3.1 관리형 트레이너 가격

| 서비스 | 모델 | 가격 | 1,000스텝 예시 | 비고 |
|---|---|---|---|---|
| fal.ai | FLUX.2 [dev] Edit Trainer V2 | 0.0056 × steps × 배수(1장 2.11 / 2장 3.44 / 3장 5.09 / 4장 6.95) | $11.82(1장), $19.26(2장) | 기본 1,000스텝, LR 5e-5, 최대 20,000스텝 |
| fal.ai | FLUX.2 [dev] T2I Trainer | 0.0064 × steps | $6.40 | 10장 이상 |
| fal.ai | FLUX.2 [klein] 4B Base Edit Trainer | 0.0046 × steps × 배수 | $9.71(1장) | deprecated 표시 |
| fal.ai | Qwen-Image-Edit-2509 Trainer | $4 / 1,000스텝(최소 100스텝 $0.40) | $4 | LR 1e-4, start2… 레퍼런스 가능 |
| fal.ai | Qwen-Image-Edit-2511 Trainer | $4 / 1,000스텝 | – | **deprecated** |
| fal.ai | FLUX.1 Kontext Trainer | $2.5 / 1,000스텝(최소 500스텝) | $2.5 | 단일 입력 |
| Replicate | fast-flux-kontext-trainer | 8×H100 $0.0122/초(≈$0.73/분) | 2~5분 ≈ $1.5~3.7(추정) | 실행 시간 공개 없음 |
| Replicate | 일반 하드웨어 | H100 $5.49/h, A100 80GB $5.04/h, L40S $3.51/h | – | 커스텀 트레이너 직접 띄울 때 |
| Civitai | FLUX.2 klein 4B/9B edit | 4B 500 Buzz, 9B 1,000 Buzz(2,000스텝) | 4B edit 5~15분 | Buzz→USD 환율 **미확인** |
| Scenario | Flux 2 Edit / Qwen Edit / Kontext | Pro/Max/Enterprise 플랜(가격 비공개) | 30~45분 | 디자이너 UI |

출처: https://fal.ai/models/fal-ai/flux-2-trainer-v2/edit, https://fal.ai/models/fal-ai/flux-2-trainer/llms.txt, https://fal.ai/models/fal-ai/flux-2-klein-4b-base-trainer/edit, https://fal.ai/models/fal-ai/qwen-image-edit-2509-trainer/llms.txt, https://fal.ai/models/fal-ai/qwen-image-edit-2511-trainer, https://fal.ai/models/fal-ai/flux-kontext-trainer/llms.txt, https://replicate.com/pricing, https://replicate.com/replicate/fast-flux-kontext-trainer, https://developer.civitai.com/orchestration/recipes/training-flux2-klein, https://help.scenario.com/articles/6252966037-train-an-edit-lora-overview

### 3.2 자체 GPU(클라우드 임대) 가격과 소요시간

| GPU | RunPod Community / Secure ($/h, 2026-10-08 갱신) | 서버리스 | 적합 모델 |
|---|---|---|---|
| RTX 4090 24GB | $0.34 / $0.89 | $1.10 | FLUX.2 klein 4B·9B, Kontext(1024는 OOM 가능) |
| RTX 5090 32GB | $0.69 / $1.19 | $1.58 | Qwen-Image-Edit-2509 32GB 예제 config(uint3 양자화) |
| L40S 48GB | $0.79 / $1.09 | $1.75 | Qwen-Edit 여유, FLUX.2 dev 양자화 |
| A100 80GB | $1.19~1.39 / $1.79 | $2.72 | FLUX.2 dev(21~22GB@bs4~6), 안정 |
| H100 SXM 80GB | $2.69 / $3.99 | $4.79 | 대량 배치 |
| B200 | $5.98 / $7.99 | $8.64 | 불필요 |

출처: https://www.runpod.io/gpu-cloud/pricing (서드파티 트래커는 10월 중 인상 보고: H100 SXM $3.49→$3.99 — https://pricingsaas.com/companies/runpod/diffs/2026W42)

소요시간·비용 실측(Spheron, 2026-07, FLUX.2 LoRA 1,000스텝·bs6): RTX 4090 2~4h $1.16~2.32, A100 PCIe spot 1.5~3h $1.79~3.57, H100 PCIe 1~2h $2.01~4.02, 튜닝 반복 포함 완성 LoRA 약 $5~15(https://www.spheron.network/blog/fine-tune-flux2-wan-lora-cost-gpu-cloud-2026/). BFL은 klein LoRA를 "소비자 GPU에서 1~3시간"으로 안내(https://help.bfl.ai/articles/7108141705-can-i-run-or-fine-tune-flux-2-klein-locally). ai-toolkit 예제: Kontext/Qwen-Edit 3,000스텝(500~4,000 권장), LR 1e-4, rank 16(https://raw.githubusercontent.com/ostris/ai-toolkit/main/config/examples/train_lora_qwen_image_edit_2509_32gb.yaml).

VRAM: klein 4B 12GB, 9B 22GB(https://docs.bfl.ai/flux_2/flux2_klein_training.md); Qwen-Edit-2509는 ai-toolkit 32GB config(3bit 양자화+텍스트 임베딩 캐시 필수); Kontext 24GB(1024 OOM 가능).

### 3.3 비용 시나리오 (학습비만, 데이터 준비 인건비 제외)

| 시나리오 | 가정 | 관리형(fal) | 자체(RunPod) |
|---|---|---|---|
| 디자인 1개 LoRA | 1,500스텝, 레퍼런스 1장, 재학습 2회 | Qwen-Edit $6×3 = **$18** / FLUX.2 dev edit $17.7×3 = **$53** | 5090 1.5h×3×$0.69 ≈ **$3** |
| 디자인 50개 | 위 × 50 | $900 / $2,650 | ≈ $150 + 운영 인력 |
| 디자인 200개 | 위 × 200 | $3,600 / $10,600 | ≈ $600 + 운영 인력 |
| 모델 세대 교체 1회 전량 재학습(200개) | 1회 | $1,200 / $3,540 | ≈ $200 |

→ **학습비는 디자인 200개 규모에서도 월 수백 달러 수준으로 무시 가능.** 실제 비용은 (1) 페어 데이터 촬영·검수 인건비, (2) 디자이너 승인 루프, (3) 추론 비용이다.

### 3.4 추론 비용·LoRA 로딩 지연

- fal 엔드포인트(LoRA 지원): Qwen-Image-Edit-Plus/2511 LoRA $0.035/MP, LoRA 최대 3개 동시, 기본 28스텝(https://fal.ai/models/fal-ai/qwen-image-edit-plus-lora/llms.txt); FLUX.2 klein 9B base edit LoRA $0.02/MP(입력+출력, 입력은 1MP로 리사이즈), 입력 최대 4장(https://fal.ai/models/fal-ai/flux-2/klein/9b/base/edit/lora/llms.txt); FLUX.2 dev LoRA $0.021/MP, LoRA 2GB 초과 시 GB당 50% 추가(https://fal.ai/models/fal-ai/flux-2/lora/llms.txt).
- 1 세션 = 시안 후보 3장(1~2MP) 가정 → $0.1~0.25/세션. 무학습 Nano Banana 2.1은 $0.034×3 ≈ $0.10, Pro는 $0.40.
- **LoRA 핫스왑 지연**: Hugging Face 실측(2023)에서 베이스를 상주시키고 어댑터만 교체하면 웜업 25초→3초, 가중치 병합(fuse) 시 추론 30% 단축(https://huggingface.co/blog/lora-adapters-dynamic-loading). Diffusers `enable_lora_hotswap`은 torch.compile 재컴파일 없이 교체(https://huggingface.co/blog/lora-fast). SwiftDiffusion은 LoRA 로딩을 초기 디노이즈 스텝과 겹쳐 지연 은폐(https://arxiv.org/abs/2407.02031). fal 자체 엔드포인트의 LoRA 캐시 정책은 **미확인**(URL로 매 요청 전달; 첫 요청 다운로드 지연 수 초 가정).
- 운영 가이드: 디자인별 LoRA는 수십 MB(fal "a few MB"~수백 MB). 인기 상위 20개 LoRA는 GPU 메모리 상주, 나머지는 /data 캐시에서 핫스왑. 사용자 플로우상 "디자인 선택 → 생성"이므로 선택 시점에 프리로드 요청을 보내 체감 지연을 줄인다.

### 3.5 디자인 수 50 → 200일 때 운영 방식 비교

| 방식 | 50개 | 200개 | 판단 |
|---|---|---|---|
| 디자인별 LoRA | 학습 50회, LoRA 50개 관리, 스왑 빈번 | 학습 200회, 모델 교체 시 200회 재학습, 캐시 전략 필수 | 품질 최상이나 운영 부담. **플래그십 20~30개**에 한정 권장 |
| 패밀리/스타일 통합 LoRA | 5~10 패밀리 LoRA | 15~25 패밀리 LoRA(패밀리당 ≤10개 디자인) | 간섭 리스크(BlockLoRA 15개 한계 보고) → 패밀리당 홀드아웃 평가 필수 |
| 무학습 + 구조화 템플릿(A+C) | 디자인 카드 50개 | 카드 200개 | 학습 0, 선형 확장. 품질은 모델 성능에 종속 |
| **하이브리드(권장)** | A+C 전수 + B 플래그십 10개 | A+C 전수 + B 플래그십 30개 + 패밀리 LoRA 5개 | 비용·품질 균형 |

---

## 4. 디자인 라이브러리 데이터 모델 제안

설계 원칙: (1) `operations`가 **진실의 원천(source of truth)**이고 이미지·LoRA·프롬프트는 파생물, (2) 모든 파생물에 버전·출처·평가 점수 부착, (3) 접근 A/B/C 어느 쪽으로 렌더링해도 같은 레코드에서 읽는다.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ReformDesign",
  "type": "object",
  "required": ["design_id", "name", "version", "status", "applicability", "operations", "assets", "rendering", "pricing"],
  "properties": {
    "design_id": {"type": "string", "pattern": "^RFM_D[0-9]{3,5}$", "description": "트리거 워드와 동일"},
    "name": {"type": "object", "properties": {"ko": {"type": "string"}, "en": {"type": "string"}}},
    "family_id": {"type": "string", "description": "스타일 패밀리(통합 LoRA 단위)"},
    "version": {"type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$"},
    "status": {"enum": ["draft", "in_review", "active", "deprecated"]},
    "tags": {"type": "array", "items": {"type": "string"}},
    "applicability": {
      "type": "object",
      "properties": {
        "garment_categories": {"type": "array", "items": {"enum": ["tshirt", "sweatshirt", "hoodie", "shirt", "denim_jacket", "jeans", "knit", "dress", "coat", "other"]}},
        "materials": {"type": "array", "items": {"enum": ["cotton", "denim", "wool", "polyester", "leather", "knit", "blend"]}},
        "excluded_materials": {"type": "array", "items": {"type": "string"}},
        "conditions": {"type": "array", "items": {"type": "string"}, "description": "예: 앞면에 큰 프린트 없음, 소매 길이 ≥ 50cm"},
        "required_parts": {"type": "array", "items": {"type": "string"}, "description": "세그멘테이션이 찾아야 하는 파트: sleeve_left, hem, collar …"},
        "fit_score_rule": {"type": "string", "description": "추천 점수 계산 규칙 ID"}
      }
    },
    "operations": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["op_id", "type", "target_part"],
        "properties": {
          "op_id": {"type": "string"},
          "type": {"enum": ["CROP", "PATCH", "EMBROIDERY", "PRINT", "DYE", "BLEACH", "CUT_OPEN", "REMOVE_PART", "ADD_PART", "DISTRESS", "RECONSTRUCT", "HARDWARE"]},
          "target_part": {"type": "string", "description": "sleeve_left | chest | hem | collar | back | …"},
          "geometry": {
            "type": "object",
            "properties": {
              "anchor": {"type": "string", "description": "의류 좌표계 기준점: chest_center, hem_line …"},
              "offset_cm": {"type": "array", "items": {"type": "number"}, "minItems": 2, "maxItems": 2},
              "size_cm": {"type": "array", "items": {"type": "number"}, "minItems": 2, "maxItems": 2},
              "rotation_deg": {"type": "number"},
              "length_rule": {"type": "string", "description": "CROP용: 'waist_line - 5cm' 등"}
            }
          },
          "params": {
            "type": "object",
            "properties": {
              "color_lab": {"type": "array", "items": {"type": "number"}},
              "color_name": {"type": "string"},
              "stitch_type": {"type": "string"},
              "thread_color": {"type": "string"},
              "edge_finish": {"enum": ["raw", "hemmed", "overlock", "bias"]},
              "opacity": {"type": "number"}
            }
          },
          "asset_ref": {"type": "string", "description": "assets.items[].asset_id"},
          "labor_minutes": {"type": "number"},
          "difficulty": {"enum": [1, 2, 3, 4, 5]},
          "mask_strategy": {"enum": ["sam3_text", "part_parser", "bbox_from_geometry", "manual"]},
          "mask_prompt": {"type": "string", "description": "SAM 3 명사구, 예: 'left sleeve of the hoodie'"}
        }
      }
    },
    "assets": {
      "type": "object",
      "properties": {
        "items": {"type": "array", "items": {"type": "object", "properties": {
          "asset_id": {"type": "string"},
          "kind": {"enum": ["patch", "embroidery_pattern", "print_artwork", "fabric_swatch", "hardware"]},
          "image_url": {"type": "string"},
          "vector_url": {"type": "string"},
          "physical_size_cm": {"type": "array", "items": {"type": "number"}},
          "physical_sku": {"type": "string"}
        }}},
        "reference_images": {"type": "array", "items": {"type": "object", "properties": {
          "url": {"type": "string"},
          "view": {"enum": ["front", "back", "detail", "on_body"]},
          "garment_meta": {"type": "object"},
          "curated_for_prompting": {"type": "boolean"},
          "source": {"enum": ["studio_after", "order_after", "synthetic"]}
        }}},
        "training_pairs": {"type": "array", "items": {"type": "object", "properties": {
          "pair_id": {"type": "string"},
          "before_url": {"type": "string"},
          "after_url": {"type": "string"},
          "extra_refs": {"type": "array", "items": {"type": "string"}},
          "caption": {"type": "string"},
          "origin": {"enum": ["real_order", "studio_shoot", "backward_synthetic"]},
          "qc_status": {"enum": ["pending", "approved", "rejected"]},
          "split": {"enum": ["train", "holdout"]}
        }}}
      }
    },
    "rendering": {
      "type": "object",
      "properties": {
        "strategy": {"enum": ["A_reference_prompt", "B_lora", "C_structured", "hybrid"]},
        "prompt_template": {"type": "string", "description": "예: 'Apply {trigger} reform to this {garment}: {op_descriptions}. Keep fabric color, texture, logos, fit and background unchanged.'"},
        "negative_prompt": {"type": "string"},
        "trigger_word": {"type": "string"},
        "preservation_clause": {"type": "string"},
        "preferred_models": {"type": "array", "items": {"type": "string"}, "description": "예: ['qwen-image-edit-2511', 'nano-banana-2.1']"},
        "lora": {"type": "object", "properties": {
          "weights_url": {"type": "string"},
          "base_model": {"type": "string"},
          "base_model_version": {"type": "string"},
          "rank": {"type": "integer"},
          "scale": {"type": "number"},
          "trained_at": {"type": "string", "format": "date-time"},
          "trainer": {"type": "string"},
          "train_steps": {"type": "integer"},
          "dataset_snapshot_id": {"type": "string"},
          "license_note": {"type": "string"}
        }},
        "compositing": {"type": "object", "properties": {
          "paste_back_outside_mask": {"type": "boolean", "default": true},
          "mask_feather_px": {"type": "integer"}
        }}
      }
    },
    "pricing": {
      "type": "object",
      "properties": {
        "base_price_krw": {"type": "integer"},
        "price_modifiers": {"type": "array", "items": {"type": "object"}},
        "lead_time_days": {"type": "integer"},
        "difficulty": {"enum": [1, 2, 3, 4, 5]}
      }
    },
    "quality": {
      "type": "object",
      "properties": {
        "holdout_metrics": {"type": "object", "properties": {
          "preservation_lpips_outside_mask": {"type": "number"},
          "preservation_psnr_outside_mask": {"type": "number"},
          "design_similarity_dreamsim": {"type": "number"},
          "instruction_clip_score": {"type": "number"},
          "vlm_judge_score": {"type": "number"}
        }},
        "designer_approval_rate": {"type": "number"},
        "user_regeneration_rate": {"type": "number"},
        "last_evaluated_at": {"type": "string", "format": "date-time"}
      }
    },
    "audit": {
      "type": "object",
      "properties": {
        "created_by": {"type": "string"},
        "approved_by": {"type": "string"},
        "changelog": {"type": "array", "items": {"type": "object"}}
      }
    }
  }
}
```

**예시 레코드(요약)**: `RFM_D017` "크롭 + 가슴 와펜" = ops [CROP(hem, length_rule="waist_line-3cm", edge_finish=raw), PATCH(chest, anchor=chest_center, offset (0,-4)cm, size 9×9cm, asset=patch_bear_v2)], applicability {sweatshirt, hoodie; cotton/blend; 앞면 대형 프린트 제외}, rendering {strategy: hybrid, lora: qwen-image-edit-2509 rank16 v1.2}, pricing {38,000원, 7일, 난이도 2}.

---

## 5. 품질 평가 체계

### 5.1 자동 지표 (게이트용)

| 지표 | 계산 | 용도 | 출처 |
|---|---|---|---|
| **원형 보존 점수** | 편집 마스크(op 마스크 ∪ 팽창 20px) **밖** 영역의 LPIPS(↓), PSNR(↑), SSIM(↑), MSE(↓). PIE-Bench 관례 | 1등 KPI. 임계: PSNR ≥ 30dB, LPIPS ≤ 0.05(초기값, 실데이터로 보정) | https://arxiv.org/pdf/2410.18756, https://arxiv.org/pdf/2412.10316 |
| 구조 유지 | DINO(v2/v3) 임베딩 코사인(원본 vs 결과, 전체 이미지) | 실루엣·핏 변형 감지 | https://arxiv.org/pdf/2506.02560, DINOv3 https://blog.roboflow.com/train-dinov3/ |
| 디자인 충실도 | 결과의 리폼 부위 크롭 vs 디자인 레퍼런스(동일 부위 크롭)의 DreamSim(↓)/DINO(↑) | "우리 디자인처럼 보이나" | https://github.com/ssnl/dreamsim |
| 지시 추종 | CLIP(결과, 지시문) 및 AugCLIP(컨텍스트 인식) | 과소/과잉 편집 탐지 | https://arxiv.org/abs/2410.11374 |
| VLM 판정 | Gemini/GPT에 (원본, 결과, 디자인 카드) 입력, 루브릭(보존 1~5, 디자인 적용 1~5, 봉제 현실성 1~5, 결함) JSON 출력 | GEdit/ImgEdit 벤치가 GPT 판정 채택 | https://arxiv.org/pdf/2605.16951 |
| 쌍대 일관성 판정 | PVC-Judge(오픈소스, GPT-5.1 상회 보고) | 자체 호스팅 가능 판정기 | https://arxiv.org/abs/2603.28547 |
| 색 정확도(염색 op) | 마스크 내 평균 Lab ΔE2000 vs 목표색 | 염색 디자인 전용 | – |
| 안전/결함 | NSFW, 손·얼굴 왜곡(온바디 시), 텍스트 오타(자수 op: OCR 일치) | 자동 반려 | – |

운영 규칙: 자동 지표는 **반려 게이트**(명백 실패 제거·재생성 트리거)로만 쓰고, 통과 후보를 사람 평가로 넘긴다. GEditBench v2와 Edit-GRPO 모두 "표준 지표는 시각 일관성을 제대로 못 잡는다"고 지적(https://arxiv.org/abs/2603.28547, https://arxiv.org/abs/2605.16951).

### 5.2 사람 평가

- **디자이너 승인 루프**: 신규 디자인/LoRA 배포 전 홀드아웃 5~10 페어 결과를 (레퍼런스 | before | 결과) 3분할로 검토, 승인/수정/반려 + 반려 사유 태그(보존 실패, 위치 오차, 스케일 오차, 질감 불일치, 봉제 비현실, 색 오차). 승인율 ≥ 80% 시 배포.
- **A/B 선호**: 같은 입력에 대해 모델/전략(A vs B vs C) 결과를 블라인드 쌍대 비교. 주간 50쌍, 디자이너 2인 + 운영 1인.
- **사용자 신호**: 재생성률, 후보 중 선택률, 주문 전환, 입고 후 "시안과 다름" 클레임률.
- **캘리브레이션**: 월 1회 동일 20쌍을 평가자 전원에게 → 일치도(Krippendorff α) 점검.
- 도구: 측면 비교 + 주석 + 승인 게이트 + 프롬프트/모델/레퍼런스 추적 로그를 갖춘 리뷰 큐(상용 단일 제품은 확인 못 함; n8n/워크플로 엔진 + 주석 툴 조합 권장 — https://n8n.io/workflows/7307-generate-and-quality-control-images-with-dall-e-2-and-human-review-loop/, https://virtuall.pro/blog/approval-workflows-for-ai-content-review-annotate-ship).

### 5.3 시안 → 작업지시서 일관성 확보

**원칙: 파라미터 우선(parameter-first).** 작업지시서는 `operations` + 사용자 옷 실측(카테고리, 사이즈, 소재, 랜드마크 거리)에서 생성하고, 시안 이미지는 그 파라미터로 렌더링된 "참고 시각화"로 둔다. 이렇게 하면 역추출이 필요 없다.

A/B 방식(생성 모델이 자유롭게 그린 경우)의 **역추출 보조 절차**:
1. 변경 마스크: 원본 vs 결과 픽셀 차이 + SAM 3로 결과 이미지에서 "patch", "embroidery" 등 명사구 세그 → 변경 영역 박스.
2. 의류 좌표계 변환: 원본의 파트 마스크(어깨선·가슴 중심·밑단)로 정규화 좌표 → cm 환산(사용자 입력 사이즈 또는 기준 치수 테이블).
3. VLM 구조화 추출: (원본, 결과)를 넣고 `{added:[], removed:[], changed:[]}` JSON 산출(SceneDiff 방식: 먼저 각 이미지 객체 나열 → 비교 → JSON; 박스는 before 기준 — https://arxiv.org/pdf/2512.16908, https://arxiv.org/pdf/2512.12633). VLM은 세부 디테일을 놓치는 경향이 보고됨(https://arxiv.org/pdf/2604.02486) → 디자인 카드의 op 리스트와 **대조 검증**(예상 op 외 변화가 있으면 "비승인 변경"으로 플래그).
4. 색 추출: 변경 영역 평균 Lab → 디자인 색 팔레트에 스냅.
5. 디자이너 확인 후 작업지시서 확정. 고객 화면에는 "시안은 참고용이며 실제 결과는 원단·봉제에 따라 달라질 수 있음" 고지.

---

## 6. 디자인 수 확장 시 운영 프로세스와 디자이너 도구

### 6.1 신규 디자인 등록 파이프라인

```
① 디자인 카드 작성(디자이너) → ② 에셋 등록(패치/도안/스와치, 실물 치수) → ③ 샘플 촬영(스튜디오: 8종 이상 의류에 적용한 before/after, + 폰 촬영 before) → ④ 데이터 QC(자동: 해상도·정렬 IoU·캡션 스키마 / 수동: 디자이너) → ⑤ 렌더링 전략 결정(A/C 즉시 활성, B는 페어 ≥20일 때) → ⑥ (B) 학습 잡 제출(fal/자체) → ⑦ 홀드아웃 자동 평가 → ⑧ 디자이너 승인(≥80%) → ⑨ 스테이징 카나리(내부 10% 트래픽) → ⑩ 프로덕션 배포 → ⑪ 모니터링(승인율·재생성률·전환·클레임) → ⑫ 재학습 트리거(실주문 페어 +20 누적 또는 승인율 < 70%)
```

- 플라이휠: 모든 주문의 입고 사진(before, 표준 지그)과 출고 사진(after)을 자동으로 `training_pairs(origin=real_order)`에 적재 → 월 단위 재학습.
- 모델 세대 교체(예: Qwen-Edit 2511 → 차기): 전 디자인 재학습을 배치로 돌리고 홀드아웃 지표가 기존 대비 열화되지 않을 때만 전환(블루/그린).
- 버저닝: `design.version`(디자인 자체), `rendering.lora.version`(가중치), `dataset_snapshot_id`(데이터) 3축.

### 6.2 디자이너 도구(내부 어드민) 최소 기능

| 도구 | 기능 |
|---|---|
| 디자인 카드 에디터 | op 추가/편집(파트 선택, 치수 입력, 에셋 연결), 적용 가능 카테고리 체크, 프롬프트 템플릿 미리보기 |
| 페어 업로더 | 드래그 업로드, 자동 페어링(파일명), 정렬 검사(특징점 매칭 IoU), 해상도 경고, 캡션 자동 생성 |
| 마스크 에디터 | SAM 3 자동 마스크 + 브러시 보정, op별 마스크 저장 |
| 리뷰 큐 | 3분할(레퍼런스/before/결과) + 승인·반려 사유, 단축키, 배치 처리 |
| 실험 보드 | 전략 A/B/C·모델·LoRA 버전별 홀드아웃 지표 비교, 샘플 그리드 |
| 배포 콘솔 | 카나리 비율, 롤백, 라이선스 체크(베이스 모델 라이선스 플래그) |
| 플라이휠 대시보드 | 디자인별 실주문 페어 누적, 재학습 대기열 |

---

## 7. 유사 사례와 교훈

| 사례 | 내용 | 교훈 |
|---|---|---|
| 유럽 패션 브랜드 커스터마이징 플랫폼(ForkPoint 케이스) | 과거 주문 데이터로 로고·텍스트 배치 추천 AI + 실시간 3D 미리보기 + 생산 자동 전달. 6개월 개발. 브랜딩 관련 CS 티켓 70%↓, 주문 완료 50% 단축, NPS +35%(벤더 자가 보고) | "배치 파라미터 → 미리보기 → 생산 데이터 자동 전달"이 곧 접근 C. 과거 주문이 추천 모델의 학습 데이터 |
| Zakeke AI Agent Studio(2026-04-24) Virtual Model Agent | 프롬프트 기반으로 프린트·자수·스티치 효과를 가상 모델 위에 이미지/짧은 영상으로 렌더 | 온바디 미리보기를 생성형으로 상품화. 2차 단계(온바디)에 참고 |
| Stitch Fix Vision(2025-10) → "See it on me"(2026-06) | 고객이 추천 코디를 자기 모습에 입혀 보는 생성 이미지 | 대형 리테일도 "내 사진 기반 미리보기"를 핵심 전환 도구로 채택 |
| H&M Creator Studio 생성형 아트워크 / Levi's 아바타 파일럿 | 생성 아트워크를 전용 블랭크 라인에 인쇄; 법적 회색지대 언급 | 생성물 권리·고지 정책을 초기에 정리 |
| fal Kontext "브로콜리 헤어" LoRA | 제거 방향 페어를 만들어 학습 시 순서를 뒤집음 | BACKWARD 합성 페어의 원형 |
| Scenario Edit LoRA 가이드 | 5~15페어, 동일 변환·동일 캡션 패턴, 캡션 불일치가 약한 LoRA의 1위 원인 | 라벨 규율이 데이터 양보다 중요 |
| Myntra "Forward"(SD3 DreamBooth LoRA, 자가 보고) | 캡션에 색·스타일·기장·패턴 명시 | 정량 결과 없음, 참고만 |
| FashionTailor(AAAI 2025) | 600만 페어로 "의류 구조 편집" 학습 | 구조 변경은 대규모 페어가 있어야 일반화 → 우리는 디자인별 소규모 LoRA + 마스크로 우회 |
| DashTailor | 아이템별 LoRA는 비현실적이라며 Fill 기반 무학습 전이 채택 | 모든 디자인을 LoRA화하지 말 것 |
| 수선 플랫폼(Sojo $2.4M 프리시드, The Seam, Save Your Wardrobe, The Restory) | 수선·리폼 수요와 투자 존재(영국 중심) | 시장 신호. 한국 사례는 검색에서 **미확인** |

출처: https://forkpoint.com/case-studies/custom-apparel-made-easy-with-ai-and-3d-preview/, https://www.printweek.com/content/product-news/zakeke-launches-ai-powered-preview-tool, https://pr.moultrieobserver.com/article/Zakeke-AI-Studio-Debuts-as-the-Prompt-Based-Solution-That-Frees-E-Commerce-Teams-from-Costly-Complex-Content-Workflows/69eb137125e04a842cd695ad, https://us.fashionnetwork.com/news/Stitch-fix-expands-ai-styling-tool-with-personalized-outfit-visualization-feature,1847029.html, https://www.gelato.com/blog/ai-and-custom-apparel, https://blog.fal.ai/announcing-flux-1-kontext-dev-inference-training/, https://help.scenario.com/articles/6252966037-train-an-edit-lora-overview, https://dev.to/aditi_baheti_f4a40487a091/transforming-fashion-with-ai-building-a-genz-trend-generator-using-stable-diffusion-3-and-dreambooth-lora-j3o, https://mlanthology.org/aaai/2025/hou2025aaai-fashiontailor, https://insiders.dashverse.ai/dashtailor-training-free-clothing-and-object-transfer-for-ai-comics/, https://fashionunited.ie/news/business/garment-repair-app-sojo-secures-2-4-million-dollars-in-pre-seed-funding-1650972257/20220426439997, https://www.businessoffashion.com/articles/sustainability/repairs-alterations-start-up-circular-fashion-sojo-the-restory-seam-tersus-save-your-wardrobe/

---

## 8. 단계별 권장안

### Phase 0 — 기획·검증 (0~6주): "학습 없이 품질 상한 확인"
- 디자인 20개를 op로 분해해 디자인 카드 작성(C 스키마). 디자이너가 "op로 못 쓰는 디자인"을 표시 → 그것이 B 후보.
- 렌더링: A(Nano Banana 2.1/Pro, Qwen-Image-Edit-2511 자체호스팅, FLUX.3 Klein API) × C-lite(SAM 3 마스크 + 마스크 외 원본 컴포지트) 조합으로 **같은 입력 30장**에 대해 시안 생성.
- 디자이너 블라인드 평가 + 자동 보존 지표로 모델·전략 베이스라인 확정. 레퍼런스는 디자인당 1~2장으로 제한.
- 산출물: 전략별 승인율, 디자인별 "A/C로 충분 vs B 필요" 분류표, 촬영 규격 확정.

### Phase 1 — 파일럿 (2~4개월): "플래그십 10개 LoRA"
- B 후보 상위 10개 디자인에 대해 스튜디오 페어 20~40 + 폰 before 10 + BACKWARD 합성 보강.
- 트레이너: 1순위 Qwen-Image-Edit-2509 (fal $4/1,000스텝, Apache 2.0, 레퍼런스 start2 지원) / 2순위 FLUX.2 [dev] Edit Trainer V2(품질 비교용, 상업 자체호스팅은 라이선스 확인) / 자체 GPU는 ai-toolkit + RunPod 5090/L40S.
- 홀드아웃 평가로 A+C 대비 승인율 개선폭 측정. 개선 < 10%p면 그 디자인은 B 중단.
- 추론: fal LoRA 엔드포인트로 시작(운영 단순), 월 1만 세션 넘으면 자체 서빙 검토.
- 실주문 플라이휠 가동(입고/출고 표준 촬영).

### Phase 2 — 확장 (6개월~): "하이브리드 운영"
- 전 디자인: A+C 카드. 플래그십 20~30개: 디자인별 LoRA. 유사 디자인 묶음: 패밀리 LoRA 5개 내외(패밀리당 ≤10개, 간섭 평가 필수).
- 합성:실제 페어 비율을 3:7로 전환, 분기별 재학습.
- 차세대 모델(Qwen-Image 2.x 상업 라이선스 해소 여부, FLUX.3 Klein Base 트레이너, LoRA-of-Change류 단일 페어 학습) 모니터링 후 블루/그린 교체.
- 온바디 미리보기(Zakeke/Stitch Fix 방식)는 별도 트랙.

### 가드레일
- 자체 호스팅 상업 배포 모델은 Apache 2.0(Qwen-Image-Edit ~2511, FLUX.2 klein 4B)만. 비상업 라이선스 모델은 API 경유 또는 계약 후.
- 시안 고지문, 고객 사진 보관 기간·동의, SynthID/워터마크 정책 확인.
- 모든 생성물에 (모델, 버전, LoRA, 프롬프트, 시드, 마스크) 메타데이터 저장 → 재현·분쟁 대응.

---

## 9. 클라이언트(리폼 편의점)에게 요청할 데이터 수집 체크리스트

### 9.1 디자인 인벤토리
- [ ] 디자인 전체 목록(이름, 사진, 출시 시기, 판매량/인기 순위)
- [ ] 디자인별 **작업 절차서**(실제 작업자가 보는 순서, 사용 부자재 SKU, 소요 시간, 난이도)
- [ ] 적용 가능 의류 카테고리·소재·제외 조건(예: 니트 불가, 앞면 대형 프린트 불가)
- [ ] 가격표·리드타임·옵션(색상 선택, 패치 위치 선택 가능 여부)
- [ ] 패치·자수 도안·프린트 원본 파일(벡터/고해상도), 실물 치수(cm), 원단 스와치 사진

### 9.2 이미지 자산
- [ ] 기존 리폼 결과물(after) 사진 전부(원본 해상도, 촬영 조건 메모)
- [ ] 과거 주문 중 **before 사진이 남아 있는 건**(고객 전송 사진·입고 사진) — 가장 가치 높음
- [ ] 디자인별 앞/뒤/디테일 컷 유무
- [ ] 고객 사진 사용 동의 범위(학습 사용 가능 여부) 확인

### 9.3 촬영 협조
- [ ] 스튜디오 촬영 가능 여부(장소·조명·삼각대 지그), 디자인당 8종 이상 의류에 적용 샘플 제작 가능 여부
- [ ] 입고/출고 시 표준 촬영을 작업 공정에 넣을 수 있는지(작업자 1명·5분/건)
- [ ] 흔한 고객 의류 카테고리 상위 10개와 색상 분포(촬영 샘플 선정용)

### 9.4 운영·정책
- [ ] 시안 승인 권한자(디자이너) 지정과 주당 가용 시간(리뷰 큐 운영)
- [ ] "원형 유지"의 허용 범위 정의(예: 실루엣 변화 불가, 색 보정 불가)
- [ ] 시안과 실물 차이에 대한 환불/재작업 정책
- [ ] 연매출 규모(FLUX Kommunity License $5M 기준), API 사용 vs 자체 호스팅 선호, 예산 상한

---

## 10. 미확인·리스크 목록

| 항목 | 상태 | 조치 |
|---|---|---|
| fal 2511 트레이너 deprecated 이후 공식 대체 엔드포인트 | 미확인 | fal 문의 또는 2509 트레이너/ai-toolkit 자체 학습 |
| FLUX.3 Image Klein Base의 관리형 edit 트레이너 | 미확인(출시 직후) | 11월 재확인 |
| GPT-Image-2 레퍼런스 16장 한도, Seedream 5.0 가격 | 서드파티만 확인 | 공식 문서 재확인 |
| Civitai Buzz→USD 환율, Scenario 플랜 가격 | 미확인 | 가입 후 확인 |
| fal LoRA 캐시/핫스왑 지연 실측 | 미확인 | Phase 1에서 실측 |
| Kohya sd-scripts의 Kontext/FLUX.2/Qwen-Edit 페어 학습 지원 | 미확인 | ai-toolkit 사용으로 회피 |
| 한국 내 유사 리폼 AI 서비스 | 검색에서 미발견 | 경쟁 조사 별도 |
| UniRef 등 벤치마크 수치는 논문 자가 보고 | 주의 | 자체 홀드아웃으로 재검증 |
| Qwen-Image-2.1 상업 라이선스 조건 | 별도 계약 필요 | Alibaba 문의 |
| LoRA 통합 시 개념 간섭 상한(15개 보고는 인물·스타일 기준) | 리폼 도메인 미검증 | 패밀리당 ≤10개로 시작 |

---

## 부록 A. 주요 출처 목록

- Google Gemini API 가격(2026-10-19 갱신): https://ai.google.dev/gemini-api/docs/pricing
- Google 이미지 생성 문서(레퍼런스 한도): https://ai.google.dev/gemini-api/docs/image-generation
- fal FLUX.2 [dev] Edit Trainer V2: https://fal.ai/models/fal-ai/flux-2-trainer-v2/edit , https://fal.ai/models/fal-ai/flux-2-trainer-v2/edit/llms.txt
- fal FLUX.2 LoRA 블로그(2025-11-25): https://blog.fal.ai/training-flux-2-loras
- fal Qwen-Image-Edit-2509 Trainer: https://fal.ai/models/fal-ai/qwen-image-edit-2509-trainer/llms.txt
- fal Qwen-Image-Edit-2511 Trainer(deprecated): https://fal.ai/models/fal-ai/qwen-image-edit-2511-trainer
- fal Qwen Edit Plus LoRA 추론: https://fal.ai/models/fal-ai/qwen-image-edit-plus-lora/llms.txt
- fal FLUX.2 klein 9B base edit LoRA 추론: https://fal.ai/models/fal-ai/flux-2/klein/9b/base/edit/lora/llms.txt
- fal Kontext Trainer: https://fal.ai/models/fal-ai/flux-kontext-trainer/llms.txt , 블로그(2025-06-26): https://blog.fal.ai/announcing-flux-1-kontext-dev-inference-training/
- Replicate Kontext 트레이너 README: https://replicate.com/replicate/fast-flux-kontext-trainer/readme , 가격: https://replicate.com/pricing
- ai-toolkit(MIT): https://github.com/ostris/ai-toolkit , 예제 config: https://raw.githubusercontent.com/ostris/ai-toolkit/main/config/examples/train_lora_qwen_image_edit_2509_32gb.yaml , https://raw.githubusercontent.com/ostris/ai-toolkit/main/config/examples/train_lora_flux_kontext_24gb.yaml
- Civitai FLUX.2 klein 학습 레시피: https://developer.civitai.com/orchestration/recipes/training-flux2-klein
- BFL klein 학습 가이드: https://docs.bfl.ai/flux_2/flux2_klein_training.md , FAQ: https://help.bfl.ai/articles/7108141705-can-i-run-or-fine-tune-flux-2-klein-locally , 라이선스 페이지: https://bfl.ai/pricing/licensing , Self-Serve Dev License: https://help.bfl.ai/articles/9272590838-self-serve-dev-license-overview-pricing
- FLUX.2 klein 9B 라이선스 전문: https://huggingface.co/black-forest-labs/FLUX.2-klein-base-9B/blob/main/LICENSE.md , FLUX.2 dev 모델 카드: https://huggingface.co/black-forest-labs/FLUX.2-dev
- FLUX.3 Image Klein: https://www.eesel.ai/blog/flux-3-klein , https://braindetox.kr/en/posts/flux_3_image_klein_open_weights_2026.html
- Qwen-Image-Edit-2511: https://huggingface.co/Qwen/Qwen-Image-Edit-2511 , https://docs.qwenlm.ai/qwen-image-edit-2511/index.html
- Qwen-Image-2.1: https://huggingface.co/Qwen/Qwen-Image-2.1 , https://datanorth.ai/news/qwen-releases-qwen-image-2-1
- Qwen-Image 2.0(API 전용): https://invideo.io/blog/qwen-image-ai-generator/
- GPT-Image-2: https://datanorth.ai/news/openai-launches-gpt-image-2-with-99-text-accuracy , GPT Image 1.5 공식 가격: https://developers.openai.com/api/docs/models/gpt-image-1.5
- Seedream 5.0: https://tech-insider.org/?p=20596 , Seedream 4.5: https://openrouter.ai/bytedance-seed/seedream-4.5/pricing
- Scenario Edit LoRA: https://help.scenario.com/articles/6252966037-train-an-edit-lora-overview , 데이터셋 가이드: https://help.scenario.com/articles/3604099375-building-edit-lora-training-sets
- RunPod 가격(2026-10-08): https://www.runpod.io/gpu-cloud/pricing ; Spheron FLUX.2 LoRA 비용: https://www.spheron.network/blog/fine-tune-flux2-wan-lora-cost-gpu-cloud-2026/
- UniRef-Image-Edit(2026-02): https://arxiv.org/html/2602.14186
- LoRA of Change: https://arxiv.org/abs/2411.19156 ; IC-LoRA: https://arxiv.org/html/2410.23775v3
- BlockLoRA: https://arxiv.org/abs/2503.08575 ; LoRACLR: https://arxiv.org/abs/2412.09622
- LoRA 핫스왑: https://huggingface.co/blog/lora-adapters-dynamic-loading , https://huggingface.co/blog/lora-fast , https://arxiv.org/abs/2407.02031
- SAM 3: https://ai.meta.com/sam3/ ; DINOv3: https://blog.roboflow.com/train-dinov3/ ; DreamSim: https://github.com/ssnl/dreamsim
- 평가 벤치: PIE-Bench 관례 https://arxiv.org/pdf/2410.18756 , GEditBench v2 https://arxiv.org/abs/2603.28547 , Edit-GRPO https://arxiv.org/abs/2605.16951 , AugCLIP https://arxiv.org/abs/2410.11374 , ImgEdit https://neurips.cc/virtual/2025/poster/121410
- VLM 차이 추출: https://arxiv.org/pdf/2512.16908 , https://arxiv.org/pdf/2512.12633 , https://arxiv.org/pdf/2604.02486
- 마스크 인페인팅: https://fal.ai/models/fal-ai/flux-lora-fill/llms.txt , https://huggingface.co/InstantX/Qwen-Image-ControlNet-Inpainting , https://www.sozee.ai/resources/ai-inpainting-api-comparison/
- 패션 편집 연구: https://mlanthology.org/aaai/2025/hou2025aaai-fashiontailor , https://arxiv.org/abs/2409.01086v2 , https://arxiv.org/pdf/2508.08488 , https://insiders.dashverse.ai/dashtailor-training-free-clothing-and-object-transfer-for-ai-comics/
- 사례: https://forkpoint.com/case-studies/custom-apparel-made-easy-with-ai-and-3d-preview/ , https://www.printweek.com/content/product-news/zakeke-launches-ai-powered-preview-tool , https://us.fashionnetwork.com/news/Stitch-fix-expands-ai-styling-tool-with-personalized-outfit-visualization-feature,1847029.html , https://www.gelato.com/blog/ai-and-custom-apparel
- Nano Banana 의류 프롬프트 실무: https://www.kdnuggets.com/nano-banana-practical-prompting-usage-guide , https://thematerialbrief.beehiiv.com/p/i-tested-google-s-nano-banana-ai-on-fabrics
