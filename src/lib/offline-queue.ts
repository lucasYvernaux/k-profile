"use client";

import type { SyncItem } from "@/domain/sync";

/**
 * Device-side queue for daily inputs made offline. Items stay in
 * IndexedDB only until they are sent, and are wiped on sign-out.
 */
const DB_NAME = "k-offline";
const STORE = "queue";
const SYNC_URL = "/api/sync";

export type SendResult = "sent" | "queued" | "rejected" | "signed-out";

interface QueuedItem {
  id: string;
  item: SyncItem;
  queuedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

async function enqueue(item: SyncItem): Promise<void> {
  const queued: QueuedItem = { id: crypto.randomUUID(), item, queuedAt: Date.now() };
  await withStore("readwrite", (store) => store.put(queued));
}

async function postItems(items: SyncItem[]): Promise<Response> {
  return fetch(SYNC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ items }),
  });
}

/** Sends now when possible, otherwise keeps the item on the device. */
export async function sendOrQueue(item: SyncItem): Promise<SendResult> {
  if (!navigator.onLine) {
    await enqueue(item);
    return "queued";
  }
  try {
    const response = await postItems([item]);
    if (response.ok) {
      return "sent";
    }
    if (response.status === 401) {
      return "signed-out";
    }
    return response.status >= 500 ? (await enqueue(item), "queued") : "rejected";
  } catch {
    await enqueue(item);
    return "queued";
  }
}

export async function pendingCount(): Promise<number> {
  return withStore("readonly", (store) => store.count());
}

/** Replays queued items in order. Returns how many were sent. */
export async function flushQueue(): Promise<number> {
  const queued = (await withStore<QueuedItem[]>("readonly", (store) => store.getAll())).sort(
    (a, b) => a.queuedAt - b.queuedAt,
  );
  if (queued.length === 0) {
    return 0;
  }
  const response = await postItems(queued.map((entry) => entry.item));
  if (!response.ok) {
    if (response.status === 400) {
      // Invalid items will never succeed: drop them rather than retry forever.
      await withStore("readwrite", (store) => store.clear());
    }
    return 0;
  }
  await Promise.all(
    queued.map((entry) => withStore("readwrite", (store) => store.delete(entry.id))),
  );
  return queued.length;
}

/** Removes queued inputs and cached pages from this device. */
export async function clearOfflineData(): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("k-")).map((key) => caches.delete(key)));
  }
}
