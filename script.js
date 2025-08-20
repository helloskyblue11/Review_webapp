// ===== Firebase SDK =====
// Firebase CDN (из html) уже подключен, здесь только config и инициализация
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===== DOM Elements =====
const openModalBtn = document.getElementById("openModalBtn");
const closeBtn = document.getElementById("closeBtn");
const backdrop = document.getElementById("backdrop");
const saveBtn = document.getElementById("saveBtn");
const listWrap = document.getElementById("listWrap");
const searchInput = document.getElementById("searchInput");

// form fields
const nameInput = document.getElementById("name");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const contentInput = document.getElementById("content");
const ratingList = document.getElementById("ratingList");
const ratingHelper = document.getElementById("ratingHelper");

let selectedRating = null;

// ===== Modal open/close =====
openModalBtn.addEventListener("click", () => {
  backdrop.style.display = "flex";
});

closeBtn.addEventListener("click", () => {
  backdrop.style.display = "none";
});

// ===== Render rating options =====
const ratingOptions = [];
for (let i = 0.5; i <= 5; i += 0.5) {
  ratingOptions.push(i.toFixed(1));
}

ratingOptions.forEach(score => {
  const option = document.createElement("div");
  option.className = "rating-option";
  option.dataset.score = score;

  const scoreEl = document.createElement("div");
  scoreEl.className = "rating-score";
  scoreEl.textContent = score;

  const starsEl = document.createElement("div");
  starsEl.className = "rating-stars";
  starsEl.textContent = "★".repeat(Math.floor(score)) + (score % 1 ? "½" : "");

  option.appendChild(scoreEl);
  option.appendChild(starsEl);

  option.addEventListener("click", () => {
    selectedRating = parseFloat(score);
    document.querySelectorAll(".rating-option").forEach(opt => {
      opt.dataset.selected = "false";
    });
    option.dataset.selected = "true";
    ratingHelper.textContent = `선택됨: ${score}점`;
  });

  ratingList.appendChild(option);
});

// ===== Save review =====
saveBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const category = categoryInput.value;
  const date = dateInput.value;
  const content = contentInput.value.trim();

  if (!name || !selectedRating || !content) {
    alert("필수 항목을 입력하세요.");
    return;
  }

  await db.collection("reviews").add({
    name,
    rating: selectedRating,
    category,
    date,
    content,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  // reset
  nameInput.value = "";
  categoryInput.value = "기타";
  dateInput.value = "";
  contentInput.value = "";
  selectedRating = null;
  ratingHelper.textContent = "별모양 또는 점수를 눌러 선택";
  document.querySelectorAll(".rating-option").forEach(opt => opt.dataset.selected = "false");

  backdrop.style.display = "none";
});

// ===== Render reviews =====
function renderReviewCard(doc) {
  const data = doc.data();

  const card = document.createElement("div");
  card.className = "card";

  const title = document.createElement("h3");
  title.textContent = data.name;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    <span class="stars">★ ${data.rating.toFixed(1)}</span>
    <span class="tag">${data.category}</span>
    ${data.date ? `<span>${data.date}</span>` : ""}
  `;

  const review = document.createElement("div");
  review.className = "review";
  review.textContent = data.content;

  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(review);

  return card;
}

// ===== Live updates =====
let allReviews = [];

db.collection("reviews")
  .orderBy("timestamp", "desc")
  .onSnapshot(snapshot => {
    allReviews = snapshot.docs;
    updateList();
  });

// ===== Search =====
searchInput.addEventListener("input", updateList);

function updateList() {
  const keyword = searchInput.value.toLowerCase();
  listWrap.innerHTML = "";

  const filtered = allReviews.filter(doc => {
    const d = doc.data();
    return (
      d.name.toLowerCase().includes(keyword) ||
      d.content.toLowerCase().includes(keyword) ||
      d.category.toLowerCase().includes(keyword)
    );
  });

  if (filtered.length === 0) {
    listWrap.innerHTML = `<div class="empty">등록된 후기가 없습니다. 상단의 ‘리뷰 등록’을 눌러 첫 후기를 남겨주세요.</div>`;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "grid";

  filtered.forEach(doc => {
    grid.appendChild(renderReviewCard(doc));
  });

  listWrap.appendChild(grid);
}
