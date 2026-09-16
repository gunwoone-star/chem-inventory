const CATEGORY_LABELS = {
  organics1: "Organics 1",
  organics2: "Organics 2",
  organics3: "Organics 3",
  inorganics: "Inorganics",
  inorganics_bulk: "Inorganics (bulk)",
  acids: "Acids",
  bases: "Bases",
  deuteriums: "Deuteriums",
  box1: "Box 1",
  box2: "Box 2",
  box3: "Box 3",
  box4: "Box 4",
  box5: "Box 5"
};

const FIELD_LABELS = {
  msds_url: "MSDS 링크",
  hazard_class: "위험도 등급",
  quenching_method: "Quenching 방법",
  disposal_method: "처리 방법",
  storage_method: "보관 방법"
};

const GHS_PICTOGRAMS = [
  { code: "explosive", label: "폭발성", emoji: "💥" },
  { code: "flammable", label: "인화성", emoji: "🔥" },
  { code: "oxidizing", label: "산화성", emoji: "🟠" },
  { code: "gas", label: "고압가스", emoji: "💨" },
  { code: "corrosive", label: "부식성", emoji: "🧪" },
  { code: "toxic", label: "급성독성", emoji: "☠" },
  { code: "irritant", label: "자극성", emoji: "❗" },
  { code: "health", label: "건강유해성", emoji: "🫁" },
  { code: "environment", label: "환경유해성", emoji: "🐟" }
];

let chemicalsById = new Map();
let profileNameById = new Map();
let lastResults = null;
let isAdmin = false;

const searchInput = document.getElementById("search-input");
const shelfTabs = document.getElementById("shelf-tabs");
const searchBtn = document.getElementById("search-btn");
const resultsList = document.getElementById("results-list");
const resultCountEl = document.getElementById("result-count");
const template = document.getElementById("chemical-card-template");

let currentCategory = "";

// ---------- DB connection badge ----------

const dbStatus = document.getElementById("db-status");
const dbStatusText = dbStatus.querySelector(".db-status-text");

