-- ===================================================================
-- 타 연구실 시약 검색 (2026 타 연구실 시약 검색)
-- 우리 연구실이 직접 관리하지 않는, "위치 파악 + 검색"만을 위한 참고용 데이터
-- MSDS/취급방법/처리방법/보관방법/체크아웃 같은 필드는 의도적으로 두지 않음
-- ===================================================================

create table if not exists external_chemicals (
  id uuid primary key default gen_random_uuid(),
  lab_code text not null,          -- EL / syhong / CBLee / KTKim / HGL / SBPark / Leelab
  lab_name text not null,          -- 예: '이은성 교수님 연구실'
  compound_name text not null,
  cas_no text,
  company text,
  container_size text,             -- 용량
  purity_conc text,                -- 순도
  phase text,                      -- 물질 상태 (고체/용액 등)
  location text,                   -- 그 연구실 내 보관 위치
  quantity_total numeric,
  is_available boolean not null default true,  -- 사용 가능 여부 (클릭으로 토글)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists external_chemicals_name_idx on external_chemicals using gin (to_tsvector('simple', compound_name));
create index if not exists external_chemicals_cas_idx on external_chemicals (cas_no);
create index if not exists external_chemicals_lab_idx on external_chemicals (lab_code);

alter table external_chemicals enable row level security;

-- 누구나 검색/조회 가능 (로그인 불필요)
create policy "Anyone can view external chemicals"
  on external_chemicals for select
  using (true);

-- 사용가능 여부 토글은 로그인한 사용자만
create policy "Authenticated users can update availability"
  on external_chemicals for update
  to authenticated
  using (true);

-- insert/delete 정책은 의도적으로 만들지 않음 — 데이터는 SQL Editor로만 적재/관리
