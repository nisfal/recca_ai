import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');
const FILE = path.join(DATA_DIR, 'subscribers.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([]), 'utf-8');
}

export function loadSubscribers() {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE, 'utf-8');
    const arr = JSON.parse(raw);
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function saveSubscribers(set) {
  ensureFile();
  const arr = Array.from(set);
  fs.writeFileSync(FILE, JSON.stringify(arr, null, 2), 'utf-8');
}
