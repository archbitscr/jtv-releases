import { state } from '../state/appState.js';

export const eventIconsList = [
    { name: '⚽', color: '#ffffff', label: 'Soccer' },
    { name: '🏀', color: '#f97316', label: 'Basketball / NBA' },
    { name: '🏈', color: '#b45309', label: 'American Football / NFL' },
    { name: '⚾', color: '#f8fafc', label: 'Baseball / MLB' },
    { name: '🎾', color: '#bef264', label: 'Tennis' },
    { name: '🏐', color: '#f1f5f9', label: 'Volleyball' },
    { name: '🏉', color: '#d97706', label: 'Rugby' },
    { name: '🏓', color: '#ef4444', label: 'Ping Pong' },
    { name: '🏸', color: '#38bdf8', label: 'Badminton' },
    { name: '🏒', color: '#64748b', label: 'Ice Hockey' },
    { name: '🏑', color: '#15803d', label: 'Field Hockey' },
    { name: '🏏', color: '#b45309', label: 'Cricket' },
    { name: '🎳', color: '#ec4899', label: 'Bowling' },
    { name: '🎱', color: '#020617', label: 'Billiards / Pool' },
    { name: '🎮', color: '#6366f1', label: 'Video Games' },
    { name: '🕹️', color: '#f43f5e', label: 'Arcade / Retro' },
    { name: '🏎️', color: '#ef4444', label: 'Formula 1' },
    { name: '🏍️', color: '#eab308', label: 'Motorcycle / MotoGP' },
    { name: '🚲', color: '#06b6d4', label: 'Cycling' },
    { name: '🏇', color: '#b45309', label: 'Horse Racing / Equestrian' },
    { name: '🥊', color: '#ef4444', label: 'Boxing' },
    { name: '🥋', color: '#f8fafc', label: 'Martial Arts / Judo' },
    { name: '🏋️', color: '#64748b', label: 'Weightlifting' },
    { name: '🤸', color: '#ec4899', label: 'Gymnastics' },
    { name: '🏊', color: '#0ea5e9', label: 'Swimming' },
    { name: '🤽', color: '#3b82f6', label: 'Water Polo' },
    { name: '🏄', color: '#06b6d4', label: 'Surf' },
    { name: '🏂', color: '#10b981', label: 'Snowboarding' },
    { name: '⛷️', color: '#0ea5e9', label: 'Skiing' },
    { name: '🧗', color: '#f97316', label: 'Climbing' },
    { name: '🛹', color: '#64748b', label: 'Skateboarding' },
    { name: '🛶', color: '#f97316', label: 'Canoeing' },
    { name: '⛵', color: '#38bdf8', label: 'Sailing' },
    { name: '🚣', color: '#0ea5e9', label: 'Rowing' },
    { name: '🎯', color: '#ef4444', label: 'Target Shooting / Darts' },
    { name: '🏹', color: '#f97316', label: 'Archery' },
    { name: '⛳', color: '#22c55e', label: 'Golf' },
    { name: '🤺', color: '#cbd5e1', label: 'Fencing' },
    { name: '🤼', color: '#a855f7', label: 'Wrestling' },
    { name: '⛸️', color: '#38bdf8', label: 'Ice Skating' },
    { name: '🎿', color: '#ec4899', label: 'Roller Skating' },
    { name: '🎣', color: '#0284c7', label: 'Fishing' },
    { name: '🏃', color: '#10b981', label: 'Athletics / Running' },
    { name: '🚶', color: '#64748b', label: 'Hiking' },
    { name: '🏆', color: '#eab308', label: 'Trophy / Cup' },
    { name: '🥇', color: '#eab308', label: 'Gold Medal' },
    { name: '🥈', color: '#94a3b8', label: 'Silver Medal' },
    { name: '🥉', color: '#b45309', label: 'Bronze Medal' },
    { name: '🎖️', color: '#ef4444', label: 'Military Medal' },
    { name: '🎗️', color: '#f59e0b', label: 'Ribbon' },
    { name: '🏵️', color: '#eab308', label: 'Rosette' },
    { name: '🎟️', color: '#ec4899', label: 'Tickets' },
    { name: '🎫', color: '#eab308', label: 'Ticket' },
    { name: '🏁', color: '#ffffff', label: 'Checkered Flag / F1' },
    { name: '🚩', color: '#ef4444', label: 'Red Flag' },
    { name: '🎌', color: '#f43f5e', label: 'Crossed Flags' },
    { name: '🏳️', color: '#ffffff', label: 'White Flag' },
    { name: '🏴', color: '#475569', label: 'Black Flag' },
    { name: '🎭', color: '#a855f7', label: 'Theater / Opera' },
    { name: '🎨', color: '#ec4899', label: 'Art / Painting' },
    { name: '🎬', color: '#1e293b', label: 'Cinema / Filming' },
    { name: '🎞️', color: '#475569', label: 'Movie' },
    { name: '🎤', color: '#06b6d4', label: 'Microphone / Shows' },
    { name: '🎧', color: '#6366f1', label: 'DJ / Listening' },
    { name: '🎵', color: '#ec4899', label: 'Musical Note' },
    { name: '🎶', color: '#14b8a6', label: 'Melody / Concert' },
    { name: '🎸', color: '#ef4444', label: 'Guitar / Rock' },
    { name: '🎹', color: '#475569', label: 'Piano' },
    { name: '🎻', color: '#b45309', label: 'Violin' },
    { name: '🎷', color: '#f59e0b', label: 'Saxophone' },
    { name: '🥁', color: '#f43f5e', label: 'Drums' },
    { name: '📻', color: '#d97706', label: 'Radio' },
    { name: '📺', color: '#10b981', label: 'Television' },
    { name: '📸', color: '#06b6d4', label: 'Camera' },
    { name: '🎉', color: '#f59e0b', label: 'Party / New Year' },
    { name: '🎊', color: '#ec4899', label: 'Celebration' },
    { name: '🎈', color: '#ef4444', label: 'Balloon' },
    { name: '🎂', color: '#f472b6', label: 'Cake' },
    { name: '🥂', color: '#eab308', label: 'Toast / Gala' },
    { name: '🍻', color: '#f59e0b', label: 'Beer' },
    { name: '🍷', color: '#ef4444', label: 'Wine' },
    { name: '🍕', color: '#f97316', label: 'Pizza' },
    { name: '🍿', color: '#eab308', label: 'Popcorn / Cinema' },
    { name: '🍔', color: '#b45309', label: 'Burgers' },
    { name: '🌭', color: '#f97316', label: 'Hot Dogs' },
    { name: '🎪', color: '#ef4444', label: 'Circus' },
    { name: '🎆', color: '#a855f7', label: 'Fireworks' },
    { name: '🎇', color: '#f59e0b', label: 'Sparklers' },
    { name: '✨', color: '#eab308', label: 'Sparkles / Magic' },
    { name: '🌟', color: '#eab308', label: 'Bright Star' },
    { name: '💫', color: '#f59e0b', label: 'Gleam' },
    { name: '🔥', color: '#ef4444', label: 'Fire / Trending' },
    { name: '☄️', color: '#38bdf8', label: 'Comet / Special' },
    { name: '❤️', color: '#ef4444', label: 'Red Heart' },
    { name: '🖤', color: '#475569', label: 'Black Heart' },
    { name: '💬', color: '#3b82f6', label: 'Chat' },
    { name: '📢', color: '#06b6d4', label: 'Announcement' },
    { name: '📣', color: '#f59e0b', label: 'Announcer / Megaphone' },
    { name: '🔔', color: '#eab308', label: 'Bell' },
    { name: '📅', color: '#3b82f6', label: 'Calendar' },
    { name: '🛡️', color: '#64748b', label: 'Shield' },
    { name: '⚔️', color: '#cbd5e1', label: 'Crossed Swords' },
    { name: '🗡️', color: '#475569', label: 'Dagger' },
    { name: '💪', color: '#f59e0b', label: 'Strength / Biceps' },
    { name: '✊', color: '#f59e0b', label: 'Raised Fist' },
    { name: '👊', color: '#f59e0b', label: 'Fist' },
    { name: '🤜', color: '#f59e0b', label: 'Right Fist' },
    { name: '🤛', color: '#f59e0b', label: 'Left Fist' },
    { name: '👍', color: '#3b82f6', label: 'Like' },
    { name: '🤝', color: '#10b981', label: 'Agreement' },
    { name: '🍀', color: '#22c55e', label: 'Clover / Luck' },
    { name: '🧘', color: '#a855f7', label: 'Yoga' },
    { name: '📰', color: '#64748b', label: 'News' },
    { name: '😂', color: '#eab308', label: 'Comedy' },
    { name: '🧸', color: '#f59e0b', label: 'Kids / Toys' },
    { name: '👥', color: '#6366f1', label: 'Reality / People' },
    { name: '🎥', color: '#475569', label: 'Documentary / Film' },
    { name: '🍴', color: '#f97316', label: 'Food / Dining' },
    { name: '🌍', color: '#10b981', label: 'Travel / World' },
    { name: '🔍', color: '#3b82f6', label: 'Investigation / Search' },
    { name: '🌐', color: '#06b6d4', label: 'Regional / Global' },
    { name: '🔞', color: '#ef4444', label: 'Adult Content' }
];

