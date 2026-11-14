// ==========================================
// 1. IMPORT FIREBASE FIRESTORE MODULES
// ==========================================
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// 2. UTILITY & NAVIGATION FUNCTIONS
// ==========================================
export function initIcons() {
  if (typeof lucide !== "undefined" && lucide.createIcons) {
    lucide.createIcons();
  }
}

export function openImageModal(imgSrc) {
  const modal =
    document.getElementById("imageModal") ||
    document.getElementById("certModal");
  const modalImg =
    document.getElementById("imageModalImg") ||
    document.getElementById("certModalImg");
  if (modal && modalImg) {
    modalImg.src = imgSrc;
    modal.classList.add("active");
  }
}

export function closeImageModal() {
  const modal =
    document.getElementById("imageModal") ||
    document.getElementById("certModal");
  if (modal) modal.classList.remove("active");
}

export function toggleMobileMenu() {
  const nav = document.getElementById("topNav");
  if (nav) {
    nav.classList.toggle("open");
    nav.classList.toggle("active");
  }
}

// BIND TO WINDOW GLOBAL
window.initIcons = initIcons;
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;
window.openCertModal = openImageModal;
window.closeCertModal = closeImageModal;
window.toggleMobileMenu = toggleMobileMenu;

// Pindah ke Halaman Detail Blog Berdasarkan ID Firestore
window.viewBlogDetailFromFirebase = function (docId) {
  localStorage.setItem("selected_blog_id", docId);
  window.location.href = `blog-detail.html?id=${docId}`;
};

// ==========================================
// 3. REAL-TIME FIREBASE RENDERERS (PUBLIK)
// ==========================================

// Render Proyek Real-time
// RENDER PROYEK REAL-TIME DENGAN SCREENSHOT OTOMATIS MICROLINK
export function listenPublicProyek() {
  const container =
    document.getElementById("projectContainer") ||
    document.getElementById("proyekContainer");
  if (!container || !window.db) return;

  const q = query(
    collection(window.db, "proyek"),
    orderBy("createdAt", "desc"),
  );

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = `<p style="color: var(--text-muted); font-family: monospace;">Belum ada data proyek.</p>`;
      return;
    }

    container.innerHTML = snapshot.docs
      .map((docSnap) => {
        const p = docSnap.data();
        const projectUrl = p.url && p.url.trim() !== "" ? p.url : "#";
        const tagsArray = (p.tags || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

        // TENTUKAN GAMBAR: Jika gambar kosong/placeholder, buat screenshot otomatis via Microlink dari URL Proyek
        let displayImage = p.gambar;
        if (
          (!displayImage ||
            displayImage.includes("placeholder") ||
            displayImage.trim() === "") &&
          projectUrl !== "#"
        ) {
          displayImage = `https://api.microlink.io/?url=${encodeURIComponent(projectUrl)}&screenshot=true&meta=false&embed=screenshot.url`;
        }

        return `
        <div class="project-card">
          <div class="project-thumb" style="cursor: pointer;" onclick="openImageModal('${displayImage}')">
            <img src="${displayImage}" alt="${p.judul}" loading="lazy" onerror="this.src='https://via.placeholder.com/600x400/12151C/FFFFFF?text=No+Preview'">
          </div>

          <div class="project-content">
            <div class="project-tags">
              ${tagsArray.map((tag) => `<span class="tag-badge">${tag}</span>`).join("")}
            </div>

            <h3 class="project-title">${p.judul}</h3>

            <div style="margin-top: auto; padding-top: 16px;">
              <a href="${projectUrl}" 
                 ${projectUrl !== "#" ? 'target="_blank" rel="noopener noreferrer"' : "onclick=\"alert('URL preview belum ditambahkan.'); return false;\""} 
                 class="btn btn-outline btn-sm" 
                 style="width: 100%; justify-content: center; text-decoration: none;">
                <i data-lucide="external-link" class="btn-icon"></i> Preview Proyek
              </a>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    initIcons();
  });
}

// Render Sertifikat Real-time
export function listenPublicSertifikat() {
  const container =
    document.getElementById("sertifikatContainer") ||
    document.getElementById("certContainer");
  if (!container || !window.db) return;

  const q = query(
    collection(window.db, "sertifikat"),
    orderBy("createdAt", "desc"),
  );

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = `<p style="opacity: 0.6; grid-column: 1/-1;">Belum ada data sertifikat.</p>`;
      return;
    }

    container.innerHTML = snapshot.docs
      .map((docSnap) => {
        const s = docSnap.data();
        return `
        <div class="cert-card" style="cursor: pointer;" onclick="openImageModal('${s.gambar}')">
          <div class="cert-img-box">
            <img src="${s.gambar}" alt="${s.nama}" onerror="this.src='https://via.placeholder.com/600x450/12151C/FFFFFF?text=No+Certificate'">
          </div>
          <div class="cert-info">
            <h4 class="cert-name" style="margin-bottom: 6px;">${s.nama}</h4>
            <p class="cert-issuer">${s.penerbit || ""} · ${s.tahun || ""}</p>
          </div>
        </div>
      `;
      })
      .join("");

    initIcons();
  });
}

// Render Blog Real-time (Menghubungkan ke Detail)
// RENDER BLOG REAL-TIME (DENGAN GAMBAR THUMBNAIL)
// RENDER BLOG REAL-TIME (DENGAN TAMPILAN PRESISI SEPERTI KARTU PROYEK)
// ==========================================
// RENDER BLOG REAL-TIME (PRESISI & SERAGAM DENGAN PROYEK)
// ==========================================
export function listenPublicBlog() {
  const container = document.getElementById("blogContainer");
  if (!container || !window.db) return;

  const q = query(collection(window.db, "blogs"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = `<p style="opacity: 0.6; grid-column: 1/-1; font-family: monospace;">Belum ada artikel blog.</p>`;
      return;
    }

    container.innerHTML = snapshot.docs
      .map((docSnap) => {
        const b = docSnap.data();
        const id = docSnap.id;

        // Bersihkan tag HTML dari ringkasan untuk tampilan kartu
        const cleanSummary = (b.ringkasan || "").replace(/<[^>]*>?/gm, "");

        return `
        <div class="project-card">
          <!-- BINGKAI GAMBAR KARTU (UKURAN & STYLE DISAMAKAN DENGAN MENU PROYEK) -->
          <div class="project-thumb" style="cursor: pointer;" onclick="localStorage.setItem('selected_blog_id', '${id}'); window.location.href='blog-detail.html?id=${id}';">
            <img src="${b.gambar}" alt="${b.judul}" onerror="this.src='https://via.placeholder.com/600x400/12151C/FFFFFF?text=No+Preview'">
          </div>

          <div class="project-content">
            <div class="blog-date" style="font-family: monospace; font-size: 0.78rem; opacity: 0.6; margin-bottom: 8px;">
              PUBLISHED: ${b.tanggal || "-"}
            </div>

            <h3 class="project-title" style="margin-bottom: 10px;">${b.judul}</h3>

            <p style="font-size: 0.88rem; opacity: 0.75; line-height: 1.5; margin-bottom: 20px;">
              ${cleanSummary.substring(0, 90)}...
            </p>

            <div style="margin-top: auto; padding-top: 12px;">
              <a href="blog-detail.html?id=${id}" 
                 onclick="localStorage.setItem('selected_blog_id', '${id}')" 
                 class="btn btn-outline btn-sm" 
                 style="width: 100%; justify-content: center; text-decoration: none;">
                BACA <i data-lucide="arrow-right" class="btn-icon"></i>
              </a>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    if (typeof window.initIcons === "function") window.initIcons();
    else if (window.lucide) lucide.createIcons();
  });
}

