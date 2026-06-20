import path from 'path';
import { fileURLToPath } from 'url';
import { registerAppBootstrap } from './main/bootstrap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

registerAppBootstrap({ appRootDir: __dirname });

