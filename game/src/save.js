// Save and load. One job: persist the career (money, debt paid, jobs done,
// upgrades, position) to localStorage and read it back, never crashing on
// bad or missing data.

import { CONFIG } from './config.js';

export function saveGame(game) {
  try {
    const p = game.player;
    const data = {
      money: Math.floor(p.money),
      debtPaid: Math.floor(p.debtPaid),
      completed: game.missions.completed,
      index: game.missions.index,
      upgrades: { ...p.upgrades },
      health: Math.max(1, Math.floor(p.health)),
      x: p.x,
      z: p.z,
      yaw: p.yaw,
      mode: p.mode,
      carX: p.car ? p.car.x : null,
      carZ: p.car ? p.car.z : null,
      carYaw: p.car ? p.car.yaw : 0,
      timeOfDay: game.timeOfDay,
    };
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(data));
    return true;
  } catch (e) {
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
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(CONFIG.saveKey);
  } catch (e) { /* best-effort */ }
}
