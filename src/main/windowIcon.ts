import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getAppIconPath(): string {
    return process.platform === 'win32'
        ? path.join(__dirname, '../../build/icon.ico')
        : path.join(__dirname, '../../build/icon.png');
}
