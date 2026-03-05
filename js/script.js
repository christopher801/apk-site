// ./assets/script.js — STRICT PATH, ALL FEATURES

(function() {
    // DOM elements
    const grid = document.getElementById('appGrid');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const loadingEl = document.getElementById('loadingSpinner');
    const errorEl = document.getElementById('errorMessage');
    const emptyEl = document.getElementById('emptyState');

    // State
    let originalApps = [];           // raw from json
    let filteredAndSortedApps = [];  // after search + sort
    let currentSearchTerm = '';
    let currentSort = 'name';        // default

    // ---------- fetch apps ----------
    async function loadApps() {
        showLoading(true);
        hideError();
        hideEmpty();
        try {
            // exact path ./data/apps.json
            const response = await fetch('./data/apps.json', {
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            // validate minimal array
            if (!Array.isArray(data)) throw new Error('Invalid format');
            originalApps = data;
            applyFilterAndSort();     // initial render
        } catch (err) {
            console.error('Fetch error:', err);
            showError();
            grid.innerHTML = '';       // clear any half rendered cards
        } finally {
            showLoading(false);
        }
    }

    // ---------- render cards based on filteredAndSortedApps ----------
    function renderApps() {
        const container = grid;
        container.innerHTML = '';  // clear

        if (!filteredAndSortedApps.length) {
            // if no results after filter, show empty state (but only if not loading/error)
            if (!loadingEl.classList.contains('show') && !errorEl.classList.contains('show')) {
                showEmpty();
            } else {
                hideEmpty();
            }
            return;
        }
        hideEmpty();

        // use fragment for perf
        const fragment = document.createDocumentFragment();
        filteredAndSortedApps.forEach(app => {
            const card = createAppCard(app);
            fragment.appendChild(card);
        });
        container.appendChild(fragment);
    }

    // ---------- create one card DOM (with lazy loading icon) ----------
    function createAppCard(app) {
        const card = document.createElement('article');
        card.className = 'app-card';

        // icon + name header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'card-header';

        const iconDiv = document.createElement('div');
        iconDiv.className = 'card-icon';

        // lazy loading image (modern loading='lazy')
        const iconImg = document.createElement('img');
        // important: path ./images/ + icon filename
        iconImg.src = `./images/${app.icon}`;
        iconImg.alt = app.name ? `${app.name} icon` : 'app icon';
        iconImg.loading = 'lazy';
        iconImg.onerror = () => {
            // fallback emoji if icon missing (never break layout)
            iconImg.style.display = 'none';
            const fallback = document.createElement('span');
            fallback.className = 'icon-fallback';
            fallback.textContent = '📦';
            fallback.style.fontSize = '2rem';
            iconDiv.appendChild(fallback);
        };
        iconDiv.appendChild(iconImg);

        const titleEl = document.createElement('h3');
        titleEl.className = 'card-title';
        titleEl.textContent = app.name || 'App';

        headerDiv.appendChild(iconDiv);
        headerDiv.appendChild(titleEl);

        // description
        const descEl = document.createElement('p');
        descEl.className = 'card-desc';
        descEl.textContent = app.description || 'No description';

        // badges row
        const badgeRow = document.createElement('div');
        badgeRow.className = 'badge-row';

        const versionBadge = document.createElement('span');
        versionBadge.className = 'badge version';
        versionBadge.innerHTML = `<i class="fa-solid fa-code-branch"></i> ${app.version || '1.0'}`;

        const sizeBadge = document.createElement('span');
        sizeBadge.className = 'badge size';
        sizeBadge.innerHTML = `<i class="fa-regular fa-hard-drive"></i> ${app.size || '—'}`;

        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'badge category';
        categoryBadge.innerHTML = `<i class="fa-regular fa-folder"></i> ${app.category || 'other'}`;

        const dateBadge = document.createElement('span');
        dateBadge.className = 'badge date';
        // format date nicely if exists
        let displayDate = app.updated || '2026-01-15';
        if (displayDate.length > 10) displayDate = displayDate.slice(0, 10);
        dateBadge.innerHTML = `<i class="fa-regular fa-calendar"></i> ${displayDate}`;

        badgeRow.append(versionBadge, sizeBadge, categoryBadge, dateBadge);

        // footer with download
        const footer = document.createElement('div');
        footer.className = 'card-footer';

        const downloadLink = document.createElement('a');
        downloadLink.href = `./apks/${app.apkFile}`;   // locked path
        downloadLink.className = 'download-btn';
        downloadLink.setAttribute('aria-label', `Download ${app.name} apk`);
        downloadLink.download = app.apkFile;            // hint download
        downloadLink.innerHTML = `<i class="fa-solid fa-download"></i> Download`;

        const updateSmall = document.createElement('span');
        updateSmall.className = 'update-note';
        updateSmall.innerHTML = `<i class="fa-regular fa-clock"></i> ${displayDate}`;

        footer.appendChild(downloadLink);
        footer.appendChild(updateSmall);

        card.appendChild(headerDiv);
        card.appendChild(descEl);
        card.appendChild(badgeRow);
        card.appendChild(footer);

        return card;
    }

    // ---------- filter (search) + sort combined ----------
    function applyFilterAndSort() {
        if (!originalApps.length) {
            filteredAndSortedApps = [];
            renderApps();
            return;
        }

        const term = currentSearchTerm.trim().toLowerCase();

        // filter by name, description, category
        let filtered = originalApps.filter(app => {
            if (term === '') return true;
            const nameMatch = app.name?.toLowerCase().includes(term) || false;
            const descMatch = app.description?.toLowerCase().includes(term) || false;
            const catMatch = app.category?.toLowerCase().includes(term) || false;
            return nameMatch || descMatch || catMatch;
        });

        // sorting
        const sortBy = currentSort;
        filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return (a.name || '').localeCompare(b.name || '');
            } else if (sortBy === 'size') {
                // extract numeric MB for reasonable sort
                const getSizeMB = (sizeStr) => {
                    if (!sizeStr) return 0;
                    const num = parseFloat(sizeStr.replace(/[^\d.]/g, ''));
                    return isNaN(num) ? 0 : num;
                };
                return getSizeMB(a.size) - getSizeMB(b.size);
            } else if (sortBy === 'updated') {
                // newest first: descending (latest date first)
                const dateA = a.updated ? new Date(a.updated).getTime() : 0;
                const dateB = b.updated ? new Date(b.updated).getTime() : 0;
                return dateB - dateA; // descending → newer first
            }
            return 0;
        });

        filteredAndSortedApps = filtered;
        renderApps();
    }

    // ---------- debounced search ----------
    let debounceTimer;
    function handleSearchInput(e) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentSearchTerm = e.target.value;
            applyFilterAndSort();
        }, 300);
    }

    function handleSortChange(e) {
        currentSort = e.target.value;
        applyFilterAndSort();
    }

    // ---------- UI helpers ----------
    function showLoading(show) {
        if (show) {
            loadingEl.classList.add('show');
            grid.style.opacity = '0.4';
        } else {
            loadingEl.classList.remove('show');
            grid.style.opacity = '1';
        }
    }
    function showError() {
        errorEl.classList.add('show');
        hideEmpty();
    }
    function hideError() {
        errorEl.classList.remove('show');
    }
    function showEmpty() {
        emptyEl.classList.add('show');
    }
    function hideEmpty() {
        emptyEl.classList.remove('show');
    }

    // ---------- event listeners ----------
    searchInput.addEventListener('input', handleSearchInput);
    sortSelect.addEventListener('change', handleSortChange);

    // initialize: load data
    loadApps();

    // (optional) extra: if fetch fails due to path, error shows
    // ensure no console errors beyond fetch.
})();