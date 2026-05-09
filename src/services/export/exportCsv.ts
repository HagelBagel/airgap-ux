import type { JobCard } from '../../domain/types'

/**
 * Exports job cards as speaker-level outcomes in CSV format.
 * Each speaker's view of each desired outcome becomes a separate row.
 *
 * CSV columns: title, speaker, importance, satisfaction, evidence
 */
export async function exportCsv(cards: JobCard[], projectName: string): Promise<void> {
  // CSV header
  const headers = ['title', 'speaker', 'importance', 'satisfaction', 'evidence']
  
  // Build CSV rows from speaker outcomes
  const rows: string[] = [headers.map(escapeCsvField).join(',')]
  
  for (const card of cards) {
    for (const outcome of card.speakerOutcomes) {
      // Use the first evidence quote, or empty string if none
      const evidenceText = outcome.evidence.length > 0 
        ? outcome.evidence[0].text 
        : ''
      
      const row = [
        outcome.description,
        outcome.speakerId,
        String(outcome.importance),
        String(outcome.satisfaction),
        evidenceText,
      ].map(escapeCsvField).join(',')
      
      rows.push(row)
    }
  }
  
  const csv = rows.join('\n')
  const filename = `${projectName.replace(/[^a-z0-9_-]/gi, '_')}_jtbd.csv`

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as Window & typeof globalThis & {
        showSaveFilePicker: (_opts: object) => Promise<FileSystemFileHandle>
      }).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(csv)
      await writable.close()
      return
    } catch (err) {
      // User cancelled the picker — do not fall through to the download.
      if (err instanceof DOMException && err.name === 'AbortError') return
      // Any other error: fall back to blob download below.
    }
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * Escapes a CSV field value: wraps in quotes and escapes internal quotes.
 */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"` // Escape quotes by doubling
  }
  return field
}
