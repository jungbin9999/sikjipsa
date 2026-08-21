// 데이터정의서(2단계 ③) 엔티티 기준 타입. 필드명은 정의서 표기 그대로 사용한다.

export type LightCondition = "직사광" | "간접광" | "그늘";
export type PotSize = "소" | "중" | "대";
export type PlantStatus = "활성" | "보관" | "삭제";
export type CareType = "물주기" | "분갈이";
export type GrowthRate = "빠름" | "보통" | "느림";

/** /data/plants.json 한 항목 — DB가 아니라 코드 내 정적 데이터 */
export interface PlantSpecies {
  id: string;
  name: string;
  base_watering_interval_days: number;
  growth_rate: GrowthRate;
  light_condition_default: LightCondition;
  care_tip: string;
  image_url: string;
}

/** auth.users와 1:1로 연결된 앱 전용 사용자 필드 */
export interface Profile {
  user_id: string;
  nickname: string | null;
  profile_image_url: string | null;
  /** "서울" 같은 지역명 또는 "37.5665,126.978" 형태의 좌표 */
  location: string | null;
  notification_permission: boolean;
  created_at: string;
}

export interface Plant {
  plant_id: string;
  user_id: string;
  species: string;
  nickname: string;
  photo_url: string | null;
  adopted_at: string;
  last_watered_at: string;
  pot_size: PotSize | null;
  light_condition: LightCondition;
  next_watering_date: string;
  next_repotting_date: string;
  status: PlantStatus;
  created_at: string;
}

export interface CareLog {
  care_log_id: string;
  plant_id: string;
  care_type: CareType;
  scheduled_date: string;
  completed_at: string | null;
  is_completed: boolean;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  notification_type: string;
  sent_at: string;
  is_read: boolean;
}

/** /data/products.json 한 항목 — DB가 아니라 코드 내 정적 데이터 */
export interface Product {
  product_id: string;
  category: string;
  name: string;
  thumbnail_url: string;
  price: number;
  affiliate_url: string;
  review_summary: string;
  is_sold_out: boolean;
}
