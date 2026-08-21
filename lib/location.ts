/** 위치 권한 거부·실패 시 적용하는 기본값(정책정의서 예외처리 규칙) */
export const DEFAULT_LOCATION = "서울";

/**
 * 현재 위치를 "위도,경도" 문자열로 돌려준다.
 * 권한 거부·실패·미지원은 모두 서울 기준값으로 폴백한다.
 */
export function requestCurrentLocation(): Promise<string> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(DEFAULT_LOCATION);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve(
          `${position.coords.latitude.toFixed(4)},${position.coords.longitude.toFixed(4)}`,
        ),
      () => resolve(DEFAULT_LOCATION),
      { timeout: 8000 },
    );
  });
}

/** 화면에 보여줄 위치 라벨 */
export function locationLabel(location: string | null): string {
  if (!location) return DEFAULT_LOCATION;
  return location.includes(",") ? "현재 위치" : location;
}

/** 서울 기준값으로 동작 중인지 — 마이페이지 배지 노출 조건 */
export function isDefaultLocation(location: string | null): boolean {
  return !location || location === DEFAULT_LOCATION;
}
