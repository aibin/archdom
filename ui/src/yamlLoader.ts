import yaml from 'js-yaml'
import { MetaFile, YamlLayer } from './types'

export const yamlCache = new Map<string, YamlLayer>()
const metaCache = new Map<string, MetaFile>()

// All layer positions live in one file at the folder root, keyed by yaml path.
const POSITIONS_FILE = 'archdom.positions.json'
export type NodePositions = Record<string, { x: number; y: number }>
type AllPositions = Record<string, NodePositions>
let allPositionsCache: AllPositions | null = null

let _dirHandle: FileSystemDirectoryHandle | null = null

export function setDirectoryHandle(handle: FileSystemDirectoryHandle | null) {
  _dirHandle = handle
  yamlCache.clear()
  metaCache.clear()
  allPositionsCache = null
}

// ── File I/O helpers ──────────────────────────────────────────────────────────

async function readFromHandle(handle: FileSystemDirectoryHandle, path: string): Promise<string> {
  const parts = path.split('/')
  let dir: FileSystemDirectoryHandle = handle
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i])
  }
  const fileHandle = await dir.getFileHandle(parts[parts.length - 1])
  const file = await fileHandle.getFile()
  return file.text()
}

async function writeToHandle(handle: FileSystemDirectoryHandle, path: string, content: string): Promise<void> {
  const parts = path.split('/')
  let dir: FileSystemDirectoryHandle = handle
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i], { create: true })
  }
  const fh = await dir.getFileHandle(parts[parts.length - 1], { create: true })
  const w = await (fh as FileSystemFileHandle).createWritable()
  await w.write(content)
  await w.close()
}

// ── YAML loader ───────────────────────────────────────────────────────────────

export async function loadYaml(path: string): Promise<YamlLayer> {
  if (yamlCache.has(path)) return yamlCache.get(path)!
  if (!_dirHandle) throw new Error(`No folder open — cannot load ${path}`)
  const text = await readFromHandle(_dirHandle, path)
  const data = yaml.load(text) as YamlLayer
  yamlCache.set(path, data)
  return data
}

// ── Positions (single consolidated file) ─────────────────────────────────────

async function loadAllPositions(): Promise<AllPositions> {
  if (allPositionsCache !== null) return allPositionsCache
  if (!_dirHandle) { allPositionsCache = {}; return {} }
  try {
    const text = await readFromHandle(_dirHandle, POSITIONS_FILE)
    allPositionsCache = JSON.parse(text) as AllPositions
  } catch {
    allPositionsCache = {}
  }
  return allPositionsCache
}

async function persistAllPositions(): Promise<void> {
  if (!_dirHandle || allPositionsCache === null) return
  try {
    await writeToHandle(_dirHandle, POSITIONS_FILE, JSON.stringify(allPositionsCache, null, 2))
  } catch (err) {
    console.warn('Could not save layout positions:', err)
  }
}

export async function loadPositions(yamlPath: string): Promise<NodePositions> {
  const all = await loadAllPositions()
  return all[yamlPath] ?? {}
}

export async function savePositions(yamlPath: string, positions: NodePositions): Promise<void> {
  const all = await loadAllPositions()
  all[yamlPath] = positions
  await persistAllPositions()
}

export async function clearPositions(yamlPath: string): Promise<void> {
  const all = await loadAllPositions()
  delete all[yamlPath]
  await persistAllPositions()
}

// ── Raw text loader / saver (for the YAML editor) ────────────────────────────

export async function loadRawText(path: string): Promise<string> {
  if (!_dirHandle) return ''
  try { return await readFromHandle(_dirHandle, path) } catch { return '' }
}

export async function saveRawText(path: string, text: string): Promise<void> {
  if (!_dirHandle) return
  await writeToHandle(_dirHandle, path, text)
}

// ── Metadata loader ───────────────────────────────────────────────────────────

export async function loadMetaFile(path: string): Promise<MetaFile> {
  if (metaCache.has(path)) return metaCache.get(path)!
  if (!_dirHandle) throw new Error(`No folder open — cannot load ${path}`)
  const text = await readFromHandle(_dirHandle, path)
  const data = (yaml.load(text) ?? {}) as MetaFile
  metaCache.set(path, data)
  return data
}
