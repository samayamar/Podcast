/* Dino-Sprint – über Kakteen springen, unter Flugsauriern abtauchen */
(function () {
  "use strict";
  const R = window.Retro;
  const W = 300, H = 150;
  const GROUND = 128;
  const DINO_X = 30;

  const RUN = [
    ["......gggggg....", ".....gggggggg...", ".....ggwkgggg...", ".....gggggggggg.", ".....gggggg.....",
     ".s...gggggggg...", "ss..gggggg......", "sggggggggg......", "gggggggggggg....", ".ggggggggg.g....",
     "..gggggggg......", "...gggggg.......", "...gg..gg.......", "...gg...gg......"],
    ["......gggggg....", ".....gggggggg...", ".....ggwkgggg...", ".....gggggggggg.", ".....gggggg.....",
     ".s...gggggggg...", "ss..gggggg......", "sggggggggg......", "gggggggggggg....", ".ggggggggg.g....",
     "..gggggggg......", "...gggggg.......", "....gg.gg.......", "...gg...g......."]
  ];
  const DUCK = [
    ["..............gggggg..", "s...........gggggggg..", "ss.gggggggggggwkggggg.", "sggggggggggggggggggggg",
     "ggggggggggggggggg.....", ".gggggggggggggg.......", "..gg...gg............", "..gg....gg..........."],
    ["..............gggggg..", "s...........gggggggg..", "ss.gggggggggggwkggggg.", "sggggggggggggggggggggg",
     "ggggggggggggggggg.....", ".gggggggggggggg.......", "...gg.gg.............", "..gg....g............"]
  ];
  const DINO_COLORS = { g: "#3fd96b", s: "#2f9e44", w: "#fff", k: "#1b1440" };
  const BIRD = [
    ["....pp........", "...pppp.......", "pppppppppppp..", "...ppppppppppy", "......pp......", "..............", ".............."],
    ["..............", "...pppp.......", "pppppppppppp..", "...ppppppppppy", "....pppp......", "....ppp.......", "....pp........"]
  ];
  const BIRD_COLORS = { p: "#b388ff", y: "#ffcf33" };

  let g;

  function init(game) {
    g = game;
    g.dino = { y: 0, vy: 0, duck: false, step: 0 };
    g.obstacles = [];
    g.clouds = [{ x: 80, y: 30 }, { x: 220, y: 50 }];
    g.speed = 150;
    g.next = 1.2;
    g.dist = 0;
    g.ground = 0;
    g.pause = 0.6;
  }

  function night() { return Math.floor(g.score / 700) % 2 === 1; }

  function addObstacle() {
    if (g.score > 250 && Math.random() < 0.3) {
      const heights = [GROUND - 14, GROUND - 30, GROUND - 44];
      g.obstacles.push({ type: "bird", x: W + 10, y: heights[R.randInt(0, 2)], w: 14, h: 7 });
    } else {
      const big = Math.random() < 0.4;
      const count = R.randInt(1, big ? 2 : 3);
      const w = (big ? 10 : 7) * count + (count - 1) * 2;
      g.obstacles.push({ type: "cactus", x: W + 10, y: GROUND - (big ? 24 : 16), w: w, h: big ? 24 : 16, big: big, count: count });
    }
  }

  function update(game, dt) {
    g = game;
    if (g.pause > 0) { g.pause -= dt; return; }
    const d = g.dino;

    // Springen (Knopf, Tippen, Leertaste, Pfeil hoch) und Ducken
    const jump = g.pressed("a") || g.pressed("up");
    d.duck = g.input.down && d.y === 0;
    if (jump && d.y === 0) { d.vy = 330; g.beep(520, 0.08, "square", 0.04, 300); }
    if (d.y > 0 || d.vy > 0) {
      d.vy -= (g.input.down ? 1800 : 1000) * dt; // nach unten drücken = schneller landen
      d.y = Math.max(0, d.y + d.vy * dt);
      if (d.y === 0) d.vy = 0;
    }
    d.step += dt * g.speed / 18;

    g.speed = Math.min(420, g.speed + 6 * dt);
    g.ground = (g.ground + g.speed * dt) % 12;
    g.dist += g.speed * dt;
    while (g.dist >= 15) {
      g.dist -= 15;
      g.add(1);
      if (g.score % 100 === 0) { g.beep(880, 0.06); setTimeout(function () { g.beep(1175, 0.1); }, 70); }
    }

    g.next -= dt;
    if (g.next <= 0) {
      addObstacle();
      g.next = R.rand(0.75, 1.6) * 220 / g.speed + 0.35;
    }
    g.obstacles.forEach(function (o) { o.x -= (o.type === "bird" ? g.speed + 25 : g.speed) * dt; });
    g.obstacles = g.obstacles.filter(function (o) { return o.x + o.w > -10; });
    g.clouds.forEach(function (c) { c.x -= g.speed * 0.2 * dt; if (c.x < -30) { c.x = W + R.rand(10, 80); c.y = R.rand(15, 60); } });

    // Zusammenstoß (etwas großzügig, damit es fair bleibt)
    const box = d.duck
      ? { x: DINO_X + 2, y: GROUND - 8 - d.y, w: 18, h: 7 }
      : { x: DINO_X + 4, y: GROUND - 13 - d.y, w: 9, h: 12 };
    for (const o of g.obstacles) {
      if (R.overlap(box, { x: o.x + 2, y: o.y + 2, w: o.w - 4, h: o.h - 3 })) {
        g.loseLife();
        return;
      }
    }
  }

  function drawCactus(ctx, o) {
    ctx.fillStyle = night() ? "#7dff6a" : "#2f9e44";
    const cw = o.big ? 10 : 7;
    for (let i = 0; i < o.count; i++) {
      const x = o.x + i * (cw + 2);
      ctx.fillRect(x + cw / 2 - 2, o.y, 4, o.h);                 // Stamm
      ctx.fillRect(x, o.y + o.h * 0.35, 2, o.h * 0.3);            // linker Arm
      ctx.fillRect(x, o.y + o.h * 0.6, cw / 2, 2);
      ctx.fillRect(x + cw - 2, o.y + o.h * 0.2, 2, o.h * 0.3);    // rechter Arm
      ctx.fillRect(x + cw / 2, o.y + o.h * 0.45, cw / 2, 2);
    }
  }

  function draw(ctx, game) {
    g = game;
    const dark = night();
    ctx.fillStyle = dark ? "#151032" : "#fff7e0";
    ctx.fillRect(0, 0, W, H);
    if (dark) {
      ctx.fillStyle = "#fff";
      [[20, 20], [70, 40], [130, 15], [200, 35], [260, 22], [240, 60]].forEach(function (s) { ctx.fillRect(s[0], s[1], 1, 1); });
      ctx.fillStyle = "#ffe8a3"; ctx.beginPath(); ctx.arc(250, 30, 8, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = "#ffcf33"; ctx.beginPath(); ctx.arc(255, 28, 10, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = dark ? "#3b2d7a" : "#ffffff";
    g.clouds.forEach(function (c) {
      ctx.fillRect(c.x, c.y, 22, 5); ctx.fillRect(c.x + 4, c.y - 3, 12, 3);
    });

    // Boden mit Steinchen
    ctx.fillStyle = dark ? "#b388ff" : "#8a6d3b";
    ctx.fillRect(0, GROUND, W, 1);
    for (let x = -g.ground; x < W; x += 12) {
      ctx.fillRect(x, GROUND + 4, 3, 1);
      ctx.fillRect(x + 7, GROUND + 8, 2, 1);
    }

    g.obstacles.forEach(function (o) {
      if (o.type === "cactus") drawCactus(ctx, o);
      else R.sprite(BIRD[Math.floor(g.t * 6) % 2], o.x, o.y, BIRD_COLORS, 1);
    });

    const d = g.dino;
    const frame = d.y > 0 ? 0 : Math.floor(d.step) % 2;
    if (d.duck) R.sprite(DUCK[frame], DINO_X, GROUND - 8, DINO_COLORS, 1);
    else R.sprite(RUN[frame], DINO_X, GROUND - 14 - Math.round(d.y), DINO_COLORS, 1);

    if (g.pause > 0) R.text("Tippen zum Springen!", W / 2, 60, 9, dark ? "#ffcf33" : "#6a4cff");
  }

  R.register({
    name: "dino",
    title: "Dino-Sprint",
    intro: "Der kleine Dino rennt los! Spring über die Kakteen und duck dich unter den Flugsauriern. Es wird immer schneller – wie weit kommst du?",
    help: "Aufs Spielfeld tippen oder ⤒ zum Springen, ▼ zum Ducken",
    width: W, height: H,
    lives: 1,
    tapKey: "a",
    controls: { actions: [{ key: "down", label: "▼" }, { key: "a", label: "⤒" }] },
    init: init,
    update: update,
    draw: draw
  });
})();
