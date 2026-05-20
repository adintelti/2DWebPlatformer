type SoundName = "jump" | "coin" | "stomp" | "hurt" | "goal";

const SOUND_SETTINGS: Record<SoundName, { frequency: number; duration: number; type: OscillatorType; gain: number }> = {
  jump: { frequency: 420, duration: 0.12, type: "square", gain: 0.045 },
  coin: { frequency: 880, duration: 0.1, type: "triangle", gain: 0.055 },
  stomp: { frequency: 150, duration: 0.12, type: "sawtooth", gain: 0.05 },
  hurt: { frequency: 90, duration: 0.22, type: "sawtooth", gain: 0.05 },
  goal: { frequency: 660, duration: 0.4, type: "triangle", gain: 0.04 },
};

export class AudioSynth {
  private context: AudioContext | undefined;

  resume(): void {
    this.ensureContext()?.resume();
  }

  play(name: SoundName): void {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    const settings = SOUND_SETTINGS[name];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = settings.type;
    oscillator.frequency.setValueAtTime(settings.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, settings.frequency * 0.55), now + settings.duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(settings.gain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.duration + 0.02);
  }

  private ensureContext(): AudioContext | undefined {
    if (this.context) {
      return this.context;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return undefined;
    }

    this.context = new AudioContextClass();
    return this.context;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
