// Save and load for Laguna Verde. One job: keep career progress in
// localStorage so Carmen can pick up where she left off, session after session.
const KEY = 'laguna-verde-save-v1';

function pack(G) {
  return {
    money: G.money,
    debtPaid: G.debtPaid,
    missionsDone: G.missionsDone,
    upgrades: G.upgrades,
    health: G.health,
    pos: G.player ? [G.player.pos.x, G.player.pos.z] : [0, 0],
    time: G.timeOfDay,
    savedAt: Date.now(),
  };
}

function valid(d) {
  return d && typeof d.money === 'number' && typeof d.missionsDone === 'number';
}

export function saveGame(G) {
  try {
    localStorage.setItem(KEY, JSON.stringify(pack(G)));
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
    return valid(d) ? d : null;
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
