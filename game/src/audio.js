// Procedural audio: engine hum, three radio stations, sirens and effects.
// Everything is synthesized with WebAudio. No audio files, no network.
// Every call is guarded: if the browser has no audio, the game stays silent
// and keeps playing.

import { STATIONS } from './config.js';

export function createAudio() {
  const a = {
    ctx: null,
    master: null,
    muted: false,
    station: 0,
    engineOsc: null,
    engineGain: null,
    radioTimer: null,
    radioStep: 0,
    sirenOsc: null,
    sirenGain: null,
    sirenOn: false,
  };

  function ensure() {
    if (a.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      a.ctx = new AC();
      a.master = a.ctx.createGain();
      a.master.gain.value = a.muted ? 0 : 0.5;
      a.master.connect(a.ctx.destination);
      startEngine();
      startRadio();
      return true;
    } catch (err) {
      return false;
    }
  }

  function startEngine() {
    try {
      a.engineOsc = a.ctx.createOscillator();
      a.engineOsc.type = 'sawtooth';
      a.engineOsc.frequency.value = 55;
      a.engineGain = a.ctx.createGain();
      a.engineGain.gain.value = 0;
      const filt = a.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 320;
      a.engineOsc.connect(filt);
      filt.connect(a.engineGain);
      a.engineGain.connect(a.master);
      a.engineOsc.start();
    } catch (err) { /* audio is optional */ }
  }

  function note(freq, time, dur, type, vol) {
    try {
      const o = a.ctx.createOscillator();
      o.type = type || 'square';
      o.frequency.value = freq;
      const g = a.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.12, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur);
      o.connect(g);
      g.connect(a.master);
      o.start(time);
      o.stop(time + dur + 0.05);
    } catch (err) { /* audio is optional */ }
  }

  function kick(time) {
    try {
      const o = a.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, time);
      o.frequency.exponentialRampToValueAtTime(40, time + 0.12);
      const g = a.ctx.createGain();
      g.gain.setValueAtTime(0.25, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
      o.connect(g);
      g.connect(a.master);
      o.start(time);
      o.stop(time + 0.16);
    } catch (err) { /* audio is optional */ }
  }

  // One bar of the current station, scheduled on a timer.
  function radioBar() {
    if (!a.ctx || a.muted) return;
    const st = STATIONS[a.station];
    const stepDur = 60 / st.bpm / 2; // eighth notes
    const now = a.ctx.currentTime + 0.05;
    const scale = [0, 3, 5, 7, 10, 12, 15];
    for (let s = 0; s < 8; s++) {
      const t = now + s * stepDur;
      const deg = scale[(a.radioStep + s) % scale.length];
      const f = st.root * Math.pow(2, deg / 12) * 2;
      if (st.genre === 'dembow') {
        if (s % 2 === 0) kick(t);
        if (s === 2 || s === 5) note(f * 2, t, stepDur * 0.9, 'square', 0.07);
        if (s === 0 || s === 4) note(st.root * 2, t, stepDur * 1.8, 'sine', 0.16);
      } else if (st.genre === 'synthwave') {
        note(f, t, stepDur * 0.95, 'sawtooth', 0.08);
        if (s % 4 === 0) kick(t);
        if (s === 0) note(st.root, t, stepDur * 7, 'triangle', 0.12);
      } else {
        if (s % 4 === 0) note(f / 2, t, stepDur * 2.5, 'sine', 0.14);
        if (s === 1 || s === 5) note(f * 2, t, stepDur, 'triangle', 0.05);
        if (s === 0) kick(t);
      }
    }
    a.radioStep += 8;
  }

  function startRadio() {
    if (a.radioTimer) return;
    a.radioTimer = setInterval(radioBar, 60 / STATIONS[a.station].bpm * 1000 * 4);
  }

  a.unlock = () => ensure();
  a.stationName = () => STATIONS[a.station].name;
  a.nextStation = () => {
    a.station = (a.station + 1) % STATIONS.length;
    a.radioStep = 0;
    return STATIONS[a.station].name;
  };
  a.setMuted = (m) => {
    a.muted = m;
    if (a.master) a.master.gain.value = m ? 0 : 0.5;
    if (a.sirenGain) a.sirenGain.gain.value = m ? 0 : 0.05;
  };
  a.setEngine = (speedNorm) => {
    if (!a.engineOsc || !a.ctx) return;
    try {
      a.engineOsc.frequency.setTargetAtTime(55 + speedNorm * 140, a.ctx.currentTime, 0.08);
      a.engineGain.gain.setTargetAtTime(a.muted ? 0 : 0.03 + speedNorm * 0.05, a.ctx.currentTime, 0.1);
    } catch (err) { /* audio is optional */ }
  };
  a.setSiren = (on) => {
    if (!a.ctx) return;
    if (on && !a.sirenOn) {
      a.sirenOn = true;
      try {
        a.sirenOsc = a.ctx.createOscillator();
        a.sirenOsc.type = 'sine';
        a.sirenOsc.frequency.value = 700;
        a.sirenGain = a.ctx.createGain();
        a.sirenGain.gain.value = a.muted ? 0 : 0.05;
        const lfo = a.ctx.createOscillator();
        lfo.frequency.value = 0.6;
        const lfoGain = a.ctx.createGain();
        lfoGain.gain.value = 220;
        lfo.connect(lfoGain);
        lfoGain.connect(a.sirenOsc.frequency);
        a.sirenOsc.connect(a.sirenGain);
        a.sirenGain.connect(a.master);
        a.sirenOsc.start();
        lfo.start();
        a.sirenLfo = lfo;
      } catch (err) { /* audio is optional */ }
    } else if (!on && a.sirenOn) {
      a.sirenOn = false;
      try {
        a.sirenOsc.stop();
        a.sirenLfo.stop();
      } catch (err) { /* audio is optional */ }
      a.sirenOsc = null;
    }
  };
  function blip(freq, dur, type, vol) {
    if (!a.ctx) return;
    note(freq, a.ctx.currentTime, dur, type, vol);
  }
  a.gunshot = () => {
    if (!a.ctx) return;
    try {
      const len = a.ctx.sampleRate * 0.12;
      const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = a.ctx.createBufferSource();
      src.buffer = buf;
      const g = a.ctx.createGain();
      g.gain.value = 0.3;
      src.connect(g);
      g.connect(a.master);
      src.start();
    } catch (err) { /* audio is optional */ }
  };
  a.hit = () => blip(160, 0.15, 'sawtooth', 0.15);
  a.cash = () => { blip(880, 0.1, 'sine', 0.15); setTimeout(() => blip(1320, 0.15, 'sine', 0.15), 90); };
  a.jingle = () => {
    [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.14), i * 110));
  };
  a.crash = () => blip(70, 0.25, 'sawtooth', 0.25);
  return a;
}
