import { describe, it, expect } from 'vitest'
import { parsePlainTextTranscript } from './parsePlainTextTranscript'

describe('parsePlainTextTranscript', () => {
  it('starts a new segment for each "Name: text" line', () => {
    const transcript = 'Interviewer: How do approvals work today?\nAnna: They take days.'

    expect(parsePlainTextTranscript(transcript)).toEqual([
      { speakerId: 'Interviewer', text: 'How do approvals work today?' },
      { speakerId: 'Anna', text: 'They take days.' },
    ])
  })

  it('joins lines without a speaker prefix onto the previous segment', () => {
    const transcript = 'Anna: They take days.\nSometimes a whole week.\nInterviewer: Why?'

    expect(parsePlainTextTranscript(transcript)).toEqual([
      { speakerId: 'Anna', text: 'They take days. Sometimes a whole week.' },
      { speakerId: 'Interviewer', text: 'Why?' },
    ])
  })

  it('attributes text before the first speaker prefix to "Unknown"', () => {
    const transcript = 'Recorded on site.\nAnna: They take days.'

    expect(parsePlainTextTranscript(transcript)).toEqual([
      { speakerId: 'Unknown', text: 'Recorded on site.' },
      { speakerId: 'Anna', text: 'They take days.' },
    ])
  })

  it('ignores blank lines and trims whitespace', () => {
    const transcript = '\n  Anna :   They take days.  \n\n   \n  Sometimes a week.  \n\nBo: Same here.\n'

    expect(parsePlainTextTranscript(transcript)).toEqual([
      { speakerId: 'Anna', text: 'They take days. Sometimes a week.' },
      { speakerId: 'Bo', text: 'Same here.' },
    ])
  })

  it('handles Windows line endings', () => {
    const transcript = 'Anna: They take days.\r\nSometimes a week.\r\nBo: Same here.\r\n'

    expect(parsePlainTextTranscript(transcript)).toEqual([
      { speakerId: 'Anna', text: 'They take days. Sometimes a week.' },
      { speakerId: 'Bo', text: 'Same here.' },
    ])
  })

  it('accepts speaker IDs with digits, underscores and spaces', () => {
    const transcript = 'Speaker_01: Hello.\nP 2: Hi.'

    expect(parsePlainTextTranscript(transcript)).toEqual([
      { speakerId: 'Speaker_01', text: 'Hello.' },
      { speakerId: 'P 2', text: 'Hi.' },
    ])
  })

  it('drops a speaker line with no text when nothing follows it', () => {
    expect(parsePlainTextTranscript('Anna:\nBo: Hi.')).toEqual([
      { speakerId: 'Bo', text: 'Hi.' },
    ])
  })

  it('returns an empty array for empty or whitespace-only input', () => {
    expect(parsePlainTextTranscript('')).toEqual([])
    expect(parsePlainTextTranscript(' \n\t\r\n ')).toEqual([])
  })
})
