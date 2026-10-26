/**
 * mockData.ts
 *
 * Pre-canned transcript and job cards for Mock Mode (VITE_MOCK_MODE=true).
 * Shared by the AI worker (job cards) and the research store (transcript),
 * so it must stay framework-free: no Vue or Pinia imports.
 */

import type { Evidence, JobCard, SpeakerSegment } from '../../domain/types';
import { computeOpportunityScore } from '../../domain/strategyn/opportunityScore';

// Realistic UX research scenario: project management software.
// Used when mockMode: true — lets UI development proceed without a GPU.

export const MOCK_SEGMENTS: SpeakerSegment[] = [
  {
    speakerId: 'Speaker_01',
    text: "I spend at least two hours every morning trying to figure out what each team member is actually working on. It's exhausting and I feel like I'm always behind.",
    startTime: 12.3,
    endTime:   20.1,
  },
  {
    speakerId: 'Speaker_02',
    text: "When I need to prioritize, I have to manually check four different tools. By the time I have the full picture, half the day is already gone.",
    startTime: 25.0,
    endTime:   32.8,
  },
  {
    speakerId: 'Speaker_01',
    text: "Getting sign-off is the real bottleneck. I send an email, wait three days, and then it gets buried. The project just stalls.",
    startTime: 45.2,
    endTime:   53.9,
  },
  {
    speakerId: 'Speaker_02',
    text: "Approvals are a bit painful, but honestly I've mostly worked around it by calling people directly. It's not ideal, but it works most of the time.",
    startTime: 58.0,
    endTime:   67.5,
  },
  {
    speakerId: 'Speaker_01',
    text: "Reporting to the client is always a last-minute scramble. I manually copy numbers from three spreadsheets. One wrong paste and the whole thing is wrong.",
    startTime: 80.0,
    endTime:   90.2,
  },
];

function buildMockJobCard(
  id: string,
  description: string,
  importance: number,
  satisfaction: number,
  evidenceItems: Pick<Evidence, 'speakerId' | 'text' | 'startTime' | 'endTime'>[],
): JobCard {
  const opportunityScore = computeOpportunityScore(importance, satisfaction);
  const evidence: Evidence[] = evidenceItems.map(e => ({ ...e }));

  return {
    id,
    description,
    averageImportance:   importance,
    averageSatisfaction: satisfaction,
    opportunityScore,
    hasTension: false,
    evidence,
    speakerOutcomes: [
      {
        speakerId: 'aggregate',
        description,
        importance,
        satisfaction,
        opportunityScore,
        evidence,
      },
    ],
  };
}

export const MOCK_JOB_CARDS: JobCard[] = [
  // Score: 9 + max(9−2, 0) = 9 + 7 = 16  ← prime opportunity
  buildMockJobCard(
    'mock-1',
    'Track team task status without manual cross-checking',
    9,
    2,
    [
      {
        speakerId: 'Speaker_01',
        text: "I spend at least two hours every morning trying to figure out what each team member is actually working on.",
        startTime: 12.3,
        endTime:   20.1,
      },
      {
        speakerId: 'Speaker_02',
        text: "I have to manually check four different tools. By the time I have the full picture, half the day is already gone.",
        startTime: 25.0,
        endTime:   32.8,
      },
    ],
  ),

  // Score: 8 + max(8−2, 0) = 8 + 6 = 14  ← prime opportunity
  buildMockJobCard(
    'mock-2',
    'Obtain stakeholder sign-off without email delays',
    8,
    2,
    [
      {
        speakerId: 'Speaker_01',
        text: "Getting sign-off is the real bottleneck. I send an email, wait three days, and then it gets buried.",
        startTime: 45.2,
        endTime:   53.9,
      },
    ],
  ),

  // Score: 8 + max(8−1, 0) = 8 + 7 = 15  ← prime opportunity
  buildMockJobCard(
    'mock-3',
    'Generate client-ready status reports without manual data entry',
    8,
    1,
    [
      {
        speakerId: 'Speaker_01',
        text: "I manually copy numbers from three spreadsheets. One wrong paste and the whole thing is wrong.",
        startTime: 80.0,
        endTime:   90.2,
      },
    ],
  ),

  // Tension card: Speaker_01 satisfaction = 2, Speaker_02 satisfaction = 7
  // Difference = 5 points → hasTension = true (threshold > 3)
  // Score from averages: 7 + max(7 − 4.5, 0) = 7 + 2.5 = 9.5
  {
    id:                  'mock-4',
    description:         'Get approval decisions without synchronous phone calls',
    averageImportance:   7,
    averageSatisfaction: 4.5,
    opportunityScore:    7 + Math.max(7 - 4.5, 0),
    hasTension:          true,
    evidence: [
      {
        speakerId: 'Speaker_01',
        text: "Getting sign-off is the real bottleneck. The project just stalls.",
        startTime: 45.2,
        endTime:   53.9,
      },
      {
        speakerId: 'Speaker_02',
        text: "I've mostly worked around it by calling people directly. It works most of the time.",
        startTime: 58.0,
        endTime:   67.5,
      },
    ],
    speakerOutcomes: [
      {
        speakerId:         'Speaker_01',
        description:       'Get approval decisions without synchronous phone calls',
        importance:        7,
        satisfaction:      2,
        // 7 + max(7−2, 0) = 12
        opportunityScore:  computeOpportunityScore(7, 2),
        evidence: [
          {
            speakerId: 'Speaker_01',
            text: "Getting sign-off is the real bottleneck. The project just stalls.",
            startTime: 45.2,
            endTime:   53.9,
          },
        ],
      },
      {
        speakerId:         'Speaker_02',
        description:       'Get approval decisions without synchronous phone calls',
        importance:        7,
        satisfaction:      7,
        // 7 + max(7−7, 0) = 7
        opportunityScore:  computeOpportunityScore(7, 7),
        evidence: [
          {
            speakerId: 'Speaker_02',
            text: "I've mostly worked around it by calling people directly. It works most of the time.",
            startTime: 58.0,
            endTime:   67.5,
          },
        ],
      },
    ],
  },
];
