/*
  FRONTEND FLOW:
  1. fetchAnime() asks Flask for data via GET request
  2. renderAnime() builds cards from that data using template literals
  3. Event listeners watch for user actions (click, input)
  4. User actions trigger POST/PUT/DELETE requests to Flask
  5. Flask updates the database and JS re-fetches to reflect changes
  
  CRUD: Create (POST) → Read (GET) → Update (PUT) → Delete (DELETE)
*/

// STRUCTURE:
// script.js never touches the database directly
// always asks Flask first & Flask handles the database

// ── STATE ──
let animeList = [];
let currentRating = 0;
let currentFilter = "all";
let genres = [];
let selectedAnime = null; // stores anime picked from Jikan

// ── THEME TOGGLE ──
const themeToggle = document.getElementById("theme-toggle");
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dawn");
  themeToggle.textContent = document.body.classList.contains("dawn") ? "☾ Dark" : "☀ Dawn";
});

// ── STAR RATING ──
const stars = document.querySelectorAll(".star");
stars.forEach(star => {
  star.addEventListener("click", () => {
    currentRating = parseInt(star.dataset.value);
    updateStars();
  });
  star.addEventListener("mouseover", () => {
    highlightStars(parseInt(star.dataset.value));
  });
  star.addEventListener("mouseout", () => {
    updateStars();
  });
});

function updateStars() {
  stars.forEach(star => {
    star.classList.toggle("filled", parseInt(star.dataset.value) <= currentRating);
  });
}

function highlightStars(value) {
  stars.forEach(star => {
    star.classList.toggle("filled", parseInt(star.dataset.value) <= value);
  });
}

function renderStars(rating) {
  if (!rating) return "☆☆☆☆☆";
  let result = "";
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) result += "★";
    else if (rating >= i - 0.5) result += "½";
    else result += "☆";
  }
  return result;
}

// ── GENRE AUTOCOMPLETE ──
const genreInput = document.getElementById("genre-input");
const suggestions = document.getElementById("genre-suggestions");

genreInput.addEventListener("input", () => {
  const val = genreInput.value.toLowerCase();
  if (!val) { suggestions.style.display = "none"; return; }

  const matches = genres.filter(g => g.toLowerCase().startsWith(val));
  if (matches.length === 0) { suggestions.style.display = "none"; return; }

  suggestions.innerHTML = matches.map(g =>
    `<div class="suggestion-item" onclick="selectGenre('${g}')">${g}</div>`
  ).join("");
  suggestions.style.display = "block";
});

function selectGenre(genre) {
  genreInput.value = genre;
  suggestions.style.display = "none";
}

document.addEventListener("click", (e) => {
  if (!genreInput.contains(e.target)) suggestions.style.display = "none";
});

// ── JIKAN SEARCH ──
const titleInput = document.getElementById("title-input");
const jikanSuggestions = document.getElementById("jikan-suggestions");

titleInput.addEventListener("input", () => {
  const query = titleInput.value.trim();
  if (query.length < 3) {
    jikanSuggestions.style.display = "none";
    return;
  }

  // wait for user to stop typing before searching
  clearTimeout(titleInput._searchTimeout);
  titleInput._searchTimeout = setTimeout(() => {
    console.log("Searching for:", query);
    fetch(`/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        console.log("Jikan response:", data);
          if (!data.data || data.data.length === 0) {
          return;
        }

        jikanSuggestions.innerHTML = data.data.map(anime => `
          <div class="suggestion-item" onclick="selectJikanAnime(${anime.mal_id})">
            <strong>${anime.title_english || anime.title}</strong>
            <span style="color:var(--text-muted);font-size:11px;">
              ${anime.year || ""} · ${anime.episodes || "?"} eps
            </span>
          </div>
        `).join("");

        // store results so we can look them up when user picks one
        titleInput._jikanResults = data.data;
        jikanSuggestions.style.display = "block";
      });
  }, 400);
});

function selectJikanAnime(malId) {
  const anime = titleInput._jikanResults.find(a => a.mal_id === malId);
  if (!anime) return;

  // store full anime data
  selectedAnime = {
    title: anime.title_english || anime.title,
    genre: anime.genres.map(g => g.name).join(", "),
    image_url: anime.images?.jpg?.large_image_url || "",
    episodes: anime.episodes || null,
    mal_score: anime.score || null,
    synopsis: anime.synopsis || "",
    studio: anime.studios?.[0]?.name || "",
    year: anime.year || null,
    mal_id: anime.mal_id
  };

  // autofill form
  titleInput.value = selectedAnime.title;
  document.getElementById("genre-input").value = selectedAnime.genre;
  jikanSuggestions.style.display = "none";
}

document.addEventListener("click", (e) => {
  if (!titleInput.contains(e.target)) jikanSuggestions.style.display = "none";
});

// ── FETCH & RENDER ──
function fetchAnime() {
  fetch("/anime")
    .then(res => res.json())
    .then(data => {
      animeList = data;
      genres = [...new Set(data.map(a => a.genre).filter(Boolean))];
      updateCount();
      renderFilterChips();
      renderAnime();
    });
}

function updateCount() {
  document.getElementById("anime-count").textContent = animeList.length;
  document.getElementById("vault-count").textCojntent =
    `Your Vault — ${animeList.length} title${animeList.length !== 1 ? "s" : ""}`;
}

function getStatusClass(status) {
  if (status === "Completed") return "status-completed";
  if (status === "Watching") return "status-watching";
  if (status === "Plan to Watch") return "status-plan";
  if (status === "On Hold") return "status-hold";
  if (status === "Dropped") return "status-dropped";
  return "";
}

function renderAnime() {
  const container = document.getElementById("anime-list");
  const filtered = currentFilter === "all"
    ? animeList
    : animeList.filter(a => a.status === currentFilter || a.genre === currentFilter);

  if (filtered.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">No anime found.</p>`;
    return;
  }

  container.innerHTML = filtered.map(anime => `
    <div class="anime-card" data-id="${anime.id}">
      ${anime.image_url ? `
        <div class="card-image">
          <img src="${anime.image_url}" alt="${anime.title}">
        </div>` : ""}
      <div class="card-body">
        <div class="card-genre">${anime.genre || "—"}</div>
        <div class="card-title">${anime.title}</div>
        <span class="card-status ${getStatusClass(anime.status)}">${anime.status || "—"}</span>
        ${anime.episodes ? `<div class="card-episodes">📺 ${anime.episodes} episodes</div>` : ""}
        ${anime.studio ? `<div class="card-studio">🎬 ${anime.studio}</div>` : ""}
        ${anime.year ? `<div class="card-year">📅 ${anime.year}</div>` : ""}
        ${anime.mal_score ? `<div class="card-mal-score">⭐ MAL: ${anime.mal_score}</div>` : ""}
        <div class="card-stars">${renderStars(anime.rating)}</div>
        ${anime.synopsis ? `
          <div class="card-synopsis">${anime.synopsis.length > 120
            ? anime.synopsis.substring(0, 120) + "..."
            : anime.synopsis}
          </div>` : ""}
        <div class="card-actions">
          <button class="btn-edit" onclick="editAnime(${anime.id})">Edit</button>
          <button class="btn-delete" onclick="deleteAnime(${anime.id})">✕</button>
        </div>
      </div>
    </div>
  `).join("");
}

// ── FILTER CHIPS ──
function renderFilterChips() {
  const container = document.getElementById("filter-chips");
  const uniqueGenres = [...new Set(animeList.map(a => a.genre).filter(Boolean))];

  container.innerHTML = `<span class="filter-chip ${currentFilter === "all" ? "active" : ""}" data-genre="all">All</span>`;
  uniqueGenres.forEach(genre => {
    container.innerHTML += `<span class="filter-chip ${currentFilter === genre ? "active" : ""}" data-genre="${genre}">${genre}</span>`;
  });

  container.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      currentFilter = chip.dataset.genre;
      renderFilterChips();
      renderAnime();
    });
  });
}

