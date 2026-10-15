import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const testDirectory = path.dirname(fileURLToPath(import.meta.url));

// All persistence is an in-memory fixture. These tests never contact cloud services.
export class MemoryDatabase {
  records = new Map();
  beforeTransaction;
  doc(key) {
    const ref = {
      path: key,
      collection: (name) => this.collection(`${key}/${name}`),
      get: async () => ({ exists: this.records.has(key), data: () => structuredClone(this.records.get(key)), ref }),
      create: async (value) => { assert.equal(this.records.has(key), false); this.records.set(key, structuredClone(value)); },
      set: async (value, options) => { this.records.set(key, { ...(options?.merge ? this.records.get(key) : {}), ...structuredClone(value) }); },
      async update(value) { await ref.set(value, { merge: true }); },
      delete: async () => { this.records.delete(key); },
    };
    return ref;
  }
  collection(prefix) {
    return {
      doc: (id) => this.doc(`${prefix}/${id}`),
      where: (field, operation, value) => {
        assert.equal(operation, '==');
        return { limit: () => ({ get: async () => {
          const found = [...this.records].find(([key, data]) => key.startsWith(`${prefix}/`) && data[field] === value);
          return { docs: found ? [await this.doc(found[0]).get()] : [] };
        } }) };
      },
    };
  }
  batch() {
    const pending = [];
    return { create(ref, value) { pending.push(() => ref.create(value)); }, async commit() { for (const write of pending) await write(); } };
  }
  async runTransaction(work) {
    const before = this.beforeTransaction;
    this.beforeTransaction = undefined;
    if (before) await before();
    const writes = [];
    const result = await work({
      get: async (ref) => { assert.equal(writes.length, 0, 'read state before scheduling writes'); return ref.get(); },
      set: (ref, value, options) => writes.push(() => ref.set(value, options)),
      update: (ref, value) => writes.push(() => ref.update(value)),
      delete: (ref) => writes.push(() => ref.delete()),
    });
    for (const write of writes) await write();
    return result;
  }
}

export function modules(db) {
  const cache = new Map();
  function load(relative) {
    const filename = path.join(testDirectory, '..', relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = new Module(filename);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    const ordinaryRequire = loaded.require.bind(loaded);
    loaded.require = (name) => {
      if (name === 'server-only') return {};
      if (name === '@/lib/firebase-admin') return { getDatabase: () => db };
      if (name === 'next/headers') return { cookies: async () => ({ set() {}, get() {}, delete() {} }) };
      if (name.startsWith('@/lib/')) return load(`src/lib/${name.slice('@/lib/'.length)}.ts`);
      return ordinaryRequire(name);
    };
    cache.set(filename, loaded);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    loaded._compile(compiled.outputText, filename);
    return loaded.exports;
  }
  return { load, documents: load('src/lib/documents.ts'), auth: load('src/lib/auth.ts'), images: load('src/lib/signature-image.ts') };
}
