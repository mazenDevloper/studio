/**
 * M3U files imported from the device («ملف m3u من جهازك»): kept in this browser (IndexedDB - a playlist can be
 * several MB, too big for localStorage), so the IPTV screen loads it again next time without asking.
 */
const DB = "dc-iptv-files", STORE = "files";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const q = fn(db.transaction(STORE, mode).objectStore(STORE));
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}
export const saveIptvFile = (id: string, text: string) => tx("readwrite", s => s.put(text, id));
export const readIptvFile = (id: string) => tx<string | undefined>("readonly", s => s.get(id) as IDBRequest<string | undefined>);

/** a file from the picker → its text (UTF-8, UTF-16 or gzipped .m3u.gz) */
export async function fileText(f: File): Promise<string> {
  let bytes = new Uint8Array(await f.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
  const enc = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le" : bytes[0] === 0xfe && bytes[1] === 0xff ? "utf-16be" : "utf-8";
  return new TextDecoder(enc).decode(bytes).replace(/^﻿/, "");
}