async function checkSupabaseConnection() {
  try {
    const { error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    dbStatus.classList.add("ok");
    dbStatusText.textContent = "연결됨";
  } catch (err) {
    dbStatus.classList.add("error");
    dbStatusText.textContent = "연결 실패";
    console.error("Supabase connection failed:", err);
  }
}
checkSupabaseConnection();

// ---------- Search ----------

function sanitizeForFilter(s) {
  return s.replace(/[(),%]/g, "").trim();
}

async function performSearch() {
  const rawQuery = searchInput.value.trim();

  resultsList.innerHTML = '<li class="results-loading">검색 중...</li>';

  let query = supabaseClient
    .from("chemicals")
    .select("*")
    .eq("is_disposed", false)
    .order("compound_name")
    .limit(100);

  if (currentCategory) query = query.eq("category", currentCategory);

  const q = sanitizeForFilter(rawQuery);
  if (q) {
    query = query.or(`compound_name.ilike.%${q}%,cas_no.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    resultsList.innerHTML = '<li class="results-empty">검색 중 오류가 발생했습니다.</li>';
    console.error("Search failed:", error);
    return;
  }

  lastResults = data;
  await loadHolderProfiles(data);
  renderResults();
}

async function loadHolderProfiles(chemicals) {
  const holderIds = [...new Set(chemicals.map((c) => c.current_holder_id).filter(Boolean))];
  if (holderIds.length === 0) return;

  const { data } = await supabaseClient
    .from("profiles")
    .select("id, display_name")
    .in("id", holderIds);

  (data || []).forEach((p) => profileNameById.set(p.id, p.display_name));
}

// ---------- Render ----------

function renderResults() {
  if (lastResults === null) return;

  chemicalsById.clear();
  resultsList.innerHTML = "";
  resultCountEl.textContent = lastResults.length ? `${lastResults.length}건` : "";

  if (lastResults.length === 0) {
    resultsList.innerHTML = '<li class="results-empty">검색 결과가 없습니다.</li>';
    return;
  }

  for (const chem of lastResults) {
    chemicalsById.set(chem.id, chem);
    resultsList.appendChild(buildCard(chem));
  }
}

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buildCard(chem) {
  const node = template.content.cloneNode(true);
  const li = node.querySelector(".chem-card");
  li.dataset.id = chem.id;

  li.querySelector(".chem-name").textContent = chem.compound_name;
  li.querySelector(".chem-position-inline").textContent = chem.storage_position || "-";
  li.querySelector(".chem-company-inline").textContent = chem.company || "-";
  li.querySelector(".chem-cas").textContent = chem.cas_no ? `CAS ${chem.cas_no}` : "CAS 없음";
  li.querySelector(".chem-category-tag").textContent = CATEGORY_LABELS[chem.category] || chem.category;
  li.querySelector(".chem-company").textContent = chem.company || "-";
  li.querySelector(".chem-size").textContent = chem.container_size || "-";
  li.querySelector(".chem-position").textContent = chem.storage_position || "-";
  li.querySelector(".chem-quantity").textContent = `${chem.quantity_total}개`;
  li.querySelector(".chem-purity").textContent = chem.purity_conc || "-";
  li.querySelector(".chem-container").textContent = chem.container_type || "-";
  li.querySelector(".chem-phase").textContent = chem.phase || "-";
  li.querySelector(".chem-catalogue").textContent = chem.catalogue_no || "-";

  const badge = li.querySelector(".chem-status-badge");
  if (chem.status === "in_use") {
    badge.textContent = "사용중";
    badge.classList.add("in-use");
  } else {
    badge.textContent = "사용가능";
  }

  renderMsdsPanel(li.querySelector('.tab-panel[data-panel="msds"]'), chem);
  renderDisposalPanel(li.querySelector('.tab-panel[data-panel="disposal"]'), chem);
  renderEditableField(li.querySelector('.tab-panel[data-panel="storage"]'), chem, "storage_method");

  const checkoutBtn = li.querySelector(".checkout-btn");
  const returnBtn = li.querySelector(".return-btn");
  const disposeBtn = li.querySelector(".dispose-btn");
  const holderNote = li.querySelector(".holder-note");

  if (!currentUser) {
    checkoutBtn.disabled = true;
    checkoutBtn.title = "로그인이 필요합니다";
    disposeBtn.disabled = true;
    disposeBtn.title = "로그인이 필요합니다";
  }

  if (chem.status === "in_use") {
    checkoutBtn.hidden = true;

    const isMine = currentUser && chem.current_holder_id === currentUser.id;
    if (isMine) returnBtn.hidden = false;

    const holderName = isMine ? "나" : (profileNameById.get(chem.current_holder_id) || "다른 연구자");
    const since = chem.checked_out_at ? formatDateTime(chem.checked_out_at) : "";

    holderNote.textContent = since ? `${holderName} 사용중 (${since}부터)` : `${holderName} 사용중`;

    const holderInline = li.querySelector(".chem-holder-inline");
    holderInline.textContent = since ? `${holderName} · ${since}~` : holderName;
    holderInline.hidden = false;
  }

  return node;
}

function renderEditableField(container, chem, field) {
  container.innerHTML = "";
  container.classList.remove("empty");

  const value = chem[field];
  const contentEl = document.createElement("div");

  if (value) {
    if (field === "msds_url" && /^https?:\/\//i.test(value)) {
      const a = document.createElement("a");
      a.href = value;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = value;
      a.style.color = "var(--accent)";
      contentEl.appendChild(a);
    } else {
      contentEl.textContent = value;
      contentEl.style.whiteSpace = "pre-line";
    }
  } else {
    container.classList.add("empty");
  }

  container.appendChild(contentEl);

  if (currentUser) {
    const editBtn = document.createElement("button");
    editBtn.className = "btn-ghost edit-field-btn";
    editBtn.style.marginTop = "0.6rem";
    editBtn.style.fontSize = "0.78rem";
    editBtn.textContent = value ? "수정" : "정보 추가";
    editBtn.addEventListener("click", () => openFieldEditor(container, chem, field));
    container.appendChild(editBtn);
  }
}

function openFieldEditor(container, chem, field) {
  container.innerHTML = "";
  const textarea = document.createElement("textarea");
  textarea.value = chem[field] || "";
  textarea.rows = 3;
  textarea.style.width = "100%";
  textarea.style.background = "var(--bg)";
  textarea.style.border = "1px solid var(--border)";
  textarea.style.borderRadius = "8px";
  textarea.style.color = "var(--text)";
  textarea.style.padding = "0.6rem";
  textarea.placeholder = `${FIELD_LABELS[field]} 입력...`;

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn-primary";
  saveBtn.style.marginTop = "0.5rem";
  saveBtn.style.marginRight = "0.5rem";
  saveBtn.textContent = "저장";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn-ghost";
  cancelBtn.style.marginTop = "0.5rem";
  cancelBtn.textContent = "취소";

  saveBtn.addEventListener("click", async () => {
    const newValue = textarea.value.trim();
    saveBtn.disabled = true;
    const { error } = await supabaseClient
      .from("chemicals")
      .update({ [field]: newValue || null, updated_at: new Date().toISOString() })
      .eq("id", chem.id);

    if (error) {
      alert("저장에 실패했습니다: " + error.message);
      saveBtn.disabled = false;
      return;
    }

    chem[field] = newValue || null;
    renderEditableField(container, chem, field);
  });

  cancelBtn.addEventListener("click", () => renderEditableField(container, chem, field));

  container.appendChild(textarea);
  container.appendChild(document.createElement("br"));
  container.appendChild(saveBtn);
  container.appendChild(cancelBtn);
}

// ---------- MSDS tab: GHS pictograms + safety-info links + subfields ----------

function pubchemLink(casNo) {
  return `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(casNo)}`;
}

function sigmaAldrichKrLink(casNo) {
  const q = encodeURIComponent(casNo);
  return `https://www.sigmaaldrich.com/KR/ko/search/${q}?focus=products&page=1&perpage=30&sort=relevance&term=${q}&type=cas_number`;
}

function renderMsdsPanel(panel, chem) {
  renderGhsDisplay(panel.querySelector("[data-ghs-display]"), chem);

  const linkRow = panel.querySelector(".pubchem-link-row");
  linkRow.innerHTML = "";
  if (chem.cas_no) {
    const pubchemA = document.createElement("a");
    pubchemA.href = pubchemLink(chem.cas_no);
    pubchemA.target = "_blank";
    pubchemA.rel = "noopener noreferrer";
    pubchemA.textContent = "🔗 PubChem 안전정보 (GHS·SDS)";
    linkRow.appendChild(pubchemA);

    if (chem.company && /sigma/i.test(chem.company)) {
      const sigmaA = document.createElement("a");
      sigmaA.href = sigmaAldrichKrLink(chem.cas_no);
      sigmaA.target = "_blank";
      sigmaA.rel = "noopener noreferrer";
      sigmaA.textContent = "🔗 Sigma-Aldrich 한국어 SDS 검색";
      linkRow.appendChild(sigmaA);
    }
  } else {
    linkRow.innerHTML = '<p class="ghs-empty-note">CAS 번호가 없어 자동 검색 링크를 만들 수 없습니다.</p>';
  }

  renderEditableField(panel.querySelector('[data-subfield="hazard_class"] .subfield-body'), chem, "hazard_class");
  renderEditableField(panel.querySelector('[data-subfield="msds_url"] .subfield-body'), chem, "msds_url");
}

function renderGhsDisplay(container, chem) {
  container.innerHTML = "";

  const codes = (chem.ghs_pictograms || "").split(",").map((s) => s.trim()).filter(Boolean);

  if (codes.length === 0) {
    const note = document.createElement("span");
    note.className = "ghs-empty-note";
    note.textContent = "지정된 GHS 픽토그램이 없습니다.";
    container.appendChild(note);
  } else {
    for (const code of codes) {
      const info = GHS_PICTOGRAMS.find((g) => g.code === code);
      if (!info) continue;
      const icon = document.createElement("div");
      icon.className = "ghs-icon";
      icon.title = info.label;
      icon.innerHTML = `<span class="ghs-icon-inner">${info.emoji}</span>`;
      container.appendChild(icon);
    }
  }

  if (currentUser) {
    const editBtn = document.createElement("button");
    editBtn.className = "btn-ghost edit-field-btn";
    editBtn.style.fontSize = "0.78rem";
    editBtn.textContent = "픽토그램 수정";
    editBtn.addEventListener("click", () => openGhsEditor(container, chem));
    container.appendChild(editBtn);
  }
}

function openGhsEditor(container, chem) {
  container.innerHTML = "";
  const selected = new Set((chem.ghs_pictograms || "").split(",").map((s) => s.trim()).filter(Boolean));

  const editRow = document.createElement("div");
  editRow.className = "ghs-edit-row";

  for (const g of GHS_PICTOGRAMS) {
    const label = document.createElement("label");
    label.className = "ghs-checkbox";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = g.code;
    cb.checked = selected.has(g.code);
    label.appendChild(cb);
    label.appendChild(document.createTextNode(`${g.emoji} ${g.label}`));
    editRow.appendChild(label);
  }

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn-primary";
  saveBtn.textContent = "저장";
  saveBtn.style.marginRight = "0.5rem";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn-ghost";
  cancelBtn.textContent = "취소";

  saveBtn.addEventListener("click", async () => {
    const codes = [...editRow.querySelectorAll("input:checked")].map((cb) => cb.value);
    const newValue = codes.join(",") || null;
    saveBtn.disabled = true;

    const { error } = await supabaseClient
      .from("chemicals")
      .update({ ghs_pictograms: newValue, updated_at: new Date().toISOString() })
      .eq("id", chem.id);

    if (error) {
      alert("저장에 실패했습니다: " + error.message);
      saveBtn.disabled = false;
      return;
    }

    chem.ghs_pictograms = newValue;
    renderGhsDisplay(container, chem);
  });

  cancelBtn.addEventListener("click", () => renderGhsDisplay(container, chem));

  container.appendChild(editRow);
  container.appendChild(saveBtn);
  container.appendChild(cancelBtn);
}

// ---------- 처리방법 tab: quenching + disposal subfields ----------

function renderDisposalPanel(panel, chem) {
  renderEditableField(panel.querySelector('[data-subfield="quenching_method"] .subfield-body'), chem, "quenching_method");
  renderEditableField(panel.querySelector('[data-subfield="disposal_method"] .subfield-body'), chem, "disposal_method");
}

// ---------- Tab switching (event delegation) ----------

resultsList.addEventListener("click", (e) => {
  const header = e.target.closest(".chem-card-header");
  if (header) {
    header.closest(".chem-card").classList.toggle("expanded");
    return;
  }

  const tabBtn = e.target.closest(".tab-btn");
  if (tabBtn) {
    const card = tabBtn.closest(".chem-card");
    card.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    card.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tabBtn.classList.add("active");
    card.querySelector(`.tab-panel[data-panel="${tabBtn.dataset.tab}"]`).classList.add("active");
    return;
  }

  const checkoutBtn = e.target.closest(".checkout-btn");
  if (checkoutBtn) {
    const card = checkoutBtn.closest(".chem-card");
    handleCheckout(card.dataset.id);
    return;
  }

  const returnBtn = e.target.closest(".return-btn");
  if (returnBtn) {
    const card = returnBtn.closest(".chem-card");
    openReturnModal(card.dataset.id);
    return;
  }

  const disposeBtn = e.target.closest(".dispose-btn");
  if (disposeBtn) {
    const card = disposeBtn.closest(".chem-card");
    handleDispose(card.dataset.id);
    return;
  }
});

resultsList.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const header = e.target.closest(".chem-card-header");
  if (!header) return;
  e.preventDefault();
  header.closest(".chem-card").classList.toggle("expanded");
});

