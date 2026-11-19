// Story missions. One job: the seven jobs that pay off Tomas's debt
// — each with a named client, a line of dialogue, an objective on the
// map, and a payout. The state machine runs one mission at a time.

import { CONFIG } from './config.js';

export const MISSIONS = [
  {
    id: 1,
    name: 'First Fare',
    client: 'Mrs. Alvarez',
    brief: 'Mrs. Alvarez needs a lift to Hotel Brisa. Drive smooth, she gets carsick.',
    dialogue: '"My grandson drives like a maniac. You, mija, you drive like your father did. Careful, yes?"',
    type: 'drive',
    target: 'hotel',
    payout: 400,
  },
  {
    id: 2,
    name: 'The Pickup',
    client: 'Rico',
    brief: 'Collect the package at Mercado Verde. Los Tiburones are watching the market, so keep it quiet.',
    dialogue: '"Package is under the blue stall. Don\'t look at anyone. Don\'t stop for anyone."',
    type: 'pickup',
    target: 'market',
    payout: 900,
  },
  {
    id: 3,
    name: 'Race the Tide',
    client: 'Tomas',
    brief: 'Tomas bet the Sharks he can outrun their driver along the boardwalk. Win the race, keep the car in one piece.',
    dialogue: '"Carmen, please. One race. If I win, they forget half of what I owe."',
    type: 'race',
    target: 'pier',
    payout: 1400,
  },
  {
    id: 4,
    name: 'The Getaway',
    client: 'Lena',
    brief: 'Lena needs a fast exit from the Sharks\' den. Lose the police, then bring her to the garage.',
    dialogue: '"Drive. Don\'t ask what was in the bag. Just drive, and don\'t stop until the stars are gone."',
    type: 'getaway',
    target: 'sharksDen',
    payout: 2200,
  },
  {
    id: 5,
    name: 'Smuggler\'s Run',
    client: 'Captain Mendez',
    brief: 'Run the crates over the causeway to the lighthouse at dusk. The tide waits for no one.',
    dialogue: '"The light has to stay on, the crates have to move. You know the causeway better than any of my crew."',
    type: 'deliver',
    target: 'lighthouse',
    payout: 3000,
  },
  {
    id: 6,
    name: 'The Garage Job',
    client: 'Garage del Sol',
    brief: 'The Sharks came to collect at the garage. Hold them off, then get the delivery to Casa Azul.',
    dialogue: '"They think they can walk into my father\'s garage and take what they want. Not today."',
    type: 'defend',
    target: 'canalHouse',
    payout: 4200,
  },
  {
    id: 7,
    name: 'Clear the Debt',
    client: 'Tomas',
    brief: 'The last job. Move the cargo to Villa Miramar, settle the $50,000, and Tomas walks free.',
    dialogue: '"Fifty thousand. That\'s the number, Carmen. After tonight, I owe nobody anything. Thank you, hermana."',
    type: 'finale',
    target: 'villa',
    payout: 50000,
  },
];

export class Missions {
  constructor(layout, onEvent) {
    this.layout = layout;
    this.onEvent = onEvent; // (type, data) — 'start', 'objective', 'complete', 'failed', 'dialogue'
    this.index = 0; // next mission to play
    this.active = null;
    this.stage = 'idle'; // idle | toTarget | return | done
    this.marker = null; // {x, z, label}
    this.returnPoint = null; // where 'return' stage heads: garage, or Casa Azul for the defend job
    this.raceProgress = 0;
    this.enemiesLeft = 0;
    this.timer = 0;
  }

  get current() {
    return MISSIONS[this.index] || null;
  }

  get done() {
    return this.index >= MISSIONS.length;
  }

  get completedCount() {
    return this.index;
  }

