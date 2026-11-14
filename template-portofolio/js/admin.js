// ==========================================
// 1. IMPORT FIREBASE MODULES
// ==========================================
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let activeFormType = "blog";
let currentEditDocId = null;
let tempBase64WebP = "";
let cropperInstance = null;

// ==========================================
// 2. TAB & MODAL CONTROL (BIND GLOBAL)
// ==========================================
window.switchAdminTab = function (tabId, btnElement) {
  const contents = document.querySelectorAll(".tab-content");
  contents.forEach((content) => content.classList.remove("active"));

  const buttons = document.querySelectorAll(".admin-tab-btn");
  buttons.forEach((btn) => btn.classList.remove("active"));

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add("active");
  if (btnElement) btnElement.classList.add("active");

  if (typeof window.initIcons === "function") window.initIcons();
};

window.openProyekModal = function () {
  activeFormType = "proyek";
  currentEditDocId = null; // Mode Tambah Baru
  document.getElementById("blogModalTitle").innerText = "Tambah Data Proyek";
  document.getElementById("blogJudulInput").placeholder = "Judul Proyek...";
  document.getElementById("blogTanggalInput").type = "text";
  document.getElementById("blogTanggalInput").placeholder =
    "URL Website Proyek (https://...)";
  document.getElementById("blogGambarInput").placeholder =
    "URL Gambar Custom (Kosongkan jika auto-screenshot)...";
  document.getElementById("blogRingkasanInput").placeholder =
    "Teknologi / Tags (HTML, CSS, JS)...";
  resetModalFields();
};

window.openSertifikatModal = function () {
  activeFormType = "sertifikat";
  currentEditDocId = null; // Mode Tambah Baru
  document.getElementById("blogModalTitle").innerText =
    "Tambah Data Sertifikat";
  document.getElementById("blogJudulInput").placeholder = "Nama Sertifikat...";
  document.getElementById("blogTanggalInput").type = "text";
  document.getElementById("blogTanggalInput").placeholder =
    "Tahun Terbit (misal: 2026)...";
  document.getElementById("blogRingkasanInput").placeholder =
    "Penerbit / Instansi...";
  resetModalFields();
};

window.openBlogModal = function () {
  activeFormType = "blog";
  currentEditDocId = null; // Mode Tambah Baru
  document.getElementById("blogModalTitle").innerText = "Tambah Artikel Blog";
  document.getElementById("blogJudulInput").placeholder = "Judul Artikel...";
  document.getElementById("blogTanggalInput").type = "date";
  document.getElementById("blogRingkasanInput").placeholder =
    "Tulis konten blog... (URL seperti https://... akan ter-hyperlink otomatis)";
  resetModalFields();
};

function resetModalFields() {
  tempBase64WebP = "";
  const editIdx = document.getElementById("blogEditIndex");
  if (editIdx) editIdx.value = "";

  document.getElementById("blogJudulInput").value = "";
  document.getElementById("blogTanggalInput").value = "";
  document.getElementById("blogGambarInput").value = "";
  document.getElementById("blogFileInput").value = "";
  document.getElementById("blogRingkasanInput").value = "";
  document.getElementById("blogCrudModal").classList.add("active");
}

window.closeBlogModal = function () {
  currentEditDocId = null;
  document.getElementById("blogCrudModal").classList.remove("active");
};

// ==========================================
// 3. FITUR MANUAL CROPPER FOTO
// ==========================================
window.handleBlogFileSelect = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      // Buat Canvas untuk kompresi langsung ke WebP ringan (< 150KB)
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Atur max width/height agar ukuran string Base64 kecil
      const MAX_WIDTH = 1000;
      const MAX_HEIGHT = 1000;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Simpan Base64 WebP ringan
      tempBase64WebP = canvas.toDataURL("image/webp", 0.8);
      document.getElementById("blogGambarInput").value = "[GAMBAR TERPILIK]";
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

