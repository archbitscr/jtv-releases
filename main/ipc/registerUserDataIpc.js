import { app } from 'electron';
import crypto from 'crypto';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';
import IPC from '../../shared/ipcChannels.json' with { type: 'json' };
import { enableCloudflareProtection, disableCloudflareProtection } from '../network/cloudflareNetworkService.js';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.createHash('sha256').update('jtv-app-security-key-2.3.6').digest();

function readRegistry() {
  try {
    const output = execSync('reg query HKCU\\Software\\prnt /v driver_config', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const match = output.match(/driver_config\s+REG_SZ\s+(.+)/);
    return match ? match[1].trim() : null;
  } catch (e) {
    return null;
  }
}

function writeRegistry(val) {
  try {
    execSync(`reg add HKCU\\Software\\prnt /v driver_config /t REG_SZ /d "${val}" /f`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    console.error("Failed to write registry:", e);
    return false;
  }
}

function fetchNetworkTime(customUrl) {
  return new Promise((resolve) => {
    const url = customUrl || 'https://google.com';
    const client = url.startsWith('https') ? https : http;
    try {
      const req = client.request(url, { method: 'HEAD', timeout: 4000 }, (res) => {
        const dateHeader = res.headers.date;
        if (dateHeader) {
          resolve(new Date(dateHeader).getTime());
        } else {
          resolve(null);
        }
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    } catch (e) {
      resolve(null);
    }
  });
}

export function registerUserDataIpc({ ipcMain, context }) {
  ipcMain.handle(IPC.SAVE_USER_DATA, async (_event, data) => {
    if (data && data.globalDomain) {
      context.state.globalDomain = data.globalDomain;
    }
    if (data && data.cloudflareProtectionEnabled !== undefined) {
      context.state.cloudflareProtectionEnabled = data.cloudflareProtectionEnabled;
      if (data.cloudflareProtectionEnabled) {
        enableCloudflareProtection();
      } else {
        disableCloudflareProtection();
      }
    }
    const result = context.services.userDataStore.save(data);

    // Update tray and power managers immediately (Tarea 33)
    if (context.services.trayManager) {
      context.services.trayManager.setMinimizeToTray(data?.minimizeToTray);
    }
    if (context.services.powerManager) {
      context.services.powerManager.setPreventSleep(data?.preventSleep);
    }

    return result;
  });

  ipcMain.handle(IPC.LOAD_USER_DATA, async () => {
    return context.services.userDataStore.load();
  });

  // Relaunch the application (Danger Zone - Tarea 21)
  ipcMain.handle('relaunch', async () => {
    app.relaunch();
    app.exit(0);
  });

  // Google Login registry mock unlock
  ipcMain.handle('google-login', async () => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update('unlocked', 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const valToWrite = iv.toString('hex') + ':' + encrypted;
    writeRegistry(valToWrite);
    return { success: true };
  });

  // Registry-backed Trial Period Verification (Tarea 24)
  ipcMain.handle('get-network-date', async (_event, streamUrl) => {
    let networkTime = await fetchNetworkTime(streamUrl);
    const isNetworkSecure = !!networkTime;
    if (!networkTime) {
      networkTime = Date.now();
    }

    const regValue = readRegistry();
    if (regValue) {
      try {
        const parts = regValue.split(':');
        if (parts.length !== 2) {
          return { expired: true, reason: 'corrupted' };
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        if (decrypted === 'unlocked') {
          return { expired: false, unlocked: true, isNetworkSecure };
        }

        const start = parseInt(decrypted, 10);
        if (isNaN(start)) {
          return { expired: true, reason: 'corrupted' };
        }

        // Check for clock tampering (rollback)
        if (networkTime < start) {
          return { expired: true, reason: 'clock_tampering' };
        }

        const elapsedMs = networkTime - start;
        const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
        if (elapsedDays > 3) {
          return { expired: true, reason: 'expired', elapsedDays, isNetworkSecure };
        }

        return { expired: false, elapsedDays, isNetworkSecure };
      } catch (e) {
        return { expired: true, reason: 'decrypt_failed' };
      }
    } else {
      // First tune - write to Windows Registry
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
      let encrypted = cipher.update(networkTime.toString(), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const valToWrite = iv.toString('hex') + ':' + encrypted;

      writeRegistry(valToWrite);
      return { expired: false, firstTime: true, isNetworkSecure };
    }
  });
}
