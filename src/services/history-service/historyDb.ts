import { openDB, IDBPDatabase } from 'idb';
import { AppSettings, HistoryRecord, NamedMatrix } from '@/src/types/math';

const DB_NAME = 'matrixlab-db';
const DB_VERSION = 1;
const MAX_HISTORY_ITEMS = 150;

interface MatrixLabSchema {
  history: {
    key: string;
    value: HistoryRecord;
    indexes: { 'by-timestamp': number };
  };
  matrices: {
    key: string;
    value: NamedMatrix;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

let dbPromise: Promise<IDBPDatabase<MatrixLabSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<MatrixLabSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<MatrixLabSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('history')) {
          const histStore = db.createObjectStore('history', { keyPath: 'id' });
          histStore.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('matrices')) {
          db.createObjectStore('matrices', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

export async function listHistoryRecords(): Promise<HistoryRecord[]> {
  try {
    const db = await getDb();
    const all = await db.getAllFromIndex('history', 'by-timestamp');
    return all.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export async function saveHistoryRecord(record: HistoryRecord): Promise<void> {
  const db = await getDb();
  await db.put('history', record);

  // Enforce bounded storage
  const all = await db.getAllFromIndex('history', 'by-timestamp');
  if (all.length > MAX_HISTORY_ITEMS) {
    const sortedAsc = all.sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = sortedAsc.slice(0, all.length - MAX_HISTORY_ITEMS);
    const tx = db.transaction('history', 'readwrite');
    for (const item of toDelete) {
      await tx.store.delete(item.id);
    }
    await tx.done;
  }
}

export async function renameHistoryRecord(id: string, customName: string): Promise<void> {
  const db = await getDb();
  const item = await db.get('history', id);
  if (item) {
    item.customName = customName.trim() || undefined;
    await db.put('history', item);
  }
}

export async function deleteHistoryRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('history', id);
}

export async function clearAllHistoryRecords(): Promise<void> {
  const db = await getDb();
  await db.clear('history');
}

export async function loadSavedMatrices(): Promise<NamedMatrix[]> {
  try {
    const db = await getDb();
    const items = await db.getAll('matrices');
    return items.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function saveNamedMatrix(matrix: NamedMatrix): Promise<void> {
  const db = await getDb();
  await db.put('matrices', matrix);
}

export async function deleteNamedMatrix(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('matrices', id);
}

export async function loadAppSettings(): Promise<AppSettings | null> {
  try {
    const db = await getDb();
    const res = await db.get('settings', 'user-settings');
    return res ?? null;
  } catch {
    return null;
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  try {
    const db = await getDb();
    await db.put('settings', settings, 'user-settings');
  } catch {
    // Ignore storage error in restricted environments
  }
}
