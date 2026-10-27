/* Flitzer-Rennen – den anderen Autos ausweichen und Sterne sammeln */
(function () {
  "use strict";
  const R = window.Retro;
  const W = 200, H = 300;
  const ROAD_L = 34, ROAD_R = 166;
  const LANES = [56, 100, 144]; // Mitte der Spuren
  const CAR_W = 14, CAR_H = 24;
  const PLAYER_Y = 246;
  const COLORS = ["#ff4f8b", "#4de1ff", "#ffcf33", "#b388ff", "#ff9f1c", "#7dff6a"];

  let g;

  function init(game) {
    g = game;
    g.car = { x: LANES[1] - CAR_W / 2, crash: 0 };
    g.speed = 110;
    g.scroll = 0;
    g.dist = 0;
    g.traffic = [];
    g.stars = [];
    g.spawn = 1.2;
    g.starSpawn = 3;
    g.pause = 1.2;
  }

  function freeLane(y) {
    const free = LANES.filter(function (lx) {
      return !g.traffic.some(function (c) { return Math.abs(c.x + CAR_W / 2 - lx) < 4 && Math.abs(c.y - y) < 60; });
    });
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function update(game, dt) {
    g = game;
    if (g.pause > 0) { g.pause -= dt; return; }
    const car = g.car;

    // Lenken (Knöpfe, Tastatur oder Wischen springt eine Spur weiter)
    const sw = g.swipe();
    if (sw === "left" || sw === "right") {
      const center = car.x + CAR_W / 2;
      const lane = LANES.reduce(function (best, lx) { return Math.abs(lx - center) < Math.abs(best - center) ? lx : best; });
      const idx = R.clamp(LANES.indexOf(lane) + (sw === "left" ? -1 : 1), 0, 2);
      car.target = LANES[idx] - CAR_W / 2;
    }
    if (g.input.left) { car.x -= 110 * dt; car.target = null; }
    if (g.input.right) { car.x += 110 * dt; car.target = null; }
    if (car.target != null) {
      const d = car.target - car.x, step = 150 * dt;
      car.x = Math.abs(d) <= step ? car.target : car.x + Math.sign(d) * step;
      if (car.x === car.target) car.target = null;
    }
    car.x = R.clamp(car.x, ROAD_L + 2, ROAD_R - CAR_W - 2);

    // Tempo steigt langsam
    if (car.crash > 0) {
      car.crash -= dt;
      g.speed = Math.max(70, g.speed - 60 * dt);
    } else {
      g.speed = Math.min(300, g.speed + 4 * dt);
    }
    g.scroll = (g.scroll + g.speed * dt) % 40;
    g.dist += g.speed * dt;
    while (g.dist >= 50) { g.dist -= 50; g.add(5); }

    // Andere Autos fahren langsamer als wir – sie kommen also von oben entgegen
    g.spawn -= dt;
    if (g.spawn <= 0) {
      g.spawn = R.rand(0.55, 1.2) * 130 / g.speed + 0.25;
      const lane = freeLane(-CAR_W * 2);
      if (lane != null) {
        g.traffic.push({ x: lane - CAR_W / 2, y: -CAR_H - 4, own: R.rand(30, 80), color: COLORS[R.randInt(0, COLORS.length - 1)] });
      }
    }
    g.traffic.forEach(function (c) { c.y += (g.speed - c.own) * dt; });
    g.traffic = g.traffic.filter(function (c) { return c.y < H + 10; });

    g.starSpawn -= dt;
    if (g.starSpawn <= 0) {
      g.starSpawn = R.rand(2.5, 5);
      const lane = freeLane(-10);
      if (lane != null) g.stars.push({ x: lane, y: -10 });
    }
    g.stars.forEach(function (s) { s.y += g.speed * dt; });

    const me = { x: car.x + 1, y: PLAYER_Y + 2, w: CAR_W - 2, h: CAR_H - 4 };
    g.stars = g.stars.filter(function (s) {
      if (R.overlap(me, { x: s.x - 5, y: s.y - 5, w: 10, h: 10 })) {
        g.add(50);
        g.beep(988, 0.08, "square", 0.04); setTimeout(function () { g.beep(1319, 0.12, "square", 0.04); }, 80);
        return false;
      }
      return s.y < H + 10;
    });

    if (car.crash <= 0) {
      for (const c of g.traffic) {
        if (R.overlap(me, { x: c.x + 1, y: c.y + 2, w: CAR_W - 2, h: CAR_H - 4 })) {
          c.hit = true;
          g.traffic = g.traffic.filter(function (o) { return o !== c; });
          if (g.loseLife()) car.crash = 1.8;
          break;
        }
      }
    }
  }

  function drawCar(ctx, x, y, color, player) {
    // Reifen
    ctx.fillStyle = "#111";
    ctx.fillRect(x - 2, y + 3, 3, 6); ctx.fillRect(x + CAR_W - 1, y + 3, 3, 6);
    ctx.fillRect(x - 2, y + CAR_H - 9, 3, 7); ctx.fillRect(x + CAR_W - 1, y + CAR_H - 9, 3, 7);
    ctx.fillStyle = color;
    if (player) {
      // Rennwagen: schmale Nase, Front- und Heckflügel
      ctx.fillRect(x, y, CAR_W, 2);                 // Frontflügel
      ctx.fillRect(x + 5, y + 2, 4, 8);             // Nase
      ctx.fillRect(x + 2, y + 9, CAR_W - 4, 11);    // Mittelteil
      ctx.fillRect(x - 1, y + CAR_H - 3, CAR_W + 2, 3); // Heckflügel
      ctx.fillStyle = "#fff";
      ctx.fillRect(x + 5, y + 11, 4, 4);            // Helm
      ctx.fillStyle = "#1b1440";
      ctx.fillRect(x + 6, y + 12, 2, 2);
    } else {
      ctx.fillRect(x, y + 1, CAR_W, CAR_H - 2);
      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.fillRect(x + 2, y + 5, CAR_W - 4, 4);     // Frontscheibe
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.fillRect(x + 2, y + 15, CAR_W - 4, 3);    // Heckscheibe
    }
  }

  function draw(ctx, game) {
    g = game;
    // Wiese mit Streifen
    for (let y = -40; y < H; y += 20) {
      ctx.fillStyle = Math.floor((y + 40) / 20) % 2 ? "#2f9e44" : "#37b24d";
      ctx.fillRect(0, y + g.scroll, W, 20);
    }
    // Straße
    ctx.fillStyle = "#4a4a5a";
    ctx.fillRect(ROAD_L, 0, ROAD_R - ROAD_L, H);
    // rot-weiße Randsteine
    for (let y = -40; y < H; y += 10) {
      ctx.fillStyle = Math.floor((y + 40) / 10) % 2 ? "#ff3b3b" : "#ffffff";
      ctx.fillRect(ROAD_L - 4, y + g.scroll, 4, 10);
      ctx.fillRect(ROAD_R, y + g.scroll, 4, 10);
    }
    // Spurmarkierungen
    ctx.fillStyle = "#e9e9f0";
    [78, 122].forEach(function (x) {
      for (let y = -40; y < H; y += 40) ctx.fillRect(x - 1, y + g.scroll, 2, 18);
    });

    g.stars.forEach(function (s) {
      ctx.fillStyle = "#ffcf33";
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 2.5 : 6, a = -Math.PI / 2 + i * Math.PI / 5 + g.t * 2;
        ctx.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r);
      }
      ctx.fill();
    });
    g.traffic.forEach(function (c) { drawCar(ctx, c.x, c.y, c.color, false); });

    const car = g.car;
    if (car.crash <= 0 || Math.floor(g.t * 10) % 2) drawCar(ctx, car.x, PLAYER_Y, "#ff2d2d", true);

    // Tacho
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.fillRect(W - 50, H - 18, 46, 14);
    R.text(Math.round(g.speed * 0.9) + " km/h", W - 7, H - 11, 8, "#fff", "right");
    if (g.pause > 0) R.text("Los!", W / 2, 150, 14, "#ffcf33");
  }

  R.register({
    name: "flitzer",
    title: "Flitzer-Rennen",
    intro: "Rase über die Strecke und weiche den anderen Autos aus! Sammle Sterne für Extrapunkte. Je länger du fährst, desto schneller wird es.",
    help: "◀ ▶ zum Lenken oder nach links/rechts wischen",
    width: W, height: H,
    lives: 3,
    controls: { dpad: "lr" },
    init: init,
    update: update,
    draw: draw
  });
})();