// ---------- Checkout / Return ----------

async function handleCheckout(chemId) {
  const chem = chemicalsById.get(chemId);
  if (!chem || chem.status !== "available") return;

  const { error: updateError } = await supabaseClient
    .from("chemicals")
    .update({
      status: "in_use",
      current_holder_id: currentUser.id,
      checked_out_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", chemId)
    .eq("status", "available");

  if (updateError) {
    alert("사용 시작 처리에 실패했습니다: " + updateError.message);
    return;
  }

  const { error: logError } = await supabaseClient
    .from("usage_logs")
    .insert({ chemical_id: chemId, checked_out_by: currentUser.id });

  if (logError) console.error("Failed to log checkout:", logError);

  await performSearch();
}

const returnModal = document.getElementById("return-modal");
const returnForm = document.getElementById("return-form");

function openReturnModal(chemId) {
  document.getElementById("return-chemical-id").value = chemId;
  document.getElementById("return-amount").value = "";
  document.getElementById("return-error").textContent = "";
  showModal(returnModal);
}

returnForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const chemId = document.getElementById("return-chemical-id").value;
  const amountNote = document.getElementById("return-amount").value.trim();
  const errorEl = document.getElementById("return-error");

  const { data: openLog, error: findError } = await supabaseClient
    .from("usage_logs")
    .select("id")
    .eq("chemical_id", chemId)
    .is("returned_at", null)
    .order("checked_out_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError || !openLog) {
    errorEl.textContent = "사용 기록을 찾지 못했습니다.";
    console.error(findError);
    return;
  }

  const { error: logError } = await supabaseClient
    .from("usage_logs")
    .update({
      returned_by: currentUser.id,
      returned_at: new Date().toISOString(),
      amount_used_note: amountNote
    })
    .eq("id", openLog.id);

  if (logError) {
    errorEl.textContent = "반납 처리에 실패했습니다.";
    console.error(logError);
    return;
  }

  await supabaseClient
    .from("chemicals")
    .update({
      status: "available",
      current_holder_id: null,
      checked_out_at: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", chemId);

  hideModal(returnModal);
  await performSearch();
});

// ---------- Dispose ----------

async function handleDispose(chemId) {
  const chem = chemicalsById.get(chemId);
  if (!chem) return;

  const amountStr = prompt(`몇 개를 폐기하시겠어요? (현재 보유: ${chem.quantity_total}개)`, "1");
  if (amountStr === null) return;
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    alert("올바른 수량을 입력해주세요.");
    return;
  }

  const newQuantity = Math.max(0, chem.quantity_total - amount);
  const updates = { quantity_total: newQuantity, updated_at: new Date().toISOString() };
  if (newQuantity === 0) {
    updates.is_disposed = true;
    updates.disposed_at = new Date().toISOString();
  }

  const { error } = await supabaseClient.from("chemicals").update(updates).eq("id", chemId);
  if (error) {
    alert("폐기 처리에 실패했습니다: " + error.message);
    return;
  }

  await supabaseClient.from("inventory_changes").insert({
    chemical_id: chemId,
    changed_by: currentUser.id,
    change_type: "dispose",
    quantity_delta: -amount
  });

  await performSearch();
}

// ---------- Add new chemical ----------

const addModal = document.getElementById("add-modal");
document.getElementById("open-add-btn").addEventListener("click", () => showModal(addModal));

// ---------- Category tab picker ----------

const addCategoryTabs = document.getElementById("add-category-tabs");
let selectedAddCategory = "";

addCategoryTabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".shelf-tab");
  if (!tab) return;
  addCategoryTabs.querySelectorAll(".shelf-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  selectedAddCategory = tab.dataset.category;
});

