// ==========================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// firebaseConfig dari project Firebase "raihan-portofolio-babcf".
const firebaseConfig = {
  apiKey: "AIzaSyB3Dn2ZL38L0t80DvBpc_pE-KLJHgr3qkc",
  authDomain: "raihan-portofolio-babcf.firebaseapp.com",
  projectId: "raihan-portofolio-babcf",
  storageBucket: "raihan-portofolio-babcf.firebasestorage.app",
  messagingSenderId: "995923372827",
  appId: "1:995923372827:web:896b3da2e0cb9e654001be",
};

if (String(firebaseConfig.apiKey).startsWith("ISI_")) {
  console.error(
    "[Firebase] firebaseConfig di js/firebase-config.js belum diisi. Data dan login belum akan berfungsi.",
  );
}

// Inisialisasi Firebase App, Firestore & Authentication
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Dipakai oleh script.js dan admin.js
window.db = db;
window.auth = auth;