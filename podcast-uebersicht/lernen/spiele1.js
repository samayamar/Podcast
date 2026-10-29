/* SpotiMy – Lernspiele für die 1. Klasse
   Jede Aufgabe wird vorgelesen; Stufe 1–3 passt sich automatisch an. */
(function () {
  "use strict";
  const L = window.Lernen.api;
  const el = L.el, randInt = L.randInt, pick = L.pick, shuffle = L.shuffle, choices = L.choices;

  function visual(className) { return el("div", "visual" + (className ? " " + className : "")); }
  function numberOptions(right, min, max, n) {
    const others = [];
    for (let d = -3; d <= 3; d++) { const v = right + d; if (d && v >= min && v <= max) others.push(v); }
    while (others.length < n - 1) { const v = randInt(min, max); if (v !== right && others.indexOf(v) < 0) others.push(v); }
    return choices(right, others, n).map(function (v) { return { label: String(v), value: v }; });
  }
  // Dinge in Fünferreihen anordnen – so lassen sie sich leichter zählen
  function rows(symbol, count, perRow) {
    const box = visual();
    for (let i = 0; i < count; i += perRow) {
      const row = el("div", "row");
      for (let j = i; j < Math.min(count, i + perRow); j++) row.append(el("span", null, symbol));
      box.append(row);
    }
    return box;
  }

  /* ---------- 1. Zahlen-Zoo: Tiere zählen ---------- */
  const ANIMALS = [
    { e: "🐶", one: "Hund", many: "Hunde" }, { e: "🐱", one: "Katze", many: "Katzen" },
    { e: "🐸", one: "Frosch", many: "Frösche" }, { e: "🐥", one: "Küken", many: "Küken" },
    { e: "🐟", one: "Fisch", many: "Fische" }, { e: "🐞", one: "Marienkäfer", many: "Marienkäfer" },
    { e: "🐌", one: "Schnecke", many: "Schnecken" }, { e: "🦋", one: "Schmetterling", many: "Schmetterlinge" },
    { e: "🐝", one: "Biene", many: "Bienen" }, { e: "🐢", one: "Schildkröte", many: "Schildkröten" }
  ];
  window.Lernen.games.zahlen = {
    id: "zahlen", icon: "🦁", title: "Zahlen-Zoo", levels: 3,
    intro: "Im Zoo gibt es viele Tiere. Zähl genau und tipp auf die richtige Zahl!",
    make: function (level) {
      const max = [5, 10, 20][level - 1];
      const n = randInt(level === 1 ? 1 : 3, max);
      const a = pick(ANIMALS);
      return {
        visual: rows(a.e, n, 5),
        prompt: "Wie viele " + a.many + " siehst du?",
        options: numberOptions(n, 1, max, 4),
        answer: n,
        solution: n === 1 ? "Es ist 1 " + a.one + "." : "Es sind " + n + " " + a.many + "."
      };
    }
  };

  /* ---------- 2. Rechen-Rakete: Plus und Minus ---------- */
  window.Lernen.games.rechnen = {
    id: "rechnen", icon: "🚀", title: "Rechen-Rakete", levels: 3,
    intro: "Rechne mit und lass die Rakete steigen! Zuerst Plus bis 10, später auch Minus und bis 20.",
    make: function (level) {
      let a, b, plus;
      if (level === 1) { plus = true; a = randInt(1, 6); b = randInt(1, 10 - a); }
      else if (level === 2) { plus = Math.random() < 0.5; if (plus) { a = randInt(1, 9); b = randInt(1, 10 - a); } else { a = randInt(3, 10); b = randInt(1, a - 1); } }
      else { plus = Math.random() < 0.5; if (plus) { a = randInt(3, 15); b = randInt(2, 20 - a); } else { a = randInt(8, 20); b = randInt(2, Math.min(a - 1, 10)); } }
      const result = plus ? a + b : a - b;
      const box = visual();
      if (level === 1) {
        // Hilfe zum Abzählen: zwei Gruppen Äpfel
        const row = el("div", "row");
        row.append(el("span", null, "🍎".repeat(a)), el("span", null, " + "), el("span", null, "🍐".repeat(b)));
        row.style.flexWrap = "wrap";
        row.style.fontSize = "2rem";
        box.append(row);
      }
      box.append(el("div", "math", a + (plus ? " + " : " − ") + b + " = ?"));
      return {
        visual: box,
        prompt: "Wie viel ist " + a + (plus ? " plus " : " minus ") + b + "?",
        options: numberOptions(result, 0, 20, 4),
        answer: result,
        solution: a + (plus ? " + " : " − ") + b + " = " + result,
        solutionSpeech: a + (plus ? " plus " : " minus ") + b + " ist " + result + "."
      };
    }
  };

  /* ---------- 3. Anlaut-Angeln: Anfangsbuchstaben ---------- */
  const WORDS = [
    ["🍎", "Apfel"], ["🚗", "Auto"], ["🐜", "Ameise"], ["🍌", "Banane"], ["🌳", "Baum"], ["🐝", "Biene"],
    ["🦕", "Dino"], ["🐬", "Delfin"], ["🐘", "Elefant"], ["🦆", "Ente"], ["🐟", "Fisch"], ["🐸", "Frosch"],
    ["🦒", "Giraffe"], ["🥒", "Gurke"], ["🏠", "Haus"], ["🐶", "Hund"], ["🎩", "Hut"], ["🦔", "Igel"],
    ["🐱", "Katze"], ["🐮", "Kuh"], ["🦁", "Löwe"], ["🐭", "Maus"], ["🌙", "Mond"], ["🥕", "Möhre"],
    ["👃", "Nase"], ["🍊", "Orange"], ["👂", "Ohr"], ["🐙", "Oktopus"], ["🐴", "Pferd"], ["🐧", "Pinguin"],
    ["🍕", "Pizza"], ["🚀", "Rakete"], ["🌹", "Rose"], ["🌈", "Regenbogen"], ["☀️", "Sonne"], ["🐯", "Tiger"],
    ["🍅", "Tomate"], ["⏰", "Uhr"], ["🐳", "Wal"], ["☁️", "Wolke"], ["🦓", "Zebra"], ["🍋", "Zitrone"], ["🚂", "Zug"]
  ];
  const LETTERS = Array.from(new Set(WORDS.map(function (w) { return w[1][0]; })));
  window.Lernen.games.anlaut = {
    id: "anlaut", icon: "🎣", title: "Anlaut-Angeln", levels: 3,
    intro: "Hör genau hin: Mit welchem Buchstaben fängt das Wort an? Tipp auf den richtigen Buchstaben!",
    make: function (level) {
      const w = pick(WORDS), letter = w[1][0];
      const box = visual("big");
      box.append(el("span", null, w[0]));
      const n = level === 1 ? 3 : 4;
      const opts = choices(letter, LETTERS.filter(function (l) { return l !== letter; }), n);
      return {
        visual: box,
        prompt: level < 3 ? w[1] : "Was ist das?",
        speech: "Mit welchem Buchstaben fängt " + w[1] + " an?",
        options: opts.map(function (l) { return { label: l, value: l }; }),
        answer: letter,
        cols: n === 3 ? 3 : 2,
        solution: w[1] + " fängt mit " + letter + " an."
      };
    }
  };

  /* ---------- 4. Silben-Trommel: Silben zählen ---------- */
  const SYLLABLES = [
    ["⚽", "Ball"], ["🏠", "Haus"], ["🐶", "Hund"], ["🌳", "Baum"], ["🐭", "Maus"], ["🐟", "Fisch"], ["🌙", "Mond"],
    ["🍎", "Ap-fel"], ["🐱", "Kat-ze"], ["☀️", "Son-ne"], ["🐯", "Ti-ger"], ["🦓", "Ze-bra"], ["🚗", "Au-to"],
    ["🦁", "Lö-we"], ["🦆", "En-te"], ["🦔", "I-gel"], ["🐝", "Bie-ne"], ["🥒", "Gur-ke"],
    ["🍌", "Ba-na-ne"], ["🍅", "To-ma-te"], ["🦒", "Gi-raf-fe"], ["🚀", "Ra-ke-te"], ["🐘", "E-le-fant"],
    ["🍍", "A-na-nas"], ["🦋", "Schmet-ter-ling"], ["🍓", "Erd-bee-re"], ["🐊", "Kro-ko-dil"], ["📞", "Te-le-fon"],
    ["🍫", "Scho-ko-la-de"], ["🥑", "A-vo-ca-do"], ["🌈", "Re-gen-bo-gen"]
  ];
  window.Lernen.games.silben = {
    id: "silben", icon: "🥁", title: "Silben-Trommel", levels: 3,
    intro: "Sprich das Wort laut und klatsch bei jeder Silbe in die Hände. Wie oft hast du geklatscht?",
    make: function (level) {
      const maxSyl = level + 1;
      const pool = SYLLABLES.filter(function (s) { return s[1].split("-").length <= maxSyl; });
      const s = pick(pool), parts = s[1].split("-"), word = parts.join("");
      const box = visual("big");
      box.append(el("span", null, s[0]));
      const counts = level === 1 ? [1, 2, 3] : [1, 2, 3, 4];
      return {
        visual: box,
        prompt: word + " – wie viele Silben?",
        speech: "Wie viele Silben hat " + word + "? Klatsch mit!",
        options: counts.map(function (c) { return { label: "👏".repeat(c), value: c }; }),
        answer: parts.length,
        cols: counts.length === 3 ? 3 : 2,
        solution: parts.join(" – "),
        solutionSpeech: parts.join(", ") + "."
      };
    }
  };

  /* ---------- 5. Uhr-Detektiv: volle und halbe Stunden ---------- */
  const NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function clock(hour, half) {
    const s = svg("svg", { viewBox: "0 0 200 200", class: "clock", role: "img", "aria-label": "Uhr" });
    s.append(svg("circle", { cx: 100, cy: 100, r: 92, fill: "#fff", stroke: "#6a4cff", "stroke-width": 8 }));
    for (let i = 1; i <= 12; i++) {
      const a = i * Math.PI / 6;
      const t = svg("text", { x: 100 + Math.sin(a) * 70, y: 100 - Math.cos(a) * 70 + 8, "text-anchor": "middle", "font-size": 22, "font-weight": 800, fill: "#2b2147" });
      t.textContent = String(i);
      s.append(t);
    }
    const hourAngle = ((hour % 12) + (half ? 0.5 : 0)) * 30, minAngle = half ? 180 : 0;
    function hand(angle, len, width, color) {
      const a = angle * Math.PI / 180;
      s.append(svg("line", { x1: 100, y1: 100, x2: 100 + Math.sin(a) * len, y2: 100 - Math.cos(a) * len, stroke: color, "stroke-width": width, "stroke-linecap": "round" }));
    }
    hand(minAngle, 72, 6, "#ff4f6d");   // großer Zeiger: Minuten
    hand(hourAngle, 46, 10, "#2b2147"); // kleiner Zeiger: Stunden
    s.append(svg("circle", { cx: 100, cy: 100, r: 7, fill: "#2b2147" }));
    return s;
  }
  function timeLabel(h, half) { return half ? "halb " + (h % 12 + 1) : h + " Uhr"; }
  window.Lernen.games.uhr = {
    id: "uhr", icon: "⏰", title: "Uhr-Detektiv", levels: 3,
    intro: "Der kleine Zeiger zeigt die Stunde, der große Zeiger die Minuten. Wie spät ist es?",
    make: function (level) {
      const h = randInt(1, 12);
      const half = level === 1 ? false : level === 2 ? true : Math.random() < 0.5;
      const right = timeLabel(h, half);
      const others = [];
      for (let i = 1; i <= 12; i++) if (i !== h) others.push(timeLabel(i, half));
      if (half) others.push(timeLabel(h, false), timeLabel(h % 12 + 1, false)); // typische Verwechslungen
      else others.push(timeLabel(h, true));
      const box = visual();
      box.append(clock(h, half));
      return {
        visual: box,
        prompt: "Wie spät ist es?",
        options: choices(right, others, 4).map(function (t) { return { label: t, value: t }; }),
        answer: right,
        small: true,
        solution: "Es ist " + right + "."
      };
    }
  };

  /* ---------- 6. Muster-Raupe: Muster fortsetzen ---------- */
  const SHAPES = ["🔴", "🟡", "🔵", "🟢", "🟣", "🟠", "⭐", "❤️"];
  window.Lernen.games.muster = {
    id: "muster", icon: "🐛", title: "Muster-Raupe", levels: 3,
    intro: "Die Raupe hat ein Muster auf dem Rücken. Schau genau: Was kommt als Nächstes?",
    make: function (level) {
      const s = shuffle(SHAPES);
      const patterns = [[["A", "B"]], [["A", "A", "B"], ["A", "B", "B"]], [["A", "B", "C"], ["A", "A", "B", "C"]]][level - 1];
      const p = pick(patterns);
      const map = { A: s[0], B: s[1], C: s[2] };
      const total = p.length * 2 + randInt(0, p.length - 1);
      const seq = [];
      for (let i = 0; i <= total; i++) seq.push(map[p[i % p.length]]);
      const right = seq.pop();
      const box = visual();
      box.append(el("span", null, "🐛"));
      seq.forEach(function (x) { box.append(el("span", null, x)); });
      box.append(el("span", null, "❓"));
      return {
        visual: box,
        prompt: "Was kommt als Nächstes?",
        options: choices(right, [s[0], s[1], s[2], s[3]].filter(function (x) { return x !== right; }), 3).map(function (x) { return { label: x, value: x }; }),
        answer: right,
        cols: 3
      };
    }
  };

  /* ---------- 7. Taschengeld-Laden: Geld zählen ---------- */
  function money(value) {
    if (value >= 5) {
      const n = el("span", "note", value + " €");
      n.style.background = { 5: "#c9d6c5", 10: "#f2b8b8", 20: "#b8cdf2" }[value];
      return n;
    }
    return el("span", "coin bi", value + " €");
  }
  window.Lernen.games.geld = {
    id: "geld", icon: "🪙", title: "Taschengeld-Laden", levels: 3,
    intro: "Im Laden zählen wir Geld. Wie viel Euro liegen auf dem Tisch?",
    make: function (level) {
      const kinds = level === 1 ? [1, 2] : level === 2 ? [1, 2, 5] : [1, 2, 5, 10];
      const max = level === 1 ? 10 : 20;
      const items = [];
      let sum = 0;
      const count = randInt(2, level === 1 ? 4 : 5);
      for (let i = 0; i < count; i++) {
        const fit = kinds.filter(function (k) { return sum + k <= max; });
        if (!fit.length) break;
        const v = pick(fit);
        items.push(v); sum += v;
      }
      items.sort(function (a, b) { return b - a; }); // große Werte zuerst, so zählt es sich leichter
      const box = visual();
      items.forEach(function (v) { box.append(money(v)); });
      return {
        visual: box,
        prompt: "Wie viel Geld ist das?",
        options: numberOptions(sum, 1, 20, 4).map(function (o) { return { label: o.label + " €", value: o.value }; }),
        answer: sum,
        solution: "Das sind " + sum + " Euro."
      };
    }
  };

  /* ---------- 8. Bilder-Memory: Paare finden ---------- */
  const MEMORY = [["🐶", "Hund"], ["🐱", "Katze"], ["🐸", "Frosch"], ["🦁", "Löwe"], ["🐘", "Elefant"], ["🦒", "Giraffe"],
    ["🍎", "Apfel"], ["🍌", "Banane"], ["🍓", "Erdbeere"], ["🚗", "Auto"], ["🚀", "Rakete"], ["⚽", "Ball"],
    ["🌈", "Regenbogen"], ["⭐", "Stern"], ["🐧", "Pinguin"], ["🦋", "Schmetterling"]];
  window.Lernen.games.memory = {
    id: "memory", icon: "🧩", title: "Bilder-Memory", levels: 2,
    intro: "Alle Karten liegen verdeckt. Dreh immer zwei um und finde die Paare!",
    custom: function (api) {
      let pairs = 6;
      function round() {
        const set = shuffle(MEMORY).slice(0, pairs);
        const cards = shuffle(set.concat(set));
        const grid = el("div", "memory");
        grid.style.gridTemplateColumns = "repeat(" + (pairs > 6 ? 4 : 4) + ", minmax(0, 1fr))";
        let open = [], found = 0, moves = 0, busy = false;
        api.progress(0, pairs);
        cards.forEach(function (c) {
          const b = el("button", "card", c[0]);
          b.type = "button";
          b.setAttribute("aria-label", "Karte");
          b.addEventListener("click", function () {
            if (busy || b.classList.contains("open") || b.classList.contains("found")) return;
            b.classList.add("open");
            api.say(c[1]);
            open.push({ b: b, c: c });
            if (open.length < 2) return;
            moves++;
            const a = open[0], z = open[1];
            open = [];
            if (a.c[0] === z.c[0]) {
              a.b.classList.add("found"); z.b.classList.add("found");
              found++;
              api.happy();
              api.addStar();
              api.progress(found, pairs);
              if (found === pairs) {
                setTimeout(function () {
                  api.say("Geschafft! Du hast alle Paare gefunden.");
                  api.overlay("🏆", "Alle Paare gefunden!", "Du hast " + moves + " Züge gebraucht.", [
                    { label: "↻ Nochmal (6 Paare)", action: function () { pairs = 6; round(); } },
                    { label: "↻ Schwieriger (8 Paare)", action: function () { pairs = 8; round(); }, secondary: true }
                  ]);
                }, 700);
              }
            } else {
              busy = true;
              setTimeout(function () { a.b.classList.remove("open"); z.b.classList.remove("open"); busy = false; }, 1000);
            }
          });
          grid.append(b);
        });
        api.main.replaceChildren(el("p", "prompt", "Finde die Paare!"), grid);
      }
      round();
    }
  };
})();
