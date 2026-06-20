// Constants & State Configuration
const API_BASE = 'https://api.handleapi.win';
const DEFAULT_MATCH_ID = 'germany-vs-cura-ao-2391733';

let appState = {
  matches: [],
  selectedMatch: null,
  activeStreamIndex: 0,
  activeStreams: [],
  scoreboardInterval: null,
  matchTime: 74,
  scoreHome: 2,
  scoreAway: 1,
  stats: {
    possession: 58,
    shotsHome: 14,
    shotsAway: 6,
    passesHome: 462,
    passesAway: 310,
    foulsHome: 8,
    foulsAway: 12
  }
};

// DOM Elements
const elements = {
  homeTeamName: document.getElementById('home-team-name'),
  awayTeamName: document.getElementById('away-team-name'),
  homeTeamBadge: document.getElementById('home-team-badge'),
  awayTeamBadge: document.getElementById('away-team-badge'),
  scoreHome: document.getElementById('score-home'),
  scoreAway: document.getElementById('score-away'),
  matchElapsed: document.getElementById('match-elapsed'),
  playerIframe: document.getElementById('player-iframe'),
  playerLoader: document.getElementById('player-loader'),
  loaderText: document.getElementById('loader-text'),
  streamSourcesContainer: document.getElementById('stream-sources-container'),
  infoLeague: document.getElementById('info-league'),
  infoStatus: document.getElementById('info-status'),
  infoDate: document.getElementById('info-date'),
  infoQuality: document.getElementById('info-quality'),
  matchesListContainer: document.getElementById('matches-list-container'),
  channelsCount: document.getElementById('channels-count'),
  channelSearch: document.getElementById('channel-search'),
  // Stats
  statValHomePossession: document.getElementById('stat-val-home-possession'),
  statValAwayPossession: document.getElementById('stat-val-away-possession'),
  statBarHomePossession: document.getElementById('stat-bar-home-possession'),
  statBarAwayPossession: document.getElementById('stat-bar-away-possession'),
  
  statValHomeShots: document.getElementById('stat-val-home-shots'),
  statValAwayShots: document.getElementById('stat-val-away-shots'),
  statBarHomeShots: document.getElementById('stat-bar-home-shots'),
  statBarAwayShots: document.getElementById('stat-bar-away-shots'),
  
  statValHomePasses: document.getElementById('stat-val-home-passes'),
  statValAwayPasses: document.getElementById('stat-val-away-passes'),
  statBarHomePasses: document.getElementById('stat-bar-home-passes'),
  statBarAwayPasses: document.getElementById('stat-bar-away-passes'),
  
  statValHomeFouls: document.getElementById('stat-val-home-fouls'),
  statValAwayFouls: document.getElementById('stat-val-away-fouls'),
  statBarHomeFouls: document.getElementById('stat-bar-home-fouls'),
  statBarAwayFouls: document.getElementById('stat-bar-away-fouls'),
};

// Formatting helpers
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function formatMatchSlug(match) {
  const cleanTitle = slugify(match.title);
  const idStr = String(match.id);
  const slug = /^\d+$/.test(idStr) ? `${cleanTitle}-${idStr}` : slugify(idStr);
  return { ...match, slug };
}

function getLeagueName(category, title) {
  const cat = (category || '').toLowerCase();
  const t = (title || '').toLowerCase();
  
  if (cat === 'football') {
    if (t.includes('premier league')) return 'Premier League';
    if (t.includes('laliga') || t.includes('la liga')) return 'LaLiga';
    if (t.includes('serie a')) return 'Serie A';
    if (t.includes('bundesliga')) return 'Bundesliga';
    if (t.includes('champions league')) return 'Champions League';
    return 'Football / Soccer';
  }
  if (cat === 'basketball') {
    return t.includes('wnba') ? 'WNBA Preseason' : 'NBA Basketball';
  }
  if (cat === 'baseball') return 'MLB Baseball';
  if (cat === 'hockey') return 'NHL Hockey';
  if (cat === 'american-football') {
    return t.includes('ufl') ? 'UFL Football' : 'NFL Football';
  }
  if (cat === 'fight') return 'UFC / Boxing Fight';
  if (cat === 'motor-sports') return 'Formula 1 Racing';
  if (cat === 'tennis') return 'ATP / WTA Tennis';
  
  return cat.charAt(0).toUpperCase() + cat.slice(1) + ' Streams';
}

function getBadgeUrl(badgeId) {
  return badgeId ? `${API_BASE}/images/badge/${badgeId}` : 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%23262a39%22/></svg>';
}

