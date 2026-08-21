/**
 * 리스트 카드 색을 흰 → 블랙 → 라임 순으로 돌린다.
 * 참고 이미지(design-refs/typo_03.png)의 리스트 패턴 — 흰 카드만 늘어놓으면
 * 팔레트가 드러나지 않아서, 카드 자체를 팔레트로 번갈아 칠한다.
 * accent(라임) 위 텍스트는 항상 ink여야 하므로 톤별 보조 텍스트 색도 같이 준다.
 */
export interface CardTone {
  card: string;
  sub: string;
  chip: string;
}

const TONES: CardTone[] = [
  {
    card: "bg-accent text-ink",
    sub: "text-ink/60",
    chip: "bg-ink text-paper",
  },
  {
    card: "bg-ink text-paper",
    sub: "text-paper/50",
    chip: "bg-accent text-ink",
  },
  {
    card: "bg-paper text-ink",
    sub: "text-ink/50",
    chip: "bg-cloud text-ink/70",
  },
];

export function cardTone(index: number): CardTone {
  return TONES[index % TONES.length];
}
