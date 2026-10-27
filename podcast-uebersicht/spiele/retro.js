/* SpotiMy-Retro-Spiele: gemeinsame Grundlage
   Spielschleife, Touch-Knöpfe, Tastatur, Wischen, Start-/Ende-Bildschirm, Rekord, Töne.
   Ein Spiel meldet sich mit Retro.register({...}) an (siehe mampf.js usw.). */
(function () {
  "use strict";

  const GAMES = ["mampf", "weltraum", "fass", "rohr", "flitzer", "dino"];
  const RES = 3; // interne Auflösung je Spielpixel (scharf auf Retina-Displays)

  const $ = function (id) { return document.getElementById(id); };
  const canvas = $("screen");
  const ctx = canvas.getContext("2d");
  const overlay = $("overlay");

  let def = null;   // Spiel-Definition
  let game = null;  // Zustand des laufenden Spiels
  let state = "title"; // title | play | paused | over
  let last = 0;
  let audio = null;

  const input = { left: false, right: false, up: false, down: false, a: false, b: false };
  let pressed = {};
  let swipe = null;

  /* ---------- Hilfsfunktionen für die Spiele ---------- */

  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // Kleine Pixelgrafik aus Textzeilen zeichnen: jedes Zeichen = eine Farbe aus der Palette
  function sprite(rows, x, y, palette, px, flip) {
    px = px || 1;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const color = palette[row[c]];
        if (!color) continue;
        ctx.fillStyle = color;
        const cx = flip ? row.length - 1 - c : c;
        ctx.fillRect(x + cx * px, y + r * px, px, px);
      }
    }
  }

  function text(str, x, y, size, color, align) {
    ctx.fillStyle = color || "#fff";
    ctx.font = "800 " + (size || 10) + "px ui-rounded, system-ui, sans-serif";
    ctx.textAlign = align || "center";
    ctx.textBaseline = "middle";
    ctx.fillText(str, x, y);
  }

  // Retro-Ton (erst nach dem ersten Antippen möglich)
  function beep(freq, dur, type, vol, slide) {
    if (!audio) return;
    try {
      const t = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + (dur || 0.08));
      gain.gain.setValueAtTime(vol || 0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.08));
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + (dur || 0.08) + 0.02);
    } catch (e) { /* ohne Ton weiter */ }
  }

  function unlockAudio() {
    if (audio) { if (audio.state === "suspended") audio.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audio = new AC();
  }

  /* ---------- Rekord ---------- */

  function recordKey() { return "spotimy-rekord-" + def.name; }
  function getRecord() {
    try { return Number(localStorage.getItem(recordKey())) || 0; } catch (e) { return 0; }
  }
  function setRecord(v) {
    try { localStorage.setItem(recordKey(), String(v)); } catch (e) { /* privat: ohne Rekord */ }
  }

  /* ---------- Spielzustand ---------- */

  function newGame() {
    game = {
      w: def.width, h: def.height,
      input: input,
      score: 0, lives: def.lives || 3, level: 1, t: 0,
      pressed: function (key) { const v = pressed[key]; pressed[key] = false; return !!v; },
      swipe: function () { const s = swipe; swipe = null; return s; },
      add: function (points) { game.score += points; },
      // Leben verlieren; gibt false zurück, wenn das Spiel vorbei ist
      loseLife: function () {
        game.lives--;
        beep(220, 0.35, "sawtooth", 0.06, -180);
        if (game.lives <= 0) { gameOver(); return false; }
        return true;
      },
      beep: beep
    };
    def.init(game);
  }

  function showOverlay(title, message, button) {
    $("overlay-title").textContent = title;
    $("overlay-text").textContent = message;
    $("overlay-button").textContent = button;
    $("overlay-help").textContent = def.help || "";
    overlay.hidden = false;
    $("overlay-button").focus({ preventScroll: true });
  }

  function start() {
    unlockAudio();
    if (state !== "paused") newGame();
    overlay.hidden = true;
    pressed = {};
    swipe = null;
    state = "play";
    last = performance.now();
  }

  function gameOver() {
    state = "over";
    const record = getRecord();
    const isRecord = game.score > record;
    if (isRecord) setRecord(game.score);
    beep(330, 0.15, "square", 0.05); setTimeout(function () { beep(247, 0.15); }, 160);
    setTimeout(function () { beep(196, 0.35, "square", 0.05, -60); }, 320);
    showOverlay(isRecord ? "Neuer Rekord! 🏆" : "Game Over",
      "Punkte: " + game.score + (isRecord ? "" : "  ·  Rekord: " + record), "↻ Nochmal");
  }

  function pause() {
    if (state !== "play") return;
    state = "paused";
    showOverlay("Pause", "Punkte: " + game.score, "▶ Weiter");
  }

  /* ---------- Bildschirmgröße ---------- */

  function fit() {
    const stage = $("stage");
    const sw = stage.clientWidth - 8, sh = stage.clientHeight - 8;
    const scale = Math.max(0.5, Math.min(sw / def.width, sh / def.height));
    canvas.style.width = Math.floor(def.width * scale) + "px";
    canvas.style.height = Math.floor(def.height * scale) + "px";
  }

  /* ---------- Eingabe ---------- */

  function bindButton(button, key) {
    function down(e) {
      e.preventDefault();
      unlockAudio();
      try { button.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
      input[key] = true;
      pressed[key] = true;
      button.classList.add("down-state");
    }
    function up() {
      input[key] = false;
      button.classList.remove("down-state");
    }
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("lostpointercapture", up);
    button.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  function makeButton(label, key, extra) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn " + (extra || "") + " " + key;
    b.textContent = label;
    b.setAttribute("aria-label", { left: "Links", right: "Rechts", up: "Hoch", down: "Runter" }[key] || label);
    bindButton(b, key);
    return b;
  }

  function buildControls(c) {
    const left = $("pad-left"), right = $("pad-right");
    if (c.dpad === "4") {
      const d = document.createElement("div");
      d.className = "dpad";
      d.append(makeButton("▲", "up"), makeButton("◀", "left"), makeButton("▶", "right"), makeButton("▼", "down"));
      left.append(d);
    } else if (c.dpad === "lr") {
      const d = document.createElement("div");
      d.className = "lr";
      d.append(makeButton("◀", "left"), makeButton("▶", "right"));
      left.append(d);
    }
    (c.actions || []).forEach(function (a, i) {
      right.append(makeButton(a.label, a.key, "action" + (i ? " second" : "")));
    });
  }

  const KEYS = {
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    " ": "a", Enter: "a", x: "b", X: "b"
  };
  document.addEventListener("keydown", function (e) {
    const key = KEYS[e.key];
    if (e.key === "Escape" || e.key === "p") { pause(); return; }
    if (!key) return;
    e.preventDefault();
    if (state !== "play" && (key === "a") && !e.repeat) { start(); return; }
    if (!input[key]) pressed[key] = true;
    input[key] = true;
  });
  document.addEventListener("keyup", function (e) {
    const key = KEYS[e.key];
    if (key) input[key] = false;
  });

  // Wischen auf dem Spielfeld (z. B. Richtung wechseln) und Tippen
  let touchStart = null;
  $("stage").addEventListener("pointerdown", function (e) {
    unlockAudio();
    touchStart = { x: e.clientX, y: e.clientY };
    if (def.tapKey) { pressed[def.tapKey] = true; input[def.tapKey] = true; }
  });
  $("stage").addEventListener("pointermove", function (e) {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    swipe = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    touchStart = { x: e.clientX, y: e.clientY };
  });
  function stageUp() {
    touchStart = null;
    if (def && def.tapKey) input[def.tapKey] = false;
  }
  $("stage").addEventListener("pointerup", stageUp);
  $("stage").addEventListener("pointercancel", stageUp);

  $("overlay-button").addEventListener("click", start);
  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); });
  window.addEventListener("blur", pause);
  window.addEventListener("resize", fit);

  /* ---------- Spielschleife ---------- */

  function frame(now) {
    requestAnimationFrame(frame);
    if (!def || !game) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === "play") {
      game.t += dt;
      def.update(game, dt);
    }
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.imageSmoothingEnabled = false;
    def.draw(ctx, game);
    $("score").textContent = String(game.score).padStart(5, "0");
    $("lives").textContent = game.lives > 0 ? "♥".repeat(Math.min(game.lives, 6)) : "";
  }

  /* ---------- Anmelden und Laden ---------- */

  window.Retro = {
    register: function (d) {
      def = d;
      document.title = d.title + " – SpotiMy";
      $("title").textContent = d.title;
      canvas.width = d.width * RES;
      canvas.height = d.height * RES;
      buildControls(d.controls || {});
      newGame();
      fit();
      showOverlay(d.title, d.intro || "", "▶ Los geht's");
      requestAnimationFrame(frame);
    },
    rand: rand, randInt: randInt, clamp: clamp, overlap: overlap,
    sprite: sprite, text: text, beep: beep,
    state: function () { return game; } // für automatische Tests
  };

  const name = new URLSearchParams(location.search).get("spiel");
  if (GAMES.indexOf(name) >= 0) {
    const s = document.createElement("script");
    s.src = name + ".js";
    document.body.append(s);
  } else {
    $("overlay-title").textContent = "Spiel nicht gefunden";
    $("overlay-button").hidden = true;
  }
})();
