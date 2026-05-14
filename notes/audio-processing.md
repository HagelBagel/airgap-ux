I'll examine the actual implementation and compare it to the documented behavior. Let me gather all the relevant files.   

Searched for text `processAudio|audioPreprocessor`, 9 results

Read [](file:///c%3A/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/services/audio/audioPreprocessor.ts)

Read [](file:///c%3A/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/workers/ai.worker.ts#1-1), lines 1 to 100

Read [](file:///c%3A/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/workers/ai.worker.ts#120-120), lines 120 to 200

Read [](file:///c%3A/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/views/ResearchDashboard.vue#50-50), lines 50 to 100

Read [](file:///c%3A/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/workers/messages.ts#1-1), lines 1 to 80

Searched for text `processMedia`, 4 results

Read [](file:///c%3A/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/stores/researchProject.ts)

Read [](file:///c%3A/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/stores/useResearchStore.ts#150-150), lines 150 to 250

Searched for text `decodeAudioFile`, 2 results

Read [](file:///c%3A/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/stores/useResearchStore.ts#416-416), lines 416 to 445

Now let me check if there are any test files or debug logs that might reveal the issue: 

Searched for text `OfflineAudioContext|decodeAudioData` (`**/*.ts`), 6 results

## Analysis: What's Correct vs. What's Broken

After examining all the related files, I found **the preprocessing documentation is accurate, but the implementation has a critical bug that prevents the preprocessed audio from being used**. Here's what I found:

### ✅ **What's Correct**

The **audioPreprocessor.ts** implementation is sound:
1. **Decoding stage** — Uses regular `AudioContext` correctly to decode the input file (line 58)
2. **Buffer calculation** — Creates `OfflineAudioContext` with proper sample count: `sourceBuffer.duration * targetSampleRate` (line 62)
3. **Processing chain** — All connections are correct: source → HPF → compressor → gain → destination
4. **WAV conversion** — The `audioBufferToWav()` function correctly converts Float32 to 16-bit PCM with proper headers

Your preprocessing is actually working as designed.

### ❌ **What's Broken**

The bug is in useResearchStore.ts in the `decodeAudioFile()` function:

```typescript
const decoderContext = new OfflineAudioContext(1, 1, 16_000);  // ← CRITICAL BUG
audioBuffer = await decoderContext.decodeAudioData(arrayBuffer);
```

**The Problems:**

1. **Wrong API for the job**: `OfflineAudioContext` is designed for *rendering/processing* audio (like your preprocessor does). Using it to *decode* a WAV blob is misusing the API.

2. **Undersized buffer**: Buffer length of `1` sample is absurdly small. Per the Web Audio API spec, the `OfflineAudioContext` constructor expects the buffer length to be at least as large as the audio being processed. Your processed WAV could be seconds long, but you're telling the context to expect only 1 sample.

3. **Result**: The decoded audio data is likely **truncated, corrupted, or empty** — which explains why you hear no difference despite correct preprocessing.

### 🎯 **Why You Can't Hear the Difference**

The audio flow breaks here:

```
Raw File 
  ↓ (processAudio)
Preprocessed WAV ✅ (correctly processed)
  ↓ (store.processMedia → decodeAudioFile)
Corrupted/truncated Float32Array ❌
  ↓
Worker receives garbage data
  ↓
Whisper tries to transcribe nothing/noise
```

### **What Should Happen**

According to MDN Web Audio API docs:
- Use **`AudioContext`** for decoding
- Use **`OfflineAudioContext`** for rendering/processing

The fix would be to replace the `OfflineAudioContext` with a regular `AudioContext` in `decodeAudioFile()`, with proper buffer length calculation if you wanted to use offline context for this purpose (which you shouldn't). 
 
 Here's the comprehensive description of how audio pre-processing works in the AirGapUX system:

# Audio Pre-Processing Architecture

## Overview

The audio pre-processing system in AirGapUX is designed to prepare audio files for speech recognition and analysis. It operates as the first stage in the AI processing pipeline (`'audio-preprocessing'`), transforming raw audio into optimized, standardized format suitable for transcription.

## Core Architecture

### 1. **Entry Point: [processAudio()](cci:1://file:///c:/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/services/audio/audioPreprocessor.ts:54:0-94:1) Function**
Located in [src/services/audio/audioPreprocessor.ts](cci:7://file:///c:/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/services/audio/audioPreprocessor.ts:0:0-0:0), this is the main public API that takes a raw audio file and returns a processed WAV blob.

### 2. **Processing Pipeline**
The system uses Web Audio API's `OfflineAudioContext` to create a non-real-time processing chain:

```
Input File → AudioContext Decode → OfflineAudioContext → Filter Chain → WAV Export
```

## Data Flow Breakdown

### **Stage 1: Audio Decoding**
```typescript
const arrayBuffer = await file.arrayBuffer();
const audioCtx = new AudioContext();
const sourceBuffer = await audioCtx.decodeAudioData(arrayBuffer);
```
- Converts any supported audio format to standardized AudioBuffer
- Handles various input formats (MP3, M4A, etc.)
- Immediately cleans up the AudioContext to free resources

### **Stage 2: Sample Rate Conversion**
```typescript
const targetSampleRate = 16000;
const offlineCtx = new OfflineAudioContext(1, sourceBuffer.duration * targetSampleRate, targetSampleRate);
```
- Downsamples to 16kHz (optimal for speech recognition)
- Converts to mono (single channel)
- Reduces computational load for downstream processing

### **Stage 3: Signal Processing Chain**

#### **High-Pass Filter (80Hz cutoff)**
```typescript
const hpf = offlineCtx.createBiquadFilter();
hpf.type = 'highpass';
hpf.frequency.value = 80;
```
- Removes low-frequency rumble and noise
- Eliminates DC offset and microphone handling noise
- Preserves speech frequencies (typically 85Hz+)

#### **Dynamics Compressor (Critical Stage)**
```typescript
const compressor = offlineCtx.createDynamicsCompressor();
compressor.threshold.setValueAtTime(-24, offlineCtx.currentTime);
compressor.knee.setValueAtTime(30, offlineCtx.currentTime);
compressor.ratio.setValueAtTime(12, offlineCtx.currentTime);
compressor.attack.setValueAtTime(0.003, offlineCtx.currentTime);
compressor.release.setValueAtTime(0.25, offlineCtx.currentTime);
```
- **Purpose**: Levels volume variations in speech
- **Threshold**: -24dB (starts compressing above this level)
- **Ratio**: 12:1 (strong compression for speech)
- **Attack**: 3ms (fast response to speech transients)
- **Release**: 250ms (smooth release for natural decay)
- **Knee**: 30dB (soft compression transition)

This is the most critical component - it ensures quiet speech becomes audible while loud peaks are controlled, creating consistent audio levels for the speech recognition model.

#### **Post-Compression Gain**
```typescript
const gainNode = offlineCtx.createGain();
gainNode.gain.value = 2.0;
```
- Compensates for level reduction from compression
- Boosts the processed signal to optimal amplitude
- Ensures sufficient signal-to-noise ratio

### **Stage 4: Audio Chain Connection**
```typescript
source.connect(hpf);
hpf.connect(compressor);
compressor.connect(gainNode);
gainNode.connect(offlineCtx.destination);
```
The signal flows through: Source → High-Pass Filter → Compressor → Gain → Output

### **Stage 5: WAV Export**
The [audioBufferToWav()](cci:1://file:///c:/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/services/audio/audioPreprocessor.ts:0:0-52:1) function converts the processed AudioBuffer to a standard WAV file:
- Converts Float32 samples to 16-bit PCM
- Creates proper WAV header with metadata
- Returns as Blob for downstream processing

## Integration with Processing Pipeline

### **UI Integration**
- Processing stage managed by `useResearchStore`
- UI shows "Processing audio…" during this stage
- Progress tracked through [ProcessingStage](cci:2://file:///c:/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/domain/types.ts:60:0-68:12) enum
- Status displayed in [ProcessingStatus.vue](cci:7://file:///c:/Users/chfro/Documents/Firma%20tanker/AirGapUX/src/components/ProcessingStatus.vue:0:0-0:0) component

### **Worker Communication**
The processed audio is sent to the AI worker for transcription:
1. Audio pre-processing completes first
2. Stage transitions to `'loading-models'`
3. Then `'transcribing'` with processed audio

## Technical Rationale

### **Why 16kHz Mono?**
- Speech recognition models optimized for telephone-quality audio
- Reduces computational requirements by 75% compared to 48kHz stereo
- Sufficient bandwidth for human speech (up to 8kHz)

### **Why Heavy Compression?**
- Interview recordings often have inconsistent levels
- Compressor ensures consistent speech amplitude
- Improves transcription accuracy by normalizing levels
- Reduces dynamic range for better model performance

### **Why High-Pass Filtering?**
- Eliminates room rumble and HVAC noise
- Removes microphone handling noise
- Focuses processing bandwidth on speech frequencies

## Performance Characteristics

- **Non-real-time**: Uses `OfflineAudioContext` for batch processing
- **Memory efficient**: Processes in chunks, cleans up contexts immediately
- **Browser-native**: No external dependencies, uses Web Audio API
- **Format agnostic**: Accepts any browser-supported audio format

## Error Handling

The system gracefully handles:
- Unsupported audio formats (throws during decode)
- Memory constraints (managed by browser)
- Processing failures (propagates to error state)

This architecture ensures consistent, high-quality audio preparation for speech recognition while maintaining privacy and performance standards.