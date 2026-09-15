let currentUser = null;
let currentProfile = null;

const authGuest = document.getElementById("auth-guest");
const authUser = document.getElementById("auth-user");
const userNameEl = document.getElementById("user-name");
const openAddBtn = document.getElementById("open-add-btn");

const loginModal = document.getElementById("login-modal");
const signupModal = document.getElementById("signup-modal");

function showModal(modal) {
  modal.hidden = false;
}
function hideModal(modal) {
  modal.hidden = true;
}

document.getElementById("open-login-btn").addEventListener("click", () => showModal(loginModal));
document.getElementById("open-signup-btn").addEventListener("click", () => showModal(signupModal));

document.querySelectorAll(".modal-close").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.closest(".modal-overlay").hidden = true;
  });
});

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });
});

async function refreshProfile() {
  if (!currentUser) {
    currentProfile = null;
    return;
  }
  const { data } = await supabaseClient
    .from("profiles")
    .select("display_name")
    .eq("id", currentUser.id)
    .maybeSingle();
  currentProfile = data;
}

function updateAuthUI() {
  if (currentUser) {
    authGuest.hidden = true;
    authUser.hidden = false;
    userNameEl.textContent = currentProfile?.display_name || currentUser.email;
    openAddBtn.disabled = false;
    openAddBtn.title = "";
  } else {
    authGuest.hidden = false;
    authUser.hidden = true;
    openAddBtn.disabled = true;
    openAddBtn.title = "로그인이 필요합니다";
  }
  if (typeof renderResults === "function") renderResults();
}

async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session?.user || null;
  await refreshProfile();
  updateAuthUI();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    await refreshProfile();
    updateAuthUI();
  });
}

const REMEMBER_EMAIL_KEY = "chemInventory.rememberedEmail";

const loginEmailInput = document.getElementById("login-email");
const loginRememberCheckbox = document.getElementById("login-remember");

const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
if (rememberedEmail) {
  loginEmailInput.value = rememberedEmail;
  loginRememberCheckbox.checked = true;
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = loginEmailInput.value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = "로그인에 실패했습니다. 이메일/비밀번호를 확인해주세요.";
    return;
  }

  if (loginRememberCheckbox.checked) {
    localStorage.setItem(REMEMBER_EMAIL_KEY, email);
  } else {
    localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }

  hideModal(loginModal);
  document.getElementById("login-password").value = "";
});

document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const errorEl = document.getElementById("signup-error");
  const noteEl = document.getElementById("signup-note");
  errorEl.textContent = "";
  noteEl.hidden = true;

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } }
  });

  if (error) {
    errorEl.textContent = "가입에 실패했습니다: " + error.message;
    return;
  }
  noteEl.hidden = false;
  e.target.reset();
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});