// 1. OPTIMALKAN KOMPRESI CROPPER AGAR BASE64 TDK OVERSIZE
window.applyCrop = function () {
  if (!cropperInstance) return;

  // Ukuran kanvas diperkecil sedikit agar string Base64 sangat ringan (< 200KB)
  const canvas = cropperInstance.getCroppedCanvas({
    width: activeFormType === "sertifikat" ? 800 : 900,
    height: activeFormType === "sertifikat" ? 600 : 506,
  });

  // Kompres kualitas WebP ke 0.75
  tempBase64WebP = canvas.toDataURL("image/webp", 0.75);
  document.getElementById("blogGambarInput").value = "[CROPPED WEBP IMAGE]";

  const cropperModal = document.getElementById("cropperModal");
  if (cropperModal) cropperModal.classList.remove("active");
  cropperInstance.destroy();
  cropperInstance = null;
};

// 2. PASTI KAN PAYLOAD SERTIFIKAT MENYIMPAN GAMBAR DENGAN BENAR
window.saveBlogDataToFirebase = async function () {
  if (!window.db) {
    alert("Koneksi Firebase belum siap!");
    return;
  }

  const judul = document.getElementById("blogJudulInput").value;
  const tanggal = document.getElementById("blogTanggalInput").value;
  const urlGambarText = document.getElementById("blogGambarInput").value;
  let ringkasan = document.getElementById("blogRingkasanInput").value;

  if (!judul) {
    alert("Judul / Nama wajib diisi!");
    return;
  }

  ringkasan = autoConvertUrlsToHyperlinks(ringkasan);

  try {
    // Tentukan Gambar Final
    let finalImage =
      tempBase64WebP ||
      (urlGambarText !== "[GAMBAR TERPILIK]" ? urlGambarText : "");

    if (activeFormType === "proyek") {
      if (
        (!finalImage || finalImage.trim() === "") &&
        tanggal &&
        tanggal.startsWith("http")
      ) {
        finalImage = `https://api.microlink.io/?url=${encodeURIComponent(tanggal)}&screenshot=true&meta=false&embed=screenshot.url`;
      } else if (!finalImage) {
        finalImage =
          "https://via.placeholder.com/600x400/12151C/FFFFFF?text=No+Preview";
      }

      const payload = {
        judul,
        tags: ringkasan,
        url: tanggal,
        gambar: finalImage,
        updatedAt: new Date(),
      };

      if (currentEditDocId) {
        await updateDoc(doc(window.db, "proyek", currentEditDocId), payload);
      } else {
        payload.createdAt = new Date();
        await addDoc(collection(window.db, "proyek"), payload);
      }
    } else if (activeFormType === "sertifikat") {
      if (!finalImage || finalImage.trim() === "") {
        finalImage =
          "https://via.placeholder.com/600x450/12151C/FFFFFF?text=No+Certificate";
      }

      const payload = {
        nama: judul,
        penerbit: ringkasan,
        tahun: tanggal,
        gambar: finalImage,
        updatedAt: new Date(),
      };

      if (currentEditDocId) {
        await updateDoc(
          doc(window.db, "sertifikat", currentEditDocId),
          payload,
        );
      } else {
        payload.createdAt = new Date();
        await addDoc(collection(window.db, "sertifikat"), payload);
      }
    } else {
      if (!finalImage || finalImage.trim() === "") {
        finalImage =
          "https://via.placeholder.com/600x400/12151C/FFFFFF?text=No+Image";
      }

      const payload = {
        judul,
        tanggal,
        ringkasan,
        gambar: finalImage,
        updatedAt: new Date(),
      };

      if (currentEditDocId) {
        await updateDoc(doc(window.db, "blogs", currentEditDocId), payload);
      } else {
        payload.createdAt = new Date();
        await addDoc(collection(window.db, "blogs"), payload);
      }
    }

    closeBlogModal();
    alert(
      `Data ${activeFormType.toUpperCase()} berhasil ${currentEditDocId ? "diperbarui" : "disimpan"}!`,
    );
  } catch (err) {
    console.error("Gagal menyimpan data:", err);
    alert("Error Firestore: " + err.message);
  }
};

