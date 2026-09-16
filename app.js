const CATEGORY_LABELS = {
  organics1: "Organics 1",
  organics2: "Organics 2",
  organics3: "Organics 3",
  inorganics: "Inorganics",
  inorganics_bulk: "Inorganics (bulk)",
  acids: "Acids",
  bases: "Bases",
  deuteriums: "Deuteriums",
  special_gas: "특수가스",
  box1: "Box 1",
  box2: "Box 2",
  box3: "Box 3",
  box4: "Box 4",
  box5: "Box 5"
};

const CATEGORY_LABEL_TO_CODE = Object.fromEntries(
  Object.entries(CATEGORY_LABELS).map(([code, label]) => [label.toLowerCase(), code])
);

function resolveCategoryInput(text) {
  if (!text) return null;
  const norm = text.trim().toLowerCase();
  if (!norm) return null;
  if (CATEGORY_LABELS[norm]) return norm;
  if (CATEGORY_LABEL_TO_CODE[norm]) return CATEGORY_LABEL_TO_CODE[norm];
  return null;
}

const FIELD_LABELS = {
  disposal_method: "처리 방법",
  storage_method: "보관 방법",
  handling_notes: "취급 시 주의사항 (한 줄에 한 항목씩 입력하면 각 줄이 항목으로 표시됩니다)",
  hazard_class: "간단한 위험 태그 (예: 부식성, 인화성 액체)"
};

let chemicalsById = new Map();
let profileNameById = new Map();
let lastResults = null;
let isAdmin = false;

const searchInput = document.getElementById("search-input");
const searchModeTabs = document.getElementById("search-mode-tabs");
const shelfTabs = document.getElementById("shelf-tabs");
const searchBtn = document.getElementById("search-btn");
const resultsList = document.getElementById("results-list");
const resultCountEl = document.getElementById("result-count");
const paginationEl = document.getElementById("pagination");
const template = document.getElementById("chemical-card-template");

let currentCategory = "";
let searchMode = "name";

const SEARCH_MODE_PLACEHOLDERS = {
  name: "예: Nitromethane",
  cas: "예: 75-52-5 또는 카탈로그 번호"
};

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
  return s.replace(/[(),%*]/g, "").trim();
}

let searchRequestId = 0;
const PAGE_SIZE = 100;
let currentPage = 1;
let totalResultCount = 0;

async function performSearch(resetPage = true) {
  if (resetPage) currentPage = 1;

  const rawQuery = searchInput.value.trim();
  const requestId = ++searchRequestId;

  resultsList.innerHTML = '<li class="results-loading">검색 중...</li>';

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabaseClient
    .from("chemicals")
    .select("*", { count: "exact" })
    .eq("is_disposed", false)
    .order("compound_name")
    .range(from, to);

  if (currentCategory) query = query.eq("category", currentCategory);

  const q = sanitizeForFilter(rawQuery);
  if (q) {
    if (searchMode === "cas") {
      query = query.or(`cas_no.ilike.%${q}%,catalogue_no.ilike.%${q}%`);
    } else {
      query = query.ilike("compound_name", `%${q}%`);
    }
  }

  const { data, error, count } = await query;

  // A newer search started while this one was in flight — its result is stale, discard it.
  if (requestId !== searchRequestId) return;

  if (error) {
    resultsList.innerHTML = '<li class="results-empty">검색 중 오류가 발생했습니다.</li>';
    console.error("Search failed:", error);
    return;
  }

  lastResults = data;
  totalResultCount = count || 0;
  await loadHolderProfiles(data);

  if (requestId !== searchRequestId) return;
  renderResults();
  renderPagination();
}