// ---------- Paste-from-order-log parsing ----------
// Expected column order (tab-separated, copied straight from the lab's purchase
// order-log spreadsheet): Company, CAS No., Catalogue No., compound name,
// purity/conc., quantity (ea), size, form

const addPasteTextarea = document.getElementById("add-paste");
const pastePreview = document.getElementById("paste-preview");

function parseOrderLogRow(line) {
  const cells = line.split("\t").map((c) => c.trim());
  if (cells.length < 8) return null;

  const [company, cas_no, catalogue_no, compound_name, purity_conc, quantityStr, size, form] = cells;
  if (!compound_name) return null;

  return {
    company: company || null,
    cas_no: cas_no || null,
    catalogue_no: catalogue_no || null,
    compound_name,
    purity_conc: purity_conc || null,
    quantity_total: parseFloat(quantityStr) || 1,
    container_size: size || null,
    phase: form || null
  };
}

function parsePastedRows(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseOrderLogRow);
}

addPasteTextarea.addEventListener("input", () => {
  const text = addPasteTextarea.value.trim();
  if (!text) {
    pastePreview.textContent = "";
    return;
  }

  const rows = parsePastedRows(text);
  const validRows = rows.filter(Boolean);
  const invalidCount = rows.length - validRows.length;

  if (validRows.length === 0) {
    pastePreview.style.color = "var(--danger)";
    pastePreview.textContent = "형식을 인식하지 못했습니다. Company~form까지 8개 칸을 탭으로 구분해 붙여넣어주세요.";
  } else {
    pastePreview.style.color = "var(--success)";
    const names = validRows.map((r) => r.compound_name).join(", ");
    pastePreview.textContent = `${validRows.length}개 물질 인식됨${invalidCount ? ` (형식이 안 맞는 ${invalidCount}줄 제외)` : ""}: ${names}`;
  }
});

