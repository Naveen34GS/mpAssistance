import { pipeline, env } from '@xenova/transformers';

// Skip local model check since we are downloading from HF
env.allowLocalModels = false;

class TTSEngine {
  private synthesizer: any = null;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  async init(onProgress?: (info: any) => void) {
    if (this.synthesizer) return;
    this.synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts', {
      quantized: true,
      progress_callback: onProgress,
    });
  }

  async generateAndPlay(text: string, isQuestion: boolean, onStart: () => void, onEnd: () => void) {
    if (!this.synthesizer) {
      throw new Error('TTS Engine not initialized');
    }

    // Female voice for question, Male for answer
    const speakerEmbeddingUrl = isQuestion
      ? 'https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors-extracted/resolve/main/cmu_us_slt_arctic-wav-arctic_a0001.bin' // Female
      : 'https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors-extracted/resolve/main/cmu_us_bdl_arctic-wav-arctic_a0001.bin'; // Male

    // Generate audio (Float32Array)
    const result = await this.synthesizer(text, {
      speaker_embeddings: speakerEmbeddingUrl
    });

    onStart();

    // Play it using Web Audio API
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const { audio, sampling_rate } = result;

    const audioBuffer = this.audioContext.createBuffer(1, audio.length, sampling_rate);
    audioBuffer.getChannelData(0).set(audio);

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = audioBuffer;
    this.currentSource.connect(this.audioContext.destination);

    this.currentSource.onended = () => {
      this.currentSource = null;
      onEnd();
    };

    this.currentSource.start(0);
  }

  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // ignore if already stopped
      }
      this.currentSource.disconnect();
      this.currentSource = null;
    }
  }
}

export const ttsEngine = new TTSEngine();