function renderPagination() {
  renderPaginationInto(paginationEl, currentPage, totalResultCount, (page) => {
    currentPage = page;
    performSearch(false);
    resultsList.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderPaginationInto(container, page, totalCount, onPageChange) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (totalPages <= 1) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }

  container.hidden = false;
  container.innerHTML = "";

  const addBtn = (label, targetPage, opts = {}) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (opts.active) btn.classList.add("active");
    if (opts.disabled) btn.disabled = true;
    if (!opts.disabled && !opts.active) {
      btn.addEventListener("click", () => onPageChange(targetPage));
    }
    container.appendChild(btn);
  };

  const addEllipsis = () => {
    const span = document.createElement("span");
    span.className = "pagination-ellipsis";
    span.textContent = "…";
    container.appendChild(span);
  };

  addBtn("‹", page - 1, { disabled: page === 1 });

  const pageNumbers = new Set([1, totalPages, page, page - 1, page + 1]);
  let prev = null;
  for (const p of [...pageNumbers].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)) {
    if (prev !== null && p - prev > 1) addEllipsis();
    addBtn(String(p), p, { active: p === page });
    prev = p;
  }

  addBtn("›", page + 1, { disabled: page === totalPages });
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
  resultCountEl.textContent = totalResultCount ? `${totalResultCount}건` : "";

  if (lastResults.length === 0) {
    resultsList.innerHTML = '<li class="results-empty">검색 결과가 없습니다.</li>';
    return;
  }

  for (const chem of lastResults) {
    chemicalsById.set(chem.id, chem);
    resultsList.appendChild(buildCard(chem));
  }
}

function appendTextWithLinks(container, text) {
  const urlPattern = /https?:\/\/[^\s]+/g;
  let lastIndex = 0;
  let match;
  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const a = document.createElement("a");
    a.href = match[0];
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = match[0];
    a.style.color = "var(--accent)";
    container.appendChild(a);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function formatPurity(value) {
  if (value === null || value === undefined || value === "") return "";
  const trimmed = String(value).trim();
  // A bare decimal fraction like "0.98" or "0.995" means a percentage stored as a ratio.
  // Anything already containing a "%" sign or letters (e.g. ">99.5%", "ReagentPlus") is left as-is.
  if (/^\d*\.?\d+$/.test(trimmed)) {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      if (num > 0 && num <= 1) {
        const pct = Math.round(num * 10000) / 100;
        return `${pct}%`;
      }
      // A bare number like "98" (no % sign) in a purity field almost always means 98%.
      if (num > 1 && num <= 100) {
        return `${num}%`;
      }
    }
  }
  return trimmed;
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
  li.querySelector(".chem-purity-inline").textContent = formatPurity(chem.purity_conc);
  li.querySelector(".chem-position-inline").textContent = chem.storage_position || "-";
  li.querySelector(".chem-company-inline").textContent = chem.company || "-";
  li.querySelector(".chem-cas").textContent = chem.cas_no ? `CAS ${chem.cas_no}` : "CAS 없음";
  li.querySelector(".chem-category-tag").textContent = CATEGORY_LABELS[chem.category] || chem.category;
  li.querySelector(".chem-company").textContent = chem.company || "-";
  li.querySelector(".chem-size").textContent = chem.container_size || "-";
  li.querySelector(".chem-position").textContent = chem.storage_position || "-";
  li.querySelector(".chem-quantity").textContent = `${chem.quantity_total}개`;
  li.querySelector(".chem-purity").textContent = formatPurity(chem.purity_conc) || "-";
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
  renderEditableField(li.querySelector('.tab-panel[data-panel="handling"]'), chem, "handling_notes");
  renderEditableField(li.querySelector('.tab-panel[data-panel="disposal"]'), chem, "disposal_method");
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
      contentEl.style.whiteSpace = "pre-line";
      appendTextWithLinks(contentEl, value);
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
  renderEditableField(panel.querySelector(".hazard-tag"), chem, "hazard_class");

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
    linkRow.innerHTML = '<p class="link-empty-note">CAS 번호가 없어 자동 검색 링크를 만들 수 없습니다.</p>';
  }
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
// Supports two formats, auto-detected by column count:
//
// 1. Full row copied straight from the lab's actual purchase order-log
//    spreadsheet (columns A-O, 15 cells): name / order date / actual order
//    date / recipient / receipt date / storage / Company / CAS No. /
//    Catalogue No. / compound name / purity·conc. / quantity(ea) / size /
//    formula / form. Cells can be quoted (Excel wraps a cell in double
//    quotes when copying if it contains embedded tabs/newlines), so this is
//    parsed with a small CSV/TSV-aware parser, not a naive split.
//
// 2. The shorter simplified form (8-10 cells): Company / CAS No. /
//    Catalogue No. / compound name / purity·conc. / quantity(ea) / size /
//    form, optionally followed by storage position and/or category.

