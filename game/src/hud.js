// HUD and minimap. One job: keep the DOM readouts (health, cash, debt,
// wanted stars, speed, station, objective) in sync with the game, and paint
// a top-down minimap of the city every frame.

import { CONFIG } from './config.js';

export class HUD {
  constructor() {
    this.el = (id) => document.getElementById(id);
    this.bannerTimer = null;
    this.endTimer = null;
    this.objectiveFlash = null;
    this.objectiveFlashUntil = 0;
  }

  showBanner(name, line, ms = 6000) {
    const banner = this.el('mission-banner');
    this.el('banner-title').textContent = name;
    this.el('banner-line').textContent = line;
    banner.style.display = 'block';
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      banner.style.display = 'none';
    }, ms);
  }

  flashObjective(text) {
    this.objectiveFlash = text;
    this.objectiveFlashUntil = performance.now() + 3000;
  }

  showMissionEnd(title, sub) {
    const end = this.el('mission-end');
    this.el('end-title').textContent = title;
    this.el('end-sub').textContent = sub;
    end.style.display = 'block';
    clearTimeout(this.endTimer);
    this.endTimer = setTimeout(() => {
      end.style.display = 'none';
    }, 6000);
  }

  update(game) {
    const p = game.player;
    this.el('health-fill').style.width = `${Math.max(0, p.health)}%`;
    this.el('cash').textContent = `$${Math.floor(p.money)}`;
    this.el('debt-text').textContent = `$${Math.floor(p.debtPaid)} / $${CONFIG.debtTotal} paid`;
    this.el('debt-fill').style.width = `${Math.min(100, (p.debtPaid / CONFIG.debtTotal) * 100)}%`;
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < game.police.wanted ? '★' : '☆';
    this.el('stars').textContent = stars;
    const speed = p.mode === 'car' && p.car ? Math.round(Math.abs(p.car.speed) * 3.6) : 0;
    this.el('speed').textContent = `${speed} km/h`;
    this.el('station').textContent = game.audio.stationName();
    const obj = this.el('objective');
    if (this.objectiveFlash && performance.now() < this.objectiveFlashUntil) {
      obj.textContent = this.objectiveFlash;
    } else {
      this.objectiveFlash = null;
      obj.textContent = game.missions.objective();
    }
    this.drawMinimap(game);
  }

  drawMinimap(game) {
    const canvas = this.el('minimap');
    if (!canvas) return;
    const g = canvas.getContext('2d');
    const S = 200;
    const toMap = (x, z) => [(x + 250) * (S / 500), (z + 250) * (S / 500)];
    g.fillStyle = '#1c2733';
    g.fillRect(0, 0, S, S);
    // Lagoon water on the west edge.
    g.fillStyle = '#2fa8b8';
    g.fillRect(0, 0, 52, S);
    // Roads.
    g.strokeStyle = '#5a5a60';
    g.lineWidth = 3;
    for (const x of CONFIG.roadsX) {
      const [px] = toMap(x, 0);
      g.beginPath();
      g.moveTo(px, 0);
      g.lineTo(px, S);
      g.stroke();
    }
    for (const z of CONFIG.roadsZ) {
      const [, pz] = toMap(0, z);
      g.beginPath();
      g.moveTo(0, pz);
      g.lineTo(S, pz);
      g.stroke();
    }
    // Causeway across the lagoon.
    g.strokeStyle = '#8a8a80';
    g.lineWidth = 4;
    g.beginPath();
    const [cx0, cz0] = toMap(-250, 0);
    const [cx1] = toMap(-100, 0);
    g.moveTo(cx0, cz0);
    g.lineTo(cx1, cz0);
    g.stroke();
    // Garage.
    const [gx, gz] = toMap(CONFIG.garagePos.x, CONFIG.garagePos.z);
    g.fillStyle = '#e8b04b';
    g.fillRect(gx - 4, gz - 4, 8, 8);
    // Mission marker.
    const t = game.missions.active ? game.missions.target() : null;
    if (t) {
      const [mx, mz] = toMap(t.x, t.z);
      const pulse = 5 + Math.sin(performance.now() / 200) * 2;
      g.fillStyle = '#ffd23f';
      g.beginPath();
      g.arc(mx, mz, pulse, 0, Math.PI * 2);
      g.fill();
    }
    // Traffic.
    g.fillStyle = '#9a9a9a';
    for (const c of game.traffic.cars) {
      const [px, pz] = toMap(c.x, c.z);
      g.fillRect(px - 1, pz - 1, 2, 2);
    }
    // Police blips.
    g.fillStyle = '#4f8fff';
    for (const c of game.police.cars) {
      const [px, pz] = toMap(c.x, c.z);
      g.beginPath();
      g.arc(px, pz, 3, 0, Math.PI * 2);
      g.fill();
    }
    // Enemies.
    g.fillStyle = '#ff7a40';
    for (const e of game.combat.enemies) {
      const [px, pz] = toMap(e.x, e.z);
      g.beginPath();
      g.arc(px, pz, 3, 0, Math.PI * 2);
      g.fill();
    }
    // Player.
    const [px, pz] = toMap(game.player.x, game.player.z);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(px, pz, 4, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#ffffff';
    g.beginPath();
    g.arc(px, pz, 6, 0, Math.PI * 2);
    g.stroke();
  }
}