document.getElementById("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("add-error");
  errorEl.textContent = "";

  const category = selectedAddCategory;

  if (!category) {
    errorEl.textContent = "보관 장소는 필수입니다.";
    return;
  }

  const pasteText = addPasteTextarea.value.trim();
  let payloads;

  if (pasteText) {
    const rows = parsePastedRows(pasteText).filter(Boolean);
    if (rows.length === 0) {
      errorEl.textContent = "붙여넣은 내용에서 물질 정보를 인식하지 못했습니다.";
      return;
    }
    payloads = rows.map((r) => ({ ...r, category }));
  } else {
    const compound_name = document.getElementById("add-name").value.trim();
    if (!compound_name) {
      errorEl.textContent = "물질명은 필수입니다 (또는 위에 붙여넣기를 사용하세요).";
      return;
    }
    payloads = [{
      compound_name,
      cas_no: document.getElementById("add-cas").value.trim() || null,
      company: document.getElementById("add-company").value.trim() || null,
      catalogue_no: document.getElementById("add-catalogue").value.trim() || null,
      purity_conc: document.getElementById("add-purity").value.trim() || null,
      container_size: document.getElementById("add-size").value.trim() || null,
      container_type: document.getElementById("add-container").value.trim() || null,
      phase: document.getElementById("add-phase").value.trim() || null,
      quantity_total: parseFloat(document.getElementById("add-quantity").value) || 1,
      category
    }];
  }

  const { data, error } = await supabaseClient.from("chemicals").insert(payloads).select();

  if (error) {
    errorEl.textContent = "등록에 실패했습니다: " + error.message;
    return;
  }

  const changeRows = data.map((chem) => ({
    chemical_id: chem.id,
    changed_by: currentUser.id,
    change_type: "purchase_new",
    quantity_delta: chem.quantity_total
  }));
  await supabaseClient.from("inventory_changes").insert(changeRows);

  hideModal(addModal);
  e.target.reset();
  addPasteTextarea.value = "";
  pastePreview.textContent = "";
  document.getElementById("add-quantity").value = 1;
  addCategoryTabs.querySelectorAll(".shelf-tab").forEach((t) => t.classList.remove("active"));
  selectedAddCategory = "";

  if (data.length === 1) {
    searchInput.value = data[0].compound_name;
    currentCategory = "";
    shelfTabs.querySelectorAll(".shelf-tab").forEach((t) => t.classList.toggle("active", t.dataset.category === ""));
    await performSearch();
  } else {
    searchInput.value = "";
    currentCategory = category;
    shelfTabs.querySelectorAll(".shelf-tab").forEach((t) => t.classList.toggle("active", t.dataset.category === category));
    await performSearch();
  }
});

