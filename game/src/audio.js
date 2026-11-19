// Procedural sound: engine hum, radio stations, sirens, gunshots. No audio files.
// All sound is synthesized with WebAudio, so the game stays offline and self contained.
const STATIONS = [
  { name: 'LAGUNA FM 101.2', desc: 'Sunset pop', root: 220, scale: [0, 3, 5, 7, 10] },
  { name: 'TIBURON ROCK 94.7', desc: 'Garage rock', root: 110, scale: [0, 2, 3, 5, 7, 10] },
  { name: 'MAREA LATINA 88.5', desc: 'Cumbia nights', root: 196, scale: [0, 2, 4, 5, 7, 9, 11] },
];
export function createAudio() {
  const A = { ctx: null, station: 0, muted: false, radioOn: true, engineOsc: null, engineGain: null, radioTimer: null, sirenOsc: null };
  A.ensure = () => {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try {
      A.ctx = new (window.AudioContext || window.webkitAudioContext)();
      A.engineOsc = A.ctx.createOscillator(); A.engineOsc.type = 'sawtooth'; A.engineOsc.frequency.value = 50;
      A.engineGain = A.ctx.createGain(); A.engineGain.gain.value = 0;
      const filt = A.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 400;
      A.engineOsc.connect(filt); filt.connect(A.engineGain); A.engineGain.connect(A.ctx.destination);
      A.engineOsc.start();
      A.startRadio();
    } catch { A.ctx = null; }
  };
  A.note = (freq, t, dur, type, vol) => {
    const o = A.ctx.createOscillator(); const g = A.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(A.ctx.destination); o.start(t); o.stop(t + dur + 0.05);
  };
  A.startRadio = () => {
    if (!A.ctx) return;
    let step = 0;
    const tick = () => {
      if (!A.ctx || A.muted || !A.radioOn) { A.radioTimer = setTimeout(tick, 200); return; }
      const st = STATIONS[A.station];
      const t = A.ctx.currentTime + 0.05;
      const deg = st.scale[step % st.scale.length];
      const f = st.root * Math.pow(2, deg / 12) * (step % 8 === 0 ? 2 : 1);
      A.note(f, t, 0.22, 'triangle', 0.05);
      if (step % 4 === 2) A.note(st.root / 2, t, 0.3, 'sine', 0.08);
      step += 1;
      A.radioTimer = setTimeout(tick, 210);
    };
    tick();
  };
  A.setEngine = (speedNorm, driving) => {
    if (!A.ctx || !A.engineGain) return;
    A.engineGain.gain.value = A.muted ? 0 : (driving ? 0.02 + speedNorm * 0.05 : 0.012);
    A.engineOsc.frequency.value = 45 + speedNorm * 140;
  };
  A.cycleStation = () => { A.station = (A.station + 1) % STATIONS.length; return STATIONS[A.station]; };
  A.stationName = () => STATIONS[A.station].name + ' - ' + STATIONS[A.station].desc;
  A.shot = () => {
    if (!A.ctx || A.muted) return;
    const t = A.ctx.currentTime;
    const buf = A.ctx.createBuffer(1, A.ctx.sampleRate * 0.12, A.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = A.ctx.createBufferSource(); src.buffer = buf;
    const g = A.ctx.createGain(); g.gain.value = 0.25;
    src.connect(g); g.connect(A.ctx.destination); src.start(t);
  };
  A.siren = (on) => {
    if (!A.ctx) return;
    if (on && !A.sirenOsc) {
      A.sirenOsc = A.ctx.createOscillator(); A.sirenOsc.type = 'sine';
      const g = A.ctx.createGain(); g.gain.value = A.muted ? 0 : 0.03;
      const lfo = A.ctx.createOscillator(); lfo.frequency.value = 0.5;
      const lg = A.ctx.createGain(); lg.gain.value = 220;
      lfo.connect(lg); lg.connect(A.sirenOsc.frequency); A.sirenOsc.frequency.value = 750;
      A.sirenOsc.connect(g); g.connect(A.ctx.destination);
      A.sirenOsc.start(); lfo.start(); A.sirenGain = g;
    } else if (!on && A.sirenOsc) {
      try { A.sirenOsc.stop(); } catch {}
      A.sirenOsc = null;
    }
  };
  A.cash = () => { if (!A.ctx || A.muted) return; const t = A.ctx.currentTime; A.note(880, t, 0.15, 'sine', 0.12); A.note(1320, t + 0.12, 0.25, 'sine', 0.12); };
  A.toggleMute = () => { A.muted = !A.muted; if (A.engineGain) A.engineGain.gain.value = 0; return A.muted; };
  return A;
}
