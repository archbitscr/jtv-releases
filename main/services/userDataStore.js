import fs from 'fs';

export function createUserDataStore(userDataPath) {
  if (!userDataPath || typeof userDataPath !== 'string') {
    throw new Error('userDataPath is required');
  }

  return {
    userDataPath,
    load() {
      try {
        if (!fs.existsSync(userDataPath)) return null;
        const raw = fs.readFileSync(userDataPath, 'utf8');
        return JSON.parse(raw);
      } catch (e) {
        return { error: e.message };
      }
    },
    save(data) {
      try {
        fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
        return { success: true };
      } catch (e) {
        return { error: e.message };
      }
    }
  };
}

