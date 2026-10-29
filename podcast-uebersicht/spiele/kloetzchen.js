/* Klötzchen-Stapler – fallende Steine drehen, volle Reihen abräumen */
(function () {
  "use strict";
  const R = window.Retro;
  const COLS = 10, ROWS = 20, C = 12;          // Spielfeld 10×20, Kästchen 12 Pixel
  const BX = 4, BY = 4;                         // Lage des Spielfelds
  const W = BX + COLS * C + 64, H = BY * 2 + ROWS * C;

  // Die sieben Steine (je 4 Kästchen), eigene Farben
  const PIECES = {
    I: { color: "#4de1ff", cells: [[0, 1], [1, 1], [2, 1], [3, 1]], size: 4 },
    O: { color: "#ffcf33", cells: [[0, 0], [1, 0], [0, 1], [1, 1]], size: 2 },
    T: { color: "#b388ff", cells: [[1, 0], [0, 1], [1, 1], [2, 1]], size: 3 },
    S: { color: "#7dff6a", cells: [[1, 0], [2, 0], [0, 1], [1, 1]], size: 3 },
    Z: { color: "#ff4f6d", cells: [[0, 0], [1, 0], [1, 1], [2, 1]], size: 3 },
    J: { color: "#4d7cff", cells: [[0, 0], [0, 1], [1, 1], [2, 1]], size: 3 },
    L: { color: "#ff9f1c", cells: [[2, 0], [0, 1], [1, 1], [2, 1]], size: 3 }
  };
  const LINE_POINTS = [0, 100, 300, 500, 800];

  let g;

  // Siebener-Beutel: jeder Stein kommt einmal, dann wird neu gemischt
  function nextFromBag() {
    if (!g.bag.length) {
      g.bag = Object.keys(PIECES);
      for (let i = g.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = g.bag[i]; g.bag[i] = g.bag[j]; g.bag[j] = t;
      }
    }
    return g.bag.pop();
  }

  function cellsOf(piece) {
    // Kästchen nach "rot" Vierteldrehungen im Uhrzeigersinn
    const def = PIECES[piece.type];
    return def.cells.map(function (c) {
      let x = c[0], y = c[1];
      for (let r = 0; r < piece.rot; r++) { const nx = def.size - 1 - y; y = x; x = nx; }
      return [piece.x + x, piece.y + y];
    });
  }

  function fits(piece) {
    return cellsOf(piece).every(function (c) {
      return c[0] >= 0 && c[0] < COLS && c[1] < ROWS && (c[1] < 0 || !g.board[c[1]][c[0]]);
    });
  }

  function spawn() {
    const type = g.next;
    g.next = nextFromBag();
    g.piece = { type: type, rot: 0, x: type === "O" ? 4 : 3, y: type === "I" ? -1 : 0 };
    g.fall = 0;
    g.lock = 0;
    if (!fits(g.piece)) {
      g.dead = true;
      g.loseLife();
    }
  }

  function init(game) {
    g = game;
    g.board = Array.from({ length: ROWS }, function () { return new Array(COLS).fill(null); });
    g.bag = [];
    g.next = nextFromBag();
    g.lines = 0;
    g.flash = [];
    g.flashTime = 0;
    g.repeat = { left: 0, right: 0, down: 0 };
    g.dead = false;
    spawn();
  }

  function move(dx, dy) {
    const moved = { type: g.piece.type, rot: g.piece.rot, x: g.piece.x + dx, y: g.piece.y + dy };
    if (fits(moved)) { g.piece = moved; return true; }
    return false;
  }

  function rotate() {
    const turned = { type: g.piece.type, rot: (g.piece.rot + 1) % 4, x: g.piece.x, y: g.piece.y };
    // an der Wand oder an anderen Steinen etwas zur Seite rücken
    for (const dx of [0, -1, 1, -2, 2]) {
      const t = { type: turned.type, rot: turned.rot, x: turned.x + dx, y: turned.y };
      if (fits(t)) { g.piece = t; g.lock = Math.min(g.lock, 0.2); g.beep(660, 0.04, "square", 0.025); return; }
    }
  }

  function lockPiece() {
    const color = PIECES[g.piece.type].color;
    cellsOf(g.piece).forEach(function (c) { if (c[1] >= 0) g.board[c[1]][c[0]] = color; });
    g.beep(140, 0.06, "triangle", 0.05);
    const full = [];
    g.board.forEach(function (row, y) { if (row.every(Boolean)) full.push(y); });
    if (full.length) {
      g.flash = full;
      g.flashTime = 0.25;
      g.add(LINE_POINTS[full.length] * g.level);
      g.lines += full.length;
      g.level = 1 + Math.floor(g.lines / 10);
      if (full.length === 4) [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { g.beep(f, 0.1); }, i * 70); });
      else g.beep(880, 0.15, "square", 0.05, 300);
      g.piece = null;
    } else {
      spawn();
    }
  }

  function clearRows() {
    g.board = g.board.filter(function (row, y) { return g.flash.indexOf(y) < 0; });
    while (g.board.length < ROWS) g.board.unshift(new Array(COLS).fill(null));
    g.flash = [];
    spawn();
  }

  // Taste halten = wiederholen
  function held(key, dt, first, every) {
    if (!g.input[key]) { g.repeat[key] = 0; return false; }
    const before = g.repeat[key];
    g.repeat[key] += dt;
    if (before === 0) return true;
    return before < first ? g.repeat[key] >= first : Math.floor((g.repeat[key] - first) / every) > Math.floor((before - first) / every);
  }

  function update(game, dt) {
    g = game;
    if (g.dead) return;
    if (g.flashTime > 0) { g.flashTime -= dt; if (g.flashTime <= 0) clearRows(); return; }
    if (!g.piece) return;

    const sw = g.swipe();
    if (held("left", dt, 0.18, 0.06) || sw === "left") move(-1, 0);
    if (held("right", dt, 0.18, 0.06) || sw === "right") move(1, 0);
    if (g.pressed("a") || g.pressed("up") || sw === "up") rotate();
    if (g.pressed("b") || sw === "down") {
      let dropped = 0;
      while (move(0, 1)) dropped++;
      g.add(dropped * 2);
      lockPiece();
      return;
    }
    if (held("down", dt, 0.05, 0.04)) { if (move(0, 1)) { g.add(1); g.fall = 0; } }

    const interval = Math.max(0.07, 0.8 - (g.level - 1) * 0.07);
    g.fall += dt;
    if (g.fall >= interval) {
      g.fall = 0;
      if (move(0, 1)) g.lock = 0;
    }
    // kurz liegen lassen, damit man noch schieben kann
    const onGround = !fits({ type: g.piece.type, rot: g.piece.rot, x: g.piece.x, y: g.piece.y + 1 });
    if (onGround) { g.lock += dt; if (g.lock >= 0.5) lockPiece(); }
  }

  function drawCell(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, C, C);
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.fillRect(x, y, C, 2); ctx.fillRect(x, y, 2, C);
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.fillRect(x, y + C - 2, C, 2); ctx.fillRect(x + C - 2, y, 2, C);
  }

  function draw(ctx, game) {
    g = game;
    ctx.fillStyle = "#120c2b";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#05031a";
    ctx.fillRect(BX, BY, COLS * C, ROWS * C);
    ctx.fillStyle = "#1b1440";
    for (let x = 1; x < COLS; x++) ctx.fillRect(BX + x * C, BY, 1, ROWS * C);
    for (let y = 1; y < ROWS; y++) ctx.fillRect(BX, BY + y * C, COLS * C, 1);

    g.board.forEach(function (row, y) {
      row.forEach(function (color, x) {
        if (!color) return;
        const blink = g.flash.indexOf(y) >= 0 && Math.floor(g.flashTime * 20) % 2;
        drawCell(ctx, BX + x * C, BY + y * C, blink ? "#ffffff" : color);
      });
    });

    if (g.piece && !g.dead) {
      // Schatten: wo der Stein landen würde
      const ghost = { type: g.piece.type, rot: g.piece.rot, x: g.piece.x, y: g.piece.y };
      while (fits({ type: ghost.type, rot: ghost.rot, x: ghost.x, y: ghost.y + 1 })) ghost.y++;
      ctx.fillStyle = "rgba(255,255,255,.14)";
      cellsOf(ghost).forEach(function (c) { if (c[1] >= 0) ctx.fillRect(BX + c[0] * C + 1, BY + c[1] * C + 1, C - 2, C - 2); });
      const color = PIECES[g.piece.type].color;
      cellsOf(g.piece).forEach(function (c) { if (c[1] >= 0) drawCell(ctx, BX + c[0] * C, BY + c[1] * C, color); });
    }

    // Seitenleiste: nächster Stein, Reihen, Level
    const sx = BX + COLS * C + 8;
    R.text("Nächster", sx + 26, 14, 7, "#ffcf33");
    ctx.fillStyle = "#05031a";
    ctx.fillRect(sx, 22, 52, 36);
    const n = PIECES[g.next];
    const small = 9;
    const minX = Math.min.apply(null, n.cells.map(function (c) { return c[0]; }));
    const maxX = Math.max.apply(null, n.cells.map(function (c) { return c[0]; }));
    const minY = Math.min.apply(null, n.cells.map(function (c) { return c[1]; }));
    const maxY = Math.max.apply(null, n.cells.map(function (c) { return c[1]; }));
    const ox = sx + 26 - (maxX - minX + 1) * small / 2, oy = 40 - (maxY - minY + 1) * small / 2;
    n.cells.forEach(function (c) {
      ctx.fillStyle = n.color;
      ctx.fillRect(ox + (c[0] - minX) * small, oy + (c[1] - minY) * small, small - 1, small - 1);
    });
    R.text("Reihen", sx + 26, 78, 7, "#4de1ff");
    R.text(String(g.lines), sx + 26, 90, 11, "#fff");
    R.text("Level", sx + 26, 112, 7, "#4de1ff");
    R.text(String(g.level), sx + 26, 124, 11, "#fff");
  }

  R.register({
    name: "kloetzchen",
    title: "Klötzchen-Stapler",
    intro: "Die Steine fallen von oben. Dreh und schieb sie so, dass volle Reihen entstehen – die verschwinden dann! Je mehr Reihen auf einmal, desto mehr Punkte.",
    help: "◀ ▶ schieben, ▼ schneller, ⟳ drehen, ⤓ ganz fallen lassen – oder wischen (hoch = drehen, runter = fallen lassen)",
    width: W, height: H,
    lives: 1,
    controls: { dpad: "4", actions: [{ key: "a", label: "⟳" }, { key: "b", label: "⤓" }] },
    init: init,
    update: update,
    draw: draw
  });
})();
