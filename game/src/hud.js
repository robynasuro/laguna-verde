// The HUD. One job: everything the player reads — health, money, the
// debt meter, wanted stars, speed, the minimap, messages, dialogue,
// and the menus (start, pause, garage, mission results). All DOM, no
// canvas except the minimap itself.

import { CONFIG } from './config.js';

export class Hud {
  constructor(onStart, onGarageBuy) {
    this.onStart = onStart;
    this.onGarageBuy = onGarageBuy;
    this.el = {};
    const ids = [
      'hud', 'health-fill', 'health-text', 'money', 'debt-fill', 'debt-text',
      'stars', 'speed', 'vehicle', 'station', 'objective', 'messages',
      'dialogue', 'dialogue-who', 'dialogue-line', 'minimap',
      'menu', 'menu-title', 'menu-sub', 'menu-start',
      'pause-menu', 'resume-btn', 'restart-btn',
      'result', 'result-title', 'result-text', 'result-btn',
      'garage', 'garage-list', 'garage-close', 'garage-money',
      'toast',
    ];
    for (const id of ids) {
      const n = document.getElementById(id);
      if (n) this.el[id] = n;
    }
    this.mapCtx = this.el['minimap'] ? this.el['minimap'].getContext('2d') : null;
    this.messageTimer = null;
    this.dialogueTimer = null;

    if (this.el['menu-start']) {
      this.el['menu-start'].addEventListener('click', () => this.onStart());
    }
    if (this.el['resume-btn']) {
      this.el['resume-btn'].addEventListener('click', () => this.hidePause());
    }
    if (this.el['garage-close']) {
      this.el['garage-close'].addEventListener('click', () => this.hideGarage());
    }
    this.paused = false;
    this.onResume = null;
    this.onRestart = null;
    if (this.el['restart-btn']) {
      this.el['restart-btn'].addEventListener('click', () => {
        if (this.onRestart) this.onRestart();
      });
    }
    if (this.el['result-btn']) {
      this.el['result-btn'].addEventListener('click', () => this.hideResult());
    }
  }

  setHealth(hp) {
    if (this.el['health-fill']) this.el['health-fill'].style.width = Math.max(0, hp) + '%';
    if (this.el['health-text']) this.el['health-text'].textContent = Math.ceil(Math.max(0, hp));
  }

  setMoney(amount) {
    if (this.el.money) this.el.money.textContent = '$' + Math.floor(amount).toLocaleString('en-US');
    if (this.el['garage-money']) this.el['garage-money'].textContent = '$' + Math.floor(amount).toLocaleString('en-US');
  }

  setDebt(paid) {
    const pct = Math.min(100, (paid / CONFIG.debtTotal) * 100);
    if (this.el['debt-fill']) this.el['debt-fill'].style.width = pct + '%';
    if (this.el['debt-text']) {
      this.el['debt-text'].textContent = '$' + Math.floor(paid).toLocaleString('en-US') + ' / $' + CONFIG.debtTotal.toLocaleString('en-US');
    }
  }

  setWanted(stars) {
    if (!this.el.stars) return;
    let s = '';
    for (let i = 0; i < CONFIG.wantedMax; i++) s += i < stars ? '★' : '☆';
    this.el.stars.textContent = s;
    this.el.stars.className = stars > 0 ? 'hot' : '';
  }

  setSpeed(kmh, inCar) {
    if (this.el.speed) this.el.speed.textContent = inCar ? Math.round(Math.abs(kmh) * 2.4) + ' km/h' : 'on foot';
  }

  setVehicle(name) {
    if (this.el.vehicle) this.el.vehicle.textContent = name || 'On foot';
  }

  setStation(name) {
    if (this.el.station) this.el.station.textContent = '♪ ' + name;
  }

  setObjective(text) {
    if (this.el.objective) this.el.objective.textContent = text || '';
  }

  showMessage(text, ms = 4000) {
    if (!this.el.messages) return;
    const div = document.createElement('div');
    div.className = 'msg';
    div.textContent = text;
    this.el.messages.appendChild(div);
    while (this.el.messages.children.length > 4) {
      this.el.messages.removeChild(this.el.messages.firstChild);
    }
    setTimeout(() => div.remove(), ms);
  }

  showDialogue(who, line, ms = 6000) {
    if (!this.el.dialogue) return;
    this.el['dialogue-who'].textContent = who;
    this.el['dialogue-line'].textContent = line;
    this.el.dialogue.classList.add('show');
    clearTimeout(this.dialogueTimer);
    this.dialogueTimer = setTimeout(() => {
      this.el.dialogue.classList.remove('show');
    }, ms);
  }

