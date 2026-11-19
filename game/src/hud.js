// HUD and minimap: health, money, debt meter, wanted stars, speed,
// objective, dialogue box, messages, and the top-down minimap canvas. One
// job: everything the player reads on screen.
const MAP_SIZE = 190;
const MAP_SPAN = 560;

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const el = {
    hud: $('hud'),
    stars: $('stars'),
    health: $('healthfill'),
    money: $('money'),
    debt: $('debt'),
    debtfill: $('debtfill'),
    speed: $('speed'),
    veh: $('veh'),
    objective: $('objective'),
    msg: $('msg'),
    dialog: $('dialog'),
    radio: $('radio'),
    crosshair: $('crosshair'),
    minimap: $('minimap'),
    toast: $('toast'),
  };
  const mm = el.minimap.getContext('2d');
  let msgTimer = null;
  let dialogTimer = null;

  function show() {
    el.hud.style.display = 'block';
  }
  function hide() {
    el.hud.style.display = 'none';
  }

  function starsHtml(wanted) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
      s += '<span class="' + (i <= wanted ? '' : 'off') + '">&#9733;</span>';
    }
    return s;
  }

  function update(G) {
    el.stars.innerHTML = starsHtml(G.wanted);
    el.health.style.width = Math.max(0, G.health) + '%';
    el.health.style.background = G.health > 50 ? '#3ddc74' : G.health > 25 ? '#ffd23e' : '#ff4444';
    el.money.textContent = '$' + G.money.toLocaleString();
    el.debt.textContent = 'Debt paid: $' + G.debtPaid.toLocaleString() + ' / $50,000';
    el.debtfill.style.width = Math.min(100, (G.debtPaid / 50000) * 100) + '%';
    el.speed.textContent = G.inCar ? Math.round(Math.abs(G.car.speed) * 3.2) : '0';
    el.veh.textContent = G.inCar
      ? G.car.def.name + (G.car.stolen ? ' (stolen)' : '')
      : 'On foot - pistol ready (F)';
    el.radio.textContent = G.audio.stationName();
    el.crosshair.style.display = (!G.inCar && G.armed) ? 'block' : 'none';
  }

  function setObjective(text) {
    el.objective.innerHTML = '<b>Job:</b> ' + text;
  }

  // A big centre message that clears itself after a few seconds.
  function flash(text, ms = 2600) {
    el.msg.textContent = text;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { el.msg.textContent = ''; }, ms);
  }

  function say(who, text) {
    el.dialog.innerHTML = '<span class="who">' + who + ':</span> ' + text;
    el.dialog.style.display = 'block';
    clearTimeout(dialogTimer);
    dialogTimer = setTimeout(() => { el.dialog.style.display = 'none'; }, 7000);
  }

  function toast(text) {
    el.toast.textContent = text;
    el.toast.style.display = 'block';
    setTimeout(() => { el.toast.style.display = 'none'; }, 2200);
  }

  // Minimap helpers: world coords to map pixels, and a dot at a spot.
  const scale = MAP_SIZE / MAP_SPAN;
  const toX = (x) => (x + 280) * scale;
  const toZ = (z) => (z + 280) * scale;
  function dot(x, z, r, color) {
    mm.fillStyle = color;
    mm.beginPath();
    mm.arc(toX(x), toZ(z), r, 0, 7);
    mm.fill();
  }
  function roadLines(coords, vertical) {
    mm.strokeStyle = '#3a3f45';
    mm.lineWidth = 5;
    for (const c of coords) {
      mm.beginPath();
      if (vertical) {
        mm.moveTo(toX(c), 0);
        mm.lineTo(toX(c), MAP_SIZE);
      } else {
        mm.moveTo(0, toZ(c));
        mm.lineTo(MAP_SIZE, toZ(c));
      }
      mm.stroke();
    }
  }

  // Minimap: lagoon blue, land sand, roads grey, player green, marker
  // yellow, police blue, garage orange, Ferris wheel pink, lighthouse white.
  function drawMinimap(G) {
    const S = MAP_SIZE;
    mm.fillStyle = '#1fa8b8';
    mm.fillRect(0, 0, S, S);
    mm.fillStyle = '#8a7a5a';
    mm.fillRect(toX(-150), 0, S - toX(-150), S);
    mm.fillStyle = '#e8d49a';
    mm.fillRect(toX(-152), 0, 6, S);
    roadLines([-120, -60, 0, 60, 120, 180], true);
    roadLines([-180, -120, -60, 0, 60, 120, 180], false);
    // The causeway across the lagoon.
    mm.strokeStyle = '#d8d0c0';
    mm.lineWidth = 3;
    mm.beginPath();
    mm.moveTo(toX(-262), toZ(0));
    mm.lineTo(toX(-150), toZ(0));
    mm.stroke();
    // Garage, Ferris wheel, lighthouse.
    mm.fillStyle = '#ff9f2e';
    mm.fillRect(toX(-132) - 4, toZ(66) - 4, 8, 8);
    dot(-195, 0, 5, '#ff5d8f');
    dot(-228, -185, 4, '#fff');
    // Police blips, helicopter included.
    for (const c of G.police.cars) dot(c.pos.x, c.pos.z, 3.5, '#2244ff');
    if (G.police.heli) dot(G.police.heli.pos.x, G.police.heli.pos.z, 4, '#88aaff');
    // Mission marker, pulsing.
    const t = G.marker;
    if (t) {
      const r = 6 + Math.sin(performance.now() / 200) * 2;
      dot(t.x, t.z, r, '#ffd23e');
      mm.fillStyle = '#000';
      mm.font = 'bold 9px Verdana';
      mm.fillText('!', toX(t.x) - 2, toZ(t.z) + 3);
    }
    // Player arrow, rotated to the heading.
    const p = G.playerPos();
    mm.save();
    mm.translate(toX(p.x), toZ(p.z));
    mm.rotate(Math.atan2(Math.sin(G.heading), Math.cos(G.heading)));
    mm.fillStyle = '#3ddc74';
    mm.beginPath();
    mm.moveTo(0, -7);
    mm.lineTo(5, 6);
    mm.lineTo(-5, 6);
    mm.closePath();
    mm.fill();
    mm.restore();
    // North ring.
    mm.strokeStyle = 'rgba(255,255,255,0.5)';
    mm.lineWidth = 1;
    mm.beginPath();
    mm.arc(S / 2, S / 2, S / 2 - 2, 0, 7);
    mm.stroke();
  }

  return { show, hide, update, setObjective, flash, say, toast, drawMinimap, el };
}