// ---------- Events ----------

searchBtn.addEventListener("click", performSearch);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") performSearch();
});

let searchDebounceTimer = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(performSearch, 300);
});

shelfTabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".shelf-tab");
  if (!tab) return;
  shelfTabs.querySelectorAll(".shelf-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  currentCategory = tab.dataset.category;
  performSearch();
});

// ---------- Nav menu / views ----------

const navMenuBtn = document.getElementById("nav-menu-btn");
const navMenuDropdown = document.getElementById("nav-menu-dropdown");
const viewSearch = document.getElementById("view-search");
const viewLog = document.getElementById("view-log");

navMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  navMenuDropdown.hidden = !navMenuDropdown.hidden;
});

document.addEventListener("click", () => {
  navMenuDropdown.hidden = true;
});

navMenuDropdown.addEventListener("click", (e) => {
  const item = e.target.closest(".nav-menu-item");
  if (!item) return;
  const view = item.dataset.view;

  navMenuDropdown.querySelectorAll(".nav-menu-item").forEach((el) => el.classList.remove("active"));
  item.classList.add("active");
  navMenuDropdown.hidden = true;

  if (view === "log") {
    viewSearch.hidden = true;
    viewLog.hidden = false;
    loadUsageLog();
  } else {
    viewLog.hidden = true;
    viewSearch.hidden = false;
  }
});

