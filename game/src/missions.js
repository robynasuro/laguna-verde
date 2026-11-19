// Story missions: the stage machine, the beacon marker, dialogue, payouts
// and the debt. Missions run in order; finishing one pays money and chips
// away at Tomas's $50,000 debt. The last one clears it.

import * as THREE from 'three';
import { MISSIONS } from './config.js';
import { setWanted, addWanted } from './police.js';

export function createMissions(scene) {
  // The beacon: a glowing column + a floating ring over the objective.
  const beacon = new THREE.Group();
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd93d, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  column.position.y = 15;
  beacon.add(column);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.4, 20),
    new THREE.MeshBasicMaterial({ color: 0xffd93d, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.3;
  beacon.add(ring);
  beacon.visible = false;
  scene.add(beacon);
  return {
    list: MISSIONS,
    index: 0,
    stage: 0,
    active: false,
    done: false,
    completed: [],
    beacon,
    kills: 0,
    raceStart: 0,
    raceTime: 0,
    onComplete: null,
    onFail: null,
  };
}

export function currentMission(m) {
  return m.list[m.index] || null;
}

export function missionObjectiveText(m) {
  const cur = currentMission(m);
  if (!cur) return 'Debt cleared. Laguna Verde is yours, Carmen.';
  if (!m.active) return `Next job: ${cur.name} — ${cur.client}. Walk to the yellow marker or press N to start.`;
  const stage = cur.stages[m.stage];
  return stage ? stage.text : cur.name;
}

export function startMission(m, ctx) {
  const cur = currentMission(m);
  if (!cur || m.active) return false;
  m.active = true;
  m.stage = 0;
  m.kills = 0;
  m.raceStart = ctx.time;
  if (cur.wanted) setWanted(ctx.police, cur.wanted);
  if (cur.timeOfDay) ctx.setTimeOfDay(cur.timeOfDay);
  ctx.hud.showDialogue(cur.client, cur.intro);
  ctx.hud.showToast(`${cur.name} — ${cur.client}`);
  ctx.audio.jingle();
  placeBeacon(m, ctx);
  return true;
}

function placeBeacon(m, ctx) {
  const cur = currentMission(m);
  if (!cur || !m.active) {
    m.beacon.visible = false;
    return;
  }
  const stage = cur.stages[m.stage];
  if (!stage || stage.type === 'defend') {
    // Defend: the beacon stays on the garage.
    m.beacon.position.set(20, 0, 120);
    m.beacon.visible = true;
    return;
  }
  m.beacon.position.set(stage.target[0], 0, stage.target[1]);
  m.beacon.visible = true;
}

function advanceStage(m, ctx) {
  const cur = currentMission(m);
  m.stage += 1;
  if (m.stage >= cur.stages.length) {
    completeMission(m, ctx);
  } else {
    const stage = cur.stages[m.stage];
    ctx.hud.showToast(stage.text);
    placeBeacon(m, ctx);
  }
}

function completeMission(m, ctx) {
  const cur = currentMission(m);
  m.active = false;
  m.completed.push(cur.id);
  ctx.player.money += cur.payout;
  ctx.player.debtPaid = Math.min(50000, ctx.player.debtPaid + cur.payout);
  m.beacon.visible = false;
  ctx.hud.showToast(`Job done: ${cur.name} — paid $${cur.payout.toLocaleString()}`);
  ctx.hud.showDialogue(cur.client, cur.id === 7
    ? 'It is done. The debt is gone. Tomas is free, and so are we.'
    : 'Paid. The debt is smaller now. One job at a time.');
  ctx.audio.jingle();
  ctx.saveGame();
  if (cur.id === 7) {
    m.done = true;
    ctx.state = 'won';
    ctx.hud.showWin();
  } else {
    m.index += 1;
    ctx.hud.showMissionComplete(cur);
  }
  if (m.onComplete) m.onComplete(cur);
}

export function failMission(m, ctx, reason) {
  if (!m.active) return;
  m.active = false;
  m.beacon.visible = false;
  ctx.hud.showToast(`Job failed: ${reason}`);
  ctx.hud.showMissionFailed(currentMission(m), reason);
  ctx.player.health = 100;
  if (m.onFail) m.onFail(reason);
}

export function updateMissions(m, ctx, dt) {
  if (!m.active) return;
  const cur = currentMission(m);
  if (!cur) return;
  const stage = cur.stages[m.stage];
  if (!stage) return;
  const p = ctx.player;
  const px = p.car ? p.car.x : p.x;
  const pz = p.car ? p.car.z : p.z;

  if (stage.type === 'defend') {
    // Defend counts kills, not position.
    if (m.kills >= (cur.attackers || 5)) {
      advanceStage(m, ctx);
    }
    return;
  }
  const dx = stage.target[0] - px;
  const dz = stage.target[1] - pz;
  const dist = Math.hypot(dx, dz);
  m.targetDist = dist;

  if (stage.type === 'pickup') {
    if (dist < 6) {
      ctx.hud.showPrompt('Press E to pick up');
      if (ctx.input.consume('KeyE')) {
        if (cur.ambush) {
          ctx.combat.spawnAmbush(ctx, 3);
          addWanted(ctx.police, 1, 'rival crew');
          ctx.hud.showDialogue('Rico', 'Told you. Black jackets, two o\u2019clock. Drive!');
        }
        advanceStage(m, ctx);
      }
    }
    return;
  }
  if (stage.type === 'race') {
    // Race checkpoints must be hit in order, and the clock is running.
    m.raceTime = ctx.time - m.raceStart;
    if (dist < 8) {
      ctx.hud.showToast(`Checkpoint ${m.stage + 1} of ${cur.stages.length} — ${m.raceTime.toFixed(1)}s`);
      advanceStage(m, ctx);
    }
    return;
  }
  // goto / deliver / escape: reaching the point finishes the stage.
  const radius = stage.type === 'escape' ? 10 : 7;
  if (dist < radius) {
    if (stage.type === 'escape' && ctx.police.wanted >= 4) {
      ctx.hud.showToast('Too hot. Lose some heat first.');
      return;
    }
    advanceStage(m, ctx);
  }
}

// Called by combat when the player defeats an attacker during a defense.
export function registerKill(m, ctx) {
  m.kills += 1;
  const cur = currentMission(m);
  if (cur && cur.stages[m.stage] && cur.stages[m.stage].type === 'defend') {
    ctx.hud.showToast(`Attackers stopped: ${m.kills} of ${cur.attackers || 5}`);
  }
}
