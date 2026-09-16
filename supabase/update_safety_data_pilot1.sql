-- 파일럿: MIT/USC 공식 자료 기반 보관/Quenching/폐기 방법 (출처 포함)
-- 대상: 알칼리 금속(Na/K), 강산(H2SO4/HNO3/H3PO4), 강염기(NaOH/KOH/TBAOH)

update chemicals set
  storage_method = '공기 중 수분과 격렬하게 반응하므로 광유(mineral oil) 등 불활성 액체에 완전히 잠기도록 하여 밀봉된 용기에 보관합니다.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.33)',
  quenching_method = '소량의 알칼리 금속 조각/부스러기는 마른 티슈로 닦아낸 뒤, 그 티슈와 사용한 도구를 물이 담긴 용기에 담가 최소 24시간 이상 두어 반응이 완전히 끝난 것을 확인한 후 폐기합니다.

출처: USC Environmental Health & Safety, "Quenching & Disposal" — https://ehs.usc.edu/research/lab/pyrophoric-and-water-reactive-chemicals/pyrophoric-quenching/',
  disposal_method = '일반 쓰레기나 하수구로 절대 폐기하지 않습니다. 밀봉 용기에 담아 위험 화학물질 폐기물로 지정 수거 절차를 통해 처리하세요 (구체적 수거 경로는 소속 기관 환경안전 담당 부서에 문의).

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.33)',
  updated_at = now()
where id = 'e246a0c8-a070-4a0c-b2ed-aa686c132f22'; -- Sodium metal in kerosene

update chemicals set
  storage_method = '공기 중 수분과 격렬하게 반응하므로 광유(mineral oil) 등 불활성 액체에 완전히 잠기도록 하여 밀봉된 용기에 보관합니다.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.33)',
  quenching_method = '소량의 알칼리 금속 조각/부스러기는 마른 티슈로 닦아낸 뒤, 그 티슈와 사용한 도구를 물이 담긴 용기에 담가 최소 24시간 이상 두어 반응이 완전히 끝난 것을 확인한 후 폐기합니다.

출처: USC Environmental Health & Safety, "Quenching & Disposal" — https://ehs.usc.edu/research/lab/pyrophoric-and-water-reactive-chemicals/pyrophoric-quenching/',
  disposal_method = '일반 쓰레기나 하수구로 절대 폐기하지 않습니다. 밀봉 용기에 담아 위험 화학물질 폐기물로 지정 수거 절차를 통해 처리하세요 (구체적 수거 경로는 소속 기관 환경안전 담당 부서에 문의).

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.33)',
  updated_at = now()
where id = '021c4ce6-1596-43d1-8a7c-4d402b84e612'; -- Potassium

update chemicals set
  disposal_method = '산 수용액은 어떤 경우에도 하수구로 직접 폐기할 수 없습니다. 전용 폐액 용기에 모아 위험물 폐기 절차에 따라 처리하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.34)',
  updated_at = now()
where id = '591c3335-c619-4602-8dec-caa98ab717b7'; -- Sulfuric acid

update chemicals set
  disposal_method = '산 수용액은 어떤 경우에도 하수구로 직접 폐기할 수 없습니다. 전용 폐액 용기에 모아 위험물 폐기 절차에 따라 처리하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.34)',
  updated_at = now()
where id = '90cdbd89-54db-4699-ae4d-02cf1a85e0eb'; -- Sulfuric acid

update chemicals set
  disposal_method = '산 수용액은 어떤 경우에도 하수구로 직접 폐기할 수 없습니다. 전용 폐액 용기에 모아 위험물 폐기 절차에 따라 처리하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.34)',
  updated_at = now()
where id = '273132ab-c11f-42a1-add8-7ab7e8ac9083'; -- Nitric acid

update chemicals set
  disposal_method = '산 수용액은 어떤 경우에도 하수구로 직접 폐기할 수 없습니다. 전용 폐액 용기에 모아 위험물 폐기 절차에 따라 처리하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.34)',
  updated_at = now()
where id = '0dc532c9-d37b-441d-ac48-2441b412787a'; -- Phosphoric acid

update chemicals set
  disposal_method = '산 수용액은 어떤 경우에도 하수구로 직접 폐기할 수 없습니다. 전용 폐액 용기에 모아 위험물 폐기 절차에 따라 처리하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.34)',
  updated_at = now()
where id = '83398116-00a5-4b9e-8c28-11b393465bf7'; -- Phosphoric acid

update chemicals set
  disposal_method = '산 수용액은 어떤 경우에도 하수구로 직접 폐기할 수 없습니다. 전용 폐액 용기에 모아 위험물 폐기 절차에 따라 처리하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.34)',
  updated_at = now()
where id = 'e4a19882-73fc-430c-9fa1-63c8c85ebcc1'; -- Orthophosphoric acid

update chemicals set
  disposal_method = '염기 수용액은 어떤 경우에도 하수구로 직접 폐기할 수 없습니다. 전용 폐액 용기에 모아 위험물 폐기 절차에 따라 처리하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.34)',
  updated_at = now()
where id = '6ea009e5-f2b8-4765-9ab7-3bcec9a08c38'; -- Sodium hydroxide beads

update chemicals set
  disposal_method = '염기 수용액은 어떤 경우에도 하수구로 직접 폐기할 수 없습니다. 전용 폐액 용기에 모아 위험물 폐기 절차에 따라 처리하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.34)',
  updated_at = now()
where id = '2691b074-ae5f-45fc-b686-347c1a05a34c'; -- Sodium hydroxide beads

update chemicals set
  disposal_method = '염기 수용액은 어떤 경우에도 하수구로 직접 폐기할 수 없습니다. 전용 폐액 용기에 모아 위험물 폐기 절차에 따라 처리하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.34)',
  updated_at = now()
where id = 'd9614edc-3e73-415b-8bfa-addd92c74924'; -- Potassium hydroxide, pellet

update chemicals set
  disposal_method = '염기 수용액은 어떤 경우에도 하수구로 직접 폐기할 수 없습니다. 전용 폐액 용기에 모아 위험물 폐기 절차에 따라 처리하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023) — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf (p.34)',
  updated_at = now()
where id = '89da8c29-900a-4ae4-a1db-6f904bbd54aa'; -- Tetrabutylammonium hydroxide solution