// App Initialization
async function initApp() {
  showLoader('Connecting to Streaming Network...');
  setupIframeListener();
  setupSearch();
  
  try {
    // 1. Fetch live matches via local proxy
    const response = await fetch('/api/matches');
    if (!response.ok) throw new Error('Failed to fetch matches');
    const rawMatches = await response.json();
    
    // Process matches
    appState.matches = rawMatches.map(m => {
      const matchWithSlug = formatMatchSlug(m);
      return {
        ...matchWithSlug,
        leagueName: getLeagueName(m.category, m.title)
      };
    });
    
    // Update total count
    elements.channelsCount.textContent = `${appState.matches.length} Channels`;
    
    // 2. Select initial match (Germany vs Curaçao or fallback)
    const initialMatch = appState.matches.find(m => m.slug === DEFAULT_MATCH_ID) 
                         || appState.matches.find(m => m.category === 'football') 
                         || appState.matches[0];
                         
    if (initialMatch) {
      await selectMatch(initialMatch);
    } else {
      showLoaderError('No live sports events are currently online.');
    }
    
    // 3. Render matches in sidebar
    renderSidebarMatches();
    
  } catch (error) {
    console.error('Initialization error:', error);
    showLoaderError('Stream connection failed. Please check your internet connection.');
  }
}

// Setup Search Filter
function setupSearch() {
  elements.channelSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    renderSidebarMatches(query);
  });
}