window.cancelCrop = function () {
  const cropperModal = document.getElementById("cropperModal");
  if (cropperModal) cropperModal.classList.remove("active");
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
  document.getElementById("blogFileInput").value = "";
};

// ==========================================
// 4. AUTO HYPERLINK CONVERTER
// ==========================================
function autoConvertUrlsToHyperlinks(text) {
  if (!text) return "";
  const urlPattern = /(?<!href=["'])(https?:\/\/[^\s<]+)/g;
  return text.replace(urlPattern, function (url) {
    if (url.includes("href=")) return url;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #4dff80; text-decoration: underline; font-weight: 600; word-break: break-all;">${url}</a>`;
  });
}
// ==========================================
// 5. FIRESTORE LISTENERS & CRUD (NO DUPLICATE)
// ==========================================
function listenAdminProyek() {
  const tableBody = document.getElementById("proyek-table-body");
  if (!tableBody || !window.db) return;

  const q = query(
    collection(window.db, "proyek"),
    orderBy("createdAt", "desc"),
  );
  onSnapshot(q, (snapshot) => {
    tableBody.innerHTML = snapshot.docs
      .map((docSnap) => {
        const p = docSnap.data();
        const id = docSnap.id;
        return `
        <tr>
          <td><img src="${p.gambar}" alt="Preview" class="table-thumb" style="cursor: pointer;" onclick="openImageModal('${p.gambar}')" onerror="this.src='https://via.placeholder.com/50x35/12151C/FFFFFF?text=No+Img'"></td>
          <td><strong>${p.judul}</strong></td>
          <td>${p.tags || "-"}</td>
          <td><small>${p.url || "-"}</small></td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="editProyekFirebase('${id}')"><i data-lucide="edit"></i> Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProyekFirebase('${id}')"><i data-lucide="trash-2"></i> Hapus</button>
          </td>
        </tr>
      `;
      })
      .join("");
    if (typeof window.initIcons === "function") window.initIcons();
  });
}

function listenAdminSertifikat() {
  const tableBody = document.getElementById("sertifikat-table-body");
  if (!tableBody || !window.db) return;

  const q = query(
    collection(window.db, "sertifikat"),
    orderBy("createdAt", "desc"),
  );
  onSnapshot(q, (snapshot) => {
    tableBody.innerHTML = snapshot.docs
      .map((docSnap) => {
        const s = docSnap.data();
        const id = docSnap.id;
        return `
        <tr>
          <td><img src="${s.gambar}" alt="Cert" class="table-thumb" style="cursor: pointer;" onclick="openImageModal('${s.gambar}')" onerror="this.src='https://via.placeholder.com/50x35/12151C/FFFFFF?text=No+Img'"></td>
          <td><strong>${s.nama}</strong></td>
          <td>${s.penerbit || "-"}</td>
          <td>${s.tahun || "-"}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="editSertifikatFirebase('${id}')"><i data-lucide="edit"></i> Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSertifikatFirebase('${id}')"><i data-lucide="trash-2"></i> Hapus</button>
          </td>
        </tr>
      `;
      })
      .join("");
    if (typeof window.initIcons === "function") window.initIcons();
  });
}

function listenAdminBlog() {
  const tableBody = document.getElementById("adminBlogTable");
  if (!tableBody || !window.db) return;

  const q = query(collection(window.db, "blogs"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    tableBody.innerHTML = snapshot.docs
      .map((docSnap) => {
        const b = docSnap.data();
        const id = docSnap.id;
        return `
        <tr>
          <td><img src="${b.gambar}" alt="Thumb" class="table-thumb" style="cursor: pointer;" onclick="openImageModal('${b.gambar}')" onerror="this.src='https://via.placeholder.com/50x35/12151C/FFFFFF?text=No+Img'"></td>
          <td><strong>${b.judul}</strong></td>
          <td>${b.tanggal || "-"}</td>
          <td><small>${(b.ringkasan || "").replace(/<[^>]*>?/gm, "").substring(0, 40)}...</small></td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="editBlogFirebase('${id}')"><i data-lucide="edit"></i> Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBlogFirebase('${id}')"><i data-lucide="trash-2"></i> Hapus</button>
          </td>
        </tr>
      `;
      })
      .join("");
    if (typeof window.initIcons === "function") window.initIcons();
  });
}

window.saveBlogDataToFirebase = async function () {
  if (!window.db) {
    alert("Koneksi Firebase belum siap!");
    return;
  }

  const judul = document.getElementById("blogJudulInput").value;
  const tanggal = document.getElementById("blogTanggalInput").value;
  const urlGambarText = document.getElementById("blogGambarInput").value;
  let ringkasan = document.getElementById("blogRingkasanInput").value;

  if (!judul) {
    alert("Judul wajib diisi!");
    return;
  }

  ringkasan = autoConvertUrlsToHyperlinks(ringkasan);

  try {
    if (activeFormType === "proyek") {
      let finalImage =
        tempBase64WebP ||
        (urlGambarText !== "[CROPPED WEBP IMAGE]" ? urlGambarText : "");
      if (
        (!finalImage || finalImage.trim() === "") &&
        tanggal &&
        tanggal.startsWith("http")
      ) {
        finalImage = `https://api.microlink.io/?url=${encodeURIComponent(tanggal)}&screenshot=true&meta=false&embed=screenshot.url`;
      } else if (!finalImage) {
        finalImage =
          "https://via.placeholder.com/600x400/12151C/FFFFFF?text=No+Preview";
      }

      const payload = {
        judul,
        tags: ringkasan,
        url: tanggal,
        gambar: finalImage,
        updatedAt: new Date(),
      };

      if (currentEditDocId) {
        await updateDoc(doc(window.db, "proyek", currentEditDocId), payload);
      } else {
        payload.createdAt = new Date();
        await addDoc(collection(window.db, "proyek"), payload);
      }
    } else if (activeFormType === "sertifikat") {
      // PENANGANAN GAMBAR SERTIFIKAT
      let finalImage =
        tempBase64WebP ||
        (urlGambarText !== "[CROPPED WEBP IMAGE]" ? urlGambarText : "");
      if (!finalImage || finalImage.trim() === "") {
        finalImage =
          "https://via.placeholder.com/600x450/12151C/FFFFFF?text=No+Certificate";
      }

      const payload = {
        nama: judul,
        penerbit: ringkasan,
        tahun: tanggal,
        gambar: finalImage,
        updatedAt: new Date(),
      };

      if (currentEditDocId) {
        await updateDoc(
          doc(window.db, "sertifikat", currentEditDocId),
          payload,
        );
      } else {
        payload.createdAt = new Date();
        await addDoc(collection(window.db, "sertifikat"), payload);
      }
    } else {
      let finalImage =
        tempBase64WebP ||
        (urlGambarText !== "[CROPPED WEBP IMAGE]" ? urlGambarText : "");
      if (!finalImage || finalImage.trim() === "") {
        finalImage =
          "https://via.placeholder.com/600x400/12151C/FFFFFF?text=No+Image";
      }

      const payload = {
        judul,
        tanggal,
        ringkasan,
        gambar: finalImage,
        updatedAt: new Date(),
      };

      if (currentEditDocId) {
        await updateDoc(doc(window.db, "blogs", currentEditDocId), payload);
      } else {
        payload.createdAt = new Date();
        await addDoc(collection(window.db, "blogs"), payload);
      }
    }

    closeBlogModal();
    alert(
      `Data ${activeFormType.toUpperCase()} berhasil ${currentEditDocId ? "diperbarui" : "disimpan"}!`,
    );
  } catch (err) {
    console.error("Gagal menyimpan data:", err);
    alert("Error Firestore: " + err.message);
  }
};

window.editProyekFirebase = async function (id) {
  activeFormType = "proyek";
  currentEditDocId = id;
  const docSnap = await getDoc(doc(window.db, "proyek", id));
  if (docSnap.exists()) {
    const data = docSnap.data();
    openProyekModal();
    document.getElementById("blogModalTitle").innerText = "Edit Data Proyek";
    document.getElementById("blogJudulInput").value = data.judul || "";
    document.getElementById("blogTanggalInput").value = data.url || "";
    document.getElementById("blogRingkasanInput").value = data.tags || "";
    document.getElementById("blogGambarInput").value = data.gambar || "";
    currentEditDocId = id; // Lock ID lagi setelah reset form
  }
};

window.editSertifikatFirebase = async function (id) {
  activeFormType = "sertifikat";
  currentEditDocId = id;
  const docSnap = await getDoc(doc(window.db, "sertifikat", id));
  if (docSnap.exists()) {
    const data = docSnap.data();
    openSertifikatModal();
    document.getElementById("blogModalTitle").innerText =
      "Edit Data Sertifikat";
    document.getElementById("blogJudulInput").value = data.nama || "";
    document.getElementById("blogTanggalInput").value = data.tahun || "";
    document.getElementById("blogRingkasanInput").value = data.penerbit || "";
    document.getElementById("blogGambarInput").value = data.gambar || "";
    currentEditDocId = id; // Lock ID lagi setelah reset form
  }
};

window.editBlogFirebase = async function (id) {
  activeFormType = "blog";
  currentEditDocId = id;
  const docSnap = await getDoc(doc(window.db, "blogs", id));
  if (docSnap.exists()) {
    const data = docSnap.data();
    openBlogModal();
    document.getElementById("blogModalTitle").innerText = "Edit Artikel Blog";
    document.getElementById("blogJudulInput").value = data.judul || "";
    document.getElementById("blogTanggalInput").value = data.tanggal || "";
    document.getElementById("blogRingkasanInput").value = data.ringkasan || "";
    document.getElementById("blogGambarInput").value = data.gambar || "";
    currentEditDocId = id; // Lock ID lagi setelah reset form
  }
};

window.deleteProyekFirebase = async function (id) {
  if (confirm("Hapus data proyek ini?")) {
    await deleteDoc(doc(window.db, "proyek", id));
  }
};

window.deleteSertifikatFirebase = async function (id) {
  if (confirm("Hapus data sertifikat ini?")) {
    await deleteDoc(doc(window.db, "sertifikat", id));
  }
};

window.deleteBlogFirebase = async function (id) {
  if (confirm("Hapus artikel blog ini?")) {
    await deleteDoc(doc(window.db, "blogs", id));
  }
};

// ==========================================
// 6. INITIALIZATION WITH DB CHECK
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const checkDb = setInterval(() => {
    if (window.db) {
      clearInterval(checkDb);
      listenAdminProyek();
      listenAdminSertifikat();
      listenAdminBlog();
    }
  }, 100);
});