  showToast(text, ms = 2500) {
    if (!this.el.toast) return;
    this.el.toast.textContent = text;
    this.el.toast.classList.add('show');
    setTimeout(() => this.el.toast.classList.remove('show'), ms);
  }

  // Menus.
  showMenu() {
    if (this.el.menu) this.el.menu.classList.remove('hidden');
    if (this.el.hud) this.el.hud.classList.add('hidden');
  }

  hideMenu() {
    if (this.el.menu) this.el.menu.classList.add('hidden');
    if (this.el.hud) this.el.hud.classList.remove('hidden');
  }

  showPause() {
    this.paused = true;
    if (this.el['pause-menu']) this.el['pause-menu'].classList.remove('hidden');
  }

  hidePause() {
    this.paused = false;
    if (this.el['pause-menu']) this.el['pause-menu'].classList.add('hidden');
    if (this.onResume) this.onResume();
  }

  showResult(title, text, buttonText = 'Continue') {
    if (!this.el.result) return;
    this.el['result-title'].textContent = title;
    this.el['result-text'].textContent = text;
    this.el['result-btn'].textContent = buttonText;
    this.el.result.classList.remove('hidden');
  }

  hideResult() {
    if (this.el.result) this.el.result.classList.add('hidden');
  }

  // Garage: three upgrades, each a row with a buy button.
  showGarage(money, upgrades) {
    if (!this.el.garage) return;
    this.setMoney(money);
    const list = this.el['garage-list'];
    list.innerHTML = '';
    for (const [key, up] of Object.entries(CONFIG.upgrades)) {
      const owned = !!upgrades[key];
      const row = document.createElement('div');
      row.className = 'upgrade' + (owned ? ' owned' : '');
      const name = document.createElement('span');
      name.textContent = up.name + ' — ' + up.desc;
      const btn = document.createElement('button');
      btn.textContent = owned ? 'Installed' : '$' + up.cost;
      btn.disabled = owned || money < up.cost;
      btn.addEventListener('click', () => this.onGarageBuy(key));
      row.appendChild(name);
      row.appendChild(btn);
      list.appendChild(row);
    }
    this.el.garage.classList.remove('hidden');
  }

  hideGarage() {
    if (this.el.garage) this.el.garage.classList.add('hidden');
  }

  get garageOpen() {
    return this.el.garage && !this.el.garage.classList.contains('hidden');
  }

  // Minimap: top-down, roads, water, player arrow, mission marker,
  // police blips, garage. World 800 maps to the 180 px canvas.
  drawMinimap(player, heading, inCar, marker, police, garagePos) {
    const ctx = this.mapCtx;
    if (!ctx) return;
    const S = 180;
    const scale = S / 820;
    const toMap = (x, z) => [(x + 410) * scale, (z + 410) * scale];
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(0, 0, S, S);
    // Water on the west edge.
    ctx.fillStyle = '#2fb3a6';
    ctx.fillRect(0, 0, 78 * scale, S);
    // Roads.
    ctx.strokeStyle = '#5a5a66';
    ctx.lineWidth = 2;
    for (let c = -240; c <= 240; c += 80) {
      const [x1, y1] = toMap(c, -260);
      const [x2, y2] = toMap(c, 260);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const [x3, y3] = toMap(-260, c);
      const [x4, y4] = toMap(260, c);
      ctx.beginPath();
      ctx.moveTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.stroke();
    }
    // Garage.
    const [gx, gy] = toMap(garagePos.x, garagePos.z);
    ctx.fillStyle = '#f2a541';
    ctx.fillRect(gx - 4, gy - 4, 8, 8);
    // Mission marker: a pulsing yellow diamond.
    if (marker) {
      const [mx, my] = toMap(marker.x, marker.z);
      const pulse = 5 + Math.sin(Date.now() / 200) * 2;
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.moveTo(mx, my - pulse);
      ctx.lineTo(mx + pulse, my);
      ctx.lineTo(mx, my + pulse);
      ctx.lineTo(mx - pulse, my);
      ctx.closePath();
      ctx.fill();
    }
    // Police blips.
    ctx.fillStyle = '#4d8dff';
    for (const car of police) {
      const [px, py] = toMap(car.x, car.z);
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player arrow.
    const [px, py] = toMap(player.x, player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(heading);
    ctx.fillStyle = inCar ? '#ff5a4e' : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
