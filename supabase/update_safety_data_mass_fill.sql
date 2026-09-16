-- ============================================================
-- 대량 기본값 채우기: 아직 비어있는 모든 물질에 '일반 원칙' 적용
-- (이미 구체적으로 채워진 항목은 WHERE 조건 때문에 자동으로 건너뜀)
-- ============================================================

update chemicals set
  disposal_method = '이 물질은 일반 쓰레기통이나 하수구로 폐기할 수 없습니다. 액체는 전용 폐액 용기에, 고체는 가능한 원래 용기에 담아 위험 폐기물 지정 수거 절차를 통해 처리하세요 (구체적 수거 경로는 소속 기관 환경안전 담당 부서에 문의). 할로겐화 화합물 등은 다른 폐기물과 분리 보관하세요.

※ 이 항목은 물질별 세부 조사 없이 적용된 일반 원칙입니다. 특별히 위험한 물질(파이로포릭, 시안화물, 과산화물 생성물질 등)은 별도로 확인된 안내가 있으면 그 내용을 우선하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (pp.33-34, 일반 폐기 원칙)',
  updated_at = now()
where disposal_method is null and is_disposed = false;

update chemicals set
  storage_method = '용기를 밀봉하고 명확하게 라벨링하여, 같은 분류(카테고리)의 다른 물질과 함께 지정된 보관 구역에 보관하세요. 산/염기/산화제/가연물 등 서로 다른 위험군은 섞어 보관하지 마세요.

※ 이 항목은 물질별 세부 조사 없이 적용된 일반 원칙입니다. 이 물질과 구체적으로 비호환되는 물질이 있는지는 MIT의 비호환 화학물질 표나 제조사 SDS를 확인하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (pp.33-34, 45-47)',
  updated_at = now()
where storage_method is null and is_disposed = false;

-- ============================================================
-- MIT 비호환 화학물질 표(p.47)에서 구체적으로 확인된 물질 4건
-- 위에서 넣은 일반 원칙을 더 구체적인 내용으로 덮어씀
-- ============================================================

update chemicals set
  storage_method = '은(Ag+) 화합물은 아세틸렌, 옥살산, 타타르산, 암모늄 화합물, 풀민산(fulminic acid)과 접촉 시 매우 민감한 폭발성 화합물(은 아세틸리드, 풀민산은 등)을 생성할 수 있으므로 이들 물질과 분리 보관하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.47, Incompatible Chemicals 표)',
  updated_at = now()
where id = '84ca6744-80cb-4347-a295-c447e6d35fdf'; -- Silver trifluoromethanesulfonate

update chemicals set
  storage_method = '은(Ag+) 화합물은 아세틸렌, 옥살산, 타타르산, 암모늄 화합물, 풀민산(fulminic acid)과 접촉 시 매우 민감한 폭발성 화합물(은 아세틸리드, 풀민산은 등)을 생성할 수 있으므로 이들 물질과 분리 보관하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.47, Incompatible Chemicals 표)',
  updated_at = now()
where id = 'f06db3dc-9f33-4ce2-a267-7bebded0d19f'; -- silver(I)oxide

update chemicals set
  storage_method = '암모늄질산염 및 기타 암모늄염과 분리 보관하세요 (혼합 시 위험 반응 가능).

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.47, Incompatible Chemicals 표)',
  updated_at = now()
where id = 'ebcd5faf-2e36-448d-a9ad-1c655ac77117'; -- Sodium nitrite

update chemicals set
  storage_method = '크롬산, 질산, 과염소산, 과산화물, 과망간산염과 분리 보관하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.47, Incompatible Chemicals 표)',
  updated_at = now()
where id = 'cf1b2cd9-30c5-4ab4-a062-a09707af11c3'; -- Acetic acid, glacial

