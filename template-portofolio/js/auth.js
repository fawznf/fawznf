import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

// ==========================================
// PENGATURAN PROTEKSI BRUTE-FORCE (SISI BROWSER)
// Perlindungan utama tetap dari Firebase Auth + Firestore Rules.
// ==========================================
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_TIME_MS = 5 * 60 * 1000;

// Halaman login: jika sudah login, langsung ke dashboard
export function checkExistingSession() {
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.replace("admin.html");
  });
}

// Halaman admin: hanya tampil jika user Firebase sudah login
export function enforceAdminSecurity() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.replace("login.html");
      return;
    }
    if (document.body) document.body.style.display = "";
  });
}

// Logout
export function handleAdminLogout() {
  signOut(auth).finally(() => {
    window.location.replace("login.html");
  });
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

function resetSubmitButton(submitBtn) {
  submitBtn.disabled = false;
  submitBtn.innerHTML = `<i data-lucide="key-round" style="width: 16px;"></i> Authenticate`;
  if (typeof window.initIcons === "function") window.initIcons();
}

// Login dengan Firebase Authentication (Email + Password)
export async function handleSecureLogin(event) {
  if (event) event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const submitBtn = document.getElementById("loginSubmitBtn");

  const lockoutUntil = localStorage.getItem("sec_lockout_until");
  if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
    const remainingSeconds = Math.ceil(
      (parseInt(lockoutUntil) - Date.now()) / 1000,
    );
    showLoginAlert(
      `AKSES TERKUNCI! Terlalu banyak percobaan gagal. Silakan tunggu ${remainingSeconds} detik lagi.`,
    );
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "AUTHENTICATING...";

  try {
    // Sesi hanya berlaku selama tab/browser terbuka
    await setPersistence(auth, browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);

    localStorage.removeItem("sec_failed_attempts");
    localStorage.removeItem("sec_lockout_until");

    showLoginAlert("AUTENTIKASI BERHASIL! Mengalihkan ke Dashboard...", false);
    setTimeout(() => {
      window.location.replace("admin.html");
    }, 800);
  } catch (err) {
    const code = err && err.code ? err.code : "";

    if (
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found" ||
      code === "auth/invalid-email"
    ) {
      const failedAttempts =
        parseInt(localStorage.getItem("sec_failed_attempts") || "0") + 1;
      localStorage.setItem("sec_failed_attempts", failedAttempts);

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        localStorage.setItem("sec_lockout_until", Date.now() + LOCKOUT_TIME_MS);
        localStorage.removeItem("sec_failed_attempts");
        showLoginAlert(
          "SISTEM DIBLOKIR! 3x salah memasukkan kredensial. Akses dibekukan selama 5 menit.",
        );
      } else {
        showLoginAlert(
          `EMAIL ATAU PASSWORD SALAH! Sisa percobaan: ${MAX_FAILED_ATTEMPTS - failedAttempts}x lagi sebelum diblokir.`,
        );
      }
    } else if (code === "auth/too-many-requests") {
      showLoginAlert(
        "Terlalu banyak percobaan dari Firebase. Tunggu beberapa menit lalu coba lagi.",
      );
    } else if (code === "auth/network-request-failed") {
      showLoginAlert("Gagal terhubung ke server. Periksa koneksi internetmu.");
    } else if (
      code === "auth/api-key-not-valid.-please-pass-a-valid-api-key." ||
      code === "auth/invalid-api-key" ||
      code === "auth/configuration-not-found"
    ) {
      showLoginAlert(
        "Konfigurasi Firebase belum benar. Periksa js/firebase-config.js dan pastikan Authentication sudah diaktifkan.",
      );
    } else {
      console.error("Login error:", err);
      showLoginAlert(`Login gagal (${code || "error tidak dikenal"}).`);
    }

    resetSubmitButton(submitBtn);
  }
}

// BIND FUNGSI KE WINDOW (dipakai oleh atribut onclick/onsubmit di HTML)
window.checkExistingSession = checkExistingSession;
window.enforceAdminSecurity = enforceAdminSecurity;
window.handleAdminLogout = handleAdminLogout;
window.handleSecureLogin = handleSecureLogin;