/* 저장소: localStorage */
const STORAGE_KEY = "magok_reviews_v1";

/* 유틸 */
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

function loadReviews() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; }
  catch { return []; }
}
function saveReviews(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
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

/* 상태 */
let reviews = loadReviews();
let selectedRating = null;

/* 요소 참조 */
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

/* 별점 옵션 생성 (0.0 ~ 5.0, 0.5 step) */
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

/* 렌더링 */
function renderList(filter="") {
  const q = filter.trim().toLowerCase();
  const data = [...reviews]
    .sort((a,b)=> b.createdAt - a.createdAt)
    .filter(r => {
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
            <span class="stars">${makeStars(r.rating)} (${r.rating.toFixed(1)})</span>
            <span class="tag">${r.category||"기타"}</span>
            <span class="helper">방문일 ${formatDate(r.date)}</span>
          </div>
          <div class="review">${(r.content||"").replace(/</g,"&lt;")}</div>
        </article>
      `).join("")}
    </div>
  `;
  listWrap.innerHTML = html;

  /* 삭제 이벤트 바인딩 */
  $$('button[data-action="delete"]', listWrap).forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const card = e.currentTarget.closest(".card");
      const id = card?.dataset.id;
      if (!id) return;
      if (confirm("이 후기를 삭제하시겠습니까?")) {
        reviews = reviews.filter(r => String(r.id) !== String(id));
        saveReviews(reviews);
        renderList(searchInput.value);
      }
    });
  });
}

/* 폼 초기화 */
function resetForm() {
  nameInput.value = "";
  contentInput.value = "";
  categorySelect.value = "기타";
  dateInput.value = "";
  selectedRating = null;
  $$(".rating-option", ratingList).forEach(b => b.dataset.selected = "false");
  ratingHelper.textContent = "별모양 또는 점수를 눌러 선택";
}

/* 모달 열기/닫기 */
function openModal() {
  resetForm();
  backdrop.style.display = "flex";
  setTimeout(()=> nameInput.focus(), 0);
}
function closeModal() {
  backdrop.style.display = "none";
}

/* 저장 */
function handleSave() {
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

  const item = {
    id: Date.now().toString(),
    name,
    rating: Number(rating),
    category,
    date,
    content,
    createdAt: Date.now()
  };
  reviews.push(item);
  saveReviews(reviews);
  renderList(searchInput.value);
  closeModal();
}

/* 이벤트 */
openModalBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);
saveBtn.addEventListener("click", handleSave);
backdrop.addEventListener("click", (e)=> { if (e.target === backdrop) closeModal(); });
document.addEventListener("keydown", (e)=> {
  if (e.key === "Escape" && backdrop.style.display === "flex") closeModal();
});
searchInput.addEventListener("input", (e)=> renderList(e.target.value));

/* 초기 진입 */
renderList("");
openModal();
