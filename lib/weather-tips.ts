import type { WeatherSnapshot } from "@/lib/weather";

/**
 * 날씨 상태별 관리 팁.
 * 기획서에 정의된 문구가 아니라 이 프로젝트에서 새로 쓴 카피 — 확정되면 여기만 교체한다.
 * 식물별 맞춤이 아니라 날씨 상태 하나로 결정되는 일반 안내다.
 */
interface WeatherTip {
  title: string;
  body: string;
}

const ALERT_TIPS: Record<string, WeatherTip> = {
  폭염: {
    title: "더운 날엔 흙이 금방 말라요",
    body: "한낮 직사광은 피하고, 잎에 분무를 곁들이면 좋아요.",
  },
  한파: {
    title: "추울 땐 물을 적게",
    body: "생장이 느려져 물이 덜 필요해요. 창가는 밤에 더 추우니 조금 떼어두세요.",
  },
  장마: {
    title: "습할 땐 과습을 조심",
    body: "흙이 잘 마르지 않아요. 창문을 열어 통풍을 시켜주세요.",
  },
};

const DRY_AIR_TIP: WeatherTip = {
  title: "공기가 건조해요",
  body: "잎 끝이 마르기 쉬워요. 잎에 분무해주면 도움이 돼요.",
};

const RAINY_TIP: WeatherTip = {
  title: "비 오는 날이에요",
  body: "흙이 천천히 마르니 물주기 전에 흙 상태를 한 번 확인해주세요.",
};

const DEFAULT_TIP: WeatherTip = {
  title: "식물이 지내기 좋은 날",
  body: "흙 표면이 말랐는지 손가락으로 확인해보세요.",
};

/** 습도가 이보다 낮으면 건조 안내 */
const DRY_HUMIDITY = 40;

/**
 * 우선순위 — 특이기상 > 건조 > 강수 > 기본
 * 특이기상은 물주기 일정까지 바꾸는 조건이라 가장 앞에 둔다.
 */
export function selectWeatherTip(weather: WeatherSnapshot): WeatherTip {
  if (weather.weather_alert_flag) {
    return ALERT_TIPS[weather.weather_alert_flag];
  }
  if (weather.humidity < DRY_HUMIDITY) return DRY_AIR_TIP;
  if (weather.precipitation > 0) return RAINY_TIP;
  return DEFAULT_TIP;
}
