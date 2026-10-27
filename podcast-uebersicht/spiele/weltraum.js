/* Weltraum-Wächter – die anrückenden Außerirdischen abwehren */
(function () {
  "use strict";
  const R = window.Retro;
  const W = 224, H = 256;
  const PLAYER_Y = 232;

  // Eigene Pixel-Figuren (zwei Bilder für die Lauf-Animation)
  const ALIENS = [
    { points: 30, color: "#ff6fb5", frames: [
      ["..xxxxx..", ".xxxxxxx.", "xx..x..xx", "xxxxxxxxx", "..x.x.x..", ".x.x.x.x."],
      ["..xxxxx..", ".xxxxxxx.", "xx..x..xx", "xxxxxxxxx", ".x.x.x.x.", "..x.x.x.."]] },
    { points: 20, color: "#4de1ff", frames: [
      ["...xxx...", ".xxxxxxx.", "xx.xxx.xx", "xxxxxxxxx", ".x.xxx.x.", "x.......x"],
      ["...xxx...", ".xxxxxxx.", "xx.xxx.xx", "xxxxxxxxx", ".x.xxx.x.", ".x.....x."]] },
    { points: 10, color: "#7dff6a", frames: [
      ["..x...x..", "...xxx...", "..xxxxx..", ".xx.x.xx.", "xxxxxxxxx", "x.x...x.x", "..x...x.."],
      ["..x...x..", "x..xxx..x", "x.xxxxx.x", "xxx.x.xxx", "xxxxxxxxx", "..x...x..", ".x.....x."]] }
  ];
  const ROW_TYPES = [0, 1, 1, 2, 2];
  const SHIP = ["....x....", "...xxx...", ".xxxxxxx.", "xxxxxxxxx", "xxxxxxxxx"];
  const UFO = ["....xxxxx....", "..xxxxxxxxx..", ".xx.xx.xx.xx.", "xxxxxxxxxxxxx", "..xx.....xx.."];
  const SHIELD = [
    "....xxxxxxxxxxxx....",
    "..xxxxxxxxxxxxxxxx..",
    ".xxxxxxxxxxxxxxxxxx.",
    "xxxxxxxxxxxxxxxxxxxx",
    "xxxxxxxxxxxxxxxxxxxx",
    "xxxxxxxxxxxxxxxxxxxx",
    "xxxxxxxxxxxxxxxxxxxx",
    "xxxxxxxxxxxxxxxxxxxx",
    "xxxxxx........xxxxxx",
    "xxxxx..........xxxxx",
    "xxxx............xxxx"
  ];
  const STARS = Array.from({ length: 40 }, function () { return [Math.random() * W, Math.random() * H, Math.random()]; });

  let g;

  function newWave() {
    g.aliens = [];
    const top = 36 + Math.min(g.level - 1, 5) * 6;
    ROW_TYPES.forEach(function (type, row) {
      for (let col = 0; col < 8; col++) {
        g.aliens.push({ x: 24 + col * 18, y: top + row * 15, type: type, alive: true });
      }
    });
    g.total = g.aliens.length;
    g.march = { dir: 1, timer: 0, frame: 0 };
    g.bombs = [];
    g.bullets = [];
    g.bombTimer = 1.5;
    g.pause = 1.4;
  }

  function newShields() {
    g.shields = [];
    for (let i = 0; i < 4; i++) {
      const sx = 22 + i * 52, sy = 196;
      SHIELD.forEach(function (row, r) {
        for (let c = 0; c < row.length; c++) if (row[c] === "x") g.shields.push({ x: sx + c, y: sy + r });
      });
    }
  }

  function init(game) {
    g = game;
    g.ship = { x: W / 2 - 4, alive: true, respawn: 0 };
    g.cooldown = 0;
    g.ufo = null;
    g.ufoTimer = R.rand(14, 22);
    newShields();
    newWave();
  }

  // Schuss oder Bombe trifft Schutzschild: kleines Loch hineinsprengen
  function hitShield(x, y, w, h) {
    for (let i = 0; i < g.shields.length; i++) {
      const s = g.shields[i];
      if (s.x >= x && s.x < x + w && s.y >= y && s.y < y + h) {
        g.shields = g.shields.filter(function (o) { return Math.abs(o.x - s.x) > 1.5 || Math.abs(o.y - s.y) > 2.5; });
        return true;
      }
    }
    return false;
  }

  function alienBox(a) {
    const rows = ALIENS[a.type].frames[0];
    return { x: a.x, y: a.y, w: rows[0].length, h: rows.length };
  }

  function update(game, dt) {
    g = game;
    if (g.pause > 0) { g.pause -= dt; return; }
    const ship = g.ship;

    // Schiff
    if (ship.respawn > 0) {
      ship.respawn -= dt;
    } else {
      if (g.input.left) ship.x -= 95 * dt;
      if (g.input.right) ship.x += 95 * dt;
      ship.x = R.clamp(ship.x, 4, W - 13);
      g.cooldown -= dt;
      const fire = g.pressed("a") || g.input.a;
      if (fire && g.cooldown <= 0 && g.bullets.length < 2) {
        g.bullets.push({ x: ship.x + 4, y: PLAYER_Y - 4 });
        g.cooldown = 0.35;
        g.beep(880, 0.06, "square", 0.03, -400);
      }
    }

    // Schüsse
    g.bullets.forEach(function (b) { b.y -= 230 * dt; });
    g.bullets = g.bullets.filter(function (b) {
      if (b.y < 8) return false;
      if (hitShield(b.x - 1, b.y, 3, 4)) return false;
      if (g.ufo && R.overlap({ x: b.x, y: b.y, w: 1, h: 4 }, { x: g.ufo.x, y: 22, w: 13, h: 5 })) {
        const bonus = [100, 150, 200, 300][R.randInt(0, 3)];
        g.add(bonus); g.ufo = null;
        g.beep(1200, 0.3, "square", 0.05, -900);
        return false;
      }
      for (const a of g.aliens) {
        if (a.alive && R.overlap({ x: b.x, y: b.y, w: 1, h: 4 }, alienBox(a))) {
          a.alive = false;
          g.add(ALIENS[a.type].points);
          g.beep(180, 0.12, "sawtooth", 0.05, -120);
          return false;
        }
      }
      return true;
    });

    // Marschieren: je weniger Außerirdische, desto schneller
    const alive = g.aliens.filter(function (a) { return a.alive; });
    if (!alive.length) {
      g.level++;
      g.add(200);
      g.beep(660, 0.12); setTimeout(function () { g.beep(990, 0.25); }, 140);
      newWave();
      return;
    }
    const m = g.march;
    m.timer -= dt;
    if (m.timer <= 0) {
      m.timer = 0.04 + 0.6 * (alive.length / g.total) / (1 + (g.level - 1) * 0.12);
      m.frame = 1 - m.frame;
      const minX = Math.min.apply(null, alive.map(function (a) { return a.x; }));
      const maxX = Math.max.apply(null, alive.map(function (a) { return a.x + 9; }));
      if ((m.dir > 0 && maxX + 4 > W - 4) || (m.dir < 0 && minX - 4 < 4)) {
        m.dir = -m.dir;
        alive.forEach(function (a) { a.y += 6; });
      } else {
        alive.forEach(function (a) { a.x += 4 * m.dir; });
      }
      g.beep([110, 98, 87, 82][Math.floor(g.t * 4) % 4], 0.05, "square", 0.025);
    }
    // Außerirdische fressen Schilde auf und landen
    alive.forEach(function (a) {
      const box = alienBox(a);
      g.shields = g.shields.filter(function (s) { return !(s.x >= box.x && s.x < box.x + box.w && s.y >= box.y && s.y < box.y + box.h); });
    });
    if (alive.some(function (a) { return a.y + 7 >= PLAYER_Y - 2; })) {
      g.lives = 1;
      g.loseLife();
      return;
    }

    // Bomben
    g.bombTimer -= dt;
    if (g.bombTimer <= 0 && g.bombs.length < 3 + Math.min(g.level, 3)) {
      g.bombTimer = R.rand(0.5, 1.3) / (1 + (g.level - 1) * 0.1);
      const cols = {};
      alive.forEach(function (a) { if (!cols[a.x] || cols[a.x].y < a.y) cols[a.x] = a; });
      const shooters = Object.keys(cols).map(function (k) { return cols[k]; });
      const s = shooters[Math.floor(Math.random() * shooters.length)];
      g.bombs.push({ x: s.x + 4, y: s.y + 7, wiggle: Math.random() * 6 });
    }
    const bombSpeed = 70 + Math.min(g.level - 1, 6) * 8;
    g.bombs.forEach(function (b) { b.y += bombSpeed * dt; });
    g.bombs = g.bombs.filter(function (b) {
      if (b.y > H - 8) return false;
      if (hitShield(b.x - 1, b.y, 3, 5)) return false;
      if (ship.respawn <= 0 && R.overlap({ x: b.x - 1, y: b.y, w: 3, h: 5 }, { x: ship.x, y: PLAYER_Y, w: 9, h: 5 })) {
        if (g.loseLife()) { ship.respawn = 1.5; g.bombs = []; }
        return false;
      }
      return true;
    });

    // Ufo
    if (g.ufo) {
      g.ufo.x += g.ufo.dir * 45 * dt;
      if (g.ufo.x < -16 || g.ufo.x > W + 4) g.ufo = null;
      else if (Math.floor(g.t * 8) % 2) g.beep(500 + Math.sin(g.t * 20) * 80, 0.03, "triangle", 0.015);
    } else {
      g.ufoTimer -= dt;
      if (g.ufoTimer <= 0) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        g.ufo = { x: dir > 0 ? -14 : W + 2, dir: dir };
        g.ufoTimer = R.rand(16, 26);
      }
    }
  }

  function draw(ctx, game) {
    g = game;
    ctx.fillStyle = "#05031a";
    ctx.fillRect(0, 0, W, H);
    STARS.forEach(function (s) {
      ctx.fillStyle = "rgba(255,255,255," + (0.25 + 0.5 * Math.abs(Math.sin(g.t * s[2] * 2 + s[0]))) + ")";
      ctx.fillRect(s[0], s[1], 1, 1);
    });
    // Boden
    ctx.fillStyle = "#3fd96b";
    ctx.fillRect(0, H - 8, W, 1);

    ctx.fillStyle = "#3fd96b";
    g.shields.forEach(function (s) { ctx.fillRect(s.x, s.y, 1, 1); });

    g.aliens.forEach(function (a) {
      if (!a.alive) return;
      const t = ALIENS[a.type];
      R.sprite(t.frames[g.march.frame], a.x, a.y, { x: t.color }, 1);
    });
    if (g.ufo) R.sprite(UFO, g.ufo.x, 22, { x: "#ff4f4f" }, 1);

    ctx.fillStyle = "#fff";
    g.bullets.forEach(function (b) { ctx.fillRect(b.x, b.y, 1, 4); });
    ctx.fillStyle = "#ffcf33";
    g.bombs.forEach(function (b) {
      const off = Math.sin(b.y / 3 + b.wiggle) > 0 ? 1 : -1;
      ctx.fillRect(b.x, b.y, 1, 2); ctx.fillRect(b.x + off, b.y + 2, 1, 2); ctx.fillRect(b.x, b.y + 4, 1, 1);
    });

    const ship = g.ship;
    if (ship.respawn <= 0 || Math.floor(g.t * 10) % 2) R.sprite(SHIP, ship.x, PLAYER_Y, { x: "#4de1ff" }, 1);

    if (g.pause > 0) R.text(g.level > 1 ? "Welle " + g.level : "Los!", W / 2, 150, 12, "#ffcf33");
  }

  R.register({
    name: "weltraum",
    title: "Weltraum-Wächter",
    intro: "Die Außerirdischen rücken an! Schieß sie ab, bevor sie landen. Hinter den Schutzschilden bist du sicher – aber die gehen nach und nach kaputt.",
    help: "◀ ▶ zum Fahren, 🔥 oder aufs Spielfeld tippen zum Schießen",
    width: W, height: H,
    lives: 3,
    tapKey: "a",
    controls: { dpad: "lr", actions: [{ key: "a", label: "🔥" }] },
    init: init,
    update: update,
    draw: draw
  });
})();
