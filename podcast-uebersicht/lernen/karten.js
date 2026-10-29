/* SpotiMy – Wissenskarten mit Lernkasten (5 Fächer) und Quiz
   Kartenstapel liegen in karten/<name>.json: { "titel", "icon", "karten": [{ "f": Frage, "a": Antwort, "g": Gruppe }] }
   "Gewusst" schiebt eine Karte ins nächste Fach, "Nochmal" zurück ins erste.
   Karten aus niedrigen Fächern kommen öfter dran. Fortschritt bleibt im Browser gespeichert. */
(function () {
  "use strict";
  const L = window.Lernen.api;
  const el = L.el, shuffle = L.shuffle, choices = L.choices;
  const SESSION = 10;

  let deck = null, deckId = "", boxes = {};

  function key() { return "spotimy-karten-" + deckId; }
  function boxOf(card) { return boxes[card.f] || 1; }
  function setBox(card, box) { boxes[card.f] = Math.max(1, Math.min(5, box)); L.store(key(), boxes); }

  // Karten für eine Runde: zuerst aus den niedrigen Fächern, innerhalb gemischt
  function pickCards(n) {
    return shuffle(deck.karten)
      .sort(function (a, b) { return boxOf(a) - boxOf(b); })
      .slice(0, n);
  }

  function boxStats() {
    const counts = [0, 0, 0, 0, 0];
    deck.karten.forEach(function (c) { counts[boxOf(c) - 1]++; });
    const wrap = el("div", "boxes");
    counts.forEach(function (n, i) { wrap.append(el("span", null, "Fach " + (i + 1) + ": " + n)); });
    return wrap;
  }

  function menu() {
    L.progress(0, 0);
    const known = deck.karten.filter(function (c) { return boxOf(c) >= 4; }).length;
    const m = el("div", "menu");
    function button(icon, title, sub, action) {
      const b = el("button", "big-button");
      b.type = "button";
      const text = el("span", null, title);
      text.append(el("small", null, sub));
      b.append(el("span", "icon", icon), text);
      b.addEventListener("click", action);
      return b;
    }
    m.append(
      button("📇", "Karteikarten", "Karte umdrehen und selbst prüfen", cardsRound),
      button("❓", "Quiz", "Vier Antworten – eine stimmt", quizRound)
    );
    L.main.replaceChildren(
      el("div", "visual big", deck.icon || "📚"),
      el("p", "prompt", deck.titel + " · " + deck.karten.length + " Karten"),
      el("p", "hint", known + " Karten kannst du schon gut (Fach 4 und 5)"),
      m,
      boxStats()
    );
    L.say(deck.titel + ". Möchtest du Karteikarten oder ein Quiz?");
  }

  function finish(right, total) {
    L.progress(total, total);
    const text = right + " von " + total + " gewusst.";
    L.say("Runde geschafft! " + text);
    L.overlay(right >= total * 0.8 ? "🏆" : "🎉", "Runde geschafft!", text, [
      { label: "↻ Noch eine Runde", action: menu }
    ]);
  }

  /* ---------- Karteikarten ---------- */
  function cardsRound() {
    const cards = pickCards(SESSION);
    let i = 0, right = 0;
    function show() {
      if (i >= cards.length) { finish(right, cards.length); return; }
      L.progress(i, cards.length);
      const c = cards[i];
      const fc = el("button", "flashcard");
      fc.type = "button";
      fc.setAttribute("aria-label", "Karte umdrehen");
      const inner = el("div", "inner");
      const front = el("div", "face front", c.f);
      front.append(el("small", null, "Antippen zum Umdrehen · Fach " + boxOf(c)));
      const back = el("div", "face back", c.a);
      inner.append(front, back);
      fc.append(inner);
      const judge = el("div", "judge");
      judge.hidden = true;
      const no = el("button", "no", "✗ Nochmal");
      const yes = el("button", "yes", "✓ Gewusst");
      no.type = yes.type = "button";
      judge.append(no, yes);
      fc.addEventListener("click", function () {
        const flipped = fc.classList.toggle("flipped");
        judge.hidden = false;
        if (flipped) L.say(c.a, deck.antwortSprache); else L.say(c.f);
      });
      no.addEventListener("click", function () { setBox(c, 1); L.oops(); i++; show(); });
      yes.addEventListener("click", function () { setBox(c, boxOf(c) + 1); L.happy(); L.addStar(); right++; i++; show(); });
      L.main.replaceChildren(fc, judge);
      L.say(c.f);
    }
    show();
  }

  /* ---------- Quiz ---------- */
  function quizRound() {
    const cards = pickCards(SESSION);
    let i = 0, right = 0;
    function show() {
      if (i >= cards.length) { finish(right, cards.length); return; }
      L.progress(i, cards.length);
      const c = cards[i];
      // falsche Antworten möglichst aus demselben Themenbereich, sonst aus dem ganzen Stapel
      let others = deck.karten.filter(function (o) { return o.g === c.g && o.a !== c.a; }).map(function (o) { return o.a; });
      if (new Set(others).size < 2) others = others.concat(shuffle(deck.karten.filter(function (o) { return o.a !== c.a; })).map(function (o) { return o.a; }));
      const opts = choices(c.a, others, 4);
      let tries = 0, done = false;
      const hint = el("p", "hint", "");
      const grid = el("div", "answers");
      opts.forEach(function (a) {
        const b = el("button", "answer small-text", a);
        b.type = "button";
        b.addEventListener("click", function () {
          if (done || b.disabled) return;
          if (a === c.a) {
            done = true;
            b.classList.add("right");
            L.happy();
            if (tries === 0) { right++; L.addStar(); setBox(c, boxOf(c) + 1); } else { setBox(c, 1); }
            L.say("Richtig!"); L.say(c.a, deck.antwortSprache, true);
            i++;
            setTimeout(show, 1600);
          } else {
            tries++;
            b.classList.add("wrong");
            b.disabled = true;
            L.oops();
            L.say("Leider nicht. Versuch es nochmal.");
          }
        });
        grid.append(b);
      });
      const q = el("div", "visual");
      q.style.fontSize = "1.6rem";
      q.style.fontWeight = "800";
      q.style.textAlign = "center";
      q.textContent = c.f;
      L.main.replaceChildren(q, hint, grid);
      L.say(c.f);
    }
    show();
  }

  window.Lernen.startCards = function (id) {
    deckId = id;
    fetch("karten/" + id + ".json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        deck = d;
        boxes = L.store(key()) || {};
        L.setTitle(d.titel);
        L.setStarsKey("spotimy-sterne-karten-" + id);
        L.overlay(d.icon || "📚", d.titel, "Wissenskarten für die 4. Klasse – " + d.karten.length + " Karten.", [
          { label: "▶ Los geht's", action: function () { L.say(d.titel); menu(); } }
        ]);
      })
      .catch(function () {
        L.main.replaceChildren(el("p", "prompt", "Die Karten konnten nicht geladen werden."));
      });
  };
})();
