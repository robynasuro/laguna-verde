// Save and load through localStorage. One job: persist career progress.
const KEY = 'laguna-verde-save-v1';
export function saveGame(G) {
  try {
    const data = {
      money: G.money, debtPaid: G.debtPaid, missionsDone: G.missionsDone,
      upgrades: G.upgrades, health: G.health,
      pos: G.player ? [G.player.pos.x, G.player.pos.z] : [0, 0],
      time: G.timeOfDay, savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}
export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d.money !== 'number') return null;
    return d;
  } catch { return null; }
}
export function hasSave() { return loadGame() !== null; }
export function clearSave() { try { localStorage.removeItem(KEY); } catch {} }
