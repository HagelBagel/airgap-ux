import { computed, ref } from 'vue'
import type { ProcessingStage } from '../domain/types'

type CalibratedStage = 'loading-models' | 'transcribing' | 'extracting' | 'scoring'

interface StageCalibration {
  samples: number
  avgSeconds: number
}

interface EtaCalibrationProfile {
  autoCalibrate: boolean
  completedRuns: number
  stages: Record<CalibratedStage, StageCalibration>
}

const STORAGE_KEY = 'airgapux.eta-calibration.v1'

const STAGE_ORDER: CalibratedStage[] = [
  'loading-models',
  'transcribing',
  'extracting',
  'scoring',
]

const DEFAULT_STAGE_SECONDS: Record<CalibratedStage, number> = {
  'loading-models': 90,
  transcribing: 120,
  extracting: 25,
  scoring: 12,
}

function createDefaultProfile(): EtaCalibrationProfile {
  return {
    autoCalibrate: true,
    completedRuns: 0,
    stages: {
      'loading-models': { samples: 0, avgSeconds: DEFAULT_STAGE_SECONDS['loading-models'] },
      transcribing: { samples: 0, avgSeconds: DEFAULT_STAGE_SECONDS.transcribing },
      extracting: { samples: 0, avgSeconds: DEFAULT_STAGE_SECONDS.extracting },
      scoring: { samples: 0, avgSeconds: DEFAULT_STAGE_SECONDS.scoring },
    },
  }
}

function parseProfile(raw: string | null): EtaCalibrationProfile {
  if (!raw) return createDefaultProfile()

  try {
    const parsed = JSON.parse(raw) as Partial<EtaCalibrationProfile>
    const base = createDefaultProfile()

    return {
      autoCalibrate: parsed.autoCalibrate ?? base.autoCalibrate,
      completedRuns: parsed.completedRuns ?? base.completedRuns,
      stages: {
        'loading-models': {
          samples: parsed.stages?.['loading-models']?.samples ?? base.stages['loading-models'].samples,
          avgSeconds: parsed.stages?.['loading-models']?.avgSeconds ?? base.stages['loading-models'].avgSeconds,
        },
        transcribing: {
          samples: parsed.stages?.transcribing?.samples ?? base.stages.transcribing.samples,
          avgSeconds: parsed.stages?.transcribing?.avgSeconds ?? base.stages.transcribing.avgSeconds,
        },
        extracting: {
          samples: parsed.stages?.extracting?.samples ?? base.stages.extracting.samples,
          avgSeconds: parsed.stages?.extracting?.avgSeconds ?? base.stages.extracting.avgSeconds,
        },
        scoring: {
          samples: parsed.stages?.scoring?.samples ?? base.stages.scoring.samples,
          avgSeconds: parsed.stages?.scoring?.avgSeconds ?? base.stages.scoring.avgSeconds,
        },
      },
    }
  } catch {
    return createDefaultProfile()
  }
}

function loadProfile(): EtaCalibrationProfile {
  if (typeof window === 'undefined') return createDefaultProfile()
  return parseProfile(window.localStorage.getItem(STORAGE_KEY))
}

function saveProfile(profile: EtaCalibrationProfile): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

const profileRef = ref<EtaCalibrationProfile>(loadProfile())

function isCalibratedStage(stage: ProcessingStage): stage is CalibratedStage {
  return STAGE_ORDER.includes(stage as CalibratedStage)
}

function getConfidence(samples: number): number {
  return Math.min(samples / 5, 1)
}

export function useEtaCalibration() {
  const profile = computed(() => profileRef.value)

  function getStageDefaultSeconds(stage: CalibratedStage): number {
    return DEFAULT_STAGE_SECONDS[stage]
  }

  function getEstimatedStageSeconds(stage: ProcessingStage): number {
    if (!isCalibratedStage(stage)) return 0

    const stored = profileRef.value.stages[stage]
    const baseline = getStageDefaultSeconds(stage)
    const confidence = getConfidence(stored.samples)
    const blended = baseline * (1 - confidence) + stored.avgSeconds * confidence

    return Math.max(1, Math.round(blended))
  }

  function recordRun(durations: Partial<Record<CalibratedStage, number>>): void {
    let recordedAny = false

    for (const stage of STAGE_ORDER) {
      const duration = durations[stage]
      if (!duration || !Number.isFinite(duration)) continue
      if (duration < 1 || duration > 60 * 60) continue

      recordedAny = true
      const current = profileRef.value.stages[stage]
      const nextSamples = current.samples + 1
      const nextAvg = ((current.avgSeconds * current.samples) + duration) / nextSamples

      profileRef.value.stages[stage] = {
        samples: nextSamples,
        avgSeconds: Math.round(nextAvg * 10) / 10,
      }
    }

    if (!recordedAny) return

    profileRef.value.completedRuns += 1
    saveProfile(profileRef.value)
  }

  function resetCalibration(): void {
    profileRef.value = createDefaultProfile()
    saveProfile(profileRef.value)
  }

  function setAutoCalibrate(value: boolean): void {
    profileRef.value.autoCalibrate = value
    saveProfile(profileRef.value)
  }

  const autoCalibrate = computed<boolean>({
    get: () => profileRef.value.autoCalibrate,
    set: (value) => setAutoCalibrate(value),
  })

  return {
    profile,
    autoCalibrate,
    completedRuns: computed(() => profileRef.value.completedRuns),
    stageOrder: STAGE_ORDER,
    isCalibratedStage,
    getStageDefaultSeconds,
    getEstimatedStageSeconds,
    recordRun,
    resetCalibration,
    setAutoCalibrate,
  }
}