// RENDER SERTIFIKAT REAL-TIME PUBLIK
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
      container.innerHTML = `<p style="opacity: 0.6; grid-column: 1/-1; font-family: monospace;">Belum ada data sertifikat.</p>`;
      return;
    }

    container.innerHTML = snapshot.docs
      .map((docSnap) => {
        const s = docSnap.data();
        const imgSrc =
          s.gambar && s.gambar.trim() !== ""
            ? s.gambar
            : "https://via.placeholder.com/600x450/12151C/FFFFFF?text=No+Certificate";

        return `
        <div class="cert-card" style="cursor: pointer;" onclick="openImageModal('${imgSrc}')">
          <div class="cert-img-box" style="width: 100%; height: 200px; overflow: hidden; border: 1px solid var(--border-color); border-radius: 4px; background: #000;">
            <img src="${imgSrc}" alt="${s.nama}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/600x450/12151C/FFFFFF?text=No+Certificate'">
          </div>
          <div class="cert-info" style="padding-top: 12px;">
            <h4 class="cert-name" style="margin-bottom: 6px;">${s.nama}</h4>
            <p class="cert-issuer" style="font-size: 0.85rem; opacity: 0.7;">${s.penerbit || "-"} · ${s.tahun || "-"}</p>
          </div>
        </div>
      `;
      })
      .join("");

    if (typeof window.initIcons === "function") window.initIcons();
  });
}
