import { genericAnchors, genericPctPerCm, SAMPLE_GARMENTS } from "./garments";
import type { PreparedPhoto } from "./image";
import type { Garment } from "./types";

export function garmentFromSample(sampleId: string, id: string, createdAt: number, analyzed = false): Garment {
  const s = SAMPLE_GARMENTS.find((g) => g.sampleId === sampleId) ?? SAMPLE_GARMENTS[0];
  return { ...s, id, source: "sample", analyzed, createdAt };
}

export function garmentFromPhoto(photo: PreparedPhoto, id: string, createdAt: number): Garment {
  // 시안 단계에서는 종류를 티셔츠로 가정하고 고객이 고치게 한다. 색은 사진에서 계산한 값이다.
  const category = "tshirt" as const;
  return {
    id,
    source: "upload",
    name: "내 옷",
    image: photo.dataUrl,
    width: photo.width,
    height: photo.height,
    category,
    colorName: photo.color.name,
    colorHex: photo.color.hex,
    material: null,
    anchors: genericAnchors(category),
    pctPerCm: genericPctPerCm(category),
    analyzed: false,
    quality: photo.quality,
    createdAt,
  };
}
