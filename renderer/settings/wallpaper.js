import { state } from '../state/appState.js';

export function normalizeWallpaperPath(wall) {
    if (!wall || wall === 'none') return wall;
    if (wall.startsWith('assets/')) return wall;
    if (wall.startsWith('build/')) {
        const file = wall.slice('build/'.length);
        return `assets/wallpapers/${file}`;
    }
    if (!wall.includes('/')) {
        return `assets/wallpapers/${wall}`;
    }
    return wall;
}

export function applyWallpaper(wall) {
    const appWall = document.getElementById('app-wallpaper');
    if (!appWall) return;
    
    if (wall === 'none') {
        const token = ++state.wallpaperRequestToken;
        appWall.style.transition = 'opacity 0s';
        appWall.classList.remove('visible');
        requestAnimationFrame(() => {
            if (token === state.wallpaperRequestToken) {
                appWall.style.transition = '';
            }
        });
        
        // Sync active class in Settings wallpaper picker
        document.querySelectorAll('.wallpaper-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.wall === 'none');
        });
        return;
    }
    
    wall = normalizeWallpaperPath(wall || "assets/wallpapers/Planet.jpg");
    state.selectedWallpaper = wall;
    if (window.jtvAPI) {
        window.jtvAPI.logRenderer(`applyWallpaper called with wall: "${wall}"`);
    }
    
    const token = ++state.wallpaperRequestToken;
    appWall.style.transition = '';
    const img = new Image();
    img.onload = () => {
        if (token !== state.wallpaperRequestToken) return;
        appWall.style.backgroundImage = `url('${wall}')`;
        appWall.classList.add('visible');
    };
    img.onerror = () => {
        if (token !== state.wallpaperRequestToken) return;
        if (window.jtvAPI) {
            window.jtvAPI.logRenderer(`Wallpaper failed to load: ${wall}. Fallback to Planet.jpg`);
        }
        if (wall !== 'assets/wallpapers/Planet.jpg') {
            applyWallpaper('assets/wallpapers/Planet.jpg');
        } else {
            appWall.style.opacity = '0';
        }
    };
    img.src = wall;
    
    // Sync active class in Settings wallpaper picker
    document.querySelectorAll('.wallpaper-option').forEach(opt => {
        if (opt.dataset.wall === wall) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}
