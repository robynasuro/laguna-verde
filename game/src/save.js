// Save and load for Laguna Verde. One job: keep career progress in
// localStorage so Carmen can pick up where she left off, session after session.
const KEY = 'laguna-verde-save-v1';

export function saveGame(G) {
  try {
    const data = {
      money: G.money,
      debtPaid: G.debtPaid,
      missionsDone: G.missionsDone,
      upgrades: G.upgrades,
      health: G.health,
      pos: G.player ? [G.player.pos.x, G.player.pos.z] : [0, 0],
      time: G.timeOfDay,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    // Storage can be full or blocked; the game keeps running either way.
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d.money !== 'number' || typeof d.missionsDone !== 'number') return null;
    return d;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch {}
}