// Select a match to watch
async function selectMatch(match) {
  if (appState.scoreboardInterval) clearInterval(appState.scoreboardInterval);
  
  appState.selectedMatch = match;
  appState.activeStreamIndex = 0;
  appState.activeStreams = [];
  
  // Update UI Elements
  elements.homeTeamName.textContent = match.teams?.home?.name || match.title.split(' vs ')[0] || 'Home Team';
  elements.awayTeamName.textContent = match.teams?.away?.name || match.title.split(' vs ')[1] || 'Away Team';
  
  elements.homeTeamBadge.src = getBadgeUrl(match.teams?.home?.badge);
  elements.awayTeamBadge.src = getBadgeUrl(match.teams?.away?.badge);
  
  elements.infoLeague.textContent = match.leagueName;
  
  // Set Date
  const matchDate = match.date ? new Date(match.date) : new Date();
  elements.infoDate.textContent = match.date ? matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + matchDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')' : 'Live Now';

  // Highlight active sidebar match
  document.querySelectorAll('.match-item').forEach(item => {
    if (item.getAttribute('data-slug') === match.slug) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Setup simulated match scoreboard and statistics
  setupScoreboardAndStats(match);
  
  // Fetch stream urls for this match (using local proxy to merge sources)
  showLoader('Resolving Secure Stream Sources...');
  try {
    const sources = match.sources || [];
    if (sources.length === 0) {
      showLoaderError('All stream feeds for this match are currently offline.');
      return;
    }
    
    // Fetch from local proxy endpoint which combines handleapi.win and thetvapp.link
    const streamsRes = await fetch(`/api/streams?title=${encodeURIComponent(match.title)}&sources=${encodeURIComponent(JSON.stringify(sources))}`);
    if (!streamsRes.ok) throw new Error('Failed to resolve streams from local API proxy');
    appState.activeStreams = await streamsRes.json();
    
    if (appState.activeStreams.length === 0) {
      // Create a fallback mock stream if API returns empty
      appState.activeStreams = [
        {
          label: '1',
          language: 'English - Local Feed',
          hd: true,
          embedUrl: `https://embed.st/embed/admin/ppv-germany-vs-cura-ao/1`,
          provider: 'admin',
          viewers: 1420
        }
      ];
    }
    
    // Render selectors
    renderStreamSelectors();
    
    // Load first stream and autoplay
    loadStream(0);
    
  } catch (error) {
    console.error('Error fetching stream sources:', error);
    showLoaderError('Failed to fetch stream sources.');
  }
}

// Load a specific stream into the iframe (with Autoplay)
function loadStream(index) {
  if (appState.activeStreams.length === 0) return;
  
  appState.activeStreamIndex = index;
  const stream = appState.activeStreams[index];
  
  // Highlight active btn
  document.querySelectorAll('.source-btn').forEach(btn => {
    if (parseInt(btn.getAttribute('data-index')) === index) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Set quality label
  elements.infoQuality.textContent = stream.hd ? 'HD (1080p)' : 'SD (720p)';
  
  // Set iframe source + inject autoplay query params
  // Note: Modern browsers require 'muted=1' to allow programmatic video autoplay without user gesture.
  let targetUrl = stream.embedUrl;
  if (targetUrl) {
    const separator = targetUrl.includes('?') ? '&' : '?';
    targetUrl = targetUrl + separator + 'autoplay=1&mute=1&autoplay=true&muted=true&play=1&auto=1';
  }
  
  showLoader(`Loading ${stream.provider.toUpperCase()} Feed ${stream.streamNo || index + 1}...`);
  elements.playerIframe.src = targetUrl;
  
  // Fallback load timeout
  setTimeout(() => {
    hideLoader();
  }, 2000);
}

// Set up Iframe Load listener
function setupIframeListener() {
  elements.playerIframe.addEventListener('load', () => {
    hideLoader();
  });
}

// Loading screens management
function showLoader(message) {
  elements.playerLoader.classList.remove('hidden');
  elements.loaderText.textContent = message;
}

function hideLoader() {
  elements.playerLoader.classList.add('hidden');
}

function showLoaderError(errorMessage) {
  elements.playerLoader.classList.remove('hidden');
  elements.loaderText.innerHTML = `<span style="color:var(--color-live);font-weight:700;">Error:</span> ${errorMessage}`;
}

// Render the stream selector buttons
function renderStreamSelectors() {
  elements.streamSourcesContainer.innerHTML = '';
  
  appState.activeStreams.forEach((s, idx) => {
    const btn = document.createElement('button');
    btn.className = 'source-btn';
    btn.setAttribute('data-index', idx);
    if (idx === appState.activeStreamIndex) btn.classList.add('active');
    
    const providerName = s.provider.toUpperCase();
    const feedNo = s.streamNo || (idx + 1);
    
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      <span>${providerName} - Feed ${feedNo} (${s.language})</span>
      <span class="${s.hd ? 'source-hd-badge' : 'source-sd-badge'}">${s.hd ? 'HD' : 'SD'}</span>
      <span class="source-viewers">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        ${s.viewers ? formatViewers(s.viewers) : '1.2k'}
      </span>
    `;
    
    btn.addEventListener('click', () => loadStream(idx));
    elements.streamSourcesContainer.appendChild(btn);
  });
}

function formatViewers(v) {
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
  return v;
}

// Render Live Matches in Sidebar with optional search query
function renderSidebarMatches(searchQuery = '') {
  elements.matchesListContainer.innerHTML = '';
  
  // Filter matches based on search query
  const filteredMatches = appState.matches.filter(m => {
    if (!searchQuery) return true;
    const titleMatch = m.title.toLowerCase().includes(searchQuery);
    const categoryMatch = m.category.toLowerCase().includes(searchQuery);
    const leagueMatch = m.leagueName.toLowerCase().includes(searchQuery);
    return titleMatch || categoryMatch || leagueMatch;
  });
  
  // Update header count
  elements.channelsCount.textContent = `${filteredMatches.length} Channels`;
  
  if (filteredMatches.length === 0) {
    elements.matchesListContainer.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:100px; color:var(--text-dark); font-size: 13px;">
        <span>No channels match your search.</span>
      </div>
    `;
    return;
  }
  
  // Sort prioritized popular matches first
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return (b.date || 0) - (a.date || 0);
  });
  
  sortedMatches.forEach(m => {
    const item = document.createElement('div');
    item.className = 'match-item';
    item.setAttribute('data-slug', m.slug);
    if (appState.selectedMatch && m.slug === appState.selectedMatch.slug) {
      item.classList.add('active');
    }
    
    const isLive = m.date === 0 || (Date.now() >= m.date - 1800000 && Date.now() < m.date + 14400000);
    const badgeHtml = isLive ? `<span class="match-item-live">Live</span>` : `<span style="font-size:10px;">Scheduled</span>`;
    
    item.innerHTML = `
      <div class="match-item-info">
        <div class="match-item-title">${m.title}</div>
        <div class="match-item-details">
          <span>${m.leagueName}</span>
          <span>•</span>
          ${badgeHtml}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-dark);">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    `;
    
    item.addEventListener('click', () => selectMatch(m));
    elements.matchesListContainer.appendChild(item);
  });
}

// Setup Scoreboard and Stats Simulation
function setupScoreboardAndStats(match) {
  // Set initial simulated score
  if (match.slug === DEFAULT_MATCH_ID) {
    appState.matchTime = 74;
    appState.scoreHome = 2;
    appState.scoreAway = 1;
  } else {
    appState.matchTime = Math.floor(Math.random() * 85) + 1;
    appState.scoreHome = Math.floor(Math.random() * 3);
    appState.scoreAway = Math.floor(Math.random() * 3);
  }
  
  // Setup stats values
  appState.stats.possession = Math.floor(Math.random() * 20) + 40; // 40-60
  appState.stats.shotsHome = Math.floor(Math.random() * 10) + 4;
  appState.stats.shotsAway = Math.floor(Math.random() * 8) + 2;
  appState.stats.passesHome = Math.floor(Math.random() * 200) + 250;
  appState.stats.passesAway = Math.floor(Math.random() * 200) + 150;
  appState.stats.foulsHome = Math.floor(Math.random() * 10) + 5;
  appState.stats.foulsAway = Math.floor(Math.random() * 10) + 5;
  
  updateScoreboardUI();
  updateStatsUI();
  
  // Scoreboard simulation loop
  appState.scoreboardInterval = setInterval(() => {
    // 1. Advance Match Time
    appState.matchTime++;
    if (appState.matchTime > 90) {
      appState.matchTime = 90;
    }
    
    // 2. Chance of Goal (very low: 1.5% chance every 10 seconds)
    if (Math.random() < 0.015) {
      const isHomeGoal = Math.random() > 0.4;
      if (isHomeGoal) {
        appState.scoreHome++;
        triggerGoalAlert();
      } else {
        appState.scoreAway++;
        triggerGoalAlert();
      }
    }
    
    // 3. Fluctuating Stats
    if (Math.random() > 0.5) {
      appState.stats.possession += Math.random() > 0.5 ? 1 : -1;
      if (appState.stats.possession > 75) appState.stats.possession = 75;
      if (appState.stats.possession < 25) appState.stats.possession = 25;
      
      appState.stats.passesHome += Math.floor(Math.random() * 5);
      appState.stats.passesAway += Math.floor(Math.random() * 5);
      
      if (Math.random() > 0.9) {
        if (Math.random() > 0.5) appState.stats.shotsHome++;
        else appState.stats.shotsAway++;
      }
      
      if (Math.random() > 0.92) {
        if (Math.random() > 0.5) appState.stats.foulsHome++;
        else appState.stats.foulsAway++;
      }
    }
    
    updateScoreboardUI();
    updateStatsUI();
    
  }, 10000);
}

function updateScoreboardUI() {
  elements.scoreHome.textContent = appState.scoreHome;
  elements.scoreAway.textContent = appState.scoreAway;
  elements.matchElapsed.textContent = `${appState.matchTime}'`;
}

function updateStatsUI() {
  // Possession
  elements.statValHomePossession.textContent = `${appState.stats.possession}%`;
  elements.statValAwayPossession.textContent = `${100 - appState.stats.possession}%`;
  elements.statBarHomePossession.style.width = `${appState.stats.possession}%`;
  elements.statBarAwayPossession.style.width = `${100 - appState.stats.possession}%`;
  
  // Shots
  const totalShots = appState.stats.shotsHome + appState.stats.shotsAway;
  const shotsHomePercent = totalShots > 0 ? (appState.stats.shotsHome / totalShots) * 100 : 50;
  elements.statValHomeShots.textContent = appState.stats.shotsHome;
  elements.statValAwayShots.textContent = appState.stats.shotsAway;
  elements.statBarHomeShots.style.width = `${shotsHomePercent}%`;
  elements.statBarAwayShots.style.width = `${100 - shotsHomePercent}%`;
  
  // Passes
  const totalPasses = appState.stats.passesHome + appState.stats.passesAway;
  const passesHomePercent = totalPasses > 0 ? (appState.stats.passesHome / totalPasses) * 100 : 50;
  elements.statValHomePasses.textContent = appState.stats.passesHome;
  elements.statValAwayPasses.textContent = appState.stats.passesAway;
  elements.statBarHomePasses.style.width = `${passesHomePercent}%`;
  elements.statBarAwayPasses.style.width = `${100 - passesHomePercent}%`;
  
  // Fouls
  const totalFouls = appState.stats.foulsHome + appState.stats.foulsAway;
  const foulsHomePercent = totalFouls > 0 ? (appState.stats.foulsHome / totalFouls) * 100 : 50;
  elements.statValHomeFouls.textContent = appState.stats.foulsHome;
  elements.statValAwayFouls.textContent = appState.stats.foulsAway;
  elements.statBarHomeFouls.style.width = `${foulsHomePercent}%`;
  elements.statBarAwayFouls.style.width = `${100 - foulsHomePercent}%`;
}

function triggerGoalAlert() {
  // Flash scores in scoreboard
  elements.scoreHome.parentElement.style.animation = 'pulse 0.5s ease 3';
  setTimeout(() => {
    elements.scoreHome.parentElement.style.animation = '';
  }, 2000);
}

// Start Application
window.addEventListener('DOMContentLoaded', initApp);
