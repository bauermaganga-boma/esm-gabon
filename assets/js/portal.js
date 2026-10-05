/* ESM — Espace numérique : back-office enseignants / scolarité et portail étudiant */
const P = (() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = n => n == null ? "—" : Number(n).toFixed(2).replace(".", ",");
  const date = d => new Date(d).toLocaleDateString("fr-FR", {day:"numeric", month:"short", year:"numeric"});
  const ago = d => { const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return "à l'instant"; if (s < 3600) return `il y a ${Math.floor(s/60)} min`; if (s < 86400) return `il y a ${Math.floor(s/3600)} h`; if (s < 7*86400) return `il y a ${Math.floor(s/86400)} j`; return date(d); };
  const ini = u => (((u.prenom || "")[0] || "") + ((u.nom || "")[0] || "")).toUpperCase();
  const full = u => u ? `${u.civ ? u.civ + " " : ""}${u.prenom} ${u.nom}` : "—";
  const chip = m => { const [l, c] = Store.mention(m); return `<span class="chip ${c}">${l}</span>`; };
  const parseNote = v => { v = String(v).trim().replace(",", "."); if (v === "") return null; const n = Number(v); return isNaN(n) || n < 0 || n > 20 ? NaN : Math.round(n * 100) / 100; };
  const noteVal = n => n == null ? "" : String(n).replace(".", ",");
  const empty = (t, ic = "inbox") => `<div class="empty">${ICONS[ic]}<p>${t}</p></div>`;
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } };
  // Exécute une action d'écriture avec gestion d'erreur et message de confirmation
  async function act(fn, okMsg) { try { const r = await fn(); if (okMsg) toast(okMsg, "ok"); return r ?? true; } catch (e) { toast(e.message || "Une erreur est survenue.", "err"); return false; } }

  let me, NAV, VIEWS, cur, route;
  const state = {other:null, draft:""};

  async function boot(role, start) {
    document.getElementById("views").innerHTML = `<div class="empty"><p>Chargement de votre espace…</p></div>`;
    let u = null;
    try { u = await Store.init(); } catch (e) { document.getElementById("views").innerHTML = empty("Connexion à la base impossible. Vérifiez votre connexion internet puis rechargez la page."); return; }
    const ok = u && (role === "etudiant" ? u.role === "etudiant" : u.role !== "etudiant");
    if (!ok) { location.replace("espace.html?role=" + (role === "etudiant" ? "etudiant" : "enseignant")); return; }
    me = u;
    const n = document.querySelector(".notice");
    if (n) n.textContent = Store.LIVE ? "Connecté à la base de données de l'ESM — les modifications sont partagées en temps réel avec tous les utilisateurs." : "Mode démonstration : les données sont enregistrées dans ce navigateur.";
    start();
    Store.subscribe((table, row) => {
      if (table === "messages" && row && row.to === me.id && !row.lu) { const f = Store.user(row.from); toast(`Nouveau message${f ? " de " + f.prenom : ""}`, ""); }
      if (table === "notes" && me.role === "etudiant") toast("Vos notes ont été mises à jour.", "");
      if (window.__esmDirty && cur === "notes") return P.redrawNav();
      route(false);
    });
  }

  function shell(nav, views, sub) {
    NAV = nav; VIEWS = views;
    const sb = document.getElementById("sb");
    const draw = () => {
      sb.innerHTML = `<div class="sb-brand"><img src="assets/img/logo-esm.svg" alt=""><span><b>ESM</b><small>${sub}</small></span></div>` +
        NAV.map(n => { const b = n.badge ? n.badge() : 0; return `<a href="#${n.id}" data-v="${n.id}" class="${n.id === cur ? "on" : ""}">${ICONS[n.ic]}${n.l}${b ? `<span class="pill">${b}</span>` : ""}</a>`; }).join("") +
        `<div class="sb-foot"><a href="index.html">${ICONS.home}Retour au site</a><button class="lnk" id="logout">${ICONS.out}Déconnexion</button></div>`;
      document.getElementById("logout").onclick = async () => { await Store.logout(); location.href = "espace.html?role=" + me.role; };
    };
    P.redrawNav = draw;
    document.getElementById("who").innerHTML = `<span class="av">${ini(me)}</span><span><b>${esc(full(me))}</b><small>${esc(me.titre || Store.classe(me.classe)?.nom || "")}</small></span>`;
    document.getElementById("sbt").onclick = e => { e.stopPropagation(); sb.classList.toggle("open"); };
    document.querySelector(".app-main").addEventListener("click", () => sb.classList.remove("open"));
    // Bouton « Sortir » toujours visible en haut : déconnexion puis retour à l'accueil du site
    const quit = document.getElementById("quit");
    if (quit) quit.onclick = async () => {
      if (window.__esmDirty && !confirm("Des notes ne sont pas enregistrées. Quitter quand même ?")) return;
      window.__esmDirty = false; quit.disabled = true;
      await Store.logout().catch(() => {}); location.href = "index.html";
    };
    route = (top = true) => {
      const id = location.hash.slice(1).split("?")[0];
      cur = NAV.some(n => n.id === id) ? id : NAV[0].id;
      const n = NAV.find(x => x.id === cur), y = scrollY;
      document.getElementById("vt").textContent = n.l; document.getElementById("vs").textContent = n.s || "";
      document.getElementById("views").innerHTML = `<div class="view on" id="v-${cur}"></div>`;
      VIEWS[cur](document.getElementById("v-" + cur));
      draw(); sb.classList.remove("open"); scrollTo(0, top ? 0 : y);
    };
    addEventListener("hashchange", () => route()); route();
  }
  const go = (id, q) => { if (q) ss("esm_q", q); location.hash = id; };
  const takeQ = () => { const q = ss("esm_q"); ss("esm_q", null); return q; };

  /* ---------- Blocs partagés ---------- */
  function kpis(list) { return `<div class="kpis">${list.map(([ic, cls, v, l]) => `<div class="kpi"><span class="ic ${cls}">${ICONS[ic]}</span><span><b>${v}</b><span>${l}</span></span></div>`).join("")}</div>`; }
  function postHTML(p, canDel) {
    const a = Store.user(p.auteur), m = p.matiere ? Store.matiere(p.matiere) : null;
    const tag = {annonce:["Annonce","info"], devoir:["Devoir","warn"], urgent:["Urgent","bad"]}[p.type];
    return `<div class="post ${p.type}"><div class="top"><h4>${esc(p.titre)}</h4><span class="chip ${tag[1]}">${tag[0]}</span></div><p>${esc(p.texte)}</p>
      <small>${esc(full(a))}${m ? " · " + esc(m.nom) : ""} · ${p.classe === "*" ? "Toute l'école" : esc(p.classe)} · ${ago(p.date)}${p.echeance ? ` · <b style="color:var(--orange)">À rendre le ${date(p.echeance)}</b>` : ""}</small>
      ${canDel ? `<div style="margin-top:.5rem"><button class="btn btn-line btn-sm" data-del="${p.id}">Supprimer</button></div>` : ""}</div>`;
  }
  function messenger(el, contacts) {
    const q = takeQ(); if (q) state.other = q;
    const draw = () => {
      const threads = Store.contactsDe(me.id);
      if (!state.other && threads[0]) state.other = threads[0].user.id;
      const o = state.other ? Store.user(state.other) : null;
      if (o) Store.markRead(o.id);
      const t = o ? Store.thread(me.id, o.id) : [];
      el.innerHTML = `<div class="card"><h2>Messagerie <span style="display:flex;gap:.5rem;align-items:center"><select id="newto" class="btn btn-line btn-sm" style="max-width:260px"><option value="">+ Nouvelle conversation…</option>${contacts.map(u => `<option value="${u.id}">${esc(full(u))}${u.classe ? " · " + u.classe : u.titre ? " · " + esc(u.titre) : ""}</option>`).join("")}</select></span></h2>
        <div class="msgs"><div class="thread-list">${threads.length ? threads.map(x => `<button data-o="${x.user.id}" class="${x.user.id === state.other ? "on" : ""} ${x.unread && x.user.id !== state.other ? "unread" : ""}"><span class="av">${ini(x.user)}</span><span style="min-width:0"><b>${esc(full(x.user))}</b><small>${x.last.from === me.id ? "Vous : " : ""}${esc(x.last.texte)}</small></span></button>`).join("") : empty("Aucune conversation")}</div>
        <div class="chat">${o ? `<div class="head">${esc(full(o))} <small style="color:var(--muted);font-weight:500">${o.classe ? "· " + esc(Store.classe(o.classe)?.nom || o.classe) : o.titre ? "· " + esc(o.titre) : ""}</small></div>
          <div class="body">${t.length ? t.map(m => `<div class="bubble ${m.from === me.id ? "me" : ""}">${esc(m.texte)}<small>${ago(m.date)}${m.from === me.id && m.lu ? " · lu" : ""}</small></div>`).join("") : `<p class="empty">Démarrez la conversation avec ${esc(o.prenom)}.</p>`}</div>
          <form id="sendf"><input name="t" placeholder="Écrire un message…" autocomplete="off" required maxlength="4000"><button class="btn btn-orange btn-sm" aria-label="Envoyer">${ICONS.send}</button></form>` : empty("Sélectionnez ou démarrez une conversation", "chat")}</div></div></div>`;
      const body = el.querySelector(".chat .body"); if (body) body.scrollTop = body.scrollHeight;
      el.querySelectorAll("[data-o]").forEach(b => b.onclick = () => { state.other = b.dataset.o; state.draft = ""; draw(); });
      el.querySelector("#newto").onchange = e => { if (e.target.value) { state.other = e.target.value; state.draft = ""; draw(); } };
      const f = el.querySelector("#sendf");
      if (f) {
        f.t.value = state.draft; f.t.focus(); f.t.oninput = () => state.draft = f.t.value;
        f.onsubmit = async e => { e.preventDefault(); const txt = f.t.value.trim(); if (!txt) return; const btn = f.querySelector("button"); btn.disabled = true; if (await act(() => Store.send(state.other, txt))) state.draft = ""; draw(); P.redrawNav(); };
      }
      P.redrawNav && P.redrawNav();
    };
    draw();
  }
  /* ---------- Planning : outils partagés ---------- */
  const PL = Planning;
  const plWeek = () => { const s = ss("esm_plw"); return s ? PL.parse(s) : PL.monday(new Date()); };
  const bindWeekNav = (el, w) => el.querySelectorAll("[data-w]").forEach(b => b.onclick = () => {
    const n = +b.dataset.w; ss("esm_plw", PL.ymd(n === 0 ? PL.monday(new Date()) : PL.addDays(w, n))); route(false);
  });
  const plus2h = h => { const m = Math.min(PL.min(h) + 120, 19 * 60); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  const nextWorkday = () => { const d = new Date(); d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return PL.ymd(d); };
  const hoursOf = list => list.reduce((a, s) => a + (PL.min(s.fin) - PL.min(s.debut)), 0) / 60;
  const fmtH = h => (Math.round(h * 4) / 4).toString().replace(".", ",") + " h";

  function seanceInfo(s) {
    const m = Store.matiere(s.matiere) || {}, p = Store.user(m.prof);
    modal(m.nom || "Cours", `<div class="post" style="border-left-color:${PL.colorOf(s.matiere)}"><p><b>${PL.JOURS[s.jour - 1]}</b> de <b>${PL.hm(s.debut)}</b> à <b>${PL.hm(s.fin)}</b></p>
      <small>Classe : ${esc(Store.classe(s.classe)?.nom || s.classe)}<br>Enseignant : ${esc(full(p))}${s.salle ? "<br>Salle : " + esc(s.salle) : ""}</small></div>`);
  }
  function eventInfo(e) {
    const T = PL.TYPES[e.type], m = e.matiere ? Store.matiere(e.matiere) : null, can = me.role === "admin" || e.auteur === me.id;
    const box = modal(e.titre, `<p class="chip" style="background:${T.c}1a;color:${T.c};margin-bottom:.8rem">${T.l}</p>
      <p><b>${PL.fmtLong(e.date)}</b>${e.debut ? ` · ${PL.hm(e.debut)}${e.fin ? " – " + PL.hm(e.fin) : ""}` : " · toute la journée"}</p>
      <p style="color:var(--muted);margin:.4rem 0">${e.classe === "*" ? "Toute l'école" : esc(Store.classe(e.classe)?.nom || e.classe)}${m ? " · " + esc(m.nom) : ""}${e.lieu ? " · " + esc(e.lieu) : ""}</p>
      ${e.details ? `<p>${esc(e.details)}</p>` : ""}<p style="font-size:.8rem;color:var(--muted);margin-top:.6rem">Ajouté par ${esc(full(Store.user(e.auteur)))}</p>
      ${can ? `<button class="btn btn-line btn-sm" id="evdel" style="margin-top:1rem;color:var(--bad)">Supprimer l'événement</button>` : ""}`);
    const d = box.querySelector("#evdel");
    if (d) d.onclick = async () => { if (!confirm("Supprimer cet événement ?")) return; if (await act(() => Store.deleteEvent(e.id), "Événement supprimé.")) { box.classList.remove("on"); route(false); } };
  }
  function seanceForm(s, classes) {
    const T = Store.db().users.filter(u => u.role === "enseignant");
    const box = modal(s.id ? "Modifier le cours" : "Ajouter un cours", `<form class="form" id="sf">
      <div class="row"><div class="field"><label>Classe</label><select name="classe">${classes.map(c => `<option value="${c.id}" ${c.id === s.classe ? "selected" : ""}>${esc(c.id)}</option>`).join("")}</select></div>
        <div class="field"><label>Matière</label><select name="matiere" required></select></div></div>
      <div class="row"><div class="field"><label>Jour</label><select name="jour">${PL.JOURS.map((j, i) => `<option value="${i + 1}" ${i + 1 === +s.jour ? "selected" : ""}>${j}</option>`).join("")}</select></div>
        <div class="field"><label>Salle</label><input name="salle" maxlength="60" value="${esc(s.salle || "")}" placeholder="ex. Salle 2, Labo"></div></div>
      <div class="row"><div class="field"><label>Début</label><input type="time" name="debut" min="07:00" max="19:00" step="900" required value="${s.debut || "08:00"}"></div>
        <div class="field"><label>Fin</label><input type="time" name="fin" min="07:00" max="19:00" step="900" required value="${s.fin || plus2h(s.debut || "08:00")}"></div></div>
      <p id="sfmsg" style="font-size:.85rem;color:var(--muted)"></p>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn btn-orange">Enregistrer</button>${s.id ? `<button type="button" class="btn btn-line" id="sfdel" style="color:var(--bad)">Supprimer ce cours</button>` : ""}</div></form>`);
    const f = box.querySelector("#sf");
    const fillM = () => {
      const ms = Store.db().matieres.filter(m => m.classe === f.classe.value);
      f.matiere.innerHTML = ms.length ? ms.map(m => `<option value="${m.id}" ${m.id === s.matiere ? "selected" : ""}>${esc(m.nom)}</option>`).join("") : `<option value="">Aucune matière dans cette classe</option>`;
      const m = Store.matiere(f.matiere.value); box.querySelector("#sfmsg").textContent = m ? "Enseignant : " + full(T.find(t => t.id === m.prof)) : "";
    };
    f.classe.onchange = fillM; f.matiere.onchange = fillM; fillM();
    f.onsubmit = async e => {
      e.preventDefault(); const d = {...Object.fromEntries(new FormData(f)), id:s.id}; d.jour = +d.jour;
      if (!d.matiere) return toast("Créez d'abord une matière pour cette classe.", "err");
      if (PL.min(d.fin) <= PL.min(d.debut)) return toast("L'heure de fin doit être après l'heure de début.", "err");
      const c = Store.conflits(d); if (c.length) return toast("Impossible : " + c[0] + ".", "err");
      if (await act(() => Store.saveSeance(d), s.id ? "Cours modifié." : "Cours ajouté à l'emploi du temps.")) { box.classList.remove("on"); ss("esm_plc", d.classe); route(false); }
    };
    const del = box.querySelector("#sfdel");
    if (del) del.onclick = async () => { if (!confirm("Retirer ce cours de l'emploi du temps ?")) return; if (await act(() => Store.deleteSeance(s.id), "Cours supprimé.")) { box.classList.remove("on"); route(false); } };
  }
  function eventForm(classes, preset = {}) {
    const admin = me.role === "admin";
    const types = admin ? Object.entries(PL.TYPES) : Object.entries(PL.TYPES).filter(([k]) => k === "examen" || k === "evenement");
    const box = modal(admin ? "Nouvel événement" : "Programmer une évaluation ou un événement", `<form class="form" id="ef">
      <div class="row"><div class="field"><label>Type</label><select name="type">${types.map(([k, t]) => `<option value="${k}">${t.l}</option>`).join("")}</select></div>
        <div class="field"><label>Concerne</label><select name="classe">${admin ? `<option value="*">Toute l'école</option>` : ""}${classes.map(c => `<option value="${c.id}" ${c.id === preset.classe ? "selected" : ""}>${esc(c.id)}</option>`).join("")}</select></div></div>
      <div class="field"><label>Titre</label><input name="titre" required maxlength="120" placeholder="ex. Examen de topographie"></div>
      <div class="field"><label>Matière (optionnel)</label><select name="matiere"></select></div>
      <div class="row"><div class="field"><label>Date</label><input type="date" name="date" required value="${nextWorkday()}"></div><div class="field"><label>Lieu</label><input name="lieu" maxlength="100" placeholder="ex. Salle 1"></div></div>
      <div class="row"><div class="field"><label>Début (optionnel)</label><input type="time" name="debut" step="900"></div><div class="field"><label>Fin (optionnel)</label><input type="time" name="fin" step="900"></div></div>
      <div class="field"><label>Détails</label><textarea name="details" maxlength="2000" style="min-height:80px" placeholder="Consignes, matériel à prévoir…"></textarea></div>
      <label style="display:flex;gap:.6rem;font-size:.88rem"><input type="checkbox" name="annonce" checked> Prévenir aussi les étudiants par une annonce</label>
      <button class="btn btn-orange">Ajouter au planning</button></form>`);
    const f = box.querySelector("#ef");
    const fillM = () => { const ms = (admin ? Store.db().matieres : Store.db().matieres.filter(m => m.prof === me.id)).filter(m => m.classe === f.classe.value); f.matiere.innerHTML = `<option value="">—</option>` + ms.map(m => `<option value="${m.id}">${esc(m.nom)}</option>`).join(""); };
    f.classe.onchange = fillM; fillM();
    f.onsubmit = async e => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(f)), annonce = !!d.annonce; delete d.annonce;
      if (d.debut && d.fin && PL.min(d.fin) <= PL.min(d.debut)) return toast("L'heure de fin doit être après l'heure de début.", "err");
      if (!d.debut) { delete d.debut; delete d.fin; } if (!d.matiere) delete d.matiere;
      f.querySelector("button.btn-orange").disabled = true;
      const ok = await act(() => Store.addEvent(d), "Ajouté au planning.");
      if (ok && annonce) await act(() => Store.addPost({classe:d.classe, matiere:d.matiere, type:d.type === "examen" ? "urgent" : "annonce", titre:`${PL.TYPES[d.type].l} : ${d.titre}`,
        texte:`${PL.fmtLong(d.date)}${d.debut ? " à " + PL.hm(d.debut) : ""}${d.lieu ? " — " + d.lieu : ""}.${d.details ? " " + d.details : ""}`}));
      if (ok) { box.classList.remove("on"); route(false); } else f.querySelector("button.btn-orange").disabled = false;
    };
  }

  function account(el) {
    el.innerHTML = `<div class="cols"><div class="card"><h2>Mon profil</h2>
        <div class="stu" style="margin-bottom:1rem"><span class="av" style="width:56px;height:56px;font-size:1.1rem">${ini(me)}</span><span><b style="font-size:1.1rem">${esc(full(me))}</b><small>${esc(me.titre || Store.classe(me.classe)?.nom || "")}</small></span></div>
        <p style="color:var(--muted)">Identifiant de connexion : <b style="color:var(--navy)">${esc(me.login)}</b>${me.matricule ? `<br>Matricule : <b style="color:var(--navy)">${esc(me.matricule)}</b>` : ""}<br>Profil : <b style="color:var(--navy)">${{admin:"Scolarité", enseignant:"Enseignant", etudiant:"Étudiant"}[me.role]}</b></p></div>
      <div class="card"><h2>Changer mon mot de passe</h2><form class="form" id="pwf">
        <div class="field"><label for="np1">Nouveau mot de passe</label><input id="np1" type="password" minlength="6" required autocomplete="new-password"></div>
        <div class="field"><label for="np2">Confirmer</label><input id="np2" type="password" minlength="6" required autocomplete="new-password"></div>
        <button class="btn btn-orange">${ICONS.lock} Mettre à jour</button></form></div></div>`;
    el.querySelector("#pwf").onsubmit = async e => {
      e.preventDefault(); const a = el.querySelector("#np1").value, b = el.querySelector("#np2").value;
      if (a !== b) return toast("Les deux mots de passe ne correspondent pas.", "err");
      if (await act(() => Store.changePassword(a), "Mot de passe mis à jour.")) e.target.reset();
    };
  }

  /* =========================================================
     BACK-OFFICE ENSEIGNANT / SCOLARITÉ
     ========================================================= */
  function teacher() { boot("enseignant", teacherApp); }
  function teacherApp() {
    const admin = me.role === "admin", db = Store.db;
    const mats = () => admin ? db().matieres : db().matieres.filter(m => m.prof === me.id);
    const myClasses = () => admin ? db().classes : db().classes.filter(c => mats().some(m => m.classe === c.id));
    const studentsOf = cid => db().users.filter(u => u.role === "etudiant" && u.classe === cid).sort((a, b) => a.nom.localeCompare(b.nom));
    const teachers = () => db().users.filter(u => u.role === "enseignant").sort((a, b) => a.nom.localeCompare(b.nom));
    const statsMat = m => { const n = db().notes[m.id] || {}; const st = studentsOf(m.classe); const moys = st.map(s => Store.moyenne(n[s.id])).filter(x => x != null); return {total:st.length, done:moys.length, avg:moys.length ? moys.reduce((a, b) => a + b, 0) / moys.length : null, pass:moys.filter(x => x >= 10).length}; };

    const nav = [
      {id:"tableau", l:"Tableau de bord", ic:"home", s:admin ? "Vue d'ensemble de l'école" : "Vue d'ensemble de vos enseignements"},
      {id:"notes", l:"Saisie des notes", ic:"edit", s:`Contrôle continu ${Store.PONDERATION.cc * 100} % · Examen ${Store.PONDERATION.exam * 100} % — moyenne calculée automatiquement`},
      {id:"annonces", l:"Annonces & devoirs", ic:"mega", s:"Publiez des informations visibles immédiatement par vos étudiants"},
      {id:"messages", l:"Messagerie", ic:"chat", s:"Échangez avec vos étudiants", badge:() => Store.unread(me.id)},
    ];
    if (admin) nav.splice(1, 0,
      {id:"candidatures", l:"Pré-inscriptions", ic:"inbox", s:"Demandes reçues depuis le site", badge:() => db().candidatures.filter(c => c.statut === "nouveau").length},
      {id:"resultats", l:"Résultats par classe", ic:"chart", s:"Moyennes générales et classements"},
      {id:"comptes", l:"Comptes", ic:"users", s:"Créer et gérer les comptes étudiants, enseignants et scolarité"},
      {id:"programme", l:"Classes & matières", ic:"book", s:"Organisation pédagogique : classes, matières, coefficients et enseignants"},
      {id:"contacts", l:"Messages du site", ic:"mail", s:"Formulaire de contact", badge:() => db().contacts.length});
    nav.splice(admin ? 5 : 2, 0, {id:"planning", l:admin ? "Planning" : "Mon planning", ic:"cal", s:admin ? "Emploi du temps des classes, examens, réunions et événements" : "Vos cours de la semaine, examens et événements de vos classes"});
    nav.push({id:"compte", l:"Mon compte", ic:"lock", s:"Profil et mot de passe"});

    const views = {
      tableau(el) {
        const ms = mats(), stud = new Set(ms.flatMap(m => studentsOf(m.classe).map(s => s.id)));
        const all = ms.map(statsMat), done = all.reduce((a, s) => a + s.done, 0), tot = all.reduce((a, s) => a + s.total, 0);
        const k = admin
          ? [["users","ic-b",db().users.filter(u => u.role === "etudiant").length,"étudiants inscrits"],["inbox","ic-o",db().candidatures.filter(c => c.statut === "nouveau").length,"nouvelles pré-inscriptions"],["book","ic-g",db().matieres.length,"matières au programme"],["chat","ic-y",Store.unread(me.id),"messages non lus"]]
          : [["book","ic-b",ms.length,"matières enseignées"],["users","ic-o",stud.size,"étudiants suivis"],["edit","ic-g",(tot ? Math.round(done / tot * 100) : 0) + " %","notes finalisées"],["chat","ic-y",Store.unread(me.id),"messages non lus"]];
        const posts = db().posts.filter(p => admin || p.auteur === me.id || p.classe === "*").slice(0, 4);
        el.innerHTML = kpis(k) + `<div class="cols"><div class="card"><h2>${admin ? "Toutes les matières" : "Mes matières"}</h2>${ms.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Matière</th><th>Classe</th><th>Coef.</th><th>Saisie</th><th>Moy. classe</th><th>Réussite</th><th></th></tr></thead><tbody>
          ${ms.map((m, i) => { const s = all[i]; const p = s.total ? Math.round(s.done / s.total * 100) : 0; return `<tr><td><b>${esc(m.nom)}</b>${admin ? `<br><small style="color:var(--muted)">${esc(full(Store.user(m.prof)))}</small>` : ""}</td><td><span class="chip neu">${esc(m.classe)}</span></td><td>${m.coef}</td>
            <td style="min-width:120px"><div style="height:8px;background:var(--line);border-radius:9px;overflow:hidden"><div style="height:100%;width:${p}%;background:${p === 100 ? "var(--ok)" : "var(--orange)"}"></div></div><small style="color:var(--muted)">${s.done}/${s.total}</small></td>
            <td class="moy">${fmt(s.avg)}</td><td>${s.done ? Math.round(s.pass / s.done * 100) + " %" : "—"}</td><td><button class="btn btn-line btn-sm" data-m="${m.id}">Saisir</button></td></tr>`; }).join("")}
          </tbody></table></div>` : empty(admin ? "Aucune matière : créez-les dans « Classes & matières »." : "Aucune matière ne vous est encore attribuée. Contactez la scolarité.", "book")}</div>
          <div class="card"><h2>Dernières annonces <a class="btn btn-line btn-sm" href="#annonces">Publier</a></h2><div class="feed">${posts.length ? posts.map(p => postHTML(p)).join("") : empty("Aucune annonce publiée")}</div></div></div>`;
        el.querySelectorAll("[data-m]").forEach(b => b.onclick = () => go("notes", b.dataset.m));
      },

      notes(el) {
        const ms = mats(); if (!ms.length) { el.innerHTML = `<div class="card">${empty("Aucune matière attribuée.", "book")}</div>`; return; }
        let mid = takeQ() || ss("esm_mat"); if (!ms.some(m => m.id === mid)) mid = ms[0].id;
        window.__esmDirty = false;
        const draw = () => {
          ss("esm_mat", mid);
          const m = Store.matiere(mid), st = studentsOf(m.classe), n = db().notes[mid] || {};
          el.innerHTML = `<div class="card"><div class="toolbar">
              <div class="field"><label>Matière</label><select id="selm">${ms.map(x => `<option value="${x.id}" ${x.id === mid ? "selected" : ""}>${esc(x.nom)} — ${esc(x.classe)}</option>`).join("")}</select></div>
              <div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn btn-line btn-sm" id="csv">${ICONS.dl} Export CSV</button><button class="btn btn-orange btn-sm" id="save">${ICONS.save} Enregistrer les notes</button></div></div>
            <p style="font-size:.85rem;color:var(--muted);margin-bottom:1rem">${esc(Store.classe(m.classe)?.nom || m.classe)} · Coefficient ${m.coef}${admin ? " · Enseignant : " + esc(full(Store.user(m.prof))) : ""} · Notes sur 20 (virgule acceptée). <b>Entrée</b> passe à l'étudiant suivant. Effacer les deux cases supprime la note.</p>
            ${st.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Étudiant</th><th>Contrôle continu</th><th>Examen</th><th>Moyenne</th><th>Mention</th><th>Dernière mise à jour</th></tr></thead><tbody>
            ${st.map((s, i) => { const x = n[s.id] || {}; return `<tr data-sid="${s.id}"><td>${i + 1}</td><td><div class="stu"><span class="av">${ini(s)}</span><span><b>${esc(s.nom.toUpperCase())} ${esc(s.prenom)}</b><small>${esc(s.matricule || s.login)}</small></span></div></td>
              <td><input class="note" data-k="cc" inputmode="decimal" value="${noteVal(x.cc)}" aria-label="CC ${esc(s.prenom)}"></td><td><input class="note" data-k="exam" inputmode="decimal" value="${noteVal(x.exam)}" aria-label="Examen ${esc(s.prenom)}"></td>
              <td class="moy">${fmt(Store.moyenne(x))}</td><td class="men">${chip(Store.moyenne(x))}</td><td><small style="color:var(--muted)">${x.maj ? ago(x.maj) : "—"}</small></td></tr>`; }).join("")}
            </tbody></table></div>` : empty("Aucun étudiant dans cette classe.", "users")}</div>
            <div class="cols"><div class="card"><h2>Répartition des moyennes</h2><div class="bars" id="bars"></div></div><div class="card"><h2>Statistiques de la classe</h2><div id="st"></div></div></div>`;
          const inputs = [...el.querySelectorAll("input.note")];
          const recalc = () => {
            const moys = [];
            el.querySelectorAll("tr[data-sid]").forEach(tr => {
              const cc = parseNote(tr.querySelector("[data-k=cc]").value), ex = parseNote(tr.querySelector("[data-k=exam]").value);
              const mo = (cc == null || ex == null || isNaN(cc) || isNaN(ex)) ? null : Store.moyenne({cc, exam:ex});
              tr.querySelector(".moy").textContent = fmt(mo); tr.querySelector(".men").innerHTML = chip(mo); if (mo != null) moys.push(mo);
            });
            const B = [[0,5],[5,8],[8,10],[10,12],[12,14],[14,16],[16,20.01]], cnt = B.map(([a, b]) => moys.filter(x => x >= a && x < b).length), mx = Math.max(1, ...cnt);
            el.querySelector("#bars").innerHTML = B.map(([a, b], i) => `<div class="b"><em>${cnt[i]}</em><i style="height:${cnt[i] / mx * 100}%"></i><small>${a}–${Math.floor(b)}</small></div>`).join("");
            const avg = moys.length ? moys.reduce((a, b) => a + b, 0) / moys.length : null, pass = moys.filter(x => x >= 10).length;
            el.querySelector("#st").innerHTML = `<div class="ring" style="--p:${moys.length ? pass / moys.length * 100 : 0}"><div><span><b>${moys.length ? Math.round(pass / moys.length * 100) : 0}%</b><br><small>de réussite</small></span></div></div>
              <div class="kpis" style="grid-template-columns:1fr 1fr;margin:1.2rem 0 0"><div class="kpi"><span><b>${fmt(avg)}</b><span>moyenne</span></span></div><div class="kpi"><span><b>${moys.length}/${st.length}</b><span>notes complètes</span></span></div>
              <div class="kpi"><span><b>${fmt(moys.length ? Math.max(...moys) : null)}</b><span>meilleure</span></span></div><div class="kpi"><span><b>${fmt(moys.length ? Math.min(...moys) : null)}</b><span>plus faible</span></span></div></div>`;
          };
          inputs.forEach((inp, i) => {
            inp.addEventListener("input", () => { const v = parseNote(inp.value); inp.classList.toggle("bad", Number.isNaN(v)); inp.classList.add("dirty"); window.__esmDirty = true; recalc(); });
            inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); (inputs[i + 2] || inputs[i + 1] || inp).focus(); } });
            inp.addEventListener("focus", () => inp.select());
          });
          el.querySelector("#selm").onchange = e => { if (window.__esmDirty && !confirm("Des notes ne sont pas enregistrées. Changer de matière quand même ?")) { e.target.value = mid; return; } window.__esmDirty = false; mid = e.target.value; draw(); };
          el.querySelector("#save").onclick = async () => {
            if (el.querySelector("input.note.bad")) return toast("Corrigez les notes invalides (entre 0 et 20).", "err");
            const rows = {};
            el.querySelectorAll("tr[data-sid]").forEach(tr => {
              if (!tr.querySelector("input.dirty")) return;
              rows[tr.dataset.sid] = {cc:parseNote(tr.querySelector("[data-k=cc]").value), exam:parseNote(tr.querySelector("[data-k=exam]").value)};
            });
            if (!Object.keys(rows).length) return toast("Aucune modification à enregistrer.", "");
            const btn = el.querySelector("#save"); btn.disabled = true;
            if (await act(() => Store.saveNotes(mid, rows), `${Object.keys(rows).length} note(s) enregistrée(s) — visibles immédiatement par les étudiants.`)) window.__esmDirty = false;
            draw(); P.redrawNav();
          };
          el.querySelector("#csv").onclick = () => {
            const lines = [["Matricule","Nom","Prénom","CC","Examen","Moyenne","Mention"]].concat(st.map(s => { const x = (db().notes[mid] || {})[s.id] || {}, mo = Store.moyenne(x); return [s.matricule || s.login, s.nom, s.prenom, x.cc ?? "", x.exam ?? "", mo ?? "", Store.mention(mo)[0]]; }));
            const blob = new Blob(["﻿" + lines.map(r => r.map(c => `"${String(c).replace(".", ",")}"`).join(";")).join("\n")], {type:"text/csv;charset=utf-8"});
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `notes_${m.classe}_${m.nom.replace(/\s+/g, "_")}.csv`; a.click();
          };
          if (st.length) recalc(); else { el.querySelector("#bars").innerHTML = ""; el.querySelector("#st").innerHTML = ""; }
        };
        draw();
        if (!window.__esmBU && (window.__esmBU = true)) addEventListener("beforeunload", e => { if (window.__esmDirty && cur === "notes") { e.preventDefault(); e.returnValue = ""; } });
      },

      annonces(el) {
        const cls = myClasses(), ms = mats();
        const list = db().posts.filter(p => admin || p.auteur === me.id);
        el.innerHTML = `<div class="cols"><div class="card"><h2>Publications ${admin ? "de l'école" : "publiées"}</h2><div class="feed">${list.length ? list.map(p => postHTML(p, true)).join("") : empty("Vous n'avez encore rien publié")}</div></div>
          <div class="card"><h2>Nouvelle publication</h2>${!admin && !cls.length ? empty("Aucune classe attribuée : vous pourrez publier dès que la scolarité vous aura confié une matière.", "mega") : `<form class="form" id="pf">
            <div class="field"><label>Destinataires</label><select name="classe" required>${admin ? `<option value="*">Toute l'école</option>` : ""}${cls.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join("")}</select></div>
            <div class="field"><label>Matière (optionnel)</label><select name="matiere"><option value="">—</option>${ms.map(m => `<option value="${m.id}" data-c="${m.classe}">${esc(m.nom)} — ${esc(m.classe)}</option>`).join("")}</select></div>
            <div class="field"><label>Type</label><select name="type"><option value="annonce">Annonce</option><option value="devoir">Devoir / travail à rendre</option><option value="urgent">Urgent</option></select></div>
            <div class="field"><label>Titre</label><input name="titre" required maxlength="120"></div>
            <div class="field"><label>Message</label><textarea name="texte" required maxlength="5000"></textarea></div>
            <div class="field" id="ech" style="display:none"><label>Date de remise</label><input type="date" name="echeance"></div>
            <button class="btn btn-orange">${ICONS.send} Publier</button></form>`}</div></div>`;
        const f = el.querySelector("#pf");
        if (f) {
          f.type.onchange = () => el.querySelector("#ech").style.display = f.type.value === "devoir" ? "" : "none";
          f.matiere.onchange = () => { const o = f.matiere.selectedOptions[0]; if (o.dataset.c) f.classe.value = o.dataset.c; };
          f.onsubmit = async e => {
            e.preventDefault(); const d = Object.fromEntries(new FormData(f));
            if (!d.matiere) delete d.matiere; if (d.echeance) d.echeance = new Date(d.echeance + "T23:59:00").toISOString(); else delete d.echeance;
            f.querySelector("button").disabled = true;
            await act(() => Store.addPost(d), "Publication envoyée aux étudiants."); route(false);
          };
        }
        el.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { if (confirm("Supprimer cette publication ?")) { await act(() => Store.deletePost(b.dataset.del)); route(false); } });
      },

      messages(el) {
        const contacts = admin ? db().users.filter(u => u.id !== me.id) : db().users.filter(u => u.role === "etudiant" && myClasses().some(c => c.id === u.classe)).concat(db().users.filter(u => u.role === "admin"));
        messenger(el, contacts);
      },

      candidatures(el) {
        const C = db().candidatures, st = {"nouveau":"info","en cours":"warn","admis":"ok","refusé":"bad"};
        el.innerHTML = kpis([["inbox","ic-b",C.length,"demandes au total"],["clock","ic-o",C.filter(c => c.statut === "nouveau").length,"à traiter"],["award","ic-g",C.filter(c => c.statut === "admis").length,"admis"],["users","ic-y",C.filter(c => c.statut === "en cours").length,"en cours d'étude"]]) +
          `<div class="card"><h2>Pré-inscriptions reçues</h2>${C.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Dossier</th><th>Candidat</th><th>Formation</th><th>Diplôme</th><th>Reçu</th><th>Statut</th><th></th></tr></thead><tbody>
          ${C.map(c => `<tr><td><b>${esc(c.ref)}</b></td><td><b>${esc(c.prenom)} ${esc(c.nom)}</b><br><small style="color:var(--muted)">${esc(c.tel)} ${c.email ? "· " + esc(c.email) : ""}</small></td><td>${esc(c.formationLabel)}</td><td>${esc(c.niveau)} ${esc(c.serie || "")}</td><td><small>${ago(c.date)}</small></td>
            <td><select data-c="${c.id}" class="chip ${st[c.statut]}" style="border:0;cursor:pointer">${Object.keys(st).map(s => `<option ${s === c.statut ? "selected" : ""}>${s}</option>`).join("")}</select></td><td><button class="btn btn-line btn-sm" data-v="${c.id}">Voir</button></td></tr>`).join("")}
          </tbody></table></div>` : empty("Aucune pré-inscription pour le moment.")}</div>`;
        el.querySelectorAll("select[data-c]").forEach(s => s.onchange = async () => { await act(() => Store.setStatut(s.dataset.c, s.value), "Statut mis à jour."); route(false); });
        el.querySelectorAll("[data-v]").forEach(b => b.onclick = () => { const c = C.find(x => x.id === b.dataset.v); modal("Dossier " + c.ref, `<p><b>${esc(c.prenom)} ${esc(c.nom)}</b> — ${esc(c.tel)} ${c.email ? "· " + esc(c.email) : ""}</p><p style="margin:.6rem 0">Formation : <b>${esc(c.formationLabel)}</b><br>Diplôme : ${esc(c.niveau)} ${esc(c.serie || "")}<br>Ville : ${esc(c.ville || "—")} · Né(e) le : ${c.naissance ? date(c.naissance) : "—"}<br>Source : ${esc(c.source || "—")}</p><div class="panel" style="box-shadow:none"><b>Motivation</b><p style="color:var(--muted);margin-top:.4rem">${esc(c.motivation || "Non renseignée.")}</p></div><div style="margin-top:1rem;display:flex;gap:.6rem;flex-wrap:wrap"><a class="btn btn-orange btn-sm" href="tel:${esc(String(c.tel).replace(/\s/g, ""))}">${ICONS.phone} Appeler</a>${c.email ? `<a class="btn btn-line btn-sm" href="mailto:${esc(c.email)}">${ICONS.mail} Écrire</a>` : ""}</div>`); });
      },

      resultats(el) {
        if (!db().classes.length) { el.innerHTML = `<div class="card">${empty("Aucune classe.", "chart")}</div>`; return; }
        let cid = ss("esm_cls"); if (!Store.classe(cid)) cid = db().classes[0].id;
        const st = studentsOf(cid).map(s => ({s, m:Store.moyenneGenerale(s.id)})).sort((a, b) => (b.m ?? -1) - (a.m ?? -1));
        const ms = st.filter(x => x.m != null).map(x => x.m), mats = db().matieres.filter(m => m.classe === cid);
        el.innerHTML = `<div class="card"><div class="toolbar"><div class="field"><label>Classe</label><select id="selc">${db().classes.map(c => `<option value="${c.id}" ${c.id === cid ? "selected" : ""}>${esc(c.nom)}</option>`).join("")}</select></div><button class="btn btn-line btn-sm no-print" onclick="print()">${ICONS.print} Imprimer</button></div>
          ${kpis([["users","ic-b",st.length,"étudiants"],["chart","ic-o",fmt(ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null),"moyenne de classe"],["award","ic-g",ms.filter(x => x >= 10).length,"admis (≥ 10)"],["book","ic-y",mats.length,"matières"]])}
          ${st.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Rang</th><th>Étudiant</th>${mats.map(m => `<th title="${esc(m.nom)}">${esc(m.nom.length > 16 ? m.nom.slice(0, 15) + "…" : m.nom)}<br><small>coef ${m.coef}</small></th>`).join("")}<th>Moy. gén.</th><th>Décision</th></tr></thead><tbody>
          ${st.map((x, i) => `<tr><td><b>${x.m != null ? i + 1 : "—"}</b></td><td><div class="stu"><span class="av">${ini(x.s)}</span><span><b>${esc(x.s.nom.toUpperCase())} ${esc(x.s.prenom)}</b><small>${esc(x.s.matricule || x.s.login)}</small></span></div></td>${Store.notesEtudiant(x.s.id).map(n => `<td>${fmt(n.moy)}</td>`).join("")}<td class="moy">${fmt(x.m)}</td><td>${chip(x.m)}</td></tr>`).join("")}
          </tbody></table></div>` : empty("Aucun étudiant dans cette classe.", "users")}</div>`;
        el.querySelector("#selc").onchange = e => { ss("esm_cls", e.target.value); route(false); };
      },

      comptes(el) {
        const R = {etudiant:"Étudiants", enseignant:"Enseignants", admin:"Scolarité"};
        let f = ss("esm_rf") || "etudiant"; if (!R[f]) f = "etudiant";
        const list = db().users.filter(u => u.role === f).sort((a, b) => (a.classe || "").localeCompare(b.classe || "") || a.nom.localeCompare(b.nom));
        const nextMat = () => { const y = String(new Date().getFullYear()).slice(2); const n = db().users.filter(u => u.role === "etudiant").map(u => +((u.login.match(/-(\d+)$/) || [])[1] || 0)); return `ESM${y}-${String(Math.max(0, ...n) + 1).padStart(3, "0")}`; };
        el.innerHTML = kpis([["cap","ic-b",db().users.filter(u => u.role === "etudiant").length,"étudiants"],["users","ic-o",db().users.filter(u => u.role === "enseignant").length,"enseignants"],["lock","ic-g",db().users.filter(u => u.role === "admin").length,"comptes scolarité"],["book","ic-y",db().classes.length,"classes"]]) +
          `<div class="cols"><div class="card"><h2>Comptes <span class="tabs" style="margin:0">${Object.entries(R).map(([k, l]) => `<button class="tab ${k === f ? "on" : ""}" data-rf="${k}">${l}</button>`).join("")}</span></h2>
            ${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nom</th><th>Identifiant</th><th>${f === "etudiant" ? "Classe" : "Fonction"}</th><th></th></tr></thead><tbody>
            ${list.map(u => `<tr><td><div class="stu"><span class="av">${ini(u)}</span><b>${esc(full(u))}</b></div></td><td><code>${esc(u.login)}</code></td><td>${esc(f === "etudiant" ? u.classe || "—" : u.titre || "—")}</td>
              <td style="white-space:nowrap"><button class="btn btn-line btn-sm" data-pw="${u.id}">Mot de passe</button> ${u.id !== me.id ? `<button class="btn btn-line btn-sm" data-rm="${u.id}" style="color:var(--bad)">Supprimer</button>` : ""}</td></tr>`).join("")}
            </tbody></table></div>` : empty("Aucun compte.", "users")}</div>
          <div class="card"><h2>Nouveau compte</h2><form class="form" id="uf">
            <div class="field"><label>Profil</label><select name="role"><option value="etudiant">Étudiant</option><option value="enseignant">Enseignant</option><option value="admin">Scolarité</option></select></div>
            <div class="row"><div class="field"><label>Prénom</label><input name="prenom" required></div><div class="field"><label>Nom</label><input name="nom" required></div></div>
            <div class="field" data-for="etudiant"><label>Classe</label><select name="classe">${db().classes.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join("")}</select></div>
            <div class="row" data-for="staff"><div class="field"><label>Civilité</label><select name="civ"><option value="">—</option><option>M.</option><option>Mme</option><option>Dr</option><option>Pr</option></select></div><div class="field"><label>Fonction / spécialité</label><input name="titre" placeholder="ex. Droit maritime"></div></div>
            <div class="row"><div class="field"><label id="lbl-login">Matricule (identifiant)</label><input name="login" required pattern="[A-Za-z0-9._\\-]{3,40}" title="Lettres, chiffres, point, tiret (3 à 40 caractères)"></div><div class="field"><label>Mot de passe initial</label><input name="password" required minlength="6" value="${"esm" + Math.floor(1000 + Math.random() * 9000)}"></div></div>
            <button class="btn btn-orange">${ICONS.users} Créer le compte</button>
            <p style="font-size:.8rem;color:var(--muted)">Communiquez l'identifiant et le mot de passe à la personne : elle pourra le changer dans « Mon compte ».</p></form></div></div>`;
        const uf = el.querySelector("#uf");
        const sync = () => {
          const r = uf.role.value;
          el.querySelector("[data-for=etudiant]").style.display = r === "etudiant" ? "" : "none";
          el.querySelector("[data-for=staff]").style.display = r === "etudiant" ? "none" : "";
          el.querySelector("#lbl-login").textContent = r === "etudiant" ? "Matricule (identifiant)" : "Identifiant (ex. p.ndong)";
          if (r === "etudiant" && !uf.login.value) uf.login.value = nextMat();
        };
        uf.role.onchange = () => { uf.login.value = ""; sync(); };
        uf.prenom.oninput = uf.nom.oninput = () => { if (uf.role.value !== "etudiant") uf.login.value = (uf.prenom.value[0] || "").toLowerCase() + "." + uf.nom.value.toLowerCase().normalize("NFD").replace(/[^a-z]/g, ""); };
        sync();
        if (!db().classes.length) uf.role.value === "etudiant" && (el.querySelector("[data-for=etudiant]").innerHTML = `<p class="chip warn">Créez d'abord une classe dans « Classes & matières ».</p>`);
        uf.onsubmit = async e => {
          e.preventDefault(); const d = Object.fromEntries(new FormData(uf));
          uf.querySelector("button").disabled = true;
          if (await act(() => Store.createUser(d), `Compte créé : ${d.login} / ${d.password}`)) { ss("esm_rf", d.role); route(false); } else uf.querySelector("button").disabled = false;
        };
        el.querySelectorAll("[data-rf]").forEach(b => b.onclick = () => { ss("esm_rf", b.dataset.rf); route(false); });
        el.querySelectorAll("[data-pw]").forEach(b => b.onclick = async () => { const u = Store.user(b.dataset.pw); const p = prompt(`Nouveau mot de passe pour ${full(u)} (6 caractères minimum) :`); if (p) await act(() => Store.setPassword(u.id, p), "Mot de passe réinitialisé."); });
        el.querySelectorAll("[data-rm]").forEach(b => b.onclick = async () => { const u = Store.user(b.dataset.rm); if (confirm(`Supprimer définitivement le compte de ${full(u)} ? Ses notes et messages seront effacés.`)) { await act(() => Store.deleteUser(u.id), "Compte supprimé."); route(false); } });
      },

      programme(el) {
        const T = teachers();
        el.innerHTML = `<div class="cols"><div class="card"><h2>Matières</h2>${db().matieres.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Matière</th><th>Classe</th><th>Coef.</th><th>Enseignant</th><th></th></tr></thead><tbody>
            ${db().matieres.map(m => `<tr data-mid="${m.id}"><td><b>${esc(m.nom)}</b></td><td><span class="chip neu">${esc(m.classe)}</span></td><td><input class="note" data-f="coef" value="${m.coef}" style="width:56px"></td>
              <td><select data-f="prof" style="padding:.4rem;border:1.5px solid var(--line);border-radius:8px;max-width:190px"><option value="">— Non attribuée —</option>${T.map(t => `<option value="${t.id}" ${t.id === m.prof ? "selected" : ""}>${esc(full(t))}</option>`).join("")}</select></td>
              <td style="white-space:nowrap"><button class="btn btn-line btn-sm" data-sv="${m.id}">Enregistrer</button> <button class="btn btn-line btn-sm" data-dm="${m.id}" style="color:var(--bad)">×</button></td></tr>`).join("")}
            </tbody></table></div>` : empty("Aucune matière.", "book")}</div>
          <div><div class="card"><h2>Nouvelle matière</h2>${db().classes.length ? `<form class="form" id="mf">
              <div class="field"><label>Intitulé</label><input name="nom" required maxlength="100"></div>
              <div class="row"><div class="field"><label>Classe</label><select name="classe">${db().classes.map(c => `<option value="${c.id}">${esc(c.id)}</option>`).join("")}</select></div><div class="field"><label>Coefficient</label><input name="coef" type="number" min="1" max="20" value="2" required></div></div>
              <div class="field"><label>Enseignant</label><select name="prof"><option value="">— Non attribuée —</option>${T.map(t => `<option value="${t.id}">${esc(full(t))}</option>`).join("")}</select></div>
              <button class="btn btn-orange">Ajouter la matière</button></form>` : empty("Créez d'abord une classe.", "book")}</div>
            <div class="card"><h2>Classes</h2><div class="feed" style="margin-bottom:1rem">${db().classes.map(c => `<div class="post" style="display:flex;justify-content:space-between;gap:.6rem;align-items:center"><span><b>${esc(c.id)}</b><br><small>${esc(c.nom)} · ${studentsOf(c.id).length} étudiant(s)</small></span><button class="btn btn-line btn-sm" data-dc="${c.id}" style="color:var(--bad)">×</button></div>`).join("") || empty("Aucune classe.")}</div>
              <form class="form" id="cf"><div class="row"><div class="field"><label>Code</label><input name="id" required placeholder="ex. L1-TL" pattern="[A-Za-z0-9\\-]{2,20}"></div><div class="field"><label>Intitulé</label><input name="nom" required placeholder="Licence 1 · Transport et Logistique"></div></div><button class="btn btn-navy">Ajouter la classe</button></form></div></div></div>`;
        el.querySelectorAll("[data-sv]").forEach(b => b.onclick = async () => {
          const tr = b.closest("tr"), m = Store.matiere(b.dataset.sv), coef = parseInt(tr.querySelector("[data-f=coef]").value, 10);
          if (!(coef >= 1 && coef <= 20)) return toast("Coefficient entre 1 et 20.", "err");
          await act(() => Store.saveMatiere({...m, coef, prof:tr.querySelector("[data-f=prof]").value || null}), "Matière mise à jour."); route(false);
        });
        el.querySelectorAll("[data-dm]").forEach(b => b.onclick = async () => { if (confirm("Supprimer cette matière et toutes ses notes ?")) { await act(() => Store.deleteMatiere(b.dataset.dm), "Matière supprimée."); route(false); } });
        el.querySelectorAll("[data-dc]").forEach(b => b.onclick = async () => { if (confirm(`Supprimer la classe ${b.dataset.dc} ainsi que ses matières et notes ? (les comptes étudiants sont conservés)`)) { await act(() => Store.deleteClasse(b.dataset.dc), "Classe supprimée."); route(false); } });
        const mf = el.querySelector("#mf");
        if (mf) mf.onsubmit = async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(mf)); d.coef = +d.coef; await act(() => Store.saveMatiere(d), "Matière ajoutée."); route(false); };
        el.querySelector("#cf").onsubmit = async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); d.id = d.id.toUpperCase(); await act(() => Store.addClasse(d), "Classe ajoutée."); route(false); };
      },

      contacts(el) {
        const K = db().contacts;
        el.innerHTML = `<div class="card"><h2>Messages reçus via le formulaire de contact</h2>${K.length ? `<div class="feed">${K.map(c => `<div class="post"><div class="top"><h4>${esc(c.sujet)} — ${esc(c.nom)}</h4><small>${ago(c.date)}</small></div><p>${esc(c.message)}</p><small>${esc(c.email)} ${c.tel ? "· " + esc(c.tel) : ""}</small><div style="margin-top:.5rem;display:flex;gap:.5rem"><a class="btn btn-line btn-sm" href="mailto:${esc(c.email)}?subject=${encodeURIComponent("Re: " + (c.sujet || ""))}">${ICONS.mail} Répondre</a><button class="btn btn-line btn-sm" data-dk="${c.id}">Archiver</button></div></div>`).join("")}</div>` : empty("Aucun message pour le moment. Les messages envoyés depuis la page Contact apparaîtront ici.", "mail")}</div>`;
        el.querySelectorAll("[data-dk]").forEach(b => b.onclick = async () => { await act(() => Store.deleteContact(b.dataset.dk)); route(false); });
      },

      planning(el) {
        const w = plWeek(), cls = myClasses();
        let cid = ss("esm_plc"); if (!cls.some(c => c.id === cid)) cid = cls[0] && cls[0].id;
        const seances = admin ? Store.seancesClasse(cid) : Store.seancesProf(me.id);
        const evs = Store.eventsPour(me).filter(e => !admin || e.classe === "*" || e.classe === cid);
        const label = s => { const m = Store.matiere(s.matiere) || {}; return admin ? {t:m.nom || "?", sub:[full(Store.user(m.prof)), s.salle].filter(x => x && x !== "—").join(" · ")} : {t:m.nom || "?", sub:[s.classe, s.salle].filter(Boolean).join(" · ")}; };
        // Volume horaire hebdomadaire
        const groups = admin ? db().matieres.filter(m => m.classe === cid).map(m => [m.nom, Store.seancesClasse(cid).filter(s => s.matiere === m.id), PL.colorOf(m.id)])
                             : cls.map(c => [c.nom, seances.filter(s => s.classe === c.id), "var(--blue)"]);
        el.innerHTML = `<div class="card"><div class="toolbar pl-toolbar">
            ${admin ? `<div class="field"><label>Classe</label><select id="plc">${cls.map(c => `<option value="${c.id}" ${c.id === cid ? "selected" : ""}>${esc(c.nom)}</option>`).join("")}</select></div>` : ""}
            ${PL.weekNav(w)}
            <div style="display:flex;gap:.5rem;flex-wrap:wrap">${admin && cid ? `<button class="btn btn-navy btn-sm" id="addc">+ Cours</button>` : ""}${cls.length ? `<button class="btn btn-orange btn-sm" id="adde">+ ${admin ? "Événement" : "Évaluation / événement"}</button>` : ""}</div></div>
            <div id="plw"></div>
            <p style="font-size:.8rem;color:var(--muted);margin-top:.8rem">${admin ? "Cliquez sur une case vide pour ajouter un cours, sur un cours pour le modifier. Les conflits (classe, enseignant, salle) sont détectés automatiquement." : "Cliquez sur un cours ou un événement pour voir le détail. L'emploi du temps est géré par la scolarité."}</p></div>
          <div class="cols"><div class="card"><h2>Prochains événements</h2>${PL.agenda(evs, e => admin || e.auteur === me.id)}</div>
            <div class="card"><h2>Volume horaire / semaine <span class="chip info">${fmtH(hoursOf(seances))}</span></h2>${groups.length ? `<div class="feed">${groups.map(([n, l, c]) => `<div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;font-size:.9rem"><span style="display:flex;gap:.5rem;align-items:center"><i style="width:10px;height:10px;border-radius:3px;background:${c};flex:none"></i>${esc(n)}</span><b style="white-space:nowrap">${fmtH(hoursOf(l))}</b></div>`).join("")}</div>` : empty("Aucun cours programmé.", "cal")}</div></div>`;
        if (!cls.length && !admin) { el.querySelector("#plw").innerHTML = empty("Aucune matière ne vous est attribuée pour le moment.", "cal"); return; }
        PL.week(el.querySelector("#plw"), {seances, events:evs, week:w, label,
          onSlot:admin && cid ? (j, h) => seanceForm({classe:cid, jour:j, debut:h}, cls) : null,
          onSeance:admin ? s => seanceForm(s, cls) : seanceInfo, onEvent:eventInfo});
        bindWeekNav(el, w);
        const pc = el.querySelector("#plc"); if (pc) pc.onchange = () => { ss("esm_plc", pc.value); route(false); };
        const ac = el.querySelector("#addc"); if (ac) ac.onclick = () => seanceForm({classe:cid, jour:1, debut:"08:00"}, cls);
        const ae = el.querySelector("#adde"); if (ae) ae.onclick = () => eventForm(cls, {classe:cid});
        el.querySelectorAll("[data-dev]").forEach(b => b.onclick = async () => { if (confirm("Supprimer cet événement ?")) { await act(() => Store.deleteEvent(b.dataset.dev), "Événement supprimé."); route(false); } });
      },

      compte: account,
    };
    shell(nav, views, admin ? "Scolarité" : "Enseignant");
  }

  /* =========================================================
     PORTAIL ÉTUDIANT
     ========================================================= */
  function student() { boot("etudiant", studentApp); }
  function studentApp() {
    const db = Store.db, cl = () => Store.classe(me.classe) || {id:me.classe, nom:me.classe || "Classe non attribuée"};
    const profs = () => [...new Set(db().matieres.filter(m => m.classe === me.classe && m.prof).map(m => m.prof))].map(Store.user).filter(Boolean);

    const nav = [
      {id:"accueil", l:"Accueil", ic:"home", s:cl().nom},
      {id:"notes", l:"Mes notes", ic:"chart", s:"Mises à jour en temps réel par vos enseignants"},
      {id:"bulletin", l:"Bulletin", ic:"print", s:"Relevé de notes imprimable"},
      {id:"annonces", l:"Annonces & devoirs", ic:"mega", s:"Informations de vos enseignants et de la scolarité"},
      {id:"edt", l:"Emploi du temps", ic:"cal", s:"Cours de la semaine, examens et événements"},
      {id:"messages", l:"Messagerie", ic:"chat", s:"Écrivez à vos enseignants", badge:() => Store.unread(me.id)},
      {id:"compte", l:"Mon compte", ic:"lock", s:"Profil et mot de passe"},
    ];

    const notesTable = rows => rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Matière</th><th>Enseignant</th><th>Coef.</th><th>CC (40 %)</th><th>Examen (60 %)</th><th>Moyenne</th><th>Mention</th></tr></thead><tbody>
      ${rows.map(n => `<tr><td><b>${esc(n.nom)}</b></td><td>${esc(full(Store.user(n.prof)))}</td><td>${n.coef}</td><td>${fmt(n.cc)}</td><td>${fmt(n.exam)}</td><td class="moy">${fmt(n.moy)}</td><td>${chip(n.moy)}</td></tr>`).join("")}</tbody></table></div>` : empty("Aucune matière pour votre classe pour le moment.", "book");

    const views = {
      accueil(el) {
        const rows = Store.notesEtudiant(me.id), mg = Store.moyenneGenerale(me.id), rg = Store.rang(me.id);
        const posts = Store.postsPour(me.classe), dev = posts.filter(p => p.type === "devoir" && p.echeance && new Date(p.echeance) > Date.now());
        el.innerHTML = `<div class="card" style="background:linear-gradient(110deg,var(--navy),var(--blue));color:#fff;border:0"><h2 style="color:#fff">Bonjour ${esc(me.prenom)} 👋</h2><p style="color:#cfe0ff">Matricule ${esc(me.matricule || me.login)} · ${esc(cl().nom)}</p></div>` +
          kpis([["chart","ic-b",fmt(mg),"moyenne générale"],["award","ic-o",rg ? `${rg.rang}<small style="font-size:.9rem">/${rg.total}</small>` : "—","rang dans la classe"],["book","ic-g",`${rows.filter(r => r.moy != null && r.moy >= 10).length}/${rows.length}`,"matières validées"],["chat","ic-y",Store.unread(me.id),"messages non lus"]]) +
          `<div class="cols"><div class="card"><h2>Dernières annonces <a class="btn btn-line btn-sm" href="#annonces">Tout voir</a></h2><div class="feed">${posts.slice(0, 3).map(p => postHTML(p)).join("") || empty("Aucune annonce")}</div></div>
          <div>${(() => {
            const j = (new Date().getDay() + 6) % 7 + 1, td = PL.ymd(new Date());
            const today = Store.seancesClasse(me.classe).filter(s => s.jour === j).sort((a, b) => a.debut.localeCompare(b.debut));
            const exam = Store.eventsPour(me).filter(e => e.type === "examen" && e.date >= td).sort((a, b) => a.date.localeCompare(b.date))[0];
            return `<div class="card"><h2>Aujourd'hui <a class="btn btn-line btn-sm" href="#edt">Planning</a></h2>${today.length ? `<div class="feed">${today.map(s => `<div style="display:flex;gap:.7rem;align-items:center;font-size:.88rem"><b style="min-width:3.2rem;color:var(--navy)">${PL.hm(s.debut)}</b><i style="width:4px;align-self:stretch;border-radius:4px;background:${PL.colorOf(s.matiere)}"></i><span>${esc(Store.matiere(s.matiere)?.nom || "")}<br><small style="color:var(--muted)">${PL.hm(s.debut)} – ${PL.hm(s.fin)}${s.salle ? " · " + esc(s.salle) : ""}</small></span></div>`).join("")}</div>` : `<p style="color:var(--muted);font-size:.9rem">Pas de cours aujourd'hui.</p>`}
              ${exam ? `<div class="post urgent" style="margin-top:.9rem"><small style="color:var(--bad);font-weight:700">Prochain examen</small><h4>${esc(exam.titre)}</h4><small>${PL.fmtLong(exam.date)}${exam.debut ? " · " + PL.hm(exam.debut) : ""}${exam.lieu ? " · " + esc(exam.lieu) : ""}</small></div>` : ""}</div>`;
          })()}<div class="card" style="text-align:center"><h2>Ma moyenne</h2><div class="ring" style="--p:${(mg || 0) * 5}"><div><span><b>${fmt(mg)}</b><br><small>/ 20</small></span></div></div><p style="margin-top:1rem">${chip(mg)}</p></div>
          <div class="card"><h2>Devoirs à rendre</h2>${dev.length ? `<div class="feed">${dev.map(p => `<div class="post devoir"><h4>${esc(p.titre)}</h4><small>${esc(Store.matiere(p.matiere)?.nom || "")} · <b style="color:var(--orange)">avant le ${date(p.echeance)}</b></small></div>`).join("")}</div>` : empty("Rien à rendre pour le moment 🎉", "award")}</div></div></div>`;
      },
      notes(el) {
        const rows = Store.notesEtudiant(me.id), mg = Store.moyenneGenerale(me.id);
        el.innerHTML = `<div class="card"><h2>Relevé de notes — ${esc(cl().nom)}</h2>${notesTable(rows)}
          <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:1.2rem;flex-wrap:wrap"><p>Moyenne générale pondérée : <b class="moy" style="font-size:1.3rem;color:var(--navy)">${fmt(mg)}</b> ${chip(mg)}</p><a class="btn btn-navy btn-sm" href="#bulletin">${ICONS.print} Voir le bulletin</a></div></div>
          ${rows.length ? `<div class="card"><h2>Mes moyennes par matière</h2><div class="bars">${rows.map(r => `<div class="b"><em>${fmt(r.moy)}</em><i style="height:${(r.moy || 0) * 5}%;${r.moy != null && r.moy < 10 ? "background:linear-gradient(180deg,#f59e8b,var(--bad))" : "background:linear-gradient(180deg,var(--sky),var(--blue))"}"></i><small title="${esc(r.nom)}">${esc(r.nom.split(" ")[0])}</small></div>`).join("")}</div></div>` : ""}`;
      },
      bulletin(el) {
        const rows = Store.notesEtudiant(me.id), mg = Store.moyenneGenerale(me.id), rg = Store.rang(me.id);
        const y = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        el.innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;border-bottom:3px solid var(--orange);padding-bottom:1rem;margin-bottom:1.2rem;flex-wrap:wrap">
            <div style="display:flex;gap:1rem;align-items:center"><img src="assets/img/logo-esm.svg" alt="" style="height:70px"><div><b style="font-family:var(--font-h);color:var(--navy);font-size:1.1rem">ÉCOLE SUPÉRIEURE DE LA MER</b><br><small style="color:var(--muted)">${ESM.adresse}</small></div></div>
            <div style="text-align:right"><b style="color:var(--navy)">BULLETIN DE NOTES</b><br><small>Année académique ${y} – ${y + 1}</small></div></div>
          <p><b>Étudiant(e) :</b> ${esc(me.nom.toUpperCase())} ${esc(me.prenom)} &nbsp;·&nbsp; <b>Matricule :</b> ${esc(me.matricule || me.login)}<br><b>Classe :</b> ${esc(cl().nom)}</p>
          <div style="margin:1.2rem 0">${notesTable(rows)}</div>
          <div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><span><b>${fmt(mg)}</b><span>Moyenne générale</span></span></div><div class="kpi"><span><b>${rg ? rg.rang + " / " + rg.total : "—"}</b><span>Rang</span></span></div><div class="kpi"><span><b style="font-size:1.1rem">${mg == null ? "En attente" : mg >= 10 ? "Admis(e)" : "Ajourné(e)"}</b><span>Décision provisoire</span></span></div></div>
          <p style="font-size:.78rem;color:var(--muted)">Document généré le ${date(new Date())} — relevé provisoire, seul le bulletin signé par la direction fait foi.</p>
          <button class="btn btn-orange no-print" onclick="print()" style="margin-top:1rem">${ICONS.print} Imprimer / enregistrer en PDF</button></div>`;
      },
      annonces(el) {
        const posts = Store.postsPour(me.classe);
        el.innerHTML = `<div class="card"><h2>Toutes les publications</h2><div class="feed">${posts.map(p => postHTML(p)).join("") || empty("Aucune annonce")}</div></div>`;
      },
      edt(el) {
        const w = plWeek(), seances = Store.seancesClasse(me.classe), evs = Store.eventsPour(me);
        el.innerHTML = `<div class="card"><div class="toolbar pl-toolbar">${PL.weekNav(w)}<span class="chip info">${fmtH(hoursOf(seances))} de cours / semaine</span></div><div id="plw"></div></div>
          <div class="card"><h2>Examens et événements à venir</h2>${PL.agenda(evs)}</div>`;
        if (!seances.length && !evs.length) { el.querySelector("#plw").innerHTML = empty("L'emploi du temps de votre classe n'est pas encore publié par la scolarité.", "cal"); return; }
        PL.week(el.querySelector("#plw"), {seances, events:evs, week:w, onSeance:seanceInfo, onEvent:eventInfo,
          label:s => { const m = Store.matiere(s.matiere) || {}; return {t:m.nom || "?", sub:[full(Store.user(m.prof)), s.salle].filter(x => x && x !== "—").join(" · ")}; }});
        bindWeekNav(el, w);
      },
      messages(el) { messenger(el, profs().concat(db().users.filter(u => u.role === "admin"))); },
      compte: account,
    };
    shell(nav, views, "Étudiant");
  }

  return {teacher, student, redrawNav:() => {}};
})();
