// Save / load through localStorage. Money, debt, missions, upgrades and
// position survive a reload; the game offers to continue where you left off.

import { CONFIG } from './config.js';

export function saveGame(ctx) {
  try {
    const p = ctx.player;
    const data = {
      money: p.money,
      debtPaid: p.debtPaid,
      health: p.health,
      missionsCompleted: ctx.missions.completed,
      missionIndex: ctx.missions.index,
      upgrades: p.upgrades,
      x: p.car ? p.car.x : p.x,
      z: p.car ? p.car.z : p.z,
      angle: p.car ? p.car.angle : p.angle,
      timeOfDay: ctx.timeOfDay,
      station: ctx.audio.station,
      savedAt: Date.now(),
    };
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number') return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(CONFIG.saveKey);
  } catch (err) { /* storage is optional */ }
}
