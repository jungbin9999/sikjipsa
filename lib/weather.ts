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
  /** 실제 조회값이 아니라 시연용 강제 시나리오인지 */
  is_scenario?: boolean;
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

/**
 * 시연·QA용 날씨 시나리오 강제.
 *
 * 실제 API로는 원하는 날씨를 만들 수 없어서(8월에 한파를 볼 수 없다) 넣은 장치다.
 * QA 체크리스트 인수기준의 사용자 시나리오 3(장마철 물주기 연기) 검증에도 필요하다.
 * URL에 `?weather=장마` 처럼 붙이면 API를 호출하지 않고 이 값을 쓴다.
 */
export const WEATHER_SCENARIOS = {
  맑음: { temperature: 26, humidity: 55, precipitation: 0, description: "맑음", weather_alert_flag: null },
  폭염: { temperature: 35, humidity: 45, precipitation: 0, description: "매우 더움", weather_alert_flag: "폭염" },
  한파: { temperature: -14, humidity: 40, precipitation: 0, description: "매우 추움", weather_alert_flag: "한파" },
  장마: { temperature: 24, humidity: 92, precipitation: 3.5, description: "비", weather_alert_flag: "장마" },
} as const satisfies Record<string, Omit<WeatherSnapshot, "region" | "queried_at" | "is_scenario">>;

export type WeatherScenario = keyof typeof WEATHER_SCENARIOS;

export function isWeatherScenario(value: string | null): value is WeatherScenario {
  return value !== null && value in WEATHER_SCENARIOS;
}

export function buildScenarioWeather(
  scenario: WeatherScenario,
  location: string | null,
): WeatherSnapshot {
  return {
    ...WEATHER_SCENARIOS[scenario],
    region: parseLocation(location).label,
    queried_at: new Date().toISOString(),
    is_scenario: true,
  };
}
