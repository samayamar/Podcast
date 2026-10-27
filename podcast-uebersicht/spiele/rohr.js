/* Rohr-Hüpfer – Krabbelkäfer von unten umkippen und dann wegschubsen */
(function () {
  "use strict";
  const R = window.Retro;
  const W = 256, H = 224;
  const FLOOR_Y = 208;
  const PLATFORMS = [
    { x0: 0, x1: 80, y: 160 }, { x0: 176, x1: 256, y: 160 },
    { x0: 60, x1: 196, y: 112 },
    { x0: 0, x1: 104, y: 64 }, { x0: 152, x1: 256, y: 64 },
    { x0: 0, x1: 256, y: FLOOR_Y }
  ];
  const PT = 6; // Dicke der Plattformen
  const PW = 10, PH = 14;
  const EW = 12, EH = 8;

  const HERO = [
    ["...yyyy...", "..yyyyyyy.", "...ssss...", "..ss.ss...", "...ssss...", "..pppppp..", ".pppppppp.", "pp.pppp.pp", "s..pppp..s", "...pppp...", "...p..p...", "..pp..pp..", ".kk....kk.", ".kk....kk."],
    ["...yyyy...", "..yyyyyyy.", "...ssss...", "..ss.ss...", "...ssss...", "..pppppp..", ".pppppppp.", "pp.pppp.pp", "s..pppp..s", "...pppp...", "..p....p..", ".pp....pp.", "kk......kk", "k........k"]
  ];
  const HERO_COLORS = { y: "#ffcf33", s: "#ffd1a6", p: "#b388ff", k: "#2b2147" };
  const BUG = [
    ["...rrrrrr...", "..rrrrrrrr..", ".rrwkrrwkrr.", "rrrrrrrrrrrr", "rrrrrrrrrrrr", ".rrrrrrrrrr.", ".k.k....k.k.", "k.k......k.k"],
    ["...rrrrrr...", "..rrrrrrrr..", ".rrwkrrwkrr.", "rrrrrrrrrrrr", "rrrrrrrrrrrr", ".rrrrrrrrrr.", "..k.k..k.k..", ".k.k....k.k."]
  ];
  const BUG_FLIP = ["k.k......k.k", ".k.k....k.k.", ".rrrrrrrrrr.", "rrrrrrrrrrrr", "rrrrrrrrrrrr", ".rrrrrrrrrr.", "..rrrrrrrr..", "...rrrrrr..."];

  let g;

  function resetHero() {
    g.hero = { x: W / 2 - PW / 2, y: FLOOR_Y - PH, vx: 0, vy: 0, air: false, face: 1, step: 0, safe: 1.5 };
  }

  function newPhase() {
    g.bugs = [];
    g.toSpawn = 3 + g.level;
    g.spawnTimer = 0.8;
    g.spawnSide = 0;
    g.pause = 1.4;
    g.bumps = [];
  }

  function init(game) { g = game; resetHero(); newPhase(); }

  // Plattform, auf der etwas mit Unterkante "feet" steht
  function standingOn(x, w, feet) {
    return PLATFORMS.find(function (p) { return Math.abs(feet - p.y) < 0.6 && x + w > p.x0 + 1 && x < p.x1 - 1; });
  }

  function wrap(o, w) {
    if (o.x < -w) o.x += W + w;
    if (o.x > W) o.x -= W + w;
  }

  function bump(x, platform) {
    g.bumps.push({ x: x, y: platform.y, t: 0.25 });
    g.beep(160, 0.08, "square", 0.05);
    g.bugs.forEach(function (b) {
      if (b.state === "kicked" || b.air) return;
      if (Math.abs(b.y + EH - platform.y) < 1 && Math.abs(b.x + EW / 2 - x) < 16) {
        if (b.state === "flip") { b.state = "walk"; }
        else { b.state = "flip"; b.timer = Math.max(3, 7 - g.level * 0.5); b.vy = -80; b.air = true; g.add(10); }
      }
    });
  }

  function updateHero(dt) {
    const h = g.hero;
    if (h.safe > 0) h.safe -= dt;
    const speed = 72;
    h.vx = (g.input.left ? -speed : 0) + (g.input.right ? speed : 0);
    if (h.vx) { h.face = h.vx > 0 ? 1 : -1; h.step += dt * 10; }
    if (!h.air && (g.pressed("a") || g.pressed("up"))) {
      h.vy = -262; h.air = true;
      g.beep(330, 0.15, "square", 0.04, 500);
    }
    h.x += h.vx * dt;
    wrap(h, PW);

    if (!h.air && !standingOn(h.x, PW, h.y + PH)) { h.air = true; h.vy = 0; }
    if (h.air) {
      const headBefore = h.y, feetBefore = h.y + PH;
      h.vy = Math.min(h.vy + 640 * dt, 300);
      h.y += h.vy * dt;
      for (const p of PLATFORMS) {
        if (h.x + PW <= p.x0 + 1 || h.x >= p.x1 - 1) continue;
        if (h.vy < 0 && headBefore >= p.y + PT && h.y < p.y + PT) {       // Kopf stößt von unten an
          h.y = p.y + PT; h.vy = 30;
          bump(h.x + PW / 2, p);
          break;
        }
        if (h.vy > 0 && feetBefore <= p.y && h.y + PH >= p.y) {          // Landung
          h.y = p.y - PH; h.vy = 0; h.air = false;
          break;
        }
      }
    }
  }

  function updateBugs(dt) {
    // Neue Käfer kommen abwechselnd aus den oberen Röhren
    if (g.toSpawn > 0) {
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        g.spawnTimer = R.rand(2, 3.2);
        g.toSpawn--;
        const left = g.spawnSide++ % 2 === 0;
        g.bugs.push({ x: left ? 14 : W - 14 - EW, y: 64 - EH, dir: left ? 1 : -1, vy: 0, air: false, state: "walk", angry: 0, step: 0 });
      }
    }
    const base = 26 + Math.min(g.level - 1, 6) * 4;
    g.bugs.forEach(function (b) {
      b.step += dt * 8;
      if (b.state === "kicked") { b.vy += 400 * dt; b.y += b.vy * dt; b.x += b.dir * 60 * dt; return; }
      if (b.state === "flip") {
        b.timer -= dt;
        if (b.timer <= 0) { b.state = "walk"; b.angry++; b.vy = -60; b.air = true; g.beep(500, 0.1, "triangle", 0.04); }
      } else {
        b.x += b.dir * (base + b.angry * 10) * dt;
      }
      if (b.air) {
        const feetBefore = b.y + EH;
        b.vy += 500 * dt; b.y += b.vy * dt;
        const p = PLATFORMS.find(function (o) { return b.vy > 0 && feetBefore <= o.y && b.y + EH >= o.y && b.x + EW > o.x0 + 1 && b.x < o.x1 - 1; });
        if (p) { b.y = p.y - EH; b.vy = 0; b.air = false; }
      } else if (!standingOn(b.x, EW, b.y + EH)) {
        b.air = true; b.vy = 0;
      }
      // Unten in die Röhre – oben wieder heraus
      if (Math.abs(b.y + EH - FLOOR_Y) < 1 && ((b.dir < 0 && b.x < 6) || (b.dir > 0 && b.x > W - EW - 6))) {
        const left = b.dir < 0;
        b.x = left ? 14 : W - 14 - EW; b.y = 64 - EH; b.dir = left ? 1 : -1;
      }
      wrap(b, EW);
    });
    g.bugs = g.bugs.filter(function (b) { return b.y < H + 20; });
  }

  function update(game, dt) {
    g = game;
    if (g.pause > 0) { g.pause -= dt; return; }
    updateHero(dt);
    updateBugs(dt);
    g.bumps.forEach(function (b) { b.t -= dt; });
    g.bumps = g.bumps.filter(function (b) { return b.t > 0; });

    const h = g.hero;
    const me = { x: h.x + 1, y: h.y + 1, w: PW - 2, h: PH - 2 };
    for (const b of g.bugs) {
      if (b.state === "kicked" || !R.overlap(me, { x: b.x + 1, y: b.y + 1, w: EW - 2, h: EH - 1 })) continue;
      if (b.state === "flip") {
        b.state = "kicked"; b.vy = -120; b.dir = h.x < b.x ? 1 : -1;
        g.add(800);
        g.beep(880, 0.08, "square", 0.05); setTimeout(function () { g.beep(1175, 0.15, "square", 0.05); }, 90);
      } else if (h.safe <= 0) {
        if (g.loseLife()) resetHero();
        return;
      }
    }

    if (g.toSpawn === 0 && !g.bugs.some(function (b) { return b.state !== "kicked"; })) {
      g.level++;
      g.add(500);
      [523, 659, 784].forEach(function (f, i) { setTimeout(function () { g.beep(f, 0.15); }, i * 120); });
      newPhase();
    }
  }

  function drawPipe(ctx, x, y, w, h, flip) {
    ctx.fillStyle = "#2fb34a";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#1c7a30";
    ctx.fillRect(flip ? x : x + w - 4, y - 2, 4, h + 4);
    ctx.fillStyle = "#7dff6a";
    ctx.fillRect(x, y + 2, w, 2);
  }

  function draw(ctx, game) {
    g = game;
    ctx.fillStyle = "#070418";
    ctx.fillRect(0, 0, W, H);

    // Röhren oben (Käfer kommen heraus) und unten (Käfer gehen hinein)
    drawPipe(ctx, 0, 40, 22, 16, false);
    drawPipe(ctx, W - 22, 40, 22, 16, true);
    drawPipe(ctx, 0, FLOOR_Y - 16, 14, 16, false);
    drawPipe(ctx, W - 14, FLOOR_Y - 16, 14, 16, true);

    PLATFORMS.forEach(function (p) {
      const floor = p.y === FLOOR_Y;
      ctx.fillStyle = floor ? "#c96a2b" : "#3a6bff";
      ctx.fillRect(p.x0, p.y, p.x1 - p.x0, floor ? H - p.y : PT);
      ctx.fillStyle = floor ? "#7a3a12" : "#1d3aa8";
      for (let x = p.x0; x < p.x1; x += 8) ctx.fillRect(x, p.y, 1, floor ? H - p.y : PT);
      ctx.fillRect(p.x0, p.y + (floor ? 7 : 3), p.x1 - p.x0, 1);
    });
    // Beule nach dem Anstoßen
    g.bumps.forEach(function (b) {
      ctx.fillStyle = "#9db4ff";
      ctx.fillRect(b.x - 8, b.y - 3, 16, 3);
    });

    g.bugs.forEach(function (b) {
      const angryColor = ["#ff4f4f", "#ff9f1c", "#ff4fd8"][Math.min(b.angry, 2)];
      if (b.state === "flip" || b.state === "kicked") {
        const blink = b.state === "flip" && b.timer < 1.5 && Math.floor(g.t * 8) % 2;
        R.sprite(BUG_FLIP, b.x, b.y, { r: blink ? "#fff" : angryColor, k: "#1b1440" }, 1);
      } else {
        R.sprite(BUG[Math.floor(b.step) % 2], b.x, b.y, { r: angryColor, w: "#fff", k: "#1b1440" }, 1, b.dir < 0);
      }
    });

    const h = g.hero;
    if (h.safe <= 0 || Math.floor(g.t * 10) % 2) {
      const frame = h.air || (h.vx && Math.floor(h.step) % 2) ? 1 : 0;
      R.sprite(HERO[frame], Math.round(h.x), Math.round(h.y), HERO_COLORS, 1, h.face < 0);
    }

    R.text("Runde " + g.level, 30, 14, 7, "#4de1ff", "left");
    R.text("Käfer: " + (g.toSpawn + g.bugs.filter(function (b) { return b.state !== "kicked"; }).length), W - 30, 14, 7, "#ff9f1c", "right");
    if (g.pause > 0) R.text(g.level > 1 ? "Runde " + g.level : "Los! Stoß die Käfer von unten an!", W / 2, 90, 8, "#ffcf33");
  }

  R.register({
    name: "rohr",
    title: "Rohr-Hüpfer",
    intro: "Krabbelkäfer kommen aus den Röhren! Spring von unten gegen die Etage, auf der ein Käfer läuft – dann kippt er um. Danach kannst du ihn wegschubsen.",
    help: "◀ ▶ laufen, ⤒ springen",
    width: W, height: H,
    lives: 3,
    controls: { dpad: "lr", actions: [{ key: "a", label: "⤒" }] },
    init: init,
    update: update,
    draw: draw
  });
})();
