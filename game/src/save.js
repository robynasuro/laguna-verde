// Save and load. One job: the player's progress in localStorage —
// money, debt paid, missions finished, upgrades, position, and
// settings — so quitting mid-debt does not mean starting over.

const KEY = 'laguna-verde-save-v1';

export function saveGame(data) {
  try {
    const payload = {
      version: 1,
      savedAt: Date.now(),
      money: data.money,
      debtPaid: data.debtPaid,
      missionsDone: data.missionsDone,
      upgrades: data.upgrades,
      player: data.player,
      station: data.station,
      muted: data.muted,
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    // Storage may be unavailable; the game plays on without it.
  }
}

export function hasSave() {
  return loadGame() !== null;
}
