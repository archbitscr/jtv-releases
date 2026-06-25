import { state } from '../state/appState.js';

export const eventIconsList = [
    { name: '⚽', color: '#ffffff', label: 'Soccer' },
    { name: '🏀', color: '#f97316', label: 'Baloncesto / NBA' },
    { name: '🏈', color: '#b45309', label: 'American Football / NFL' },
    { name: '⚾', color: '#f8fafc', label: 'Baseball / MLB' },
    { name: '🎾', color: '#bef264', label: 'Tenis' },
    { name: '🏐', color: '#f1f5f9', label: 'Voleibol' },
    { name: '🏉', color: '#d97706', label: 'Rugby' },
    { name: '🏓', color: '#ef4444', label: 'Ping Pong' },
    { name: '🏸', color: '#38bdf8', label: 'Badminton' },
    { name: '🏒', color: '#64748b', label: 'Hockey sobre Hielo' },
    { name: '🏑', color: '#15803d', label: 'Field Hockey' },
    { name: '🏏', color: '#b45309', label: 'Cricket' },
    { name: '🎳', color: '#ec4899', label: 'Bowling' },
    { name: '🎱', color: '#020617', label: 'Billar / Pool' },
    { name: '🎮', color: '#6366f1', label: 'Videojuegos' },
    { name: '🕹️', color: '#f43f5e', label: 'Arcade / Retro' },
    { name: '🏎️', color: '#ef4444', label: 'Formula 1' },
    { name: '🏍️', color: '#eab308', label: 'Motociclismo / MotoGP' },
    { name: '🚲', color: '#06b6d4', label: 'Ciclismo' },
    { name: '🏇', color: '#b45309', label: 'Horse Racing / Equestrian' },
    { name: '🥊', color: '#ef4444', label: 'Boxeo' },
    { name: '🥋', color: '#f8fafc', label: 'Artes Marciales / Judo' },
    { name: '🏋️', color: '#64748b', label: 'Fuerza / Halterofilia' },
    { name: '🤸', color: '#ec4899', label: 'Gimnasia' },
    { name: '🏊', color: '#0ea5e9', label: 'Swimming' },
    { name: '🤽', color: '#3b82f6', label: 'Water Polo' },
    { name: '🏄', color: '#06b6d4', label: 'Surf' },
    { name: '🏂', color: '#10b981', label: 'Snowboarding' },
    { name: '⛷️', color: '#0ea5e9', label: 'Skiing' },
    { name: '🧗', color: '#f97316', label: 'Escalada' },
    { name: '🛹', color: '#64748b', label: 'Skateboarding' },
    { name: '🛶', color: '#f97316', label: 'Canotaje' },
    { name: '⛵', color: '#38bdf8', label: 'Sailing' },
    { name: '🚣', color: '#0ea5e9', label: 'Remo' },
    { name: '🎯', color: '#ef4444', label: 'Tiro al Blanco / Dardos' },
    { name: '🏹', color: '#f97316', label: 'Tiro con Arco' },
    { name: '⛳', color: '#22c55e', label: 'Golf' },
    { name: '🤺', color: '#cbd5e1', label: 'Esgrima' },
    { name: '🤼', color: '#a855f7', label: 'Lucha Libre' },
    { name: '⛸️', color: '#38bdf8', label: 'Patinaje sobre Hielo' },
    { name: '🛼', color: '#ec4899', label: 'Patinaje sobre Ruedas' },
    { name: '🎣', color: '#0284c7', label: 'Pesca' },
    { name: '🏃', color: '#10b981', label: 'Atletismo / Running' },
    { name: '🚶', color: '#64748b', label: 'Senderismo' },
    { name: '🏆', color: '#eab308', label: 'Trofeo / Copa' },
    { name: '🥇', color: '#eab308', label: 'Medalla de Oro' },
    { name: '🥈', color: '#94a3b8', label: 'Medalla de Plata' },
    { name: '🥉', color: '#b45309', label: 'Medalla de Bronce' },
    { name: '🎖️', color: '#ef4444', label: 'Medalla Militar' },
    { name: '🎗️', color: '#f59e0b', label: 'Lazo' },
    { name: '🏵️', color: '#eab308', label: 'Roseta' },
    { name: '🎟️', color: '#ec4899', label: 'Entradas' },
    { name: '🎫', color: '#eab308', label: 'Ticket / Boleto' },
    { name: '🏁', color: '#ffffff', label: 'Bandera de Meta / F1' },
    { name: '🚩', color: '#ef4444', label: 'Bandera Roja' },
    { name: '🎌', color: '#f43f5e', label: 'Banderas Cruzadas' },
    { name: '🏳️', color: '#ffffff', label: 'Bandera Blanca' },
    { name: '🏴', color: '#475569', label: 'Bandera Negra' },
    { name: '🎭', color: '#a855f7', label: 'Teatro / Ópera' },
    { name: '🎨', color: '#ec4899', label: 'Arte / Pintura' },
    { name: '🎬', color: '#1e293b', label: 'Cine / Rodaje' },
    { name: '🎞️', color: '#475569', label: 'Movie' },
    { name: '🎤', color: '#06b6d4', label: 'Microphone / Shows' },
    { name: '🎧', color: '#6366f1', label: 'DJ / Listening' },
    { name: '🎵', color: '#ec4899', label: 'Nota Musical' },
    { name: '🎶', color: '#14b8a6', label: 'Melody / Concert' },
    { name: '🎸', color: '#ef4444', label: 'Guitarra / Rock' },
    { name: '🎹', color: '#475569', label: 'Piano' },
    { name: '🎻', color: '#b45309', label: 'Violin' },
    { name: '🎷', color: '#f59e0b', label: 'Saxophone' },
    { name: '🥁', color: '#f43f5e', label: 'Drums' },
    { name: '📻', color: '#d97706', label: 'Radio' },
    { name: '📺', color: '#10b981', label: 'Television' },
    { name: '📸', color: '#06b6d4', label: 'Camera' },
    { name: '🎉', color: '#f59e0b', label: 'Party / New Year' },
    { name: '🎊', color: '#ec4899', label: 'Celebration' },
    { name: '🎈', color: '#ef4444', label: 'Globo' },
    { name: '🎂', color: '#f472b6', label: 'Pastel' },
    { name: '🥂', color: '#eab308', label: 'Brindis / Gala' },
    { name: '🍻', color: '#f59e0b', label: 'Cervezas' },
    { name: '🍷', color: '#ef4444', label: 'Vinos' },
    { name: '🍕', color: '#f97316', label: 'Pizza' },
    { name: '🍿', color: '#eab308', label: 'Popcorn / Cine' },
    { name: '🍔', color: '#b45309', label: 'Hamburguesas' },
    { name: '🌭', color: '#f97316', label: 'Hot Dogs' },
    { name: '🎪', color: '#ef4444', label: 'Circo' },
    { name: '🎆', color: '#a855f7', label: 'Fuegos Artificiales' },
    { name: '🎇', color: '#f59e0b', label: 'Fuegos / Chispas' },
    { name: '✨', color: '#eab308', label: 'Chispas / Magia' },
    { name: '🌟', color: '#eab308', label: 'Estrella Brillante' },
    { name: '💫', color: '#f59e0b', label: 'Destello' },
    { name: '🔥', color: '#ef4444', label: 'Fuego / Tendencia' },
    { name: '☄️', color: '#38bdf8', label: 'Cometa / Especial' },
    { name: '❤️', color: '#ef4444', label: 'Red Heart' },
    { name: '🖤', color: '#475569', label: 'Black Heart' },
    { name: '💬', color: '#3b82f6', label: 'Charla' },
    { name: '📢', color: '#06b6d4', label: 'Anuncio' },
    { name: '📣', color: '#f59e0b', label: 'Announcer / Megaphone' },
    { name: '🔔', color: '#eab308', label: 'Campana' },
    { name: '📅', color: '#3b82f6', label: 'Calendario' },
    { name: '🛡️', color: '#64748b', label: 'Escudo' },
    { name: '⚔️', color: '#cbd5e1', label: 'Espadas Cruzadas' },
    { name: '🗡️', color: '#475569', label: 'Daga' },
    { name: '💪', color: '#f59e0b', label: 'Strength / Biceps' },
    { name: '✊', color: '#f59e0b', label: 'Raised Fist' },
    { name: '👊', color: '#f59e0b', label: 'Fist' },
    { name: '🤜', color: '#f59e0b', label: 'Right Fist' },
    { name: '🤛', color: '#f59e0b', label: 'Left Fist' },
    { name: '👍', color: '#3b82f6', label: 'Like' },
    { name: '🤝', color: '#10b981', label: 'Acuerdo' },
    { name: '🍀', color: '#22c55e', label: 'Clover / Luck' },
    { name: '🧘', color: '#a855f7', label: 'Yoga' }
];

