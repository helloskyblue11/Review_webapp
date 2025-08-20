// ===== Firebase SDK (modular) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// ===== Firebase config =====
const firebaseConfig = {
  apiKey: "AIzaSyBt8-UgWtAHHrEvgmQeKSByhgW1aVJ7N_c",
  authDomain: "magok-reviews.firebaseapp.com",
  projectId: "magok-reviews",
  storageBucket: "magok-reviews.firebasestorage.app",
  messagingSenderId: "809501399916",
  appId: "1:809501399916:web:08fdf4a9416becdf82b149",
  measurementId: "G-1D1SSYL93H"
};

// ===== Initialize Firebase =====
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ===== DOM Elements =====
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

const listWrap = $("#listWrap");
const backdrop = $("#backdrop");
const openModalBtn = $("#openModalBtn");
const closeBtn = $("#closeBtn");
const saveBtn = $("#saveBtn");
const searchInput = $("#searchInput");

const nameInput = $("#name");
const categorySelect = $("#category");
const dateInput = $("#date");
const contentInput = $("#content");
const ratingList = $("#ratingList");
const ratingHelper = $("#ratingHelper");

// ===== Helper functions =====
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
  return "★".repeat(full) + (half ? "☆" : "") + "☆".repeat(empty);
}

// ===== State =====
let reviews = [];
let selectedRating = null;

// ===== Build rating buttons =====
(function buildRatingOptions(){
  for (let v=0; v<=10; v++) {
    const val = v * 0.5;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rating-option";
    btn.dataset.value = val;
    btn.innerHTML = `
      <span class="rating-stars">${makeStars(val)}</span>
      <span class="rating-score">${val.toFixed(1)}</span>
    `;
    btn.addEventListener("click", ()=>{
      selectedRating = val;
      $$(".rating-option", ratingList).forEach(b=>b.dataset.selected="false");
      btn.dataset.selected="true";
      ratingHelper.textContent = `선택된 별점: ${val.toFixed(1)}점`;
    });
    ratingList.appendChild(btn);
  }
})();

// ===== Render list =====
function renderList(filter="") {
  const q = filter.trim().toLowerCase();
  const data = reviews.filter(r=>{
    if (!q) return true;
    return r.name.toLowerCase().includes(q) ||
           (r.content||"").toLowerCase().includes(q) ||
           (r.category||"").toLowerCase().includes(q);
  });

  if (data.length === 0) {
    listWrap.innerHTML = `<div class="empty">등록된 후기가 없습니다. 상단의 ‘리뷰 등록’을 눌러 첫 후기를 남겨주세요.</div>`;
    return;
  }

  const html = `
    <div class="grid">
      ${data.map(r=>`
        <article class="card" data-id="${r.id}">
          <div class="row" style="justify-content:space-between;">
            <h3>${r.name}</h3>
            <button class="button danger" data-action="delete">삭제</button>
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

  // Bind delete buttons
  $$('button[data-action="delete"]', listWrap).forEach(btn=>{
    btn.addEventListener("click", async e=>{
      const card = e.currentTarget.closest(".card");
      const id = card?.dataset.id;
      if (!id) return;
      if (!confirm("이 후기를 삭제하시겠습니까?")) return;
      try {
        await deleteDoc(doc(db,"reviews",id));
      } catch(err) {
        alert("삭제 중 오류가 발생했습니다.");
        console.error(err);
      }
    });
  });
}

// ===== Reset form =====
function resetForm() {
  nameInput.value = "";
  contentInput.value = "";
  categorySelect.value = "기타";
  dateInput.value = "";
  selectedRating = null;
  $$(".rating-option", ratingList).forEach(b=>b.dataset.selected="false");
  ratingHelper.textContent = "별모양 또는 점수를 눌러 선택";
}

// ===== Modal =====
openModalBtn.addEventListener("click", ()=>{
  resetForm();
  backdrop.style.display="flex";
  setTimeout(()=>nameInput.focus(),0);
});
closeBtn.addEventListener("click", ()=>backdrop.style.display="none");
backdrop.addEventListener("click", e=>{ if(e.target===backdrop) backdrop.style.display="none"; });
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && backdrop.style.display==="flex") backdrop.style.display="none"; });

// ===== Save review =====
saveBtn.addEventListener("click", async ()=>{
  const name = nameInput.value.trim();
  const category = categorySelect.value;
  const date = dateInput.value ? new Date(dateInput.value).toISOString() : "";
  const content = contentInput.value.trim();

  if (!name || selectedRating===null) {
    alert("필수 항목을 입력하세요.");
    return;
  }

  try {
    await addDoc(collection(db,"reviews"),{
      name,
      rating: Number(selectedRating),
      category,
      date,
      content,
      createdAt: serverTimestamp()
    });
    backdrop.style.display="none";
    resetForm();
  } catch(err) {
    alert("등록 중 오류가 발생했습니다.");
    console.error(err);
  }
});

// ===== Firebase Auth (anonymous) & real-time listener =====
onAuthStateChanged(auth, user=>{
  if(!user){
    signInAnonymously(auth).catch(err=>{
      console.error("Anonymous sign-in failed",err);
    });
    return;
  }

  const q = query(collection(db,"reviews"), orderBy("createdAt","desc"));
  onSnapshot(q, snap=>{
    reviews = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderList(searchInput.value);
  }, err=>{
    console.error("onSnapshot error:",err);
  });
});

// ===== Search =====
searchInput.addEventListener("input", e=>renderList(e.target.value));
