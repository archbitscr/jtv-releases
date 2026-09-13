import fs from 'fs';
import path from 'path';
import { webContents } from 'electron';

async function runAutomationScriptContent(rawContent, context) {
  const win = context.windowManager.getMainWindow();
  if (!win) {
    console.error("[Automation] MainWindow not found, cannot run script");
    return;
  }

  try {
    const script = JSON.parse(rawContent);
    console.log(`[Automation] Starting automation script with ${script.length} steps`);

    for (let i = 0; i < script.length; i++) {
      const cmd = script[i];
      console.log(`[Automation] Step ${i + 1}/${script.length}: ${JSON.stringify(cmd)}`);

      if (cmd.action === 'click') {
        const selector = cmd.selector;
        const rect = await win.webContents.executeJavaScript(`(() => {
          const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, visible: r.width > 0 && r.height > 0 };
        })()`);

        if (rect && rect.visible) {
          const x = Math.floor(rect.x);
          const y = Math.floor(rect.y);
          console.log(`[Automation] Clicking selector "${selector}" at (${x}, ${y})`);
          win.focus();
          win.webContents.sendInputEvent({ type: 'mouseMove', x, y });
          await new Promise(r => setTimeout(r, 150));
          win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
          await new Promise(r => setTimeout(r, 100));
          win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
        } else {
          console.warn(`[Automation] Selector "${selector}" not found or not visible`);
        }
      } 
      else if (cmd.action === 'clickCoords') {
        const { x, y } = cmd;
        console.log(`[Automation] Clicking coords (${x}, ${y})`);
        win.focus();
        win.webContents.sendInputEvent({ type: 'mouseMove', x, y });
        await new Promise(r => setTimeout(r, 150));
        win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
        await new Promise(r => setTimeout(r, 100));
        win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
      } 
      else if (cmd.action === 'hoverCoords') {
        const { x, y } = cmd;
        console.log(`[Automation] Hovering coords (${x}, ${y})`);
        win.focus();
        win.webContents.sendInputEvent({ type: 'mouseMove', x, y });
      }
      else if (cmd.action === 'screenshot') {
        const filename = cmd.filename || 'screenshot.png';
        const outPath = path.isAbsolute(filename) ? filename : path.join(context.__dirname, filename);
        console.log(`[Automation] Taking screenshot -> ${outPath}`);
        const nativeImage = await win.webContents.capturePage();
        const buffer = nativeImage.toPNG();
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, buffer);
        console.log(`[Automation] Saved screenshot to ${outPath}`);
      } 
      else if (cmd.action === 'wait') {
        const ms = cmd.ms || 1000;
        console.log(`[Automation] Waiting ${ms}ms`);
        await new Promise(r => setTimeout(r, ms));
      } 
      else if (cmd.action === 'key') {
        const keyCode = cmd.keyCode;
        console.log(`[Automation] Simulating key press: ${keyCode}`);
        win.focus();
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
        win.webContents.sendInputEvent({ type: 'char', keyCode });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
      } 
      else if (cmd.action === 'execute') {
        const js = cmd.js;
        console.log(`[Automation] Executing JS: ${js}`);
        if (js.includes('window.close()')) {
          console.log("[Automation] Writing success result before window closes");
          fs.writeFileSync(path.join(context.__dirname, 'automation-result.json'), JSON.stringify({ success: true, timestamp: Date.now() }));
        }
        await win.webContents.executeJavaScript(js);
      }

      if (cmd.delayAfter) {
        await new Promise(r => setTimeout(r, cmd.delayAfter));
      }
    }
    console.log("[Automation] Automation script completed successfully");
    fs.writeFileSync(path.join(context.__dirname, 'automation-result.json'), JSON.stringify({ success: true, timestamp: Date.now() }));
  } catch (err) {
    console.error("[Automation] Automation script error:", err);
    fs.writeFileSync(path.join(context.__dirname, 'automation-result.json'), JSON.stringify({ success: false, error: err.message, timestamp: Date.now() }));
  }
}

export function startDiagnosticsWatchers(context) {
  const intervals = [];
  let lastAudioActiveState = null;

  intervals.push(setInterval(() => {
    const win = context.windowManager.getMainWindow();
    if (!win) return;
    try {
      const hostAudible = !win.isDestroyed() && win.webContents.isCurrentlyAudible();
      const audioActive = hostAudible || webContents.getAllWebContents().some(wc => {
        try { return !wc.isDestroyed() && wc.isCurrentlyAudible(); } catch (e) { return false; }
      });
      if (audioActive !== lastAudioActiveState) {
        lastAudioActiveState = audioActive;
        console.log(`[AudioDetector] AUDIO STATUS DETECTED: ${audioActive ? '🔊 SOUND PLAYING (ACTIVE)' : '🔇 SILENCE (MUTED/STOPPED)'}`);
      }
    } catch (e) {}
  }, 1000));

  intervals.push(setInterval(() => {
    const triggerPath = path.join(context.__dirname, 'take-screenshot.tmp');
    if (!fs.existsSync(triggerPath)) return;
    try {
      const filename = path.basename(fs.readFileSync(triggerPath, 'utf8').trim() || 'screenshot.png');
      fs.unlinkSync(triggerPath);
      const win = context.windowManager.getMainWindow();
      if (!win) return;
      win.webContents.capturePage().then(nativeImage => {
        const buffer = nativeImage.toPNG();
        const outPath = path.join(context.__dirname, filename);
        fs.writeFileSync(outPath, buffer);
        console.log(`[Diagnostic] Saved triggered screenshot to ${outPath}`);
      }).catch(() => {});
    } catch (e) {
      console.error("Triggered screenshot error:", e);
    }
  }, 500));

  intervals.push(setInterval(() => {
    const triggerPath = path.join(context.__dirname, 'run-automation-script.tmp');
    if (!fs.existsSync(triggerPath)) return;
    try {
      const rawContent = fs.readFileSync(triggerPath, 'utf8');
      fs.unlinkSync(triggerPath);
      runAutomationScriptContent(rawContent, context);
    } catch (e) {
      console.error("Error reading run-automation-script.tmp trigger:", e);
    }
  }, 500));

  return () => {
    intervals.forEach(id => clearInterval(id));
  };
}
