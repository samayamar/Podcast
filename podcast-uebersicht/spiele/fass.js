/* Fass-Hüpfer – über rollende Fässer springen und nach oben zu Piepsi klettern */
(function () {
  "use strict";
  const R = window.Retro;
  const W = 224, H = 256;

  // Etagen von unten nach oben; "roll" = Richtung, in die Fässer rollen (zur Lücke hin)
  const FLOORS = [
    { y: 244, x0: 0, x1: 224, roll: -1 },
    { y: 204, x0: 0, x1: 200, roll: 1 },
    { y: 164, x0: 24, x1: 224, roll: -1 },
    { y: 124, x0: 0, x1: 200, roll: 1 },
    { y: 84, x0: 24, x1: 224, roll: -1 },
    { y: 46, x0: 72, x1: 152, roll: 0 }
  ];
  // Leitern: x (linke Kante), von Etage "from" nach Etage from+1
  const LADDERS = [
    { x: 182, from: 0 }, { x: 86, from: 0 },
    { x: 36, from: 1 }, { x: 128, from: 1 },
    { x: 168, from: 2 }, { x: 78, from: 2 },
    { x: 48, from: 3 }, { x: 148, from: 3 },
    { x: 108, from: 4 }
  ];
  const LADDER_W = 10;
  const PW = 8, PH = 12; // Spielfigur

  const KID = [
    ["..gggg..", ".gggggg.", "..ssss..", "..ssss..", "...ss...", ".oooooo.", "oooooooo", ".oooooo.", "..bbbb..", "..b..b..", "..b..b..", ".kk..kk."],
    ["..gggg..", ".gggggg.", "..ssss..", "..ssss..", "...ss...", ".oooooo.", "oooooooo", ".oooooo.", "..bbbb..", ".b....b.", "b......b", "kk....kk"]
  ];
  const KID_COLORS = { g: "#3fd96b", s: "#ffd1a6", o: "#ff9f1c", b: "#4d7cff", k: "#1b1440" };
  const BEAR = [
    "..bb........bb..", ".bbbb......bbbb.", ".bbbbbbbbbbbbbb.", "bbbbbbbbbbbbbbbb",
    "bbkkbbbbbbbbkkbb", "bbbwwbbbbbbwwbbb", "bbbwkbbbbbbkwbbb", "bbbbbbbnnbbbbbbb",
    "bbbbbbnnnnbbbbbb", ".bbbbbbbbbbbbbb.", "bbbbbbbbbbbbbbbb", "bb.bbbbbbbbbb.bb",
    "...bbbbbbbbbb...", "...bb......bb...", "..bbb......bbb.."
  ];
  const BEAR_COLORS = { b: "#9c5b2e", w: "#fff", k: "#2b1608", n: "#2b1608" };
  const BIRD = ["..yyy...", ".yyyyy..", "yywyyyoo", "yykyyyo.", "yyyyyy..", ".yyyy...", "..o.o..."];
  const BIRD_COLORS = { y: "#ffcf33", w: "#fff", k: "#000", o: "#ff6a00" };

  let g;

  function resetRound() {
    g.kid = { x: 16, y: FLOORS[0].y - PH, vx: 0, vy: 0, floor: 0, climbing: null, face: 1, step: 0, air: false };
    g.barrels = [];
    g.throwTimer = 1.5;
    g.bonus = 5000;
    g.bonusTimer = 2;
    g.pause = 1.4;
    g.won = 0;
  }

  function init(game) { g = game; resetRound(); }

  function ladderAt(x, floorIndex, goingUp) {
    return LADDERS.find(function (l) {
      const center = x + PW / 2;
      return Math.abs(center - (l.x + LADDER_W / 2)) < 6 && (goingUp ? l.from === floorIndex : l.from + 1 === floorIndex);
    });
  }

  function floorUnder(x, feetY, fromY) {
    // höchste Etage, auf der die Füße landen (von oben kommend)
    for (let i = FLOORS.length - 1; i >= 0; i--) {
      const f = FLOORS[i];
      if (fromY <= f.y + 0.5 && feetY >= f.y && x + PW > f.x0 + 2 && x < f.x1 - 2) return i;
    }
    return -1;
  }

  function updateKid(dt) {
    const k = g.kid;
    const speed = 62;

    if (k.climbing) {
      const l = k.climbing;
      const top = FLOORS[l.from + 1].y, bottom = FLOORS[l.from].y;
      if (g.input.up) k.y -= 42 * dt;
      if (g.input.down) k.y += 42 * dt;
      if (g.input.up || g.input.down) k.step += dt * 8;
      const feet = k.y + PH;
      if (feet <= top) { k.y = top - PH; k.climbing = null; k.floor = l.from + 1; }
      else if (feet >= bottom) { k.y = bottom - PH; k.climbing = null; k.floor = l.from; }
      return;
    }

    k.vx = 0;
    if (g.input.left) { k.vx = -speed; k.face = -1; }
    if (g.input.right) { k.vx = speed; k.face = 1; }
    if (k.vx) k.step += dt * 10;

    if (!k.air) {
      // Leiter hoch oder runter
      if (g.input.up) {
        const l = ladderAt(k.x, k.floor, true);
        if (l) { k.climbing = l; k.x = l.x + (LADDER_W - PW) / 2; k.y -= 1; return; }
      }
      if (g.input.down) {
        const l = ladderAt(k.x, k.floor, false);
        if (l) { k.climbing = l; k.x = l.x + (LADDER_W - PW) / 2; k.y += 1; return; }
      }
      if (g.pressed("a")) {
        k.vy = -150; k.air = true; k.jumped = {};
        g.beep(400, 0.12, "square", 0.04, 300);
      }
    }

    k.x = R.clamp(k.x + k.vx * dt, 0, W - PW);
    const before = k.y + PH;
    if (!k.air) {
      const f = FLOORS[k.floor];
      if (k.x + PW <= f.x0 + 2 || k.x >= f.x1 - 2) { k.air = true; k.vy = 0; } // über die Kante
    }
    if (k.air) {
      k.vy += 520 * dt;
      k.y += k.vy * dt;
      if (k.vy > 0) {
        const fi = floorUnder(k.x, k.y + PH, before);
        if (fi >= 0) { k.y = FLOORS[fi].y - PH; k.vy = 0; k.air = false; k.floor = fi; }
      }
      if (k.y > H) { if (g.loseLife()) resetRound(); }
    }
  }

  function updateBarrels(dt) {
    const speed = 52 + Math.min(g.level - 1, 6) * 6;
    g.throwTimer -= dt;
    if (g.throwTimer <= 0) {
      g.throwTimer = R.rand(2.2, 3.4) / (1 + (g.level - 1) * 0.15);
      g.barrels.push({ x: 188, y: FLOORS[4].y - 8, floor: 4, dir: -1, vy: 0, mode: "roll", spin: 0 });
      g.throwAnim = 0.5;
    }
    g.barrels.forEach(function (b) {
      b.spin += dt * 8 * (b.dir || 1);
      if (b.mode === "roll") {
        const f = FLOORS[b.floor];
        b.x += b.dir * speed * dt;
        b.y = f.y - 8;
        // manchmal eine Leiter hinunter
        const l = LADDERS.find(function (o) { return o.from + 1 === b.floor && Math.abs(b.x + 4 - (o.x + LADDER_W / 2)) < 1.5; });
        if (l && !b.lastLadder && Math.random() < 0.3 + g.level * 0.05) {
          b.mode = "ladder"; b.x = l.x + 1; b.lastLadder = l;
        } else if (l) {
          b.lastLadder = l;
        } else {
          b.lastLadder = null;
        }
        if (b.x + 8 < f.x0 || b.x > f.x1) {
          if (b.floor === 0) { b.gone = true; return; }
          b.mode = "fall"; b.vy = 20;
        }
      } else {
        // fallen (über die Kante oder die Leiter hinunter)
        b.vy = b.mode === "ladder" ? 60 : b.vy + 400 * dt;
        b.y += b.vy * dt;
        const target = FLOORS[b.floor - 1];
        if (target && b.y + 8 >= target.y) {
          b.floor--; b.y = target.y - 8; b.mode = "roll"; b.dir = target.roll;
          g.beep(90, 0.06, "triangle", 0.04);
        }
      }
    });
    g.barrels = g.barrels.filter(function (b) { return !b.gone && b.x > -12 && b.x < W + 12; });
  }

  function update(game, dt) {
    g = game;
    if (g.pause > 0) { g.pause -= dt; return; }
    if (g.won > 0) {
      g.won -= dt;
      if (g.won <= 0) { g.level++; resetRound(); }
      return;
    }
    updateKid(dt);
    updateBarrels(dt);
    if (g.throwAnim > 0) g.throwAnim -= dt;

    g.bonusTimer -= dt;
    if (g.bonusTimer <= 0) { g.bonusTimer = 2; g.bonus = Math.max(0, g.bonus - 100); }

    const k = g.kid;
    const me = { x: k.x + 1, y: k.y + 2, w: PW - 2, h: PH - 2 };
    for (const b of g.barrels) {
      if (R.overlap(me, { x: b.x + 1, y: b.y + 1, w: 6, h: 6 })) {
        if (g.loseLife()) resetRound();
        return;
      }
      // über ein Fass gesprungen?
      if (k.air && k.jumped && !k.jumped[g.barrels.indexOf(b)] && Math.abs(b.x + 4 - (k.x + PW / 2)) < 6 && b.y > k.y + PH && b.y - (k.y + PH) < 20) {
        k.jumped[g.barrels.indexOf(b)] = true;
        g.add(100);
        g.beep(1046, 0.08, "square", 0.04);
      }
    }

    if (!k.air && !k.climbing && k.floor === FLOORS.length - 1) {
      g.add(1000 + g.bonus);
      g.won = 2;
      [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { g.beep(f, 0.15); }, i * 130); });
    }
  }

  function draw(ctx, game) {
    g = game;
    ctx.fillStyle = "#06041a";
    ctx.fillRect(0, 0, W, H);

    // Leitern
    LADDERS.forEach(function (l) {
      const top = FLOORS[l.from + 1].y, bottom = FLOORS[l.from].y;
      ctx.fillStyle = "#4de1ff";
      ctx.fillRect(l.x, top, 1, bottom - top);
      ctx.fillRect(l.x + LADDER_W - 1, top, 1, bottom - top);
      for (let y = top + 4; y < bottom; y += 5) ctx.fillRect(l.x, y, LADDER_W, 1);
    });
    // Träger
    FLOORS.forEach(function (f) {
      ctx.fillStyle = "#ff4f6d";
      ctx.fillRect(f.x0, f.y, f.x1 - f.x0, 5);
      ctx.fillStyle = "#a3203a";
      for (let x = f.x0; x < f.x1; x += 8) {
        ctx.fillRect(x + 1, f.y + 1, 1, 3); ctx.fillRect(x + 2, f.y + 2, 4, 1); ctx.fillRect(x + 6, f.y + 1, 1, 3);
      }
    });

    // Piepsi oben, Bär auf der vorletzten Etage
    R.sprite(BIRD, 108, FLOORS[5].y - 9 - (Math.floor(g.t * 3) % 2), BIRD_COLORS, 1, true);
    if (g.won > 0) R.text("♥", 116, FLOORS[5].y - 18, 10, "#ff4f8b");
    R.sprite(BEAR, 196, FLOORS[4].y - 15 - (g.throwAnim > 0 ? 2 : 0), BEAR_COLORS, 1);
    // Fass-Stapel neben dem Bär
    [[212, 76], [212, 68]].forEach(function (p) {
      ctx.fillStyle = "#b8742f"; ctx.fillRect(p[0], p[1], 8, 8);
      ctx.fillStyle = "#6b3b12"; ctx.fillRect(p[0], p[1] + 2, 8, 1); ctx.fillRect(p[0], p[1] + 5, 8, 1);
    });

    g.barrels.forEach(function (b) {
      ctx.fillStyle = "#c98236";
      ctx.beginPath(); ctx.arc(b.x + 4, b.y + 4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#5c3210"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(b.x + 4 + Math.cos(b.spin) * 3, b.y + 4 + Math.sin(b.spin) * 3);
      ctx.lineTo(b.x + 4 - Math.cos(b.spin) * 3, b.y + 4 - Math.sin(b.spin) * 3); ctx.stroke();
    });

    const k = g.kid;
    const frame = (k.vx || k.climbing) && Math.floor(k.step) % 2 ? 1 : 0;
    R.sprite(KID[k.air ? 1 : frame], Math.round(k.x), Math.round(k.y), KID_COLORS, 1, k.face < 0);

    R.text("Bonus " + g.bonus, W - 4, 10, 7, "#ffcf33", "right");
    R.text("Level " + g.level, 4, 10, 7, "#4de1ff", "left");
    if (g.pause > 0) R.text("Los! Klettere zu Piepsi!", W / 2, 24, 8, "#ffcf33");
    if (g.won > 0) R.text("Geschafft!", W / 2, 24, 11, "#7dff6a");
  }

  R.register({
    name: "fass",
    title: "Fass-Hüpfer",
    intro: "Der grummelige Bär wirft mit Fässern! Klettere die Leitern hoch zu Piepsi und spring über die Fässer – das gibt Extrapunkte.",
    help: "◀ ▶ laufen, ▲ ▼ an Leitern klettern, ⤒ springen",
    width: W, height: H,
    lives: 3,
    controls: { dpad: "4", actions: [{ key: "a", label: "⤒" }] },
    init: init,
    update: update,
    draw: draw
  });
})();