const addPasteTextarea = document.getElementById("add-paste");
const pastePreview = document.getElementById("paste-preview");

// Parses tab-separated text into rows of cells, honoring CSV-style double-quoting
// (a quoted cell may contain literal tabs/newlines; "" inside quotes is a literal quote).
function parseTsvText(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === "\t") {
      row.push(field);
      field = "";
    } else if (ch === "\r") {
      // skip, \n (or end) handles the line break
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function detectSingleBoxCategory(text) {
  if (!text) return null;
  const m = text.trim().match(/^box\s*([1-5])$/i);
  return m ? `box${m[1]}` : null;
}

function parseOrderLogCells(cells) {
  cells = cells.map((c) => c.trim());

  if (cells.length >= 13) {
    // Full A-O order-log row.
    const [, , , , , storage, company, cas_no, catalogue_no, compound_name, purity_conc, quantityStr, size, , form] = cells;
    if (!compound_name) return null;
    return {
      company: company || null,
      cas_no: cas_no || null,
      catalogue_no: catalogue_no || null,
      compound_name,
      purity_conc: purity_conc || null,
      quantity_total: parseFloat(quantityStr) || 1,
      container_size: size || null,
      phase: form || null,
      storage_position: storage || null,
      category: detectSingleBoxCategory(storage)
    };
  }

  if (cells.length >= 8) {
    const [company, cas_no, catalogue_no, compound_name, purity_conc, quantityStr, size, form, position, categoryText] = cells;
    if (!compound_name) return null;
    return {
      company: company || null,
      cas_no: cas_no || null,
      catalogue_no: catalogue_no || null,
      compound_name,
      purity_conc: purity_conc || null,
      quantity_total: parseFloat(quantityStr) || 1,
      container_size: size || null,
      phase: form || null,
      storage_position: position || null,
      category: resolveCategoryInput(categoryText)
    };
  }

  return null;
}

function parsePastedRows(text) {
  return parseTsvText(text).map(parseOrderLogCells);
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
    pastePreview.textContent = "형식을 인식하지 못했습니다. 구매장부에서 행 전체를 복사해 붙여넣거나, Company~form 8개 칸(+ 위치/분류 선택)을 탭으로 구분해 붙여넣어주세요.";
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

  const tabCategory = selectedAddCategory;
  const pasteText = addPasteTextarea.value.trim();
  let payloads;

  if (pasteText) {
    const rows = parsePastedRows(pasteText).filter(Boolean);
    if (rows.length === 0) {
      errorEl.textContent = "붙여넣은 내용에서 물질 정보를 인식하지 못했습니다.";
      return;
    }

    const missingCategory = rows.filter((r) => !r.category && !tabCategory);
    if (missingCategory.length > 0) {
      const names = missingCategory.map((r) => r.compound_name).join(", ");
      errorEl.textContent = `분류를 확인할 수 없는 항목이 있습니다 (10번째 칸에 분류를 적거나 위 탭을 선택하세요): ${names}`;
      return;
    }

    payloads = rows.map((r) => ({ ...r, category: r.category || tabCategory }));
  } else {
    if (!tabCategory) {
      errorEl.textContent = "보관 장소는 필수입니다.";
      return;
    }
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
      category: tabCategory
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

searchModeTabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".search-mode-tab");
  if (!tab) return;
  searchModeTabs.querySelectorAll(".search-mode-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  searchMode = tab.dataset.mode;
  searchInput.placeholder = SEARCH_MODE_PLACEHOLDERS[searchMode];
  if (searchInput.value.trim()) performSearch();
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
const views = {
  search: document.getElementById("view-search"),
  log: document.getElementById("view-log"),
  manual: document.getElementById("view-manual"),
  external: document.getElementById("view-external")
};

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

  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== view;
  }

  if (view === "log") loadUsageLog();
  if (view === "external") searchExternalChemicals();
});

// ---------- Usage log view ----------

const logList = document.getElementById("log-list");
const logPaginationEl = document.getElementById("log-pagination");
const logSearchInput = document.getElementById("log-search-input");
const logSearchBtn = document.getElementById("log-search-btn");
const logSearchModeTabs = document.getElementById("log-search-mode-tabs");

