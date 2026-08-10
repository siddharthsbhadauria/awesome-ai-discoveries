// ==========================================================================
// Awesome AI Discoveries - Frontend Application Engine
// ==========================================================================

let appState = {
  discoveries: [],
  filtered: [],
  selectedCategory: 'ALL',
  searchQuery: '',
  sortBy: 'date-desc',
  viewMode: 'grid'
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

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
    console.warn('Could not fetch data/discoveries.json, attempting fallback parsing...', err);
    // Fallback UI if json file is unavailable
    document.getElementById('cardsContainer').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Dataset Loading Error</h3>
        <p>Could not load discoveries.json. Please make sure generate_data.py has executed.</p>
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
  // Clear existing extra pills
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
  container.innerHTML = items.map(item => `
    <div class="card">
      <div>
        <div class="card-header">
          <a href="${item.url}" target="_blank" rel="noopener" class="card-title">${item.name}</a>
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
        <a href="${item.url}" target="_blank" rel="noopener" class="card-link">GitHub →</a>
      </div>
    </div>
  `).join('');
}

function renderTable(items) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = items.map(item => `
    <tr>
      <td style="font-family: var(--font-mono); font-size: 13px; color: var(--text-dim);">${item.date}</td>
      <td><a href="${item.url}" target="_blank" rel="noopener" style="color: #fff; font-weight: 700; text-decoration: none;">${item.name}</a></td>
      <td><span class="tag-lang">${item.language}</span></td>
      <td><span class="tag-cat">${item.category}</span></td>
      <td style="color: var(--text-muted); max-width: 400px;">${escapeHtml(item.description)}</td>
      <td style="font-family: var(--font-mono); font-weight: 700; color: #fbbf24;">⭐ ${item.stars_formatted}</td>
    </tr>
  `).join('');
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
