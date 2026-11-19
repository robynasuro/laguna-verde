// Procedural radio and sound effects. One job: three WebAudio stations
// built from oscillators (no audio files, no network), an engine hum tied to
// speed, and little blips for shots, pickups and purchases. Everything is
// guarded so the game still runs if audio is unavailable.

import { CONFIG } from './config.js';

const SCALES = {
  'Sol Del Mar': { wave: 'triangle', bpm: 96, bass: [110, 87.3, 130.8, 98], lead: [220, 261.6, 329.6, 392, 329.6, 261.6] },
  'Tiburon Rock': { wave: 'square', bpm: 140, bass: [82.4, 82.4, 98, 110], lead: [164.8, 196, 220, 246.9, 220, 196] },
  'Laguna FM': { wave: 'sine', bpm: 120, bass: [130.8, 98, 110, 87.3], lead: [261.6, 329.6, 392, 523.3, 392, 329.6] },
};

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.stationIdx = 0;
    this.muted = false;
    this.step = 0;
    this.timer = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.master = null;
  }

  stationName() {
    return CONFIG.stations[this.stationIdx];
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.14;
      this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 420;
      this.engineOsc.connect(filt);
      filt.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      this.timer = setInterval(() => this.scheduleStep(), 200);
    } catch (e) {
      this.ctx = null;
    }
  }

  scheduleStep() {
    if (!this.ctx || this.muted) return;
    const station = SCALES[CONFIG.stations[this.stationIdx]];
    const t = this.ctx.currentTime + 0.05;
    const bassNote = station.bass[this.step % station.bass.length];
    const leadNote = station.lead[(this.step * 2) % station.lead.length];
    this.note(bassNote, t, 0.38, station.wave, 0.5);
    if (this.step % 2 === 0) this.note(leadNote, t + 0.05, 0.16, station.wave, 0.35);
    this.step += 1;
  }

  note(freq, when, dur, wave, vol) {
    try {
      const o = this.ctx.createOscillator();
      o.type = wave;
      o.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, when + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(when);
      o.stop(when + dur + 0.05);
    } catch (e) { /* audio is best-effort */ }
  }

  next() {
    this.stationIdx = (this.stationIdx + 1) % CONFIG.stations.length;
    this.step = 0;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.14;
  }

  setEngine(speed, inCar) {
    if (!this.ctx || !this.engineOsc) return;
    const target = inCar ? Math.min(0.12, 0.02 + Math.abs(speed) * 0.003) : 0;
    this.engineGain.gain.setTargetAtTime(this.muted ? 0 : target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + Math.abs(speed) * 3.2, this.ctx.currentTime, 0.1);
  }

  shot() {
    if (!this.ctx) return;
    try {
      const dur = 0.12;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0.5;
      src.connect(g);
      g.connect(this.master);
      src.start();
    } catch (e) { /* best-effort */ }
  }

  chime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.note(660, t, 0.18, 'sine', 0.4);
    this.note(880, t + 0.12, 0.25, 'sine', 0.4);
  }
}
