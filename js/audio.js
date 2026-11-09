export class GameAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.wheel = null;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  async start() {
    if (!this.context) {
      const AudioContextConstructor =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) {
        console.error("이 브라우저는 Web Audio API를 지원하지 않습니다.");
        return;
      }
      this.context = new AudioContextConstructor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.62;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") {
      try {
        await this.context.resume();
      } catch (error) {
        console.error("오디오 재생을 시작하지 못했습니다.", error);
        return false;
      }
    }
    if (!this.wheel) {
      const buffer = this.context.createBuffer(
        1,
        this.context.sampleRate * 2,
        this.context.sampleRate,
      );
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index++) {
        data[index] = (Math.random() * 2 - 1) * 0.7;
      }
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = 1200;
      gain.gain.value = 0.03;
      source.connect(filter).connect(gain).connect(this.master);
      source.start();
      this.wheel = { source, filter, gain };
    }
    return this.context.state === "running";
  }

  update(speed) {
    if (!this.context || !this.wheel) return;
    const now = this.context.currentTime;
    this.wheel.filter.frequency.setTargetAtTime(650 + speed * 18, now, 0.08);
    this.wheel.gain.gain.setTargetAtTime(0.018 + speed * 0.0007, now, 0.1);
  }

  tone(startFrequency, endFrequency, duration, type = "sine", volume = 0.18) {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency),
      now + duration,
    );
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noise(duration = 0.12, volume = 0.14) {
    if (!this.context || !this.master) return;
    const buffer = this.context.createBuffer(
      1,
      this.context.sampleRate * duration,
      this.context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index++) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.8;
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
  }

  async startRide() {
    if (!(await this.start())) return;
    this.startMusic();
    this.tone(180, 420, 0.24, "square", 0.18);
  }

  async jump() {
    if (!(await this.start())) return;
    this.tone(220, 520, 0.18, "triangle", 0.16);
  }

  land() {
    this.tone(110, 55, 0.14, "sine", 0.16);
  }

  flip() {
    this.tone(360, 760, 0.16, "triangle", 0.16);
    this.noise(0.08, 0.12);
  }

  collision() {
    this.noise(0.2, 0.34);
    this.tone(100, 42, 0.24, "sawtooth", 0.3);
  }

  finish() {
    this.stopMusic();
    this.stopWheel();
    this.tone(440, 660, 0.22, "sine", 0.12);
    setTimeout(() => this.tone(660, 880, 0.28, "sine", 0.12), 160);
  }

  gameOver() {
    this.stopMusic();
    this.stopWheel();
    this.tone(180, 55, 0.55, "sawtooth", 0.24);
  }

  click() {
    if (!this.context) return;
    this.tone(520, 700, 0.07, "square", 0.08);
  }

  startMusic() {
    if (this.musicTimer !== null) return;
    this.musicStep = 0;
    const notes = [110, 131, 147, 165, 147, 131, 98, 123];
    const playStep = () => {
      if (!this.context || this.context.state !== "running") {
        this.musicTimer = null;
        return;
      }
      this.tone(notes[this.musicStep % notes.length], notes[this.musicStep % notes.length] * 1.01, 0.32, "triangle", 0.035);
      this.musicStep += 1;
      this.musicTimer = window.setTimeout(playStep, 420);
    };
    playStep();
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  stopWheel() {
    if (!this.context || !this.wheel) return;
    const now = this.context.currentTime;
    this.wheel.gain.gain.cancelScheduledValues(now);
    this.wheel.gain.gain.setTargetAtTime(0, now, 0.04);
    this.wheel.source.stop(now + 0.18);
    this.wheel = null;
  }
}
