import type { WeatherAlert } from "@/lib/care-calc";

/** 데이터정의서 "날씨 데이터" 엔티티 — 조회성 데이터라 DB에 저장하지 않는다 */
export interface WeatherSnapshot {
  region: string;
  queried_at: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  weather_alert_flag: WeatherAlert;
  description: string;
}

/** 위치 권한 거부 시 적용하는 기본 좌표(서울시청) */
export const SEOUL_COORDS = { lat: 37.5665, lon: 126.978 };

/**
 * profiles.location은 텍스트 한 필드에 좌표("37.5665,126.9780") 또는
 * 지역명("서울")이 들어온다. 좌표가 아니면 서울 기준값으로 본다.
 */
export function parseLocation(location: string | null) {
  if (location && location.includes(",")) {
    const [lat, lon] = location.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon, label: "현재 위치" };
    }
  }
  return { ...SEOUL_COORDS, label: "서울" };
}

/** 외부 API가 느려도 화면이 매달리지 않도록 상한을 둔다 */
const WEATHER_TIMEOUT_MS = 3000;

/** 날씨 조회 — 실패·지연 시 null을 돌려주고 화면에서 폴백 문구를 띄운다 */
export async function fetchWeather(
  location: string | null,
): Promise<WeatherSnapshot | null> {
  const { lat, lon, label } = parseLocation(location);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);

  try {
    const response = await fetch(
      `/api/weather?lat=${lat}&lon=${lon}&label=${encodeURIComponent(label)}`,
      { signal: controller.signal },
    );
    if (!response.ok) return null;
    return (await response.json()) as WeatherSnapshot;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
