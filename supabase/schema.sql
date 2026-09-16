-- ===================================================================
-- 연구실 화학물질 재고 관리 스키마
-- ===================================================================

-- ---------- profiles (연구자 계정 정보) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Anyone can view profiles"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- 회원가입 시 profiles 행 자동 생성
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- chemicals (화학물질 재고) ----------
create table if not exists chemicals (
  id uuid primary key default gen_random_uuid(),
  category text not null,               -- organics1 / organics2 / organics3 / inorganics / inorganics_bulk / acids / bases / deuteriums
  storage_position text,                -- 선반 번호 또는 위치 설명
  company text,
  cas_no text,
  catalogue_no text,
  compound_name text not null,
  purity_conc text,
  container_size text,                  -- 병 크기 (예: 500ml, 1kg)
  container_type text,                  -- 용기 종류 (예: Amber bottle)
  phase text,                           -- 상태 (liquid/solid/aq. solution 등)
  quantity_total numeric not null default 1,  -- 보유 개수(병 기준)
  opened_date date,

  -- 안전/취급 정보 (처음엔 비어있고 나중에 채워 넣음)
  msds_url text,
  hazard_class text,
  quenching_method text,
  disposal_method text,
  storage_method text,
  handling_notes text,                  -- 취급 시 주의사항 (불렛 포인트 텍스트)
  ghs_pictograms text,                  -- 콤마로 구분된 GHS 픽토그램 코드 (예: flammable,corrosive) — 현재 UI에서는 미사용

  -- 사용 상태
  status text not null default 'available' check (status in ('available', 'in_use')),
  current_holder_id uuid references auth.users(id) on delete set null,
  checked_out_at timestamptz,

  is_disposed boolean not null default false,
  disposed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chemicals_compound_name_idx on chemicals using gin (to_tsvector('simple', compound_name));
create index if not exists chemicals_cas_no_idx on chemicals (cas_no);
create index if not exists chemicals_category_idx on chemicals (category);

alter table chemicals enable row level security;

create policy "Anyone can view chemicals"
  on chemicals for select
  using (true);

create policy "Authenticated users can insert chemicals"
  on chemicals for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update chemicals"
  on chemicals for update
  to authenticated
  using (true);

-- ---------- usage_logs (사용중 표시 / 반납 기록) ----------
create table if not exists usage_logs (
  id uuid primary key default gen_random_uuid(),
  chemical_id uuid not null references chemicals(id) on delete cascade,
  checked_out_by uuid not null references auth.users(id),
  checked_out_at timestamptz not null default now(),
  returned_by uuid references auth.users(id),
  returned_at timestamptz,
  amount_used_note text
);

alter table usage_logs enable row level security;

create policy "Anyone can view usage logs"
  on usage_logs for select
  using (true);

create policy "Authenticated users can insert usage logs"
  on usage_logs for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update usage logs"
  on usage_logs for update
  to authenticated
  using (true);

-- ---------- inventory_changes (구매/폐기 이력) ----------
create table if not exists inventory_changes (
  id uuid primary key default gen_random_uuid(),
  chemical_id uuid references chemicals(id) on delete set null,
  changed_by uuid not null references auth.users(id),
  change_type text not null check (change_type in ('purchase_new', 'restock', 'dispose')),
  quantity_delta numeric not null,
  note text,
  created_at timestamptz not null default now()
);

alter table inventory_changes enable row level security;

create policy "Anyone can view inventory changes"
  on inventory_changes for select
  using (true);

create policy "Authenticated users can insert inventory changes"
  on inventory_changes for insert
  to authenticated
  with check (true);

-- ---------- admin_users (관리자 허용 목록) ----------
-- 앱에서는 절대 쓰기 권한을 주지 않음 — SQL Editor에서만 등록 가능
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

create policy "Users can check their own admin status"
  on admin_users for select
  to authenticated
  using (auth.uid() = id);

create policy "Admins can delete usage logs"
  on usage_logs for delete
  to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));
