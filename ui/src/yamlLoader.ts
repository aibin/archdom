import yaml from 'js-yaml'
import { YamlLayer } from './types'

export const yamlCache = new Map<string, YamlLayer>()

let _dirHandle: FileSystemDirectoryHandle | null = null

export function setDirectoryHandle(handle: FileSystemDirectoryHandle | null) {
  _dirHandle = handle
  yamlCache.clear()
}

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

export async function loadYaml(path: string): Promise<YamlLayer> {
  if (yamlCache.has(path)) return yamlCache.get(path)!
  if (!_dirHandle) throw new Error(`No folder open — cannot load ${path}`)
  const text = await readFromHandle(_dirHandle, path)
  const data = yaml.load(text) as YamlLayer
  yamlCache.set(path, data)
  return data
}
