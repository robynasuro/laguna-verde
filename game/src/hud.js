// HUD, minimap, dialogue, toasts, and every menu overlay. All DOM, no
// canvas 3D, so it shows up in screenshots exactly as the player sees it.

import { CONFIG, CONTROLS, GARAGE_UPGRADES } from './config.js';

function el(id) {
  return document.getElementById(id);
}

export function createHud(ctx) {
  const hud = {
    toastTimer: 0,
    dialogueTimer: 0,
    promptTimer: 0,
  };

  hud.showToast = (text) => {
    const t = el('toast');
    t.textContent = text;
    t.style.opacity = '1';
    hud.toastTimer = 3;
  };
  hud.showDialogue = (who, text) => {
    const box = el('dialogue');
    el('dialogue-who').textContent = who;
    el('dialogue-text').textContent = text;
    box.style.opacity = '1';
    hud.dialogueTimer = 6;
  };
  hud.showPrompt = (text) => {
    const p = el('prompt');
    p.textContent = text;
    p.style.opacity = '1';
    hud.promptTimer = 0.4;
  };
  hud.flashDamage = () => {
    const d = el('damage');
    d.style.opacity = '0.55';
    setTimeout(() => { d.style.opacity = '0'; }, 180);
  };
  hud.showMissionComplete = (mission) => {
    el('mc-title').textContent = `${mission.name} complete`;
    el('mc-text').textContent = `Paid $${mission.payout.toLocaleString()}. The debt is $${(50000 - ctx.player.debtPaid).toLocaleString()} now.`;
    el('mission-complete').style.display = 'flex';
    setTimeout(() => { el('mission-complete').style.display = 'none'; }, 3500);
  };
  hud.showMissionFailed = (mission, reason) => {
    el('mf-title').textContent = `${mission ? mission.name : 'Job'} failed`;
    el('mf-text').textContent = reason;
    el('mission-failed').style.display = 'flex';
    setTimeout(() => { el('mission-failed').style.display = 'none'; }, 3500);
  };
  hud.showWin = () => {
    el('win-screen').style.display = 'flex';
  };
  hud.showPause = (show) => {
    el('pause-menu').style.display = show ? 'flex' : 'none';
  };
  hud.showMenu = (show) => {
    el('start-menu').style.display = show ? 'flex' : 'none';
  };
  hud.showGarage = (show) => {
    el('garage-menu').style.display = show ? 'flex' : 'none';
    if (show) hud.renderGarage();
  };
  hud.renderGarage = () => {
    const list = el('garage-list');
    list.innerHTML = '';
    for (const up of GARAGE_UPGRADES) {
      const lvl = ctx.player.car ? ctx.player.car.upgrades[up.id] : ctx.player.upgrades[up.id];
      const row = document.createElement('div');
      row.className = 'garage-row';
      const maxed = lvl >= up.max;
      row.innerHTML = `<span>${up.name} — ${up.desc} (lvl ${lvl}/${up.max})</span>` +
        `<button ${maxed || ctx.player.money < up.cost ? 'disabled' : ''}>$${up.cost}</button>`;
      row.querySelector('button').addEventListener('click', () => {
        if (ctx.player.money < up.cost) return;
        ctx.player.money -= up.cost;
        if (ctx.player.car) ctx.player.car.upgrades[up.id] += 1;
        ctx.player.upgrades[up.id] += 1;
        ctx.audio.cash();
        hud.renderGarage();
        hud.showToast(`${up.name} upgraded to level ${lvl + 1}`);
      });
      list.appendChild(row);
    }
    el('garage-money').textContent = `$${ctx.player.money.toLocaleString()}`;
  };

  // Menu buttons.
  el('start-btn').addEventListener('click', () => ctx.startGame(false));
  el('continue-btn').addEventListener('click', () => ctx.startGame(true));
  el('resume-btn').addEventListener('click', () => ctx.togglePause());
  el('restart-btn').addEventListener('click', () => ctx.restartMission());
  el('garage-close').addEventListener('click', () => hud.showGarage(false));
  el('win-again').addEventListener('click', () => {
    el('win-screen').style.display = 'none';
    ctx.state = 'playing';
  });

  // Fill the controls list on the start menu from CONFIG.
  const cl = el('controls-list');
  for (const [key, desc] of CONTROLS) {
    const row = document.createElement('div');
    row.className = 'control-row';
    row.innerHTML = `<b>${key}</b><span>${desc}</span>`;
    cl.appendChild(row);
  }
  return hud;
}