// ---------- Usage log view ----------

const logList = document.getElementById("log-list");

async function loadUsageLog() {
  logList.innerHTML = '<li class="results-loading">불러오는 중...</li>';

  const { data: logs, error } = await supabaseClient
    .from("usage_logs")
    .select("*")
    .order("checked_out_at", { ascending: false })
    .limit(100);

  if (error) {
    logList.innerHTML = '<li class="results-empty">사용기록을 불러오지 못했습니다.</li>';
    console.error("Failed to load usage log:", error);
    return;
  }

  if (logs.length === 0) {
    logList.innerHTML = '<li class="results-empty">아직 사용기록이 없습니다.</li>';
    return;
  }

  const chemIds = [...new Set(logs.map((l) => l.chemical_id))];
  const userIds = [...new Set(logs.flatMap((l) => [l.checked_out_by, l.returned_by]).filter(Boolean))];

  const [{ data: chems }, { data: profiles }] = await Promise.all([
    supabaseClient.from("chemicals").select("id, compound_name, category").in("id", chemIds),
    supabaseClient.from("profiles").select("id, display_name").in("id", userIds)
  ]);

  const chemById = new Map((chems || []).map((c) => [c.id, c]));
  const nameByUserId = new Map((profiles || []).map((p) => [p.id, p.display_name]));

  logList.innerHTML = "";

  for (const log of logs) {
    const chem = chemById.get(log.chemical_id);
    const chemName = chem ? chem.compound_name : "(삭제된 물질)";
    const categoryLabel = chem ? (CATEGORY_LABELS[chem.category] || chem.category) : "";
    const checkedOutByName = nameByUserId.get(log.checked_out_by) || "알 수 없음";
    const isReturned = !!log.returned_at;

    const li = document.createElement("li");
    li.className = "log-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "log-item-name";
    nameSpan.textContent = categoryLabel ? `${chemName} (${categoryLabel})` : chemName;

    const statusSpan = document.createElement("span");
    statusSpan.className = "log-item-status" + (isReturned ? " returned" : "");
    statusSpan.textContent = isReturned ? "반납완료" : "사용중";

    const detail = document.createElement("span");
    detail.className = "log-item-detail";
    let detailText = `${checkedOutByName} · ${formatDateTime(log.checked_out_at)} 사용 시작`;
    if (isReturned) {
      const returnedByName = nameByUserId.get(log.returned_by) || "알 수 없음";
      detailText += ` → ${returnedByName} · ${formatDateTime(log.returned_at)} 반납`;
      if (log.amount_used_note) detailText += ` (${log.amount_used_note})`;
    }
    detail.textContent = detailText;

    li.appendChild(nameSpan);
    li.appendChild(statusSpan);

    if (isAdmin) {
      const actions = document.createElement("span");
      actions.className = "log-item-admin-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn-ghost";
      editBtn.textContent = "메모 수정";
      editBtn.addEventListener("click", () => editLogNote(log.id, log.amount_used_note));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-ghost-danger";
      deleteBtn.textContent = "삭제";
      deleteBtn.addEventListener("click", () => deleteLogEntry(log.id));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      li.appendChild(actions);
    }

    li.appendChild(detail);
    logList.appendChild(li);
  }
}

async function editLogNote(logId, currentNote) {
  const newNote = prompt("사용량 메모 수정", currentNote || "");
  if (newNote === null) return;

  const { error } = await supabaseClient
    .from("usage_logs")
    .update({ amount_used_note: newNote.trim() || null })
    .eq("id", logId);

  if (error) {
    alert("수정에 실패했습니다: " + error.message);
    return;
  }
  await loadUsageLog();
}

async function deleteLogEntry(logId) {
  if (!confirm("이 사용기록을 삭제할까요? 되돌릴 수 없습니다.")) return;

  const { error } = await supabaseClient.from("usage_logs").delete().eq("id", logId);
  if (error) {
    alert("삭제에 실패했습니다: " + error.message);
    return;
  }
  await loadUsageLog();
}

initAuth();