let logSearchMode = "name";
let logCurrentPage = 1;
let logTotalCount = 0;

async function loadUsageLog(resetPage = true) {
  if (resetPage) logCurrentPage = 1;

  logList.innerHTML = '<li class="results-loading">불러오는 중...</li>';
  logPaginationEl.hidden = true;

  const rawQuery = logSearchInput.value.trim();
  const q = sanitizeForFilter(rawQuery);

  let matchedChemIds = null;
  if (q) {
    let chemQuery = supabaseClient.from("chemicals").select("id");
    chemQuery = logSearchMode === "cas"
      ? chemQuery.or(`cas_no.ilike.%${q}%,catalogue_no.ilike.%${q}%`)
      : chemQuery.ilike("compound_name", `%${q}%`);

    const { data: matchedChems, error: matchError } = await chemQuery;
    if (matchError) {
      logList.innerHTML = '<li class="results-empty">검색 중 오류가 발생했습니다.</li>';
      console.error("Failed to search chemicals for log filter:", matchError);
      return;
    }
    matchedChemIds = (matchedChems || []).map((c) => c.id);

    if (matchedChemIds.length === 0) {
      logList.innerHTML = '<li class="results-empty">검색 결과가 없습니다.</li>';
      return;
    }
  }

  const from = (logCurrentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let logQuery = supabaseClient
    .from("usage_logs")
    .select("*", { count: "exact" })
    .order("checked_out_at", { ascending: false })
    .range(from, to);

  if (matchedChemIds) logQuery = logQuery.in("chemical_id", matchedChemIds);

  const { data: logs, error, count } = await logQuery;

  if (error) {
    logList.innerHTML = '<li class="results-empty">사용기록을 불러오지 못했습니다.</li>';
    console.error("Failed to load usage log:", error);
    return;
  }

  logTotalCount = count || 0;

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

  renderPaginationInto(logPaginationEl, logCurrentPage, logTotalCount, (page) => {
    logCurrentPage = page;
    loadUsageLog(false);
    logList.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

logSearchBtn.addEventListener("click", () => loadUsageLog());
logSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadUsageLog();
});

let logSearchDebounceTimer = null;
logSearchInput.addEventListener("input", () => {
  clearTimeout(logSearchDebounceTimer);
  logSearchDebounceTimer = setTimeout(() => loadUsageLog(), 300);
});

logSearchModeTabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".search-mode-tab");
  if (!tab) return;
  logSearchModeTabs.querySelectorAll(".search-mode-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  logSearchMode = tab.dataset.mode;
  logSearchInput.placeholder = SEARCH_MODE_PLACEHOLDERS[logSearchMode];
  loadUsageLog();
});

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

// ---------- External (other labs) chemical search ----------

const LAB_LABELS = {
  EL: "이은성 교수님",
  syhong: "홍승윤 교수님",
  CBLee: "이철범 교수님",
  KTKim: "김경택 교수님",
  HGL: "이홍근 교수님",
  SBPark: "박승범 교수님",
  Leelab: "이동환 교수님"
};

const extSearchInput = document.getElementById("ext-search-input");
const extSearchBtn = document.getElementById("ext-search-btn");
const extSearchModeTabs = document.getElementById("ext-search-mode-tabs");
const extLabTabs = document.getElementById("ext-lab-tabs");
const extResultsList = document.getElementById("ext-results-list");
const extResultCountEl = document.getElementById("ext-result-count");
const extPaginationEl = document.getElementById("ext-pagination");
const extTemplate = document.getElementById("external-chem-template");

let extSearchMode = "name";
let extCurrentLab = "";
let extCurrentPage = 1;
let extTotalCount = 0;
let extSearchRequestId = 0;

extResultsList.addEventListener("click", (e) => {
  if (e.target.closest(".ext-available-badge")) return;
  const header = e.target.closest(".ext-card-header");
  if (!header) return;
  header.closest(".ext-card").classList.toggle("expanded");
});

extResultsList.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const header = e.target.closest(".ext-card-header");
  if (!header) return;
  e.preventDefault();
  header.closest(".ext-card").classList.toggle("expanded");
});

