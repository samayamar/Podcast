/* Mampf-Monster – Punkte im Labyrinth futtern, den Gespenstern ausweichen */
(function () {
  "use strict";
  const R = window.Retro;
  const T = 12; // Kachelgröße in Spielpixeln
  const MAZE = [
    "###################",
    "#o...............o#",
    "#.#####.###.#####.#",
    "#.#####.###.#####.#",
    "#.................#",
    "#.##.##.###.##.##.#",
    "#.##.##.###.##.##.#",
    "#........ ........#",
    "#.##.####-####.##.#",
    "#.##.###GGG###.##.#",
    " ....###GGG###.... ",
    "#.##.###GGG###.##.#",
    "#.##.#########.##.#",
    "#........P........#",
    "#.##.##.###.##.##.#",
    "#.##.##.###.##.##.#",
    "#.................#",
    "#.##.##.###.##.##.#",
    "#.##.##.###.##.##.#",
    "#o...............o#",
    "###################"
  ];
  const W = MAZE[0].length, H = MAZE.length;
  const DIRS = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };
  const NONE = { x: 0, y: 0 };
  const EXIT = { x: 9, y: 7 };   // Feld über der Tür des Gespensterhauses
  const HOME = { x: 9, y: 10 };  // Mitte des Gespensterhauses
  const GHOST_COLORS = ["#ff4f8b", "#ff9f1c", "#b388ff"];

  let g; // Spielzustand (vom Retro-Rahmen)

  function cell(x, y) {
    if (y < 0 || y >= H) return "#";
    return MAZE[y][((x % W) + W) % W];
  }
  function wall(x, y) { const c = cell(x, y); return c === "#" || c === "G" || c === "-"; }
  function same(a, b) { return a.x === b.x && a.y === b.y; }
  function opposite(a, b) { return a.x === -b.x && a.y === -b.y && (a.x || a.y); }

  function resetLevel() {
    g.dots = MAZE.map(function (row) { return row.split("").map(function (c) { return c === "." ? 1 : c === "o" ? 2 : 0; }); });
    g.dotsLeft = g.dots.reduce(function (n, row) { return n + row.filter(Boolean).length; }, 0);
    resetPositions();
  }

  function resetPositions() {
    const speedUp = Math.min(g.level - 1, 6);
    g.player = { x: 9, y: 13, dir: DIRS.left, want: DIRS.left, speed: 5.4 + speedUp * 0.2, mouth: 0 };
    g.ghosts = GHOST_COLORS.map(function (color, i) {
      return { x: 8 + i, y: 10, dir: DIRS.up, color: color, mode: "house", wait: 1 + i * 3,
               speed: 4 + speedUp * 0.3, personality: i };
    });
    g.fright = 0;
    g.combo = 0;
    g.pause = 1.6; // kurz "Los!" anzeigen
  }

  /* Bewegung von Kachelmitte zu Kachelmitte */
  function move(e, dt, onCenter, canEnter) {
    let d = e.speed * dt;
    for (let guard = 0; d > 1e-9 && guard < 8; guard++) {
      const cx = Math.round(e.x), cy = Math.round(e.y);
      const atCenter = Math.abs(e.x - cx) < 1e-6 && Math.abs(e.y - cy) < 1e-6;
      if (atCenter) {
        e.x = cx; e.y = cy;
        if (e.x < 0) e.x += W;
        if (e.x >= W) e.x -= W;
        onCenter(e);
        if (same(e.dir, NONE) || !canEnter(e.x + e.dir.x, e.y + e.dir.y)) { e.dir = NONE; return; }
        const m = Math.min(d, 1);
        e.x += e.dir.x * m; e.y += e.dir.y * m; d -= m;
        continue;
      }
      if (same(e.dir, NONE)) return;
      const ahead = e.dir.x > 0 ? Math.ceil(e.x) - e.x : e.dir.x < 0 ? e.x - Math.floor(e.x)
        : e.dir.y > 0 ? Math.ceil(e.y) - e.y : e.y - Math.floor(e.y);
      const m = Math.min(d, ahead);
      e.x += e.dir.x * m; e.y += e.dir.y * m; d -= m;
    }
  }

  function playerCenter(p) {
    const v = g.dots[p.y] && g.dots[p.y][p.x];
    if (v) {
      g.dots[p.y][p.x] = 0;
      g.dotsLeft--;
      if (v === 1) { g.add(10); g.beep(g.t % 0.2 < 0.1 ? 520 : 600, 0.04, "square", 0.025); }
      else {
        g.add(50);
        g.fright = Math.max(3, 7 - g.level * 0.5);
        g.combo = 0;
        g.ghosts.forEach(function (gh) {
          if (gh.mode === "chase") { gh.mode = "fright"; gh.dir = { x: -gh.dir.x, y: -gh.dir.y }; }
        });
        g.beep(300, 0.3, "triangle", 0.06, 500);
      }
    }
    if (!wall(p.x + p.want.x, p.y + p.want.y)) p.dir = p.want;
  }

  // Gespenst wählt an Kreuzungen eine Richtung
  function ghostCenter(gh) {
    const options = Object.keys(DIRS).map(function (k) { return DIRS[k]; }).filter(function (d) {
      return !wall(gh.x + d.x, gh.y + d.y) && !opposite(d, gh.dir);
    });
    if (!options.length) { gh.dir = { x: -gh.dir.x, y: -gh.dir.y }; return; }
    if (gh.mode === "fright" || Math.random() < 0.18) {
      gh.dir = options[Math.floor(Math.random() * options.length)];
      return;
    }
    let target;
    const p = g.player;
    if (gh.mode === "eaten") target = EXIT;
    else if (gh.personality === 1) target = { x: p.x + p.dir.x * 4, y: p.y + p.dir.y * 4 };
    else if (gh.personality === 2 && Math.hypot(gh.x - p.x, gh.y - p.y) < 6) target = { x: 1, y: H - 2 };
    else target = { x: Math.round(p.x), y: Math.round(p.y) };
    options.sort(function (a, b) {
      return Math.hypot(gh.x + a.x - target.x, gh.y + a.y - target.y) - Math.hypot(gh.x + b.x - target.x, gh.y + b.y - target.y);
    });
    gh.dir = options[0];
  }

  // Gerade Linie zu einem Punkt (im Haus, wo keine Wände gelten)
  function glide(gh, to, speed, dt) {
    const dx = to.x - gh.x, dy = to.y - gh.y, dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= step) { gh.x = to.x; gh.y = to.y; return true; }
    gh.x += dx / dist * step; gh.y += dy / dist * step;
    return false;
  }

  function updateGhost(gh, dt) {
    const speedUp = Math.min(g.level - 1, 6);
    if (gh.mode === "house") {
      gh.wait -= dt;
      gh.y = HOME.y + Math.sin(g.t * 6 + gh.personality) * 0.25;
      if (gh.wait <= 0) gh.mode = "leave";
    } else if (gh.mode === "leave") {
      const target = Math.abs(gh.x - EXIT.x) > 0.01 ? { x: EXIT.x, y: HOME.y } : EXIT;
      if (glide(gh, target, 3, dt) && same(target, EXIT)) {
        gh.mode = g.fright > 0 ? "fright" : "chase";
        gh.dir = Math.random() < 0.5 ? DIRS.left : DIRS.right;
      }
    } else if (gh.mode === "enter") {
      if (glide(gh, HOME, 6, dt)) { gh.mode = "house"; gh.wait = 1.5; }
    } else {
      gh.speed = gh.mode === "eaten" ? 9 : gh.mode === "fright" ? 2.8 : 4 + speedUp * 0.3;
      move(gh, dt, ghostCenter, function (x, y) { return !wall(x, y); });
      if (gh.mode === "eaten" && Math.abs(gh.x - EXIT.x) < 0.1 && Math.abs(gh.y - EXIT.y) < 0.1) {
        gh.x = EXIT.x; gh.y = EXIT.y; gh.mode = "enter";
      }
    }
  }

  function update(game, dt) {
    g = game;
    if (g.pause > 0) { g.pause -= dt; return; }
    const p = g.player;

    const sw = g.swipe();
    ["left", "right", "up", "down"].forEach(function (k) { if (g.input[k] || g.pressed(k)) p.want = DIRS[k]; });
    if (sw) p.want = DIRS[sw];
    if (opposite(p.want, p.dir)) p.dir = p.want;

    move(p, dt, playerCenter, function (x, y) { return !wall(x, y); });
    p.mouth += dt * 12;

    if (g.fright > 0) {
      g.fright -= dt;
      if (g.fright <= 0) g.ghosts.forEach(function (gh) { if (gh.mode === "fright") gh.mode = "chase"; });
    }
    g.ghosts.forEach(function (gh) { updateGhost(gh, dt); });

    // Zusammenstöße
    for (const gh of g.ghosts) {
      if (Math.hypot(gh.x - p.x, gh.y - p.y) > 0.7) continue;
      if (gh.mode === "fright") {
        gh.mode = "eaten";
        g.combo++;
        g.add(100 * Math.pow(2, g.combo));
        g.beep(800, 0.2, "square", 0.05, 600);
      } else if (gh.mode === "chase" || gh.mode === "leave") {
        if (g.loseLife()) resetPositions();
        return;
      }
    }

    if (g.dotsLeft <= 0) {
      g.level++;
      g.add(500);
      g.beep(660, 0.12); setTimeout(function () { g.beep(880, 0.2); }, 130);
      resetLevel();
    }
  }

  /* ---------- Zeichnen ---------- */

  function drawMaze(ctx) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = MAZE[y][x];
        const px = x * T, py = y * T;
        if (c === "#") {
          ctx.fillStyle = "#2a1f8f";
          ctx.fillRect(px, py, T, T);
          ctx.fillStyle = "#7c6cff";
          if (!wall(x, y - 1) && y > 0) ctx.fillRect(px, py, T, 2);
          if (!wall(x, y + 1) && y < H - 1) ctx.fillRect(px, py + T - 2, T, 2);
          if (!wall(x - 1, y) && x > 0) ctx.fillRect(px, py, 2, T);
          if (!wall(x + 1, y) && x < W - 1) ctx.fillRect(px + T - 2, py, 2, T);
        } else if (c === "-") {
          ctx.fillStyle = "#ff8fc0";
          ctx.fillRect(px, py + T / 2 - 1, T, 3);
        } else if (c === "G") {
          ctx.fillStyle = "#1a1350";
          ctx.fillRect(px, py, T, T);
        }
        const dot = g.dots && g.dots[y][x];
        if (dot === 1) {
          ctx.fillStyle = "#ffe8a3";
          ctx.fillRect(px + T / 2 - 1.5, py + T / 2 - 1.5, 3, 3);
        } else if (dot === 2 && Math.floor(g.t * 4) % 2 === 0) {
          ctx.fillStyle = "#ffcf33";
          ctx.beginPath(); ctx.arc(px + T / 2, py + T / 2, 4.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  function drawPlayer(ctx) {
    const p = g.player;
    const cx = p.x * T + T / 2, cy = p.y * T + T / 2;
    const angle = p.dir.x > 0 ? 0 : p.dir.x < 0 ? Math.PI : p.dir.y > 0 ? Math.PI / 2 : p.dir.y < 0 ? -Math.PI / 2 : 0;
    const open = (Math.sin(p.mouth) + 1) * 0.35 + 0.05;
    ctx.fillStyle = "#3fd96b";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 6, angle + open, angle + Math.PI * 2 - open);
    ctx.closePath();
    ctx.fill();
    // ein Auge
    const ex = cx + Math.cos(angle - 1.6) * 3, ey = cy + Math.sin(angle - 1.6) * 3;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000"; ctx.fillRect(ex - 0.6 + p.dir.x * 0.6, ey - 0.6 + p.dir.y * 0.6, 1.2, 1.2);
  }

  function drawGhost(ctx, gh) {
    const cx = gh.x * T + T / 2, cy = gh.y * T + T / 2;
    if (gh.mode !== "eaten" && gh.mode !== "enter") {
      let color = gh.color;
      if (gh.mode === "fright") color = g.fright < 2 && Math.floor(g.t * 6) % 2 ? "#ffffff" : "#3a6bff";
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, 5.8, 0, Math.PI * 2); ctx.fill();
      // drei kleine Füße
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.arc(cx + i * 3.6, cy + 5 + Math.sin(g.t * 10 + i) * 0.6, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (gh.mode === "fright") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(cx - 3, cy - 2, 2, 2); ctx.fillRect(cx + 1, cy - 2, 2, 2);
      ctx.fillRect(cx - 3, cy + 2, 6, 1);
      return;
    }
    // Augen schauen in Laufrichtung
    [-2.4, 2.4].forEach(function (ox) {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx + ox, cy - 1.5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1b1440"; ctx.fillRect(cx + ox - 0.8 + gh.dir.x, cy - 2.3 + gh.dir.y, 1.6, 1.6);
    });
  }

  function draw(ctx, game) {
    g = game;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W * T, H * T);
    drawMaze(ctx);
    g.ghosts.forEach(function (gh) { drawGhost(ctx, gh); });
    drawPlayer(ctx);
    if (g.pause > 0) {
      R.text(g.level > 1 ? "Level " + g.level : "Los!", W * T / 2, 7 * T + T / 2, 11, "#ffcf33");
    }
  }

  R.register({
    name: "mampf",
    title: "Mampf-Monster",
    intro: "Futtere alle Punkte im Labyrinth! Die großen Pillen machen die Gespenster für kurze Zeit blau – dann kannst du sie fangen.",
    help: "Wischen oder Pfeiltasten zum Lenken",
    width: W * T,
    height: H * T,
    lives: 3,
    controls: { dpad: "4" },
    init: function (game) { g = game; resetLevel(); },
    update: update,
    draw: draw
  });
})();
