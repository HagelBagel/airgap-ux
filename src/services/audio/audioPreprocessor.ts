function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const bufferData = buffer.getChannelData(0);
  const samples = new Int16Array(bufferData.length);
  
  // Convert Float32 to Int16 PCM
  for (let i = 0; i < bufferData.length; i++) {
    const s = Math.max(-1, Math.min(1, bufferData[i]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Create WAV file
  const bufferLength = 44 + samples.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * blockAlign, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * blockAlign, true);
  
  // Write PCM data
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, samples[i], true);
    offset += 2;
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function processAudio(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext(); // Standard context for decoding
  const sourceBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close(); // Clean up immediately

  const targetSampleRate = 16000;
  const offlineCtx = new OfflineAudioContext(1, sourceBuffer.duration * targetSampleRate, targetSampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = sourceBuffer;

  // 1. High-Pass Filter (Remove low-end rumble)
  const hpf = offlineCtx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 80;

  // 2. Dynamics Compressor (THE CRITICAL PART)
  // This levels the volume: quiet speech gets louder, loud noises get capped.
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-24, offlineCtx.currentTime); // Start squashing at -24dB
  compressor.knee.setValueAtTime(30, offlineCtx.currentTime);      // Smooth transition
  compressor.ratio.setValueAtTime(12, offlineCtx.currentTime);     // Strong compression
  compressor.attack.setValueAtTime(0.003, offlineCtx.currentTime); // Fast reaction
  compressor.release.setValueAtTime(0.25, offlineCtx.currentTime); // Smooth release

  // 3. Post-Compression Gain (Make the leveled signal "Hot")
  const gainNode = offlineCtx.createGain();
  gainNode.gain.value = 2.0; // Since compression lowers peaks, we boost it back up

  // Connect chain: source -> hpf -> compressor -> gain -> destination
  source.connect(hpf);
  hpf.connect(compressor);
  compressor.connect(gainNode);
  gainNode.connect(offlineCtx.destination);

  source.start(0);
  const renderedBuffer = await offlineCtx.startRendering();
  
  return audioBufferToWav(renderedBuffer);
}