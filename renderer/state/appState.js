export const state = {
    // App State / Lifecycle
    channels: [],
    scheduleData: [],
    activeChannelId: null,
    currentModule: "live",
    previousModule: "live",
    watchStartTime: null,
    currentlyWatchingId: null,
    lastTunedChannel: null,
    shouldRestoreTunedChannel: false,
    zapSourceTab: "favorites",
    hudPinned: false,
    hotkeyMap: {
        fullscreen: ['f'],
        toggleHUD: [' '],
        volumeUp: ['ArrowRight', '+'],
        volumeDown: ['ArrowLeft', '-'],
        toggleMute: ['m', '*'],
        prevChannel: ['ArrowUp'],
        nextChannel: ['ArrowDown'],
        prevSource: ['PageUp'],
        nextSource: ['PageDown'],
        escape: ['Escape']
    },

    // Settings & API Configuration
    globalDomain: "https://dlhd.pk/",
    apiKey: "",
    apiEndpoint: "",
    autoUpdateDomain: true,
    selectedWallpaper: "assets/wallpapers/Planet.jpg",
    isAppFullscreen: false,
    wallpaperRequestToken: 0,

    // Player State
    playerSource: "stream",
    currentVolumeLevel: 10,
    lastVolumeLevelBeforeMute: 10,
    streamNetworkActive: false,
    autoVolumeDone: false,
    monitorInterval: null,
    lastFramePixels: null,
    detectedSpeakerCoords: null,

    // Live Filters State
    filterLanguages: [
        { name: "English", icon: "globe", enabled: true },
        { name: "Español", icon: "globe", enabled: true },
        { name: "Français", icon: "globe", enabled: false },
        { name: "Português", icon: "globe", enabled: false },
        { name: "Arabic", icon: "globe", enabled: false },
        { name: "Italiano", icon: "globe", enabled: false },
        { name: "Deutsch", icon: "globe", enabled: false },
        { name: "Polish", icon: "globe", enabled: false },
        { name: "Turkish", icon: "globe", enabled: false },
        { name: "Greek", icon: "globe", enabled: false },
        { name: "Dutch", icon: "globe", enabled: false },
        { name: "Russian", icon: "globe", enabled: false },
        { name: "Serbian", icon: "globe", enabled: false },
        { name: "Croatian", icon: "globe", enabled: false },
        { name: "Bulgarian", icon: "globe", enabled: false },
        { name: "Hebrew", icon: "globe", enabled: false },
        { name: "Danish", icon: "globe", enabled: false },
        { name: "Swedish", icon: "globe", enabled: false },
        { name: "Romanian", icon: "globe", enabled: false },
        { name: "Czech", icon: "globe", enabled: false },
        { name: "Slovak", icon: "globe", enabled: false },
        { name: "Hungarian", icon: "globe", enabled: false }
    ],
    filterGenres: [
        { name: "Sports", icon: "🏆" },
        { name: "News", icon: "📰" },
        { name: "Movies", icon: "🎬" },
        { name: "Series", icon: "📺" },
        { name: "Comedy", icon: "😂" },
        { name: "Animation", icon: "🎨" },
        { name: "Kids", icon: "🧸" },
        { name: "Reality", icon: "👥" },
        { name: "Music", icon: "🎵" },
        { name: "Documentary", icon: "🎥" },
        { name: "Lifestyle", icon: "💫" },
        { name: "Food", icon: "🍴" },
        { name: "Travel", icon: "🌍" },
        { name: "Investigation", icon: "🔍" },
        { name: "Regional", icon: "🌐" },
        { name: "XXX Adult 18+", icon: "🔞" }
    ],
    filterEvents: [
        { name: "FIFA 2026", icon: "🏆" },
        { name: "Formula 1", icon: "🏎️" },
        { name: "UFC", icon: "🤼" },
        { name: "Boxing", icon: "🥊" },
        { name: "Motorsport", icon: "🏁" },
        { name: "Rally", icon: "🏁" },
        { name: "MotoGP", icon: "🏍️" },
        { name: "Futbol", icon: "⚽" },
        { name: "NBA", icon: "🏀" },
        { name: "NFL", icon: "🏈" },
        { name: "MLB", icon: "⚾" },
        { name: "Golf", icon: "⛳" },
        { name: "Tennis", icon: "🎾" },
        { name: "NHL", icon: "🏒" },
        { name: "Cycling", icon: "🚴" },
        { name: "Cricket", icon: "🏏" },
        { name: "Rugby", icon: "🏉" },
        { name: "Concerts", icon: "🎤" },
        { name: "Awards", icon: "🏆" },
        { name: "Festival", icon: "🎭" }
    ],
    filterList: [],
    dropdownsPopulated: false,
    selectedFilterIcon: "layout-grid",
    selectedEventFilterIcon: "flag",

    // Dashboard State
    searchTerm: "",
    activeCategory: "All",
    favActiveCategory: "All",
    favSearchTerm: "",
    guideSearchTerm: "",
    guideFilter: "all",
    dashboardCategory: "All",
    isHomeActive: true,
    favPage: 0,
    FAVS_PER_PAGE: (() => { const h = window.innerHeight; return h <= 500 ? 8 : h > 1200 ? 20 : 10; })(),

    // UI & Flags
    activeSettingsFilterTab: "tv",
    editingFilter: null,
    currentEditingChannelId: null,
    currentPinCallback: null,

    // i18n
    appLanguage: 'en',

    // Feature Flags
    audioLevelerEnabled: true,
    hwAccelEnabled: true,
    minimizeToTray: false,
    preventSleep: true,
    cloudflareProtectionEnabled: true,
    savedData: null,

    // Assigner / Event Assigner
    assignerSelectedChannelIndices: [],
    lastSelectedIdx: -1
};

// Getters and Setters for backwards compatibility and clean imports
export function getChannels() { return state.channels; }
export function setChannels(val) { state.channels = val; }

export function getGlobalDomain() { return state.globalDomain; }
export function setGlobalDomain(val) { state.globalDomain = val; }

export function getActiveSettingsFilterTab() { return state.activeSettingsFilterTab; }
export function setActiveSettingsFilterTab(val) { state.activeSettingsFilterTab = val; }
