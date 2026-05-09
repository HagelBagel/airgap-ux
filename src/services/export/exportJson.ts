import type { JobCard } from '../../domain/types'

interface ExportItem {
  title: string
  speaker: string
  importance: number
  satisfaction: number
  evidence: string
}

/**
 * Exports job cards as speaker-level outcomes in a flat JSON array format.
 * Each speaker's view of each desired outcome becomes a separate export item.
 *
 * Uses the File System Access API (showSaveFilePicker) when available,
 * falling back to a classic <a> download for older browsers.
 */
export async function exportJson(cards: JobCard[], projectName: string): Promise<void> {
  // Flatten all speaker outcomes into export items
  const items: ExportItem[] = []
  
  for (const card of cards) {
    for (const outcome of card.speakerOutcomes) {
      // Use the first evidence quote, or empty string if none
      const evidenceText = outcome.evidence.length > 0 
        ? outcome.evidence[0].text 
        : ''
      
      items.push({
        title: outcome.description,
        speaker: outcome.speakerId,
        importance: outcome.importance,
        satisfaction: outcome.satisfaction,
        evidence: evidenceText,
      })
    }
  }

  const json = JSON.stringify(items, null, 2)
  const filename = `${projectName.replace(/[^a-z0-9_-]/gi, '_')}_jtbd.json`

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as Window & typeof globalThis & {
        showSaveFilePicker: (_opts: object) => Promise<FileSystemFileHandle>
      }).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'JSON file', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return
    } catch (err) {
      // User cancelled the picker — do not fall through to the download.
      if (err instanceof DOMException && err.name === 'AbortError') return
      // Any other error: fall back to blob download below.
    }
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
