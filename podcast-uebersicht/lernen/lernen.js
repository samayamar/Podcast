/* SpotiMy – gemeinsame Grundlage für Lernspiele und Wissenskarten
   Vorlesen, Sterne, Töne, Aufgaben-Runden mit automatischer Schwierigkeit. */
(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  const main = $("main");
  const ROUND = 10; // Aufgaben pro Runde

  /* ---------- Hilfen ---------- */

  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }
  function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // n verschiedene Antworten: die richtige plus Ablenker
  function choices(right, others, n) {
    const set = [right];
    shuffle(others).forEach(function (o) { if (set.length < n && set.indexOf(o) < 0) set.push(o); });
    return shuffle(set);
  }

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* privat: ohne Speichern */ }
    return null;
  }

  /* ---------- Vorlesen (deutsche Stimme des Geräts) ---------- */

  let lastSpeech = "", lastLang = "de-DE";
  let voices = [];
  function loadVoices() { if ("speechSynthesis" in window) voices = speechSynthesis.getVoices(); }
  if ("speechSynthesis" in window) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }
  function voiceFor(lang) {
    const prefix = lang.slice(0, 2).toLowerCase();
    const list = voices.filter(function (v) { return v.lang.toLowerCase().indexOf(prefix) === 0; });
    return list.find(function (v) { return v.lang.replace("_", "-") === lang && v.localService; }) ||
      list.find(function (v) { return v.localService; }) || list[0] || null;
  }
  // Vorlesen; lang z. B. "en-GB" für englische Antworten; queue = vorheriges nicht abbrechen
  function say(text, lang, queue) {
    if (!text) return;
    lang = lang || "de-DE";
    if (!queue) { lastSpeech = text; lastLang = lang; }
    if (!("speechSynthesis" in window)) return;
    try {
      if (!queue) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.9;
      const v = voiceFor(lang);
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { /* ohne Vorlesen weiter */ }
  }
  $("speak").addEventListener("click", function () { say(lastSpeech, lastLang); });

  /* ---------- Töne ---------- */

  let audio = null;
  function tone(freqs, dur) {
    try {
      if (!audio) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audio = new AC(); }
      if (!audio) return;
      freqs.forEach(function (f, i) {
        const t = audio.currentTime + i * 0.09;
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.18));
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + (dur || 0.18) + 0.02);
      });
    } catch (e) { /* ohne Ton */ }
  }
  const happy = function () { tone([523, 659, 784]); };
  const oops = function () { tone([220, 196], 0.2); };

  /* ---------- Sterne ---------- */

  let starKey = "", stars = 0;
  function showStars() { $("stars").textContent = "⭐ " + stars; }
  function addStar() {
    stars++;
    store(starKey, stars);
    showStars();
    $("stars").classList.remove("pop"); void $("stars").offsetWidth; $("stars").classList.add("pop");
  }

  /* ---------- Ende-/Start-Fenster ---------- */

  function overlay(icon, title, text, buttons) {
    $("overlay-icon").textContent = icon;
    $("overlay-title").textContent = title;
    $("overlay-text").textContent = text;
    const box = $("overlay-buttons");
    box.replaceChildren();
    buttons.forEach(function (b) {
      const btn = el("button", b.secondary ? "secondary" : "", b.label);
      btn.type = "button";
      btn.addEventListener("click", function () { $("overlay").hidden = true; b.action(); });
      box.append(btn);
    });
    $("overlay").hidden = false;
  }

  function progress(done, total) {
    const p = $("progress");
    p.replaceChildren();
    for (let i = 0; i < total; i++) p.append(el("span", i < done ? "done" : i === done ? "now" : ""));
  }

  /* ---------- Aufgaben-Runde ----------
     Ein Spiel liefert make(level) -> { visual, prompt, speech, options:[{label, value}], answer, solution, cols, small } */

  function runQuiz(def) {
    let level = 1, index = 0, streak = 0, roundStars = 0, task = null, errors = 0, locked = false;

    function next() {
      if (index >= ROUND) { finish(); return; }
      progress(index, ROUND);
      errors = 0; locked = false;
      task = def.make(level);
      main.replaceChildren();
      if (task.visual) main.append(task.visual);
      main.append(el("p", "prompt", task.prompt));
      const hint = el("p", "hint", "");
      main.append(hint);
      const grid = el("div", "answers" + (task.cols === 3 ? " three" : ""));
      task.options.forEach(function (o) {
        const b = el("button", "answer" + (task.small ? " small-text" : ""), o.label);
        b.type = "button";
        b.addEventListener("click", function () { choose(o, b, hint); });
        grid.append(b);
      });
      main.append(grid);
      say(task.speech || task.prompt);
    }

    function choose(o, button, hint) {
      if (locked || button.disabled) return;
      if (o.value === task.answer) {
        locked = true;
        button.classList.add("right");
        happy();
        if (errors === 0) { addStar(); roundStars++; streak++; } else { streak = 0; }
        if (streak >= 3 && level < (def.levels || 3)) { level++; streak = 0; }
        hint.textContent = task.solution || "";
        say(pick(["Super!", "Richtig!", "Toll gemacht!", "Prima!", "Genau!"]) + " " + (task.solutionSpeech || task.solution || ""));
        index++;
        setTimeout(next, task.solution ? 2200 : 1300);
      } else {
        button.classList.add("wrong");
        button.disabled = true;
        oops();
        errors++;
        streak = 0;
        if (errors === 2 && level > 1) level--;
        say("Versuch es nochmal.");
      }
    }

    function finish() {
      progress(ROUND, ROUND);
      const text = roundStars === ROUND ? "Alles beim ersten Mal richtig!" : "Du hast " + roundStars + " von " + ROUND + " Sternen gesammelt.";
      say("Geschafft! " + text);
      overlay(roundStars >= 8 ? "🏆" : "🎉", "Geschafft!", text, [
        { label: "↻ Nochmal spielen", action: function () { index = 0; roundStars = 0; next(); } }
      ]);
    }

    next();
  }

  /* ---------- Start ---------- */

  function start(def) {
    document.title = def.title + " – SpotiMy";
    $("title").textContent = def.title;
    starKey = "spotimy-sterne-" + def.id;
    stars = store(starKey) || 0;
    showStars();
    overlay(def.icon || "⭐", def.title, def.intro, [{
      label: "▶ Los geht's",
      action: function () {
        say(def.intro); // erstes Vorlesen direkt nach dem Antippen (nötig fürs iPad)
        setTimeout(function () { if (def.custom) def.custom(api); else runQuiz(def); }, 50);
      }
    }]);
  }

  const api = {
    el: el, randInt: randInt, pick: pick, shuffle: shuffle, choices: choices,
    say: say, happy: happy, oops: oops, addStar: addStar, store: store,
    overlay: overlay, progress: progress, main: main,
    setTitle: function (t) { $("title").textContent = t; document.title = t + " – SpotiMy"; },
    setStarsKey: function (key) { starKey = key; stars = store(key) || 0; showStars(); }
  };

  window.Lernen = { api: api, start: start, games: {} };

  // Welches Spiel bzw. welcher Kartenstapel? (?spiel=… oder ?karten=…)
  const params = new URLSearchParams(location.search);
  const SPIELE = ["zahlen", "rechnen", "anlaut", "silben", "uhr", "muster", "geld", "memory"];
  const KARTEN = ["mathe", "deutsch", "natur", "gesellschaft", "englisch"];
  const spiel = params.get("spiel"), karten = params.get("karten");

  function load(src, done) {
    const s = document.createElement("script");
    s.src = src;
    s.onload = done;
    document.body.append(s);
  }
  if (SPIELE.indexOf(spiel) >= 0) {
    load("spiele1.js", function () { start(window.Lernen.games[spiel]); });
  } else if (KARTEN.indexOf(karten) >= 0) {
    load("karten.js", function () { window.Lernen.startCards(karten); });
  } else {
    $("title").textContent = "Nicht gefunden";
  }
})();