function stars(n) {
  let s = '';
  for (let i = 0; i < 5; i++) s += i < n ? '\u2605' : '\u2606';
  return s;
}

export function updateHud(hud, ctx, dt) {
  hud.toastTimer -= dt;
  if (hud.toastTimer <= 0) el('toast').style.opacity = '0';
  hud.dialogueTimer -= dt;
  if (hud.dialogueTimer <= 0) el('dialogue').style.opacity = '0';
  hud.promptTimer -= dt;
  if (hud.promptTimer <= 0) el('prompt').style.opacity = '0';

  const p = ctx.player;
  el('money').textContent = `$${p.money.toLocaleString()}`;
  el('debt-fill').style.width = `${Math.min(100, (p.debtPaid / CONFIG.player.debtTotal) * 100)}%`;
  el('debt-text').textContent = `Debt $${p.debtPaid.toLocaleString()} / $${CONFIG.player.debtTotal.toLocaleString()}`;
  el('health-fill').style.width = `${Math.max(0, p.health)}%`;
  el('wanted').textContent = stars(ctx.police.wanted);
  el('wanted').style.color = ctx.police.wanted > 0 ? '#ff4444' : '#ffd93d';
  const speed = p.car ? Math.abs(p.car.speed) * 3.2 : 0;
  el('speed').textContent = `${Math.round(speed)} km/h`;
  el('vehicle').textContent = p.car ? (p.car.isPolice ? 'Police cruiser' : 'Carmen\u2019s coupe') : 'On foot';
  el('radio').textContent = ctx.audio.stationName();
  el('objective').textContent = ctx.missionsObjective();
  drawMinimap(ctx);
}

// Top-down minimap: roads, lagoon, player, mission marker, police, traffic.
export function drawMinimap(ctx) {
  const canvas = el('minimap');
  if (!canvas) return;
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const w = ctx.world;
  const toX = (x) => ((x - -220) / 460) * W;
  const toY = (z) => ((z - -280) / 480) * H;

  g.clearRect(0, 0, W, H);
  g.fillStyle = '#24351f';
  g.fillRect(0, 0, W, H);
  // Lagoon.
  g.fillStyle = '#2fb3c9';
  g.fillRect(toX(-200), toY(-260), toX(230) - toX(-200), toY(-60) - toY(-260));
  // Roads.
  g.strokeStyle = '#8a8a8a';
  g.lineWidth = 2;
  for (const [a, b] of w.edges) {
    g.beginPath();
    g.moveTo(toX(a.x), toY(a.z));
    g.lineTo(toX(b.x), toY(b.z));
    g.stroke();
  }
  // Garage.
  g.fillStyle = '#e8b04b';
  g.fillRect(toX(14), toY(114), 12, 12);
  // Mission marker.
  const m = ctx.missions;
  if (m.active && m.beacon.visible) {
    const bx = toX(m.beacon.position.x);
    const by = toY(m.beacon.position.z);
    g.fillStyle = '#ffd93d';
    g.beginPath();
    g.arc(bx, by, 6, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.stroke();
  }
  // Traffic dots.
  g.fillStyle = '#cfd8dc';
  for (const c of ctx.traffic.cars) {
    g.fillRect(toX(c.x) - 1.5, toY(c.z) - 1.5, 3, 3);
  }
  // Police blips.
  g.fillStyle = '#ff2222';
  for (const c of ctx.police.cars) {
    g.beginPath();
    g.arc(toX(c.x), toY(c.z), 3.5, 0, Math.PI * 2);
    g.fill();
  }
  if (ctx.police.heli.visible) {
    g.fillStyle = '#ff8888';
    g.beginPath();
    g.arc(toX(ctx.police.heli.position.x), toY(ctx.police.heli.position.z), 4, 0, Math.PI * 2);
    g.fill();
  }
  // Player arrow.
  const p = ctx.player;
  const px = toX(p.car ? p.car.x : p.x);
  const py = toY(p.car ? p.car.z : p.z);
  const ang = p.car ? p.car.angle : p.angle;
  g.save();
  g.translate(px, py);
  g.rotate(Math.atan2(Math.sin(ang), Math.cos(ang)) + Math.PI);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(0, -7);
  g.lineTo(5, 6);
  g.lineTo(-5, 6);
  g.closePath();
  g.fill();
  g.restore();
}
