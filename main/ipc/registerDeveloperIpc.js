import { app } from 'electron';
import IPC from '../../shared/ipcChannels.json' with { type: 'json' };

export function registerDeveloperIpc({ ipcMain, context }) {
  ipcMain.handle(IPC.GET_APP_FLAGS, () => {
    return {
      isPackaged: app.isPackaged,
      devModeAvailable: context.flags.devModeAvailable
    };
  });

  ipcMain.handle(IPC.GET_DEVELOPER_STATE, () => {
    return {
      devModeAvailable: context.flags.devModeAvailable,
      developerModeEnabled: context.state.developerModeEnabled,
      diagnosticsEnabled: context.state.diagnosticsEnabled,
      diagnosticsRunning: context.diagnosticsController?.isRunning?.() || false
    };
  });

  ipcMain.handle(IPC.SET_DEVELOPER_MODE, (_event, enabled) => {
    if (!context.flags.devModeAvailable) {
      return { error: 'Developer mode not available' };
    }

    context.state.developerModeEnabled = !!enabled;
    if (!context.state.developerModeEnabled) {
      context.state.diagnosticsEnabled = false;
      context.diagnosticsController?.stop?.();
    }

    return {
      developerModeEnabled: context.state.developerModeEnabled,
      diagnosticsEnabled: context.state.diagnosticsEnabled,
      diagnosticsRunning: context.diagnosticsController?.isRunning?.() || false
    };
  });

  ipcMain.handle(IPC.GET_DIAGNOSTICS_ENABLED, () => {
    return context.state.diagnosticsEnabled;
  });

  ipcMain.handle(IPC.SET_DIAGNOSTICS_ENABLED, (_event, enabled) => {
    if (!context.flags.devModeAvailable || !context.state.developerModeEnabled) {
      return { error: 'Developer mode disabled' };
    }

    context.state.diagnosticsEnabled = !!enabled;
    if (context.state.diagnosticsEnabled) {
      context.diagnosticsController?.start?.();
    } else {
      context.diagnosticsController?.stop?.();
    }

    return {
      diagnosticsEnabled: context.state.diagnosticsEnabled,
      diagnosticsRunning: context.diagnosticsController?.isRunning?.() || false
    };
  });

  ipcMain.handle(IPC.OPEN_DEVTOOLS, () => {
    console.log('[Main] Received request to open DevTools');
    if (!context.flags.devModeAvailable || !context.state.developerModeEnabled) {
      console.warn('[Main] DevTools request denied: developer mode not active or available');
      return { error: 'Developer mode disabled' };
    }
    const win = context.windowManager.getMainWindow();
    if (!win) {
      console.error('[Main] DevTools request denied: Main window is null');
      return { error: 'No window' };
    }
    try {
      console.log('[Main] Opening DevTools (mode: detach)...');
      win.webContents.openDevTools({ mode: 'detach' });
      return { success: true };
    } catch (e) {
      console.error('[Main] Failed to open DevTools:', e.message);
      return { error: e.message };
    }
  });

  ipcMain.handle(IPC.RELOAD_WINDOW, () => {
    console.log('[Main] Received request to reload window');
    if (!context.flags.devModeAvailable || !context.state.developerModeEnabled) {
      console.warn('[Main] Reload request denied: developer mode not active or available');
      return { error: 'Developer mode disabled' };
    }
    const win = context.windowManager.getMainWindow();
    if (!win) {
      console.error('[Main] Reload request denied: Main window is null');
      return { error: 'No window' };
    }
    try {
      console.log('[Main] Reloading window (ignoring cache)...');
      win.webContents.reloadIgnoringCache();
      return { success: true };
    } catch (e) {
      console.error('[Main] Failed to reload window:', e.message);
      return { error: e.message };
    }
  });

  ipcMain.handle('open-logo-scraper', async (_event, channelName) => {
    if (!context.flags.devModeAvailable || !context.state.developerModeEnabled) {
      return { error: 'Developer mode disabled' };
    }
    const { BrowserWindow } = await import('electron');
    const scraperWin = new BrowserWindow({
      width: 650,
      height: 700,
      title: `Logo Scraper - ${channelName}`,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const safeChannelName = (channelName || '').replace(/["']/g, '');

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Logo Scraper</title>
        <style>
            body { font-family: sans-serif; background: #0d0d12; color: #fff; padding: 20px; text-align: center; }
            input { padding: 12px; width: 80%; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-size: 16px; margin-bottom: 15px; outline: none; }
            input:focus { border-color: #00ffcc; }
            button { padding: 12px 24px; background: #00ffcc; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; color: #000; transition: transform 0.2s; }
            button:hover { transform: scale(1.02); }
            .results { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 25px; max-height: 450px; overflow-y: auto; padding: 10px; border-radius: 8px; background: rgba(0,0,0,0.2); }
            .logo-item { border: 1px solid rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 120px; }
            .logo-item:hover { transform: scale(1.04); border-color: #00ffcc; background: rgba(0,255,204,0.05); }
            .logo-item img { max-width: 90px; max-height: 90px; object-fit: contain; border-radius: 4px; }
            .logo-item div { font-size: 12px; margin-top: 8px; color: rgba(255,255,255,0.6); }
        </style>
    </head>
    <body>
        <h2>Search Logo for <span style="color: #00ffcc;">\${safeChannelName}</span></h2>
        <input type="text" id="search-input" value="\${safeChannelName} logo png">
        <br>
        <button id="search-btn">Search</button>
        <div id="status" style="margin-top: 15px; color: #a5b4fc; font-weight: 600;"></div>
        <div class="results" id="results-container"></div>

        <script>
            const { ipcRenderer } = require('electron');
            const searchBtn = document.getElementById('search-btn');
            const searchInput = document.getElementById('search-input');
            const resultsContainer = document.getElementById('results-container');
            const statusDiv = document.getElementById('status');

            async function searchLogos() {
                const query = searchInput.value;
                statusDiv.innerText = 'Searching...';
                resultsContainer.innerHTML = '';
                try {
                    const searchUrl = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);
                    const response = await fetch(searchUrl);
                    const text = await response.text();
                    
                    const urls = [];
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(text, 'text/html');
                    const links = doc.querySelectorAll('a');
                    
                    const cleanName = query.replace('logo', '').replace('png', '').trim();
                    if (cleanName) {
                        urls.push('https://logo.clearbit.com/' + cleanName.toLowerCase().replace(/\\s+/g, '') + '.com');
                        urls.push('https://autocomplete.clearbit.com/v1/companies/suggest?query=' + encodeURIComponent(cleanName));
                    }
                    
                    links.forEach(a => {
                        const href = a.getAttribute('href') || '';
                        if (href.includes('uddg=')) {
                            const parts = href.split('uddg=');
                            if (parts[1]) {
                                const actualUrl = decodeURIComponent(parts[1].split('&')[0]);
                                if (actualUrl.match(/\\\\.(png|jpg|jpeg|gif|ico|svg)/i)) {
                                    urls.push(actualUrl);
                                }
                            }
                        }
                    });

                    if (cleanName) {
                        urls.push('https://img.logo.dev/' + cleanName.toLowerCase().replace(/\\\\s+/g, '') + '.com?token=pk_test');
                    }

                    statusDiv.innerText = 'Results found. Click one to crop to 300x300 and inject:';
                    
                    const uniqueUrls = [...new Set(urls)].slice(0, 15);
                    let displayCount = 0;
                    
                    for (const url of uniqueUrls) {
                        if (typeof url === 'object' && url.domain) continue;
                        
                        const item = document.createElement('div');
                        item.className = 'logo-item';
                        const img = document.createElement('img');
                        img.src = typeof url === 'string' ? url : url.logo || '';
                        img.onerror = () => item.remove();
                        img.onload = () => {
                            const label = document.createElement('div');
                            label.innerText = 'Inject';
                            item.appendChild(label);
                            displayCount++;
                        };
                        item.appendChild(img);
                        item.onclick = () => selectLogo(img.src);
                        resultsContainer.appendChild(item);
                    }
                    if (displayCount === 0 && uniqueUrls.length === 0) {
                        statusDiv.innerText = 'No logos found.';
                    }
                } catch(e) {
                    statusDiv.innerText = 'Search error: ' + e.message;
                }
            }

            function selectLogo(url) {
                statusDiv.innerText = 'Processing and injecting image...';
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = url;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 300;
                    canvas.height = 300;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, 300, 300);
                    
                    const min = Math.min(img.width, img.height);
                    ctx.drawImage(img, (img.width - min)/2, (img.height - min)/2, min, min, 0, 0, 300, 300);
                    
                    try {
                        const dataUrl = canvas.toDataURL('image/png');
                        ipcRenderer.send('logo-scraped', dataUrl);
                        statusDiv.innerText = 'Logo injected successfully!';
                        setTimeout(() => window.close(), 600);
                    } catch(e) {
                        statusDiv.innerText = 'CORS error. Try another image.';
                    }
                };
                img.onerror = () => {
                    statusDiv.innerText = 'Error loading image. Try another one.';
                };
            }

            searchBtn.onclick = searchLogos;
            searchLogos();
        </script>
    </body>
    </html>
    `;
    scraperWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
  });

  ipcMain.on('logo-scraped', (event, dataUrl) => {
    const mainWin = context.windowManager.getMainWindow();
    if (mainWin) {
      mainWin.webContents.send('logo-scraper-result', dataUrl);
    }
  });
}