const customEmojiIcons = {
    '🎾': './assets/images/tennis.svg',
};

export function emojiToHtml(emoji) {
    const src = customEmojiIcons[emoji];
    if (src) {
        return `<img src="${src}" alt="${emoji}" class="custom-emoji-img">`;
    }
    return emoji;
}

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
    if (norm === 'zap' || norm === 'fast') return '⚡';
    if (norm === 'star' || norm === 'star-icon') return '⭐';
    if (norm === 'heart' || norm === 'heart') return '❤️';
    if (norm === 'shield' || norm === 'defense') return '🛡️';
    
    // Check if it's already an emoji (contains non-ASCII or is short length)
    const isEmoji = /[^\x00-\x7F]/.test(iconOrName) || iconOrName.length <= 2;
    if (isEmoji) return iconOrName;
    
    // Check matching against some known sport names
    if (norm.includes('football') || norm.includes('soccer')) return '⚽';
    if (norm.includes('basquet') || norm.includes('baloncesto') || norm.includes('nba')) return '🏀';
    if (norm.includes('football') || norm.includes('nfl')) return '🏈';
    if (norm.includes('tenis') || norm.includes('tennis')) return '🎾';
    if (norm.includes('boxeo') || norm.includes('boxing') || norm.includes('box')) return '🥊';
    if (norm.includes('carreras') || norm.includes('formula') || norm.includes('f1')) return '🏁';
    if (norm.includes('concert') || norm.includes('music')) return '🎤';
    if (norm.includes('premio') || norm.includes('award') || norm.includes('oscar')) return '🏆';
    if (norm.includes('theater') || norm.includes('drama') || norm.includes('play')) return '🎭';

    return '🏁';
}

export function getGenreIcon(name) {
    const norm = name.toLowerCase().trim();
    if (norm.includes("movie") || norm.includes("film") || norm.includes("cinema")) return "film";
    if (norm.includes("sport") || norm.includes("sport") || norm.includes("soccer") || norm.includes("sports")) return "trophy";
    if (norm.includes("news") || norm.includes("noticias")) return "newspaper";
    if (norm.includes("kid") || norm.includes("child") || norm.includes("children") || norm.includes("smile")) return "smile";
    if (norm.includes("music") || norm.includes("musical")) return "music";
    if (norm.includes("action") || norm.includes("action-genre")) return "zap";
    if (norm.includes("comedy") || norm.includes("comedia")) return "laugh";
    if (norm.includes("horror") || norm.includes("terror") || norm.includes("miedo")) return "ghost";
    if (norm.includes("drama")) return "heart";
    if (norm.includes("documentary") || norm.includes("documental")) return "camera";
    if (norm.includes("regional") || norm.includes("local") || norm.includes("world")) return "globe";
    return "tag";
}

export function getSettingsFilterList() {
    return state.filterList;
}
