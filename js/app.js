// js/app.js
(function() {
  // ------------------------------------------------------------------
  // LOAD APP DATA FROM apps.json, RENDER CARDS, LIVE SEARCH FILTER
  // NO FRAMEWORKS, PURE VANILLA JS
  // ------------------------------------------------------------------

  const appsGrid = document.getElementById('appsGrid');
  const searchInput = document.getElementById('searchInput');

  // In-memory storage for all apps
  let allApps = [];

  // Helper: create a card DOM element from app object
  function createAppCard(app) {
    const card = document.createElement('div');
    card.className = 'app-card';

    // icon path: images/ + icon filename
    const iconPath = `images/${app.icon}`;

    // APK download link: apks/ + apkFile
    const apkPath = `apks/${app.apkFile}`;

    // Card inner structure
    card.innerHTML = `
      <div class="card-header">
        <img src="${iconPath}" alt="${app.name}" class="app-icon" loading="lazy" onerror="this.src='images/placeholder.png'; this.alt='icon missing';">
        <h3 class="app-name">${escapeHTML(app.name)}</h3>
      </div>
      <p class="app-description">${escapeHTML(app.description)}</p>
      <div class="app-meta">
        <span class="meta-item">📦 ${escapeHTML(app.version)}</span>
        <span class="meta-item">💾 ${escapeHTML(app.size)}</span>
      </div>
      <a href="${apkPath}" class="download-btn" download="${app.apkFile}">
        ⬇️ Download APK
      </a>
    `;
    return card;
  }

  // super simple escape to avoid XSS from json (just in case)
  function escapeHTML(str) {
    return String(str).replace(/[&<>"]/g, function(match) {
      if (match === '&') return '&amp;';
      if (match === '<') return '&lt;';
      if (match === '>') return '&gt;';
      if (match === '"') return '&quot;';
      return match;
    });
  }

  // Render apps based on filter text
  function renderApps(filterText = '') {
    if (!appsGrid) return;

    // clear current grid, but keep the grid element
    appsGrid.innerHTML = '';

    const lowerFilter = filterText.trim().toLowerCase();

    const filteredApps = allApps.filter(app => {
      return app.name.toLowerCase().includes(lowerFilter) ||
             app.description.toLowerCase().includes(lowerFilter);
    });

    if (filteredApps.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'loading-message';
      noResults.textContent = filterText.trim() ? '✨ No matching apps found' : '📭 No apps available';
      appsGrid.appendChild(noResults);
      return;
    }

    // use document fragment for better performance
    const fragment = document.createDocumentFragment();
    filteredApps.forEach(app => {
      fragment.appendChild(createAppCard(app));
    });
    appsGrid.appendChild(fragment);
  }

  // fetch apps.json and initialize
  function loadApps() {
    // Show loading state
    if (appsGrid) {
      appsGrid.innerHTML = '<div class="loading-message">📲 Loading apps ...</div>';
    }

    fetch('data/apps.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - could not load apps.json`);
        }
        return response.json();
      })
      .then(appsData => {
        // validate: must be array
        if (!Array.isArray(appsData)) {
          console.warn('apps.json is not an array, using fallback demo data');
          allApps = getFallbackApps();
        } else {
          allApps = appsData;
        }
        // initial render (no filter)
        renderApps();

        // attach search listener if input exists
        if (searchInput) {
          // remove any previous listeners and add fresh
          searchInput.removeEventListener('input', searchHandler);
          searchInput.addEventListener('input', searchHandler);
        }
      })
      .catch(err => {
        console.error('Error loading apps.json:', err);
        // fallback to demo data so UI still works
        allApps = getFallbackApps();
        renderApps();
        if (searchInput) {
          searchInput.removeEventListener('input', searchHandler);
          searchInput.addEventListener('input', searchHandler);
        }
        // show small warning in console but site still runs
      });
  }

  // Search handler (debounced optional but simple)
  function searchHandler(e) {
    renderApps(e.target.value);
  }

  // Fallback demo data if json missing/malformed – ensures site shows something.
  function getFallbackApps() {
    return [
      {
        name: "MyApp",
        description: "Simple productivity app with offline mode",
        version: "1.0.0",
        size: "25MB",
        apkFile: "myapp-v1.apk",
        icon: "myapp.png"
      },
      {
        name: "Calculator Pro",
        description: "Scientific calculator with graphing and themes",
        version: "2.3.1",
        size: "18MB",
        apkFile: "calculator-pro.apk",
        icon: "calculator.png"
      },
      {
        name: "Notes App",
        description: "Minimalist notes with markdown and sync",
        version: "0.9.4",
        size: "12MB",
        apkFile: "notes-app.apk",
        icon: "notes.png"
      }
    ];
  }

  // start everything once DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadApps);
  } else {
    loadApps(); // DOM already loaded
  }

  // small hack: if fetch fails due to path (opening index.html without server)
  // we also have fallback inside catch. but we also try to detect local file protocol restrictions?
  // anyway fallback works.
})();