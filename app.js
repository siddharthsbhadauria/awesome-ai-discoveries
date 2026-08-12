// ==========================================================================
// Awesome AI Discoveries - Frontend Engine (Theme & Interactive Features)
// ==========================================================================

let appState = {
  discoveries: [],
  filtered: [],
  selectedCategory: 'ALL',
  searchQuery: '',
  sortBy: 'date-desc',
  viewMode: 'grid',
  activeModalItem: null
};

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initApp();
});

// --- Theme Engine ---
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const initialTheme = savedTheme || (prefersLight ? 'light' : 'dark');

  document.documentElement.setAttribute('data-theme', initialTheme);

  const themeToggleBtn = document.getElementById('themeToggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      showToast(newTheme === 'dark' ? '🌙 Dark Mode Activated' : '☀️ Light Mode Activated');
    });
  }
}

// --- Main App Initialization ---
async function initApp() {
  setupEventListeners();

  try {
    const response = await fetch('data/discoveries.json');
    if (!response.ok) throw new Error('Failed to load JSON dataset');
    const data = await response.json();

    appState.discoveries = data.discoveries || [];
    renderStats(data.stats, data.generated_at);
    renderFeatured(data.featured);
    renderCategoryPills(data.stats.categories_count || {});
    applyFiltersAndSort();
  } catch (err) {
    console.warn('Could not fetch data/discoveries.json, error:', err);
    document.getElementById('cardsContainer').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Dataset Loading Error</h3>
        <p>Could not load discoveries.json. Please ensure generate_data.py has executed.</p>
      </div>
    `;
  }
}

function renderStats(stats, generatedAt) {
  if (!stats) return;
  document.getElementById('statDiscoveries').textContent = stats.total_discoveries || 0;
  document.getElementById('statStars').textContent = stats.total_stars_formatted || '0';
  document.getElementById('statCategories').textContent = Object.keys(stats.categories_count || {}).length || 0;

  if (generatedAt) {
    const dateObj = new Date(generatedAt);
    document.getElementById('lastUpdatedTag').textContent = `Last updated: ${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}

function renderFeatured(featured) {
  if (!featured) return;
  document.getElementById('featuredTitle').textContent = featured.name;
  document.getElementById('featuredDesc').textContent = featured.description || 'No description available.';
  document.getElementById('featuredStars').textContent = `⭐ ${featured.stars_formatted}`;
  
  const linkEl = document.getElementById('featuredLink');
  linkEl.href = featured.url;
}

function renderCategoryPills(categoriesCount) {
  const container = document.getElementById('categoriesContainer');
  container.querySelectorAll('.cat-pill:not([data-category="ALL"])').forEach(el => el.remove());

  const categories = Object.keys(categoriesCount).sort();

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-pill';
    btn.dataset.category = cat;
    btn.textContent = `${cat} (${categoriesCount[cat]})`;
    btn.addEventListener('click', () => {
      container.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.selectedCategory = cat;
      applyFiltersAndSort();
    });
    container.appendChild(btn);
  });
}

function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');
  const sortSelect = document.getElementById('sortSelect');
  const viewGridBtn = document.getElementById('viewGridBtn');
  const viewTableBtn = document.getElementById('viewTableBtn');
  const allCatBtn = document.querySelector('.cat-pill[data-category="ALL"]');

  // Search input handler
  searchInput.addEventListener('input', (e) => {
    appState.searchQuery = e.target.value.toLowerCase().trim();
    clearBtn.classList.toggle('show', appState.searchQuery.length > 0);
    applyFiltersAndSort();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    appState.searchQuery = '';
    clearBtn.classList.remove('show');
    applyFiltersAndSort();
  });

  // All categories click
  allCatBtn.addEventListener('click', () => {
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    allCatBtn.classList.add('active');
    appState.selectedCategory = 'ALL';
    applyFiltersAndSort();
  });

  // Sort select handler
  sortSelect.addEventListener('change', (e) => {
    appState.sortBy = e.target.value;
    applyFiltersAndSort();
  });

  // View mode toggle
  viewGridBtn.addEventListener('click', () => {
    appState.viewMode = 'grid';
    viewGridBtn.classList.add('active');
    viewTableBtn.classList.remove('active');
    renderViews();
  });

  viewTableBtn.addEventListener('click', () => {
    appState.viewMode = 'table';
    viewTableBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
    renderViews();
  });

  // Modal Close Listeners
  const modal = document.getElementById('detailModal');
  const closeModalBtn = document.getElementById('closeModal');
  
  closeModalBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Copy Action Buttons
  document.getElementById('copyMarkdownBtn').addEventListener('click', () => {
    const code = document.getElementById('modalMarkdown').textContent;
    copyToClipboard(code, 'Copied Markdown entry to clipboard!');
  });

  document.getElementById('copyCloneBtn').addEventListener('click', () => {
    const code = document.getElementById('modalClone').textContent;
    copyToClipboard(code, 'Copied git clone command to clipboard!');
  });
}

function applyFiltersAndSort() {
  let list = [...appState.discoveries];

  // 1. Category Filter
  if (appState.selectedCategory !== 'ALL') {
    list = list.filter(item => item.category === appState.selectedCategory);
  }

  // 2. Search Query Filter
  if (appState.searchQuery) {
    const q = appState.searchQuery;
    list = list.filter(item => 
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.language.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }

  // 3. Sorting
  switch (appState.sortBy) {
    case 'date-desc':
      list.sort((a, b) => new Date(b.date) - new Date(a.date) || b.stars - a.stars);
      break;
    case 'date-asc':
      list.sort((a, b) => new Date(a.date) - new Date(b.date) || a.stars - b.stars);
      break;
    case 'stars-desc':
      list.sort((a, b) => b.stars - a.stars);
      break;
    case 'stars-asc':
      list.sort((a, b) => a.stars - b.stars);
      break;
  }

  appState.filtered = list;
  document.getElementById('resultsCount').textContent = `Showing ${list.length} of ${appState.discoveries.length} discoveries`;

  renderViews();
}

function renderViews() {
  const cardsContainer = document.getElementById('cardsContainer');
  const tableContainer = document.getElementById('tableContainer');
  const noResults = document.getElementById('noResults');

  if (appState.filtered.length === 0) {
    cardsContainer.classList.add('hidden');
    tableContainer.classList.add('hidden');
    noResults.classList.remove('hidden');
    return;
  }

  noResults.classList.add('hidden');

  if (appState.viewMode === 'grid') {
    tableContainer.classList.add('hidden');
    cardsContainer.classList.remove('hidden');
    renderGrid(appState.filtered);
  } else {
    cardsContainer.classList.add('hidden');
    tableContainer.classList.remove('hidden');
    renderTable(appState.filtered);
  }
}

function renderGrid(items) {
  const container = document.getElementById('cardsContainer');
  container.innerHTML = items.map((item, idx) => `
    <div class="card" onclick="openModalByIdx(${idx})">
      <div>
        <div class="card-header">
          <a href="${item.url}" target="_blank" rel="noopener" class="card-title" onclick="event.stopPropagation()">${item.name}</a>
          <span class="card-stars">⭐ ${item.stars_formatted}</span>
        </div>
        <div class="card-tags">
          <span class="tag-lang">${item.language}</span>
          <span class="tag-cat">${item.category}</span>
        </div>
        <p class="card-desc">${escapeHtml(item.description)}</p>
      </div>
      <div class="card-footer">
        <span class="card-date">Discovered: ${item.date}</span>
        <div class="card-actions">
          <button class="btn-card-action" onclick="event.stopPropagation(); openModalByIdx(${idx})">Details &rarr;</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderTable(items) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = items.map((item, idx) => `
    <tr style="cursor: pointer;" onclick="openModalByIdx(${idx})">
      <td style="font-family: var(--font-mono); font-size: 12px; color: var(--text-dim);">${item.date}</td>
      <td><a href="${item.url}" target="_blank" rel="noopener" style="color: var(--text-main); font-weight: 700; text-decoration: none;" onclick="event.stopPropagation()">${item.name}</a></td>
      <td><span class="tag-lang">${item.language}</span></td>
      <td><span class="tag-cat">${item.category}</span></td>
      <td style="color: var(--text-muted); max-width: 380px;">${escapeHtml(item.description)}</td>
      <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-amber);">⭐ ${item.stars_formatted}</td>
      <td><button class="btn-card-action" onclick="event.stopPropagation(); openModalByIdx(${idx})">Details</button></td>
    </tr>
  `).join('');
}

// Modal Functions
function openModalByIdx(idx) {
  const item = appState.filtered[idx];
  if (!item) return;
  appState.activeModalItem = item;

  document.getElementById('modalTitle').textContent = item.name;
  document.getElementById('modalDesc').textContent = item.description || 'No description provided.';
  document.getElementById('modalCategory').textContent = item.category;
  document.getElementById('modalLanguage').textContent = item.language;
  document.getElementById('modalStars').textContent = `⭐ ${item.stars_formatted}`;
  document.getElementById('modalGithubLink').href = item.url;

  const markdownRow = `| ${item.date} | [${item.name}](${item.url}) | ${item.language} | ${item.category} | ${item.description} | ⭐ ${item.stars_formatted} |`;
  document.getElementById('modalMarkdown').textContent = markdownRow;
  document.getElementById('modalClone').textContent = `git clone ${item.url}.git`;

  document.getElementById('detailModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('detailModal').classList.add('hidden');
  appState.activeModalItem = null;
}

// Clipboard & Toast Helper
function copyToClipboard(text, message) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(message);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMessage') || toast;
  toastMsg.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.add('hidden');
    toast.classList.remove('show');
  }, 2500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
