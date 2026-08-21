import { NextResponse } from "next/server";
import type { WeatherAlert } from "@/lib/care-calc";

/**
 * OpenWeatherMap 현재 날씨 조회(무료 티어).
 * API 키가 서버에만 있어야 하므로 클라이언트에서 직접 호출하지 않고 이 라우트를 거친다.
 */

/** 정책정의서 "날씨 임계값 기준" 3건 */
const HEAT_WAVE_MAX_TEMP = 33; // 폭염: 최고기온 33도 이상
const COLD_WAVE_MIN_TEMP = -12; // 한파: 최저기온 -12도 이하
// 장마: 일 강수량 20mm 이상 → 현재 날씨 API는 시간당 강수량을 주므로 20mm/24h ≈ 0.83mm/h로 환산
const RAINY_SEASON_MM_PER_HOUR = 20 / 24;

function detectAlert(
  tempMax: number,
  tempMin: number,
  precipitation: number,
): WeatherAlert {
  // 기온 예외를 먼저 판정한다(정책정의서에 우선순위 정의가 없어 극한 기온을 우선)
  if (tempMax >= HEAT_WAVE_MAX_TEMP) return "폭염";
  if (tempMin <= COLD_WAVE_MIN_TEMP) return "한파";
  if (precipitation >= RAINY_SEASON_MM_PER_HOUR) return "장마";
  return null;
}

export async function GET(request: Request) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const label = searchParams.get("label") ?? "서울";
  if (!lat || !lon) {
    return NextResponse.json({ error: "missing_coords" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=kr&appid=${apiKey}`,
      { next: { revalidate: 600 } }, // 같은 좌표는 10분간 캐시(무료 티어 호출 절약)
    );
    if (!response.ok) {
      return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
    }

    const data = await response.json();
    // 1시간 강수량이 없으면 3시간 값을 시간당으로 환산
    const rain = data.rain as Record<string, number> | undefined;
    const precipitation = rain?.["1h"] ?? (rain?.["3h"] ? rain["3h"] / 3 : 0);

    return NextResponse.json({
      region: label,
      queried_at: new Date().toISOString(),
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      precipitation,
      weather_alert_flag: detectAlert(
        data.main.temp_max,
        data.main.temp_min,
        precipitation,
      ),
      description: data.weather?.[0]?.description ?? "",
    });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
