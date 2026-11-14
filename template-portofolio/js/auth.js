import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ==========================================
// CONFIGURATION & HARDENED CREDENTIALS
// ==========================================
var HARDENED_USER_HASH =
  "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
var HARDENED_PASS_HASH =
  "2d5004e2b618d25bc2dfcc9a184fb8abe4e8c2d88aadd930acb27e77e69769f4";
var MAX_FAILED_ATTEMPTS = 3;
var LOCKOUT_TIME_MS = 5 * 60 * 1000;

// Utility Hash SHA256
export async function hashSHA256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Cek Sesi Aktif saat membuka Halaman Login
export function checkExistingSession() {
  const sessionToken = sessionStorage.getItem("admin_session_token");
  const sessionExpiry = sessionStorage.getItem("admin_session_expiry");

  if (sessionToken && sessionExpiry && Date.now() < parseInt(sessionExpiry)) {
    window.location.replace("admin.html");
  }
}

// ==========================================
// FUNGSI PENJAGA KEAMANAN ADMIN PANEL (HYBRID)
// ==========================================
export function enforceAdminSecurity() {
  const sessionToken = sessionStorage.getItem("admin_session_token");
  const sessionExpiry = sessionStorage.getItem("admin_session_expiry");

  const isSessionValid =
    sessionToken && sessionExpiry && Date.now() < parseInt(sessionExpiry);

  if (!isSessionValid) {
    sessionStorage.clear();
    window.location.replace("login.html");
    return;
  }

  // BILA LOGIN VALID: Tampilkan kembali dengan mereset inline style display
  if (document.body) {
    document.body.style.display = "";
  }
}

// Validasi 2: Verifikasi dengan Firebase Auth State Listener
const checkFirebaseReady = setInterval(() => {
  if (window.auth || getAuth()) {
    clearInterval(checkFirebaseReady);
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (!user && !isSessionValid) {
        sessionStorage.clear();
        window.location.replace("login.html");
      } else {
        // Lolos dua tingkat pengamanan
        if (document.body) document.body.style.display = "block";
      }
    });
  }
}, 50);

// FUNGSI LOGOUT INTEGRATED
export function handleAdminLogout() {
  sessionStorage.clear();
  try {
    const auth = getAuth();
    signOut(auth).finally(() => {
      window.location.replace("login.html");
    });
  } catch (err) {
    window.location.replace("login.html");
  }
}

// UI Alert Helper
export function showLoginAlert(message, isError = true) {
  const alertEl = document.getElementById("loginAlert");
  if (!alertEl) return;

  alertEl.style.display = "block";
  alertEl.style.background = isError
    ? "rgba(255, 77, 77, 0.15)"
    : "rgba(77, 255, 128, 0.15)";
  alertEl.style.border = isError ? "1px solid #ff4d4d" : "1px solid #4dff80";
  alertEl.style.color = isError ? "#ff6666" : "#66ff99";
  alertEl.innerText = message;
}

// FUNGSI LOGIN DENGAN PROTEKSI BRUTE-FORCE
export async function handleSecureLogin(event) {
  if (event) event.preventDefault();

  const usernameInput = document.getElementById("loginUsername").value.trim();
  const passwordInput = document.getElementById("loginPassword").value;
  const submitBtn = document.getElementById("loginSubmitBtn");

  const lockoutUntil = localStorage.getItem("sec_lockout_until");
  if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
    const remainingSeconds = Math.ceil(
      (parseInt(lockoutUntil) - Date.now()) / 1000,
    );
    showLoginAlert(
      `AKSES TERKUNCI! Percobaan ilegal terdeteksi. Silakan tunggu ${remainingSeconds} detik lagi.`,
    );
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "AUTHENTICATING...";

  const inputUserHash = await hashSHA256(usernameInput);
  const inputPassHash = await hashSHA256(passwordInput);

  if (
    inputUserHash === HARDENED_USER_HASH &&
    inputPassHash === HARDENED_PASS_HASH
  ) {
    localStorage.removeItem("sec_failed_attempts");
    localStorage.removeItem("sec_lockout_until");

    const randomArray = new Uint8Array(24);
    window.crypto.getRandomValues(randomArray);
    const sessionToken = Array.from(randomArray, (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const expiryTime = Date.now() + 2 * 60 * 60 * 1000;

    sessionStorage.setItem("admin_session_token", sessionToken);
    sessionStorage.setItem("admin_session_expiry", expiryTime);

    showLoginAlert("AUTENTIKASI BERHASIL! Mengalihkan ke Dashboard...", false);

    setTimeout(() => {
      window.location.replace("admin.html");
    }, 800);
  } else {
    let failedAttempts =
      parseInt(localStorage.getItem("sec_failed_attempts") || "0") + 1;
    localStorage.setItem("sec_failed_attempts", failedAttempts);

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = Date.now() + LOCKOUT_TIME_MS;
      localStorage.setItem("sec_lockout_until", lockUntil);
      showLoginAlert(
        "SISTEM DIBLOKIR! Anda telah 3x salah memasukkan kredensial. Akses dibekukan selama 5 menit.",
      );
    } else {
      const sisa = MAX_FAILED_ATTEMPTS - failedAttempts;
      showLoginAlert(
        `KREDENSIAL SALAH! Sisa percobaan Anda: ${sisa}x lagi sebelum diblokir.`,
      );
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i data-lucide="key-round"></i> Authenticate`;
    if (typeof window.initIcons === "function") window.initIcons();
  }
}

// BIND FUNGSI KE WINDOW SPASIAL HTML
window.checkExistingSession = checkExistingSession;
window.enforceAdminSecurity = enforceAdminSecurity;
window.handleAdminLogout = handleAdminLogout;
window.handleSecureLogin = handleSecureLogin;
