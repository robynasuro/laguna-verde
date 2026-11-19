// Sound. One job: every sound the game makes, synthesized live with
// WebAudio — no audio files. Engine hum, three procedural radio
// stations, sirens, gunshots, and the little blips that say "done".

import { CONFIG } from './config.js';

// Chord shapes as semitone offsets from the station root.
const PROGRESSIONS = {
  minor: [[0, 3, 7, 10], [8, 10, 3, 5], [5, 8, 0, 3], [10, 0, 3, 7]],
  major: [[0, 4, 7, 11], [5, 9, 0, 4], [7, 11, 2, 5], [5, 9, 0, 4]],
};

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.station = 0;
    this.muted = false;
    this.musicTimer = null;
    this.bar = 0;
    this.started = false;
  }

  // Browsers only allow audio after a gesture; the menu button calls this.
  start() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.master);
      // Engine: a low sawtooth whose pitch follows the speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      // Siren: a slow wailing triangle, silent until wanted.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.started = true;
      this.scheduleMusic();
    } catch (e) {
      this.started = false;
    }
  }

  scheduleMusic() {
    if (!this.ctx) return;
    const station = CONFIG.stations[this.station];
    const beat = 60 / station.bpm;
    const chords = PROGRESSIONS[station.mode];
    const step = () => {
      if (!this.ctx) return;
      const chord = chords[this.bar % chords.length];
      const now = this.ctx.currentTime + 0.05;
      // A soft pad chord plus a plucked bass note per bar.
      for (const off of chord) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = midiToFreq(station.root + off);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.16, now + 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, now + beat * 4);
        osc.connect(g);
        g.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + beat * 4 + 0.1);
      }
      const bass = this.ctx.createOscillator();
      bass.type = 'triangle';
      bass.frequency.value = midiToFreq(station.root + chord[0] - 24);
      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(0.25, now);
      bg.gain.exponentialRampToValueAtTime(0.001, now + beat * 2);
      bass.connect(bg);
      bg.connect(this.musicGain);
      bass.start(now);
      bass.stop(now + beat * 2);
      this.bar++;
      this.musicTimer = setTimeout(step, beat * 4 * 1000);
    };
    step();
  }

  setStation(i) {
    this.station = ((i % CONFIG.stations.length) + CONFIG.stations.length) % CONFIG.stations.length;
    this.bar = 0;
    return CONFIG.stations[this.station].name;
  }

  nextStation() {
    return this.setStation(this.station + 1);
  }

  setEngine(speed, maxSpeed) {
    if (!this.ctx) return;
    const f = 50 + (Math.abs(speed) / maxSpeed) * 110;
    this.engineOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
    this.engineGain.gain.setTargetAtTime(Math.abs(speed) > 0.5 ? 0.05 : 0, this.ctx.currentTime, 0.1);
  }

  setSiren(on) {
    if (!this.ctx) return;
    this.sirenGain.gain.setTargetAtTime(on ? 0.05 : 0, this.ctx.currentTime, 0.2);
    if (on) {
      const t = this.ctx.currentTime;
      this.sirenOsc.frequency.cancelScheduledValues(t);
      this.sirenOsc.frequency.setValueAtTime(700, t);
      this.sirenOsc.frequency.linearRampToValueAtTime(950, t + 0.5);
      this.sirenOsc.frequency.linearRampToValueAtTime(700, t + 1.0);
    }
  }

  blip(freq = 880, dur = 0.12) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  gunshot() {
    if (!this.ctx) return;
    const len = this.ctx.sampleRate * 0.12;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.35;
    src.connect(g);
    g.connect(this.master);
    src.start();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }
}
