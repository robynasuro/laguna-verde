// Story missions. One job: the seven-job arc that pays off Tomas's debt,
// each with a named client, a line of dialogue, a marker on the map, and a
// payout. The game loop calls update() every frame; reaching the marker
// advances the job, finishing it pays out and saves.

export const MISSIONS = [
  {
    name: 'First Fare', client: 'Mrs. Alvarez', pay: 800, type: 'delivery',
    line: 'Mrs. Alvarez: "Garage del Sol? My nephew said you drive like your father did. Take me to the market, dear."',
    pickup: { x: -100, z: 137, label: 'Pick up Mrs. Alvarez' },
    dropoff: { x: 50, z: 20, label: 'Drop her at the market' },
  },
  {
    name: 'The Pickup', client: 'Dante', pay: 1200, type: 'delivery',
    line: 'Dante: "Package is waiting by the docks. No questions, no stops. You know how this works."',
    pickup: { x: 100, z: -50, label: 'Collect the package' },
    dropoff: { x: -50, z: -100, label: 'Deliver to the docks' },
    onPickupWanted: 1,
  },
  {
    name: 'Race the Tide', client: 'Tomas', pay: 1500, type: 'race',
    line: 'Tomas: "Come on, sis. One race along the boardwalk and the Sharks back off for a week. You in?"',
    checkpoints: [
      { x: -120, z: 100, label: 'Race checkpoint 1 of 3' },
      { x: -120, z: -100, label: 'Race checkpoint 2 of 3' },
      { x: 0, z: -150, label: 'Finish line' },
    ],
  },
  {
    name: 'The Getaway', client: 'Dante', pay: 2000, type: 'getaway',
    line: 'Dante: "Job went loud downtown. Get me to the safehouse and do not stop for red lights or sirens."',
    pickup: { x: -50, z: 50, label: 'Pick up Dante' },
    safehouse: { x: 150, z: 150, label: 'Reach the safehouse' },
    onPickupWanted: 3,
  },
  {
    name: "Smuggler's Run", client: 'Rosa', pay: 2500, type: 'delivery',
    line: 'Rosa: "Cross the causeway at dusk, headlights off where you can. The goods are worth the risk."',
    pickup: { x: -200, z: 0, label: 'Load the goods on the causeway' },
    dropoff: { x: 120, z: 120, label: 'Deliver to the villa' },
    timeOfDay: 'dusk',
  },
  {
    name: 'The Garage Job', client: 'Carmen', pay: 3000, type: 'defend',
    line: 'Carmen: "They came for the garage. My father built this place. Nobody takes it tonight."',
    defendAt: { x: 20, z: 100, label: 'Defend Garage del Sol' },
    enemies: 5,
  },
  {
    name: 'Clear the Debt', client: 'Tomas', pay: 5000, type: 'delivery',
    line: 'Tomas: "Last run, sis. After this, the Sharks never come near our family again. I promise."',
    pickup: { x: 0, z: -150, label: 'Pick up Tomas' },
    dropoff: { x: -100, z: 137, label: 'Make the final drop' },
    onPickupWanted: 2,
  },
];

export class Missions {
  constructor(marker, markerGem) {
    this.list = MISSIONS;
    this.index = 0;
    this.active = false;
    this.stage = 0;
    this.completed = 0;
    this.kills = 0;
    this.timer = 0;
    this.marker = marker;
    this.markerGem = markerGem;
    this.allDone = false;
  }

  current() {
    return this.list[this.index];
  }

  target() {
    if (!this.active) return null;
    const m = this.current();
    if (!m) return null;
    if (m.type === 'race') return m.checkpoints[Math.min(this.stage, m.checkpoints.length - 1)];
    if (m.type === 'defend') return m.defendAt;
    if (m.type === 'getaway') return this.stage === 0 ? m.pickup : m.safehouse;
    return this.stage === 0 ? m.pickup : m.dropoff;
  }

  objective() {
    if (this.allDone) return 'Debt cleared. Laguna Verde is yours, Carmen.';
    if (!this.active) {
      const m = this.current();
      return m ? `Next job: ${m.name} — press N to start` : 'No jobs left.';
    }
    const t = this.target();
    if (!t) return '';
    if (this.current().type === 'defend') return `${t.label} — ${this.kills} of ${this.current().enemies} down`;
    if (this.current().type === 'getaway' && this.stage === 1) return `${t.label} — lose the heat (${Math.ceil(this.timer)}s)`;
    return t.label;
  }

  start(i, game) {
    if (i >= this.list.length) return false;
    this.index = i;
    const m = this.current();
    this.active = true;
    this.stage = 0;
    this.kills = 0;
    this.timer = 0;
    if (m.type === 'getaway') this.timer = 30;
    if (m.timeOfDay) game.setTimeOfDay(m.timeOfDay);
    if (m.type === 'defend') game.combat.spawnEnemies(m.defendAt.x, m.defendAt.z, m.enemies);
    this.placeMarker();
    // In shot mode the banner must survive the slow first render in the
    // headless browser, so it stays up for the capture.
    game.hud.showBanner(m.name, m.line, game.shotMode ? 30000 : 6000);
    return true;
  }

  placeMarker() {
    const t = this.target();
    if (!t || !this.active) {
      this.marker.visible = false;
      return;
    }
    this.marker.visible = true;
    this.marker.position.set(t.x, 0, t.z);
  }

  // The player counts as "there" if they or their car is close to the marker.
  reached(game) {
    const t = this.target();
    if (!t) return false;
    const px = game.player.x;
    const pz = game.player.z;
    const dPlayer = Math.hypot(px - t.x, pz - t.z);
    let dCar = Infinity;
    if (game.player.car) dCar = Math.hypot(game.player.car.x - t.x, game.player.car.z - t.z);
    return Math.min(dPlayer, dCar) < 22;
  }

  update(dt, game) {
    if (!this.active) return;
    const m = this.current();
    if (this.markerGem) {
      this.markerGem.rotation.y += dt * 2;
      this.markerGem.position.y = 6 + Math.sin(performance.now() / 300) * 0.8;
    }
    if (m.type === 'defend') {
      if (this.kills >= m.enemies) this.complete(game);
      return;
    }
    if (m.type === 'getaway' && this.stage === 1) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.complete(game);
        return;
      }
    }
    if (this.reached(game)) this.advance(game);
  }

  advance(game) {
    const m = this.current();
    if (m.type === 'race') {
      this.stage += 1;
      if (this.stage >= m.checkpoints.length) {
        this.complete(game);
        return;
      }
      this.placeMarker();
      return;
    }
    if (this.stage === 0) {
      this.stage = 1;
      if (m.onPickupWanted) game.police.addWanted(m.onPickupWanted);
      if (m.type === 'getaway') this.timer = 30;
      this.placeMarker();
      game.hud.flashObjective('Picked up. Now get going.');
      return;
    }
    this.complete(game);
  }

  complete(game) {
    const m = this.current();
    game.player.money += m.pay;
    game.player.debtPaid += m.pay;
    this.completed += 1;
    this.active = false;
    this.marker.visible = false;
    const last = this.index >= this.list.length - 1;
    if (last) this.allDone = true;
    this.index = Math.min(this.index + 1, this.list.length - 1);
    game.hud.showMissionEnd(last ? 'Debt Cleared' : 'Job Complete', `${m.name} — earned $${m.pay}. Debt paid: $${game.player.debtPaid} of $50,000.`);
    game.audio.chime();
    game.saveGame();
  }

  fail(game, reason) {
    this.active = false;
    this.marker.visible = false;
    game.hud.showMissionEnd('Job Failed', reason);
  }
}
