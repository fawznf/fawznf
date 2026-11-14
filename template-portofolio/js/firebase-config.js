// ==========================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDA2wJb_LRFuOazrfgmWyzGLAFiiHD3DjQ",
  authDomain: "rivaldojeffmarvin-74e61.firebaseapp.com",
  projectId: "rivaldojeffmarvin-74e61",
  storageBucket: "rivaldojeffmarvin-74e61.firebasestorage.app",
  messagingSenderId: "659552618026",
  appId: "1:659552618026:web:034c32f5f31aa0b04a2553",
  measurementId: "G-E4JGLPYD6X",
};

// Inisialisasi Firebase App & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// MANDATORI: Eksport instance Firestore ke Global Window
window.db = db;
