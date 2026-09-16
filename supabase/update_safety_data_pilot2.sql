-- 파일럿 2: 과산화물 생성물질(MTBE), 시안화물(KCN), 할로겐화 용매 분리보관

update chemicals set
  storage_method = '과산화물 생성 물질 분류상 ''Class D''(생성 여부가 명확히 A~C로 분류되지 않는 물질)에 해당합니다. 일반적으로 비교적 안정적이나 보관 조건에 따라 과산화물이 생길 수 있으므로, 입고일과 개봉일을 라벨에 기재하고 제조사 SDS를 참고해 과산화물 생성 여부를 주기적으로 확인하세요.

출처: Vanderbilt University Medical Center EHS, "Peroxide Forming Chemicals: Managing, Retention, and Storage" — https://www.vumc.org/safety/sites/vumc.org.safety/files/public_files/chem/peroxide-forming-chemicals.pdf (Class D 목록)',
  updated_at = now()
where id = 'ca28c786-144b-4127-9215-bb47b8aab4ab'; -- tert-Butyl methyl ether

update chemicals set
  hazard_class = '산과 접촉 시 맹독성 시안화수소(HCN) 가스가 발생합니다. 습기와의 접촉만으로도 시안화 가스가 방출될 수 있습니다. 피부/눈 접촉, 흡입, 섭취 시 치명적일 수 있습니다.

출처: SLAC National Accelerator Laboratory, "Potassium Cyanide Safe Handling Guideline" (2013) — https://www-group.slac.stanford.edu/esh/eshmanual/references/chemsafetyGuidePotassiumCyanide.pdf',
  storage_method = '반드시 산류와 분리하여 보관하십시오. 습기 노출을 피하고, 밀폐 용기에 2차 용기(누출 방지 트레이 등)와 함께 보관합니다.

출처: SLAC National Accelerator Laboratory, "Potassium Cyanide Safe Handling Guideline" (2013) — https://www-group.slac.stanford.edu/esh/eshmanual/references/chemsafetyGuidePotassiumCyanide.pdf',
  disposal_method = '위험 폐기물로 규정되어 있으며 일반 폐기물과 분리하여 전용 절차로 처리해야 합니다. 시안화물에 오염된 용기·기구도 위험 폐기물로 취급합니다. 화재 시 이산화탄소 소화기는 사용하지 말 것(수분과 반응해 HCN 발생 가능) — 건조분말 소화기 또는 다량의 물을 사용하세요.

출처: SLAC National Accelerator Laboratory, "Potassium Cyanide Safe Handling Guideline" (2013) — https://www-group.slac.stanford.edu/esh/eshmanual/references/chemsafetyGuidePotassiumCyanide.pdf',
  updated_at = now()
where id = '522f134e-3794-48b2-a7c1-f829659f26ba'; -- Potassium cyanide

update chemicals set
  disposal_method = '할로겐화 유기화합물은 다른 유기용매와 분리된 별도 용기에 모아 폐기해야 합니다. 염소계 화합물은 일부 아민류, 염기 존재 하의 아세톤 등 특정 물질과 혼합 시 폭발성 혼합물을 형성할 수 있으므로 혼합 보관에 주의하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023), p.33 — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf',
  updated_at = now()
where id = '0497b91e-9379-4b66-902c-5176b58ed410'; -- 1,3-Dichlorobenzene

update chemicals set
  disposal_method = '할로겐화 유기화합물은 다른 유기용매와 분리된 별도 용기에 모아 폐기해야 합니다. 염소계 화합물은 일부 아민류, 염기 존재 하의 아세톤 등 특정 물질과 혼합 시 폭발성 혼합물을 형성할 수 있으므로 혼합 보관에 주의하세요.

출처: MIT Chemistry Department, Chemical Hygiene Plan and Safety Manual (2023), p.33 — https://chemistry.mit.edu/wp-content/uploads/2023/09/Chemical-Hygiene-Plan-MIT-2023-UPDATED-09.08.23.pdf',
  updated_at = now()
where id = 'eb71856b-ad2a-43b2-8af0-25bf3a44bd64'; -- 1,3-Dichlorobenzene