// ==========================================
// 4. LOAD & RENDER DETAIL BLOG
// ==========================================
export async function loadBlogDetail() {
  const detailContainer = document.getElementById("blogDetailContent");
  if (!detailContainer) return;

  // Tangkap ID dari URL (?id=xxxx) atau fallback dari localStorage
  const urlParams = new URLSearchParams(window.location.search);
  let blogId = urlParams.get("id") || localStorage.getItem("selected_blog_id");

  if (!blogId || !window.db) {
    detailContainer.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <h2>Artikel Tidak Ditemukan</h2>
        <p style="opacity: 0.6; margin-bottom: 20px;">URL artikel tidak valid atau ID belum ditentukan.</p>
        <a href="blog.html" class="btn btn-outline">Kembali ke Blog</a>
      </div>
    `;
    initIcons();
    return;
  }

  try {
    const docRef = doc(window.db, "blogs", blogId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      detailContainer.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <h2>Artikel Tidak Ditemukan</h2>
          <p style="opacity: 0.6; margin-bottom: 20px;">Artikel yang Anda cari telah dihapus dari database.</p>
          <a href="blog.html" class="btn btn-outline">Kembali ke Blog</a>
        </div>
      `;
      initIcons();
      return;
    }

    const data = docSnap.data();

    detailContainer.innerHTML = `
      <article class="hud-panel" style="max-width: 800px; margin: 0 auto; padding: 32px;">
        <a href="blog.html" class="btn btn-outline btn-sm" style="margin-bottom: 24px;">
          <i data-lucide="arrow-left"></i> Kembali ke Blog
        </a>

        <div style="font-family: monospace; font-size: 0.8rem; opacity: 0.6; margin-bottom: 8px;">
          PUBLISHED: ${data.tanggal || "N/A"}
        </div>

        <h1 class="page-title" style="font-size: 2rem; margin-bottom: 20px; line-height: 1.3;">
          ${data.judul}
        </h1>

        <div style="width: 100%; max-height: 400px; overflow: hidden; border: 1px solid var(--border-color); margin-bottom: 28px; border-radius: 4px;">
          <img src="${data.gambar}" alt="${data.judul}" 
               style="width: 100%; height: 100%; object-fit: cover;"
               onerror="this.src='https://via.placeholder.com/800x400/12151C/FFFFFF?text=No+Image'">
        </div>

        <div style="font-size: 1rem; line-height: 1.8; color: var(--text-secondary); white-space: pre-line;">
          ${data.ringkasan || "Tidak ada konten artikel."}
        </div>
      </article>
    `;

    initIcons();
  } catch (err) {
    console.error("Gagal memuat detail blog:", err);
    detailContainer.innerHTML = `<p style="color: #ff6666; text-align: center;">Error: ${err.message}</p>`;
  }
}

window.loadBlogDetail = loadBlogDetail;

// ==========================================
// 5. AUTOMATIC INITIALIZATION (SAFE LOAD)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  initIcons();

  const checkDbAndInit = setInterval(() => {
    if (window.db) {
      clearInterval(checkDbAndInit);
      if (
        document.getElementById("projectContainer") ||
        document.getElementById("proyekContainer")
      ) {
        listenPublicProyek();
      }
      if (
        document.getElementById("sertifikatContainer") ||
        document.getElementById("certContainer")
      ) {
        listenPublicSertifikat();
      }
      if (document.getElementById("blogContainer")) {
        listenPublicBlog();
      }
      if (document.getElementById("blogDetailContent")) {
        loadBlogDetail();
      }
    }
  }, 100);
});