export function mapIconToEmoji(iconOrName) {
    if (!iconOrName) return '🏁';
    const norm = iconOrName.toLowerCase().trim();
    if (norm === 'car' || norm === 'rally') return '🏎️';
    if (norm === 'bike' || norm === 'motogp') return '🏍️';
    if (norm === 'flag' || norm === 'formula 1' || norm === 'carreras') return '🏁';
    if (norm === 'trophy' || norm === 'mundial' || norm === 'copa') return '🏆';
    if (norm === 'target' || norm === 'mlb' || norm === 'nba' || norm === 'baloncesto') return '🏀';
    if (norm === 'swords' || norm === 'ufc' || norm === 'combate') return '🤼';
    if (norm === 'radio' || norm === 'boxeo') return '🥊';
    if (norm === 'flame' || norm === 'fuego') return '🔥';
    if (norm === 'medal' || norm === 'medalla') return '🥇';
    if (norm === 'dumbbell' || norm === 'gimnasio') return '🏋️';
    if (norm === 'activity' || norm === 'deportes') return '🏃';
    if (norm === 'zap' || norm === 'rápido') return '⚡';
    if (norm === 'star' || norm === 'estrella') return '⭐';
    if (norm === 'heart' || norm === 'corazón') return '❤️';
    if (norm === 'shield' || norm === 'defensa') return '🛡️';
    
    // Check if it's already an emoji (contains non-ASCII or is short length)
    const isEmoji = /[^\x00-\x7F]/.test(iconOrName) || iconOrName.length <= 2;
    if (isEmoji) return iconOrName;
    
    // Check matching against some known sport names
    if (norm.includes('fútbol') || norm.includes('futbol') || norm.includes('soccer')) return '⚽';
    if (norm.includes('basquet') || norm.includes('baloncesto') || norm.includes('nba')) return '🏀';
    if (norm.includes('football') || norm.includes('nfl')) return '🏈';
    if (norm.includes('tenis') || norm.includes('tennis')) return '🎾';
    if (norm.includes('boxeo') || norm.includes('boxing') || norm.includes('box')) return '🥊';
    if (norm.includes('carreras') || norm.includes('formula') || norm.includes('f1')) return '🏁';
    if (norm.includes('concierto') || norm.includes('musica') || norm.includes('música')) return '🎤';
    if (norm.includes('premio') || norm.includes('award') || norm.includes('oscar')) return '🏆';
    if (norm.includes('teatro') || norm.includes('drama') || norm.includes('obra')) return '🎭';

    return '🏁';
}

