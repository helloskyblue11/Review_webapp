// script.js (Firebase + Firestore real-time sync)

// 0) Firebase SDK imports (CDN). If you didn’t copy CDN imports from console,
// leave these as-is but replace the version numbers with the ones shown in your console if they differ.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// 1) Your Firebase config (copy from Firebase Console → Web app setup)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID"
  // (You can include the rest as provided by Firebase)
};

// 2) Init Firebase services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 3) DOM helpers and existing UI code (unchanged)
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function makeStars(score) {
  const full = Math.floor(score);
  const half = (score - full) >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "☆" : "") + "·".repeat(empty).replace(/·/g,"☆");
}

// App state (now driven by Firestore, not localStorage)
let reviews = [];
let selectedRating = null;

// Elements
const listWrap = $("#listWrap");
const backdrop = $("#backdrop");
const openModalBtn = $("#openModalBtn");
const closeBtn = $("#closeBtn");
const saveBtn = $("#saveBtn");
const nameInput = $("#name");
const contentInput = $("#content");
const categorySelect = $("#category");
const dateInput = $("#date");
const ratingList = $("#ratingList");
const searchInput = $("#searchInput");
const ratingHelper = $("#ratingHelper");

// Build rating options
(function buildRatingOptions(){
  const values = [];
  for (let v=0; v<=10; v++) values.push(v*0.5);
  values.forEach((val) => {
    const opt = document.createElement("button");
    opt.type = "button";
    opt.className = "rating-option";
    opt.setAttribute("data-value", String(val));
    opt.innerHTML = `
      <span class="rating-stars">${makeStars(val)}</span>
      <span class="rating-score">${val.toFixed(1)}</span>
    `;
    opt.addEventListener("click", () => {
      selectedRating = val;
      $$(".rating-option", ratingList).forEach(b => b.dataset.selected = "false");
      opt.dataset.selected = "true";
      ratingHelper.textContent = `선택된 별점: ${val.toFixed(1)}점`;
    });
    ratingList.appendChild(opt);
  });
})();

// Render list (no local sort; Firestore query already orders)
function renderList(filter="") {
  const q = filter.trim().toLowerCase();
  const data = reviews.filter(r => {
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      (r.content||"").toLowerCase().includes(q) ||
      (r.category||"").toLowerCase().includes(q)
    );
  });

  if (data.length === 0) {
    listWrap.innerHTML = `<div class="empty">조건에 맞는 후기가 없습니다.</div>`;
    return;
  }

  const html = `
    <div class="grid">
      ${data.map(r => `
        <article class="card" data-id="${r.id}">
          <div class="row" style="justify-content:space-between;">
            <h3>${r.name}</h3>
            <button class="button danger" data-action="delete" aria-label="리뷰 삭제">삭제</button>
          </div>
          <div class="meta">
            <span class="stars">${makeStars(r.rating)} (${Number(r.rating).toFixed(1)})</span>
            <span class="tag">${r.category||"기타"}</span>
            <span class="helper">방문일 ${formatDate(r.date)}</span>
          </div>
          <div class="review">${(r.content||"").replace(/</g,"&lt;")}</div>
        </article>
      `).join("")}
    </div>
  `;
  listWrap.innerHTML = html;

  // Bind delete
  $$('button[data-action="delete"]', listWrap).forEach(btn=>{
    btn.addEventListener("click", async (e)=>{
      const card = e.currentTarget.closest(".card");
      const id = card?.dataset.id;
      if (!id) return;
      if (confirm("이 후기를 삭제하시겠습니까?")) {
        try {
          await deleteDoc(doc(db, "reviews", id));
        } catch (err) {
          alert("삭제 중 오류가 발생했습니다.");
          console.error(err);
        }
      }
    });
  });
}

function resetForm() {
  nameInput.value = "";
  contentInput.value = "";
  categorySelect.value = "기타";
  dateInput.value = "";
  selectedRating = null;
  $$(".rating-option", ratingList).forEach(b => b.dataset.selected = "false");
  ratingHelper.textContent = "별모양 또는 점수를 눌러 선택";
}

function openModal() {
  resetForm();
  backdrop.style.display = "flex";
  setTimeout(()=> nameInput.focus(), 0);
}
function closeModal() {
  backdrop.style.display = "none";
}

async function handleSave() {
  const name = nameInput.value.trim();
  const rating = selectedRating;
  const category = categorySelect.value;
  const date = dateInput.value ? new Date(dateInput.value).toISOString() : "";
  const content = contentInput.value.trim();

  const errs = [];
  if (!name) errs.push("음식점명은 필수입니다.");
  if (rating === null) errs.push("별점은 필수입니다.");
  if (errs.length) {
    alert(errs.join("\n"));
    return;
  }

  try {
    await addDoc(collection(db, "reviews"), {
      name,
      rating: Number(rating),
      category,
      date,                // keep as ISO string (simple to format)
      content,
      createdAt: serverTimestamp()
    });
    closeModal();
  } catch (err) {
    alert("등록 중 오류가 발생했습니다.");
    console.error(err);
  }
}

// Events
openModalBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);
saveBtn.addEventListener("click", handleSave);
backdrop.addEventListener("click", (e)=> { if (e.target === backdrop) closeModal(); });
document.addEventListener("keydown", (e)=> {
  if (e.key === "Escape" && backdrop.style.display === "flex") closeModal();
});
searchInput.addEventListener("input", (e)=> renderList(e.target.value));

// 4) Sign in anonymously, then start real-time listener
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch(err => {
      console.error("Anonymous sign-in failed", err);
    });
    return;
  }

  // Real-time Firestore subscription ordered by createdAt desc
  const qRef = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
  onSnapshot(qRef, (snap) => {
    reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderList(searchInput.value);
  }, (err) => {
    console.error("onSnapshot error:", err);
  });
});

// Initial UI
renderList("");