  start() {
    const m = this.current;
    if (!m) return false;
    this.active = m;
    this.stage = 'toTarget';
    this.timer = 0;
    const lm = this.layout.landmarks[m.target];
    this.marker = { x: lm.x, z: lm.z, label: m.name };
    if (m.type === 'defend') this.enemiesLeft = 3;
    if (m.type === 'race') this.raceProgress = 0;
    this.onEvent('start', m);
    this.onEvent('dialogue', { who: m.client, line: m.dialogue });
    return true;
  }

  // Called every frame with the player's position and state.
  // Returns 'complete' | 'failed' | null.
  update(dt, playerPos, inCar, wantedStars) {
    if (!this.active) return null;
    const m = this.active;
    this.timer += dt;
    const lm = this.layout.landmarks[m.target];

    if (this.stage === 'toTarget') {
      const d = Math.hypot(playerPos.x - lm.x, playerPos.z - lm.z);
      if (m.type === 'race') {
        // Race: checkpoints along the boardwalk, then the pier.
        this.raceProgress += dt * (inCar ? 1 : 0.25);
        if (this.raceProgress > 25) {
          this.stage = 'return';
          this.returnPoint = this.layout.landmarks.garage;
          this.marker = { x: this.layout.landmarks.garage.x, z: this.layout.landmarks.garage.z, label: 'Back to the garage' };
          this.onEvent('objective', { text: 'Race won. Bring the car home.' });
        }
        return null;
      }
      if (m.type === 'defend' && this.enemiesLeft > 0) {
        // Enemies arrive at the garage; the player must drop them all.
        if (d < 30) {
          this.onEvent('objective', { text: 'Sharks at the garage! Hold them off.' });
        }
        return null;
      }
      if (d < 14) {
        if (m.type === 'getaway') {
          this.stage = 'escape';
          this.onEvent('objective', { text: 'Lena is in. Lose the police, then get to the garage.' });
        } else if (m.type === 'finale') {
          return this.complete();
        } else {
          this.stage = 'return';
          this.returnPoint = this.layout.landmarks.garage;
          this.marker = { x: this.layout.landmarks.garage.x, z: this.layout.landmarks.garage.z, label: 'Back to Garage del Sol' };
          this.onEvent('objective', { text: 'Got it. Now back to the garage.' });
        }
      }
      return null;
    }

    if (this.stage === 'escape') {
      if (wantedStars === 0) {
        this.stage = 'return';
        this.returnPoint = this.layout.landmarks.garage;
        this.marker = { x: this.layout.landmarks.garage.x, z: this.layout.landmarks.garage.z, label: 'Back to Garage del Sol' };
        this.onEvent('objective', { text: 'Clean. Take Lena home.' });
      }
      return null;
    }

    if (this.stage === 'return') {
      const dest = this.returnPoint || this.layout.landmarks.garage;
      const d = Math.hypot(playerPos.x - dest.x, playerPos.z - dest.z);
      if (d < 16) return this.complete();
      return null;
    }
    return null;
  }

  // An enemy went down during a defend mission.
  enemyDown() {
    if (!this.active || this.active.type !== 'defend') return;
    this.enemiesLeft = Math.max(0, this.enemiesLeft - 1);
    this.onEvent('objective', { text: this.enemiesLeft + ' Sharks left at the garage.' });
    if (this.enemiesLeft === 0) {
      this.stage = 'return';
      this.returnPoint = this.layout.landmarks.canalHouse;
      this.marker = { x: this.layout.landmarks.canalHouse.x, z: this.layout.landmarks.canalHouse.z, label: 'Deliver to Casa Azul' };
      this.onEvent('objective', { text: 'Garage is safe. Now deliver to Casa Azul.' });
    }
  }

  complete() {
    const m = this.active;
    this.active = null;
    this.marker = null;
    this.stage = 'idle';
    this.index++;
    this.onEvent('complete', m);
    return 'complete';
  }

  fail(reason) {
    const m = this.active;
    this.active = null;
    this.marker = null;
    this.stage = 'idle';
    this.onEvent('failed', { mission: m, reason });
    return 'failed';
  }

  // The marker the minimap and the world beacon draw.
  getMarker() {
    return this.marker;
  }
}