export function getGenreIcon(name) {
    const norm = name.toLowerCase().trim();
    if (norm.includes("movie") || norm.includes("película") || norm.includes("cine")) return "film";
    if (norm.includes("sport") || norm.includes("deporte") || norm.includes("futbol") || norm.includes("soccer") || norm.includes("sports")) return "trophy";
    if (norm.includes("news") || norm.includes("noticias")) return "newspaper";
    if (norm.includes("kid") || norm.includes("niño") || norm.includes("infantil") || norm.includes("smile")) return "smile";
    if (norm.includes("music") || norm.includes("música")) return "music";
    if (norm.includes("action") || norm.includes("acción")) return "zap";
    if (norm.includes("comedy") || norm.includes("comedia")) return "laugh";
    if (norm.includes("horror") || norm.includes("terror") || norm.includes("miedo")) return "ghost";
    if (norm.includes("drama")) return "heart";
    if (norm.includes("documentary") || norm.includes("documental")) return "camera";
    if (norm.includes("regional") || norm.includes("local") || norm.includes("world")) return "globe";
    return "tag";
}

export function getVodGenresForType(type) {
    if (type === "movies") return state.moviesGenres;
    if (type === "series") return state.seriesGenres;
    return state.seriesGenres;
}

export function getActiveVodGenres() {
    return getVodGenresForType(state.activeDashTab === "movies" ? "movies" : "series");
}

export function getSettingsFilterList() {
    if (state.activeSettingsFilterTab === "tv") return state.filterList;
    if (state.activeSettingsFilterTab === "series") return state.seriesGenres;
    if (state.activeSettingsFilterTab === "movies") return state.moviesGenres;
    return state.filterList;
}