// ── RANDOMIZER ──
document.getElementById("random-button").addEventListener("click", () => {
  if (animeList.length === 0) return;
  const pick = animeList[Math.floor(Math.random() * animeList.length)];

  document.getElementById("featured-title").textContent = pick.title;
  document.getElementById("featured-meta").textContent =
    `${pick.genre || "—"}  ·  ${pick.status || "—"}`;
  document.getElementById("featured-stars").textContent = renderStars(pick.rating);
  document.getElementById("featured-section").style.display = "block";
});

// ── ADD ANIME ──
document.getElementById("add-button").addEventListener("click", () => {
  const title = document.getElementById("title-input").value.trim();
  const genre = document.getElementById("genre-input").value.trim();
  const status = document.getElementById("status-input").value;
  const rating = currentRating;

  if (!title) { alert("Please enter a title!"); return; }

  // merge Jikan data with user input
  const payload = {
    title,
    genre,
    status,
    rating,
    image_url: selectedAnime?.image_url || "",
    episodes: selectedAnime?.episodes || null,
    mal_score: selectedAnime?.mal_score || null,
    synopsis: selectedAnime?.synopsis || "",
    studio: selectedAnime?.studio || "",
    year: selectedAnime?.year || null,
    mal_id: selectedAnime?.mal_id || null
  };

  fetch("/anime", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(() => {
    document.getElementById("title-input").value = "";
    document.getElementById("genre-input").value = "";
    document.getElementById("status-input").value = "Plan to Watch";
    currentRating = 0;
    selectedAnime = null;
    updateStars();
    fetchAnime();
  });
});

// ── DELETE ──
function deleteAnime(id) {
  fetch(`/anime/${id}`, { method: "DELETE" })
    .then(res => res.json())
    .then(() => fetchAnime());
}

// ── EDIT ──
function editAnime(id) {
  const anime = animeList.find(a => a.id === id);
  if (!anime) return;

  const card = document.querySelector(`[data-id="${id}"]`);
  card.innerHTML = `
    <div class="form-group">
      <label>Title</label>
      <input type="text" id="edit-title-${id}" value="${anime.title}">
    </div>
    <div class="form-group">
      <label>Genre</label>
      <input type="text" id="edit-genre-${id}" value="${anime.genre || ""}">
    </div>
    <div class="form-group">
      <label>Status</label>
      <select id="edit-status-${id}">
        <option ${anime.status === "Plan to Watch" ? "selected" : ""}>Plan to Watch</option>
        <option ${anime.status === "Watching" ? "selected" : ""}>Watching</option>
        <option ${anime.status === "Completed" ? "selected" : ""}>Completed</option>
        <option ${anime.status === "On Hold" ? "selected" : ""}>On Hold</option>
        <option ${anime.status === "Dropped" ? "selected" : ""}>Dropped</option>
      </select>
    </div>
    <div class="card-actions" style="margin-top:12px;">
      <button class="btn-edit" onclick="saveAnime(${id})">Save</button>
      <button class="btn-delete" onclick="fetchAnime()">✕</button>
    </div>
  `;
}

function saveAnime(id) {
  const title = document.getElementById(`edit-title-${id}`).value.trim();
  const genre = document.getElementById(`edit-genre-${id}`).value.trim();
  const status = document.getElementById(`edit-status-${id}`).value;

  fetch(`/anime/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, genre, status, rating: 0 })
  })
  .then(res => res.json())
  .then(() => fetchAnime());
}

// ── INIT ──
fetchAnime();