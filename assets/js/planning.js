/* ESM — Planning : emploi du temps hebdomadaire + événements (examens, réunions, sorties, congés).
   Grille semaine sur ordinateur, vue jour par jour sur mobile. Utilisé par portal.js. */
const Planning = (() => {
  const JOURS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
  const H0 = 7, H1 = 19, PX = 0.9;                 // grille de 7h à 19h, 0,9 px par minute
  const TYPES = {
    examen:{l:"Examen", c:"#dc2626"}, reunion:{l:"Réunion", c:"#7c3aed"},
    evenement:{l:"Événement", c:"#0891b2"}, conge:{l:"Congé / pas de cours", c:"#64748b"},
  };
  const PALETTE = ["#1f6fd1","#f07a1a","#16a34a","#7c3aed","#0891b2","#db2777","#a16207","#0b2a5b","#059669","#c2410c"];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const min = t => t ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : null;
  const hm = t => t ? t.slice(0, 5).replace(":", "h") : "";
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const monday = d => { d = new Date(d); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
  const addDays = (d, n) => { d = new Date(d); d.setDate(d.getDate() + n); return d; };
  const fmtDay = d => d.toLocaleDateString("fr-FR", {day:"numeric", month:"short"});
  const fmtLong = s => parse(s).toLocaleDateString("fr-FR", {weekday:"long", day:"numeric", month:"long"});
  const colorOf = id => { const i = Store.db().matieres.findIndex(m => m.id === id); return PALETTE[(i < 0 ? 0 : i) % PALETTE.length]; };

  /* Grille de la semaine.
     opts : {seances, events, week (lundi), label(s) → {t, sub}, onSlot(jour, heure), onSeance(s), onEvent(e), day (index mobile)} */
  function week(el, o) {
    const days = JOURS.map((_, i) => addDays(o.week, i)), today = ymd(new Date());
    const hasSat = o.seances.some(s => s.jour === 6) || o.events.some(e => e.date === ymd(days[5]));
    const nd = hasSat ? 6 : 5;
    const evOf = d => o.events.filter(e => e.date === ymd(d));
    const H = (H1 - H0) * 60 * PX;
    const block = (top, h, color, inner, attrs, cls = "") => `<button class="pl-b ${cls}" style="top:${top}px;height:${Math.max(h, 26)}px;--pc:${color}" ${attrs}>${inner}</button>`;
    const sBlock = s => { const L = o.label(s); return block((min(s.debut) - H0 * 60) * PX, (min(s.fin) - min(s.debut)) * PX, colorOf(s.matiere), `<b>${esc(L.t)}</b><small>${hm(s.debut)} – ${hm(s.fin)}${L.sub ? " · " + esc(L.sub) : ""}</small>`, `data-s="${s.id}"`); };
    const eBlock = e => block((min(e.debut) - H0 * 60) * PX, ((min(e.fin) || min(e.debut) + 60) - min(e.debut)) * PX, TYPES[e.type].c, `<b>${esc(e.titre)}</b><small>${TYPES[e.type].l} · ${hm(e.debut)}${e.fin ? " – " + hm(e.fin) : ""}</small>`, `data-e="${e.id}"`, "ev");
    const chip = e => `<button class="pl-chip" style="--pc:${TYPES[e.type].c}" data-e="${e.id}">${esc(e.titre)}</button>`;
    let html = `<div class="pl-grid" style="--nd:${nd}"><div class="pl-head"><div></div>${days.slice(0, nd).map((d, i) => `<div class="${ymd(d) === today ? "today" : ""}"><b>${JOURS[i]}</b><small>${fmtDay(d)}</small>${evOf(d).filter(e => !e.debut).map(chip).join("")}</div>`).join("")}</div>
      <div class="pl-body" style="height:${H}px"><div class="pl-hours">${Array.from({length:H1 - H0 + 1}, (_, k) => `<span style="top:${k * 60 * PX}px">${H0 + k}h</span>`).join("")}</div>
      ${days.slice(0, nd).map((d, i) => { const now = new Date(), isT = ymd(d) === today, nm = now.getHours() * 60 + now.getMinutes();
        return `<div class="pl-col ${isT ? "today" : ""}" data-j="${i + 1}">${isT && nm > H0 * 60 && nm < H1 * 60 ? `<i class="pl-now" style="top:${(nm - H0 * 60) * PX}px"></i>` : ""}
          ${o.seances.filter(s => s.jour === i + 1).map(sBlock).join("")}${evOf(d).filter(e => e.debut).map(eBlock).join("")}</div>`; }).join("")}</div></div>`;
    // Vue mobile : un jour à la fois
    const di = Math.min(o.day ?? Math.max(0, Math.min(nd - 1, (new Date().getDay() + 6) % 7)), nd - 1);
    const d = days[di];
    const items = [...o.seances.filter(s => s.jour === di + 1).map(s => ({k:"s", t:min(s.debut), x:s})), ...evOf(d).map(e => ({k:"e", t:min(e.debut) ?? -1, x:e}))].sort((a, b) => a.t - b.t);
    html += `<div class="pl-mobile"><div class="pl-days">${days.slice(0, nd).map((x, i) => `<button data-d="${i}" class="${i === di ? "on" : ""} ${ymd(x) === today ? "today" : ""}"><b>${JOURS[i].slice(0, 3)}</b><small>${x.getDate()}</small></button>`).join("")}</div>
      <div class="pl-list">${items.length ? items.map(({k, x}) => k === "s"
        ? (L => `<button class="pl-item" style="--pc:${colorOf(x.matiere)}" data-s="${x.id}"><span class="pl-t">${hm(x.debut)}<br><small>${hm(x.fin)}</small></span><span><b>${esc(L.t)}</b><small>${esc(L.sub || "")}</small></span></button>`)(o.label(x))
        : `<button class="pl-item ev" style="--pc:${TYPES[x.type].c}" data-e="${x.id}"><span class="pl-t">${x.debut ? hm(x.debut) : "Journée"}${x.fin ? `<br><small>${hm(x.fin)}</small>` : ""}</span><span><b>${esc(x.titre)}</b><small>${TYPES[x.type].l}${x.lieu ? " · " + esc(x.lieu) : ""}</small></span></button>`).join("")
        : `<p class="empty" style="padding:1.5rem">Aucun cours ce jour-là.</p>`}
      ${o.onSlot ? `<button class="btn btn-line btn-sm" data-add="${di + 1}" style="width:100%;justify-content:center;margin-top:.6rem">+ Ajouter un cours le ${JOURS[di].toLowerCase()}</button>` : ""}</div></div>`;
    el.innerHTML = html;
    el.querySelectorAll("[data-s]").forEach(b => b.onclick = e => { e.stopPropagation(); o.onSeance && o.onSeance(o.seances.find(s => s.id === b.dataset.s)); });
    el.querySelectorAll("[data-e]").forEach(b => b.onclick = e => { e.stopPropagation(); o.onEvent && o.onEvent(o.events.find(x => x.id === b.dataset.e)); });
    el.querySelectorAll("[data-d]").forEach(b => b.onclick = () => week(el, {...o, day:+b.dataset.d}));
    if (o.onSlot) {
      el.querySelectorAll(".pl-col").forEach(c => c.onclick = e => {
        const y = e.clientY - c.getBoundingClientRect().top, m = Math.floor((y / PX) / 30) * 30 + H0 * 60;
        o.onSlot(+c.dataset.j, `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
      });
      el.querySelectorAll("[data-add]").forEach(b => b.onclick = () => o.onSlot(+b.dataset.add, "08:00"));
    }
  }

  /* Barre de navigation de semaine */
  function weekNav(w) {
    const end = addDays(w, 5), cur = ymd(monday(new Date())) === ymd(w);
    return `<div class="pl-nav"><button class="btn btn-line btn-sm" data-w="-7" aria-label="Semaine précédente">‹</button><b>Semaine du ${fmtDay(w)} au ${fmtDay(end)}</b><button class="btn btn-line btn-sm" data-w="7" aria-label="Semaine suivante">›</button>${cur ? "" : `<button class="btn btn-line btn-sm" data-w="0">Aujourd'hui</button>`}</div>`;
  }

  /* Liste des prochains événements */
  function agenda(events, canDel) {
    const t = ymd(new Date()), list = events.filter(e => e.date >= t).sort((a, b) => (a.date + (a.debut || "")).localeCompare(b.date + (b.debut || "")));
    if (!list.length) return `<p class="empty" style="padding:1.2rem">Aucun événement à venir.</p>`;
    return `<div class="feed">${list.map(e => { const m = e.matiere ? Store.matiere(e.matiere) : null; return `<div class="post" style="border-left-color:${TYPES[e.type].c}"><div class="top"><h4>${esc(e.titre)}</h4><span class="chip" style="background:${TYPES[e.type].c}1a;color:${TYPES[e.type].c}">${TYPES[e.type].l}</span></div>
      <small><b style="color:var(--navy)">${fmtLong(e.date)}</b>${e.debut ? ` · ${hm(e.debut)}${e.fin ? " – " + hm(e.fin) : ""}` : " · toute la journée"}${e.lieu ? " · " + esc(e.lieu) : ""} · ${e.classe === "*" ? "Toute l'école" : esc(e.classe)}${m ? " · " + esc(m.nom) : ""}</small>
      ${e.details ? `<p>${esc(e.details)}</p>` : ""}${canDel && canDel(e) ? `<div style="margin-top:.4rem"><button class="btn btn-line btn-sm" data-dev="${e.id}">Supprimer</button></div>` : ""}</div>`; }).join("")}</div>`;
  }

  return {JOURS, TYPES, week, weekNav, agenda, monday, addDays, ymd, parse, hm, min, colorOf, fmtLong};
})();
