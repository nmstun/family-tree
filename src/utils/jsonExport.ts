import { FamilyTree, ExportData } from '@/types'

export function exportToJSON(tree: FamilyTree): ExportData {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    tree,
  }
}

export function downloadJSON(data: ExportData, filename: string = 'family-tree.json') {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function importJSON(json: string): ExportData | null {
  try {
    const data = JSON.parse(json) as ExportData
    if (data.version && data.tree && data.exportedAt) {
      return data
    }
    return null
  } catch (error) {
    console.error('Failed to parse JSON:', error)
    return null
  }
}
