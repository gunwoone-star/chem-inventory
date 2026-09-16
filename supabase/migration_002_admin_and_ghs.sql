-- GHS 픽토그램 태그 (콤마로 구분된 코드 문자열, 예: "flammable,corrosive")
alter table chemicals add column if not exists ghs_pictograms text;

-- 관리자 허용 목록 — 앱에서는 절대 쓰기 권한을 주지 않음 (SQL Editor에서만 부여 가능)
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

-- 로그인한 사람이 "내가 관리자인지"만 확인할 수 있음 (다른 사람 목록은 못 봄)
create policy "Users can check their own admin status"
  on admin_users for select
  to authenticated
  using (auth.uid() = id);

-- 관리자만 사용기록을 삭제(정정)할 수 있음
create policy "Admins can delete usage logs"
  on usage_logs for delete
  to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

-- ↓↓↓ 아래 한 줄을 실행하면 본인 계정이 관리자로 등록됩니다 ↓↓↓
insert into admin_users (id)
select id from auth.users where email = 'gunwoo49@snu.ac.kr'
on conflict (id) do nothing;
