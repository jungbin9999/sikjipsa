-- 식집사 2.0 초기 스키마
-- 데이터정의서(2단계 ③) 엔티티 기준, 필드명은 정의서 표기 그대로 사용
-- 제품(products)은 /data/products.json 목업으로 대체 — 테이블 생성하지 않음
-- 날씨 데이터(weather)는 조회성이라 테이블 생략(구현 착수 순서 2번 명시)

-- ─────────────────────────────────────────────
-- 사용자 앱 전용 필드 (auth.users와 1:1)
-- login_account(이메일)는 auth.users가 보유하므로 중복 저장하지 않음
-- ─────────────────────────────────────────────
create table public.profiles (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  nickname                text,
  profile_image_url       text,
  location                text,
  notification_permission boolean     not null default false,
  created_at              timestamptz not null default now()
);

-- 회원가입 시 profiles 행 자동 생성
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- 식물
-- ─────────────────────────────────────────────
create table public.plants (
  plant_id            uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (user_id) on delete cascade,
  species             text not null,
  nickname            text not null,
  photo_url           text,
  adopted_at          date not null,
  last_watered_at     date not null,
  pot_size            text,
  light_condition     text not null check (light_condition in ('직사광', '간접광', '그늘')),
  next_watering_date  date not null,
  next_repotting_date date not null,
  status              text not null default '활성' check (status in ('활성', '보관', '삭제')),
  created_at          timestamptz not null default now()
);

create index plants_user_id_idx on public.plants (user_id);

-- ─────────────────────────────────────────────
-- 케어 이력
-- ─────────────────────────────────────────────
create table public.care_logs (
  care_log_id    uuid primary key default gen_random_uuid(),
  plant_id       uuid not null references public.plants (plant_id) on delete cascade,
  care_type      text not null check (care_type in ('물주기', '분갈이')),
  scheduled_date date not null,
  completed_at   date,
  is_completed   boolean not null default false
);

create index care_logs_plant_id_idx on public.care_logs (plant_id);

-- ─────────────────────────────────────────────
-- 알림 (실제 발송 없음 — 기록·인앱 배지용, MVP 구현 범위 참조)
-- ─────────────────────────────────────────────
create table public.notifications (
  notification_id   uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (user_id) on delete cascade,
  notification_type text not null,
  sent_at           timestamptz not null default now(),
  is_read           boolean not null default false
);

create index notifications_user_id_idx on public.notifications (user_id);

-- ─────────────────────────────────────────────
-- RLS — 본인 데이터만 접근
-- ─────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.plants        enable row level security;
alter table public.care_logs     enable row level security;
alter table public.notifications enable row level security;

create policy "본인 프로필 조회" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "본인 프로필 수정" on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id);

create policy "본인 식물 조회" on public.plants
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "본인 식물 등록" on public.plants
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "본인 식물 수정" on public.plants
  for update to authenticated using ((select auth.uid()) = user_id);
create policy "본인 식물 삭제" on public.plants
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "본인 케어이력 조회" on public.care_logs
  for select to authenticated using (
    exists (select 1 from public.plants p
            where p.plant_id = care_logs.plant_id and p.user_id = (select auth.uid()))
  );
create policy "본인 케어이력 등록" on public.care_logs
  for insert to authenticated with check (
    exists (select 1 from public.plants p
            where p.plant_id = care_logs.plant_id and p.user_id = (select auth.uid()))
  );
create policy "본인 케어이력 수정" on public.care_logs
  for update to authenticated using (
    exists (select 1 from public.plants p
            where p.plant_id = care_logs.plant_id and p.user_id = (select auth.uid()))
  );
create policy "본인 케어이력 삭제" on public.care_logs
  for delete to authenticated using (
    exists (select 1 from public.plants p
            where p.plant_id = care_logs.plant_id and p.user_id = (select auth.uid()))
  );

create policy "본인 알림 조회" on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "본인 알림 등록" on public.notifications
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "본인 알림 수정" on public.notifications
  for update to authenticated using ((select auth.uid()) = user_id);