async function searchExternalChemicals(resetPage = true) {
  if (resetPage) extCurrentPage = 1;

  const requestId = ++extSearchRequestId;
  extResultsList.innerHTML = '<li class="results-loading">검색 중...</li>';
  extPaginationEl.hidden = true;

  const from = (extCurrentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabaseClient
    .from("external_chemicals")
    .select("*", { count: "exact" })
    .order("compound_name")
    .range(from, to);

  if (extCurrentLab) query = query.eq("lab_code", extCurrentLab);

  const q = sanitizeForFilter(extSearchInput.value.trim());
  if (q) {
    query = extSearchMode === "cas"
      ? query.ilike("cas_no", `%${q}%`)
      : query.ilike("compound_name", `%${q}%`);
  }

  const { data, error, count } = await query;

  if (requestId !== extSearchRequestId) return;

  if (error) {
    extResultsList.innerHTML = '<li class="results-empty">검색 중 오류가 발생했습니다.</li>';
    console.error("External search failed:", error);
    return;
  }

  extTotalCount = count || 0;
  extResultCountEl.textContent = extTotalCount ? `${extTotalCount}건` : "";
  extResultsList.innerHTML = "";

  if (data.length === 0) {
    extResultsList.innerHTML = '<li class="results-empty">검색 결과가 없습니다.</li>';
    return;
  }

  for (const chem of data) {
    extResultsList.appendChild(buildExternalCard(chem));
  }

  renderPaginationInto(extPaginationEl, extCurrentPage, extTotalCount, (page) => {
    extCurrentPage = page;
    searchExternalChemicals(false);
    extResultsList.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function buildExternalCard(chem) {
  const node = extTemplate.content.cloneNode(true);
  const li = node.querySelector(".ext-card");
  li.dataset.id = chem.id;

  li.querySelector(".ext-name").textContent = chem.compound_name;
  li.querySelector(".ext-purity").textContent = formatPurity(chem.purity_conc);
  li.querySelector(".ext-cas").textContent = chem.cas_no ? `CAS ${chem.cas_no}` : "CAS 없음";
  li.querySelector(".ext-lab-tag").textContent = LAB_LABELS[chem.lab_code] || chem.lab_name;
  li.querySelector(".ext-company").textContent = chem.company || "-";
  li.querySelector(".ext-size").textContent = chem.container_size || "-";
  li.querySelector(".ext-phase").textContent = chem.phase || "-";
  li.querySelector(".ext-location").textContent = chem.location || "-";

  const badge = li.querySelector(".ext-available-badge");
  badge.textContent = chem.is_available ? "사용가능" : "사용불가";
  badge.classList.toggle("unavailable", !chem.is_available);
  if (!currentUser) {
    badge.disabled = true;
    badge.title = "로그인이 필요합니다";
  } else {
    badge.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleExternalAvailability(chem);
    });
  }

  return node;
}

async function toggleExternalAvailability(chem) {
  const newValue = !chem.is_available;
  const { error } = await supabaseClient
    .from("external_chemicals")
    .update({ is_available: newValue, updated_at: new Date().toISOString() })
    .eq("id", chem.id);

  if (error) {
    alert("변경에 실패했습니다: " + error.message);
    return;
  }
  chem.is_available = newValue;
  searchExternalChemicals(false);
}

extSearchBtn.addEventListener("click", () => searchExternalChemicals());
extSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchExternalChemicals();
});

let extSearchDebounceTimer = null;
extSearchInput.addEventListener("input", () => {
  clearTimeout(extSearchDebounceTimer);
  extSearchDebounceTimer = setTimeout(() => searchExternalChemicals(), 300);
});

extSearchModeTabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".search-mode-tab");
  if (!tab) return;
  extSearchModeTabs.querySelectorAll(".search-mode-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  extSearchMode = tab.dataset.mode;
  extSearchInput.placeholder = extSearchMode === "cas" ? "예: 64-19-7" : "예: Acetic acid";
  searchExternalChemicals();
});

extLabTabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".shelf-tab");
  if (!tab) return;
  extLabTabs.querySelectorAll(".shelf-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  extCurrentLab = tab.dataset.lab;
  searchExternalChemicals();
});

initAuth();
