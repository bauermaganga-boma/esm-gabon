/* ESM — Espace numérique : back-office enseignants / scolarité et portail étudiant */
const P = (() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = n => n == null ? "—" : Number(n).toFixed(2).replace(".", ",");
  const date = d => new Date(d).toLocaleDateString("fr-FR", {day:"numeric", month:"short", year:"numeric"});
  const ago = d => { const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return "à l'instant"; if (s < 3600) return `il y a ${Math.floor(s/60)} min`; if (s < 86400) return `il y a ${Math.floor(s/3600)} h`; if (s < 7*86400) return `il y a ${Math.floor(s/86400)} j`; return date(d); };
  const ini = u => ((u.prenom || "")[0] + (u.nom || "")[0]).toUpperCase();
  const full = u => u ? `${u.civ ? u.civ + " " : ""}${u.prenom} ${u.nom}` : "—";
  const chip = m => { const [l, c] = Store.mention(m); return `<span class="chip ${c}">${l}</span>`; };
  const parseNote = v => { v = String(v).trim().replace(",", "."); if (v === "") return null; const n = Number(v); return isNaN(n) || n < 0 || n > 20 ? NaN : Math.round(n * 100) / 100; };
  const empty = (t, ic = "inbox") => `<div class="empty">${ICONS[ic]}<p>${t}</p></div>`;

  let me, NAV, VIEWS, cur;

  function shell(nav, views, sub) {
    NAV = nav; VIEWS = views;
    const sb = document.getElementById("sb");
    const draw = () => {
      sb.innerHTML = `<div class="sb-brand"><img src="assets/img/logo-esm.svg" alt=""><span><b>ESM</b><small>${sub}</small></span></div>` +
        NAV.map(n => { const b = n.badge ? n.badge() : 0; return `<a href="#${n.id}" data-v="${n.id}" class="${n.id === cur ? "on" : ""}">${ICONS[n.ic]}${n.l}${b ? `<span class="pill">${b}</span>` : ""}</a>`; }).join("") +
        `<div class="sb-foot"><a href="index.html">${ICONS.home}Retour au site</a><button class="lnk" id="logout">${ICONS.out}Déconnexion</button></div>`;
      document.getElementById("logout").onclick = () => { Store.logout(); location.href = "espace.html?role=" + me.role; };
    };
    P.redrawNav = draw;
    document.getElementById("who").innerHTML = `<span class="av">${ini(me)}</span><span><b>${esc(full(me))}</b><small>${esc(me.titre || Store.classe(me.classe)?.nom || "")}</small></span>`;
    document.getElementById("sbt").onclick = () => sb.classList.toggle("open");
    const route = () => {
      const id = location.hash.slice(1).split("?")[0];
      cur = NAV.some(n => n.id === id) ? id : NAV[0].id;
      const n = NAV.find(x => x.id === cur);
      document.getElementById("vt").textContent = n.l; document.getElementById("vs").textContent = n.s || "";
      document.getElementById("views").innerHTML = `<div class="view on" id="v-${cur}"></div>`;
      VIEWS[cur](document.getElementById("v-" + cur));
      draw(); sb.classList.remove("open"); scrollTo(0, 0);
    };
    addEventListener("hashchange", route); route();
  }
  const go = (id, q) => { if (q) sessionStorage.setItem("esm_q", q); location.hash = id; };
  const takeQ = () => { const q = sessionStorage.getItem("esm_q"); sessionStorage.removeItem("esm_q"); return q; };

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
    // contacts : liste des utilisateurs à qui l'on peut écrire
    let other = takeQ();
    const draw = () => {
      const threads = Store.contactsDe(me.id);
      if (!other && threads[0]) other = threads[0].user.id;
      const o = other ? Store.user(other) : null;
      if (o) Store.markRead(me.id, o.id);
      const t = o ? Store.thread(me.id, o.id) : [];
      el.innerHTML = `<div class="card"><h2>Messagerie <span style="display:flex;gap:.5rem;align-items:center"><select id="newto" class="btn btn-line btn-sm" style="max-width:260px"><option value="">+ Nouvelle conversation…</option>${contacts.map(u => `<option value="${u.id}">${esc(full(u))}${u.classe ? " · " + u.classe : u.titre ? " · " + esc(u.titre) : ""}</option>`).join("")}</select></span></h2>
        <div class="msgs"><div class="thread-list">${threads.length ? threads.map(x => `<button data-o="${x.user.id}" class="${x.user.id === other ? "on" : ""} ${x.unread && x.user.id !== other ? "unread" : ""}"><span class="av">${ini(x.user)}</span><span style="min-width:0"><b>${esc(full(x.user))}</b><small>${x.last.from === me.id ? "Vous : " : ""}${esc(x.last.texte)}</small></span></button>`).join("") : empty("Aucune conversation")}</div>
        <div class="chat">${o ? `<div class="head">${esc(full(o))} <small style="color:var(--muted);font-weight:500">${o.classe ? "· " + esc(Store.classe(o.classe).nom) : o.titre ? "· " + esc(o.titre) : ""}</small></div>
          <div class="body">${t.length ? t.map(m => `<div class="bubble ${m.from === me.id ? "me" : ""}">${esc(m.texte)}<small>${ago(m.date)}</small></div>`).join("") : `<p class="empty">Démarrez la conversation avec ${esc(o.prenom)}.</p>`}</div>
          <form id="sendf"><input name="t" placeholder="Écrire un message…" autocomplete="off" required><button class="btn btn-orange btn-sm" aria-label="Envoyer">${ICONS.send}</button></form>` : empty("Sélectionnez ou démarrez une conversation", "chat")}</div></div></div>`;
      const body = el.querySelector(".chat .body"); if (body) body.scrollTop = body.scrollHeight;
      el.querySelectorAll("[data-o]").forEach(b => b.onclick = () => { other = b.dataset.o; draw(); });
      el.querySelector("#newto").onchange = e => { if (e.target.value) { other = e.target.value; draw(); } };
      const f = el.querySelector("#sendf");
      if (f) { f.t.focus(); f.onsubmit = async e => { e.preventDefault(); await Store.send(me.id, other, f.t.value.trim()); draw(); P.redrawNav(); }; }
      P.redrawNav && P.redrawNav();
    };
    draw();
  }

  /* =========================================================
     BACK-OFFICE ENSEIGNANT / SCOLARITÉ
     ========================================================= */
  function teacher() {
    me = Store.current();
    if (!me || me.role === "etudiant") { location.replace("espace.html?role=enseignant"); return; }
    const admin = me.role === "admin", db = Store.db();
    const mats = () => admin ? db.matieres : db.matieres.filter(m => m.prof === me.id);
    const myClasses = () => admin ? db.classes : db.classes.filter(c => mats().some(m => m.classe === c.id));
    const studentsOf = cid => db.users.filter(u => u.role === "etudiant" && u.classe === cid).sort((a, b) => a.nom.localeCompare(b.nom));
    const statsMat = m => { const n = db.notes[m.id] || {}; const st = studentsOf(m.classe); const moys = st.map(s => Store.moyenne(n[s.id])).filter(x => x != null); return {total:st.length, done:moys.length, avg:moys.length ? moys.reduce((a, b) => a + b, 0) / moys.length : null, pass:moys.filter(x => x >= 10).length, moys}; };

    const nav = [
      {id:"tableau", l:"Tableau de bord", ic:"home", s:admin ? "Vue d'ensemble de l'école" : "Vue d'ensemble de vos enseignements"},
      {id:"notes", l:"Saisie des notes", ic:"edit", s:`Contrôle continu ${Store.PONDERATION.cc * 100} % · Examen ${Store.PONDERATION.exam * 100} % — moyenne calculée automatiquement`},
      {id:"annonces", l:"Annonces & devoirs", ic:"mega", s:"Publiez des informations visibles immédiatement par vos étudiants"},
      {id:"messages", l:"Messagerie", ic:"chat", s:"Échangez avec vos étudiants", badge:() => Store.unread(me.id)},
    ];
    if (admin) nav.splice(1, 0,
      {id:"candidatures", l:"Pré-inscriptions", ic:"inbox", s:"Demandes reçues depuis le site", badge:() => db.candidatures.filter(c => c.statut === "nouveau").length},
      {id:"resultats", l:"Résultats par classe", ic:"chart", s:"Moyennes générales et classements"},
      {id:"contacts", l:"Messages du site", ic:"mail", s:"Formulaire de contact", badge:() => db.contacts.length});

    const views = {
      tableau(el) {
        const ms = mats(), stud = new Set(ms.flatMap(m => studentsOf(m.classe).map(s => s.id)));
        const all = ms.map(statsMat), done = all.reduce((a, s) => a + s.done, 0), tot = all.reduce((a, s) => a + s.total, 0);
        const k = admin
          ? [["users","ic-b",db.users.filter(u => u.role === "etudiant").length,"étudiants inscrits"],["inbox","ic-o",db.candidatures.filter(c => c.statut === "nouveau").length,"nouvelles pré-inscriptions"],["book","ic-g",db.matieres.length,"matières au programme"],["chat","ic-y",Store.unread(me.id),"messages non lus"]]
          : [["book","ic-b",ms.length,"matières enseignées"],["users","ic-o",stud.size,"étudiants suivis"],["edit","ic-g",(tot ? Math.round(done / tot * 100) : 0) + " %","notes finalisées"],["chat","ic-y",Store.unread(me.id),"messages non lus"]];
        const posts = db.posts.filter(p => admin || p.auteur === me.id || (p.classe === "*")).slice(0, 4);
        el.innerHTML = kpis(k) + `<div class="cols"><div class="card"><h2>${admin ? "Toutes les matières" : "Mes matières"}</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Matière</th><th>Classe</th><th>Coef.</th><th>Saisie</th><th>Moy. classe</th><th>Réussite</th><th></th></tr></thead><tbody>
          ${ms.map((m, i) => { const s = all[i]; const p = s.total ? Math.round(s.done / s.total * 100) : 0; return `<tr><td><b>${esc(m.nom)}</b>${admin ? `<br><small style="color:var(--muted)">${esc(full(Store.user(m.prof)))}</small>` : ""}</td><td><span class="chip neu">${m.classe}</span></td><td>${m.coef}</td>
            <td style="min-width:120px"><div style="height:8px;background:var(--line);border-radius:9px;overflow:hidden"><div style="height:100%;width:${p}%;background:${p === 100 ? "var(--ok)" : "var(--orange)"}"></div></div><small style="color:var(--muted)">${s.done}/${s.total}</small></td>
            <td class="moy">${fmt(s.avg)}</td><td>${s.done ? Math.round(s.pass / s.done * 100) + " %" : "—"}</td><td><button class="btn btn-line btn-sm" data-m="${m.id}">Saisir</button></td></tr>`; }).join("")}
          </tbody></table></div></div>
          <div class="card"><h2>Dernières annonces <a class="btn btn-line btn-sm" href="#annonces">Publier</a></h2><div class="feed">${posts.length ? posts.map(p => postHTML(p)).join("") : empty("Aucune annonce publiée")}</div></div></div>`;
        el.querySelectorAll("[data-m]").forEach(b => b.onclick = () => go("notes", b.dataset.m));
      },

      notes(el) {
        const ms = mats(); if (!ms.length) { el.innerHTML = empty("Aucune matière attribuée."); return; }
        let mid = takeQ() || sessionStorage.getItem("esm_mat"); if (!ms.some(m => m.id === mid)) mid = ms[0].id;
        window.__esmDirty = false;
        const draw = () => {
          sessionStorage.setItem("esm_mat", mid);
          const m = Store.matiere(mid), st = studentsOf(m.classe), n = db.notes[mid] || {};
          el.innerHTML = `<div class="card"><div class="toolbar">
              <div class="field"><label>Matière</label><select id="selm">${ms.map(x => `<option value="${x.id}" ${x.id === mid ? "selected" : ""}>${esc(x.nom)} — ${x.classe}</option>`).join("")}</select></div>
              <div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn btn-line btn-sm" id="csv">${ICONS.dl} Export CSV</button><button class="btn btn-orange btn-sm" id="save">${ICONS.save} Enregistrer les notes</button></div></div>
            <p style="font-size:.85rem;color:var(--muted);margin-bottom:1rem">${esc(Store.classe(m.classe).nom)} · Coefficient ${m.coef}${admin ? " · Enseignant : " + esc(full(Store.user(m.prof))) : ""} · Notes sur 20 (virgule acceptée). Utilisez <b>Tab</b> ou <b>Entrée</b> pour passer d'une case à l'autre.</p>
            <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Étudiant</th><th>Contrôle continu</th><th>Examen</th><th>Moyenne</th><th>Mention</th><th>Dernière mise à jour</th></tr></thead><tbody>
            ${st.map((s, i) => { const x = n[s.id] || {}; return `<tr data-sid="${s.id}"><td>${i + 1}</td><td><div class="stu"><span class="av">${ini(s)}</span><span><b>${esc(s.nom.toUpperCase())} ${esc(s.prenom)}</b><small>${s.matricule}</small></span></div></td>
              <td><input class="note" data-k="cc" inputmode="decimal" value="${x.cc == null ? "" : String(x.cc).replace(".", ",")}" aria-label="CC ${esc(s.prenom)}"></td><td><input class="note" data-k="exam" inputmode="decimal" value="${x.exam == null ? "" : String(x.exam).replace(".", ",")}" aria-label="Examen ${esc(s.prenom)}"></td>
              <td class="moy">${fmt(Store.moyenne(x))}</td><td class="men">${chip(Store.moyenne(x))}</td><td><small style="color:var(--muted)">${x.maj ? ago(x.maj) : "—"}</small></td></tr>`; }).join("")}
            </tbody></table></div></div>
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
              <div class="kpis" style="grid-template-columns:1fr 1fr;margin:1.2rem 0 0"><div class="kpi"><span><b>${fmt(avg)}</b><span>moyenne</span></span></div><div class="kpi"><span><b>${moys.length}/${inputs.length / 2}</b><span>notes complètes</span></span></div>
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
            const rows = {}; el.querySelectorAll("tr[data-sid]").forEach(tr => { const cc = parseNote(tr.querySelector("[data-k=cc]").value), ex = parseNote(tr.querySelector("[data-k=exam]").value); if (cc != null || ex != null) rows[tr.dataset.sid] = {cc, exam:ex}; });
            await Store.saveNotes(mid, rows); window.__esmDirty = false; toast("Notes enregistrées — visibles immédiatement par les étudiants.", "ok"); draw();
          };
          el.querySelector("#csv").onclick = () => {
            const lines = [["Matricule","Nom","Prénom","CC","Examen","Moyenne","Mention"]].concat(st.map(s => { const x = (db.notes[mid] || {})[s.id] || {}, mo = Store.moyenne(x); return [s.matricule, s.nom, s.prenom, x.cc ?? "", x.exam ?? "", mo ?? "", Store.mention(mo)[0]]; }));
            const blob = new Blob(["﻿" + lines.map(r => r.map(c => `"${String(c).replace(".", ",")}"`).join(";")).join("\n")], {type:"text/csv;charset=utf-8"});
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `notes_${m.classe}_${m.nom.replace(/\s+/g, "_")}.csv`; a.click();
          };
          recalc();
        };
        draw();
        if (!window.__esmBU && (window.__esmBU = true)) addEventListener("beforeunload", e => { if (window.__esmDirty && location.hash === "#notes") { e.preventDefault(); e.returnValue = ""; } });
      },

      annonces(el) {
        const draw = () => {
          const cls = myClasses(), ms = mats();
          const list = db.posts.filter(p => admin || p.auteur === me.id);
          el.innerHTML = `<div class="cols"><div class="card"><h2>Publications ${admin ? "de l'école" : "publiées"}</h2><div class="feed">${list.length ? list.map(p => postHTML(p, true)).join("") : empty("Vous n'avez encore rien publié")}</div></div>
            <div class="card"><h2>Nouvelle publication</h2><form class="form" id="pf">
              <div class="field"><label>Destinataires</label><select name="classe" required>${admin ? `<option value="*">Toute l'école</option>` : ""}${cls.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join("")}</select></div>
              <div class="field"><label>Matière (optionnel)</label><select name="matiere"><option value="">—</option>${ms.map(m => `<option value="${m.id}" data-c="${m.classe}">${esc(m.nom)} — ${m.classe}</option>`).join("")}</select></div>
              <div class="field"><label>Type</label><select name="type"><option value="annonce">Annonce</option><option value="devoir">Devoir / travail à rendre</option><option value="urgent">Urgent</option></select></div>
              <div class="field"><label>Titre</label><input name="titre" required maxlength="90"></div>
              <div class="field"><label>Message</label><textarea name="texte" required></textarea></div>
              <div class="field" id="ech" style="display:none"><label>Date de remise</label><input type="date" name="echeance"></div>
              <button class="btn btn-orange">${ICONS.send} Publier</button></form></div></div>`;
          const f = el.querySelector("#pf");
          f.type.onchange = () => el.querySelector("#ech").style.display = f.type.value === "devoir" ? "" : "none";
          f.matiere.onchange = () => { const o = f.matiere.selectedOptions[0]; if (o.dataset.c) f.classe.value = o.dataset.c; };
          f.onsubmit = async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); d.auteur = me.id; if (!d.matiere) delete d.matiere; if (d.echeance) d.echeance = new Date(d.echeance).toISOString(); else delete d.echeance; await Store.addPost(d); toast("Publication envoyée aux étudiants.", "ok"); draw(); };
          el.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { if (confirm("Supprimer cette publication ?")) { await Store.deletePost(b.dataset.del); draw(); } });
        };
        draw();
      },

      messages(el) {
        const contacts = admin ? db.users.filter(u => u.id !== me.id) : db.users.filter(u => u.role === "etudiant" && myClasses().some(c => c.id === u.classe)).concat(db.users.filter(u => u.role === "admin"));
        messenger(el, contacts);
      },

      candidatures(el) {
        const draw = () => {
          const st = {"nouveau":"info","en cours":"warn","admis":"ok","refusé":"bad"};
          el.innerHTML = kpis([["inbox","ic-b",db.candidatures.length,"demandes au total"],["clock","ic-o",db.candidatures.filter(c => c.statut === "nouveau").length,"à traiter"],["award","ic-g",db.candidatures.filter(c => c.statut === "admis").length,"admis"],["users","ic-y",db.candidatures.filter(c => c.statut === "en cours").length,"en cours d'étude"]]) +
            `<div class="card"><h2>Pré-inscriptions reçues</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Dossier</th><th>Candidat</th><th>Formation</th><th>Diplôme</th><th>Reçu</th><th>Statut</th><th></th></tr></thead><tbody>
            ${db.candidatures.map(c => `<tr><td><b>${esc(c.ref)}</b></td><td><b>${esc(c.prenom)} ${esc(c.nom)}</b><br><small style="color:var(--muted)">${esc(c.tel)} ${c.email ? "· " + esc(c.email) : ""}</small></td><td>${esc(c.formationLabel)}</td><td>${esc(c.niveau)} ${esc(c.serie || "")}</td><td><small>${ago(c.date)}</small></td>
              <td><select data-c="${c.id}" class="chip ${st[c.statut]}" style="border:0;cursor:pointer">${Object.keys(st).map(s => `<option ${s === c.statut ? "selected" : ""}>${s}</option>`).join("")}</select></td><td><button class="btn btn-line btn-sm" data-v="${c.id}">Voir</button></td></tr>`).join("")}
            </tbody></table></div></div>`;
          el.querySelectorAll("select[data-c]").forEach(s => s.onchange = async () => { await Store.setStatut(s.dataset.c, s.value); toast("Statut mis à jour.", "ok"); draw(); P.redrawNav(); });
          el.querySelectorAll("[data-v]").forEach(b => b.onclick = () => { const c = db.candidatures.find(x => x.id === b.dataset.v); modal("Dossier " + c.ref, `<p><b>${esc(c.prenom)} ${esc(c.nom)}</b> — ${esc(c.tel)} ${c.email ? "· " + esc(c.email) : ""}</p><p style="margin:.6rem 0">Formation : <b>${esc(c.formationLabel)}</b><br>Diplôme : ${esc(c.niveau)} ${esc(c.serie || "")}<br>Ville : ${esc(c.ville || "—")} · Né(e) le : ${c.naissance ? date(c.naissance) : "—"}<br>Source : ${esc(c.source || "—")}</p><div class="panel" style="box-shadow:none"><b>Motivation</b><p style="color:var(--muted);margin-top:.4rem">${esc(c.motivation || "Non renseignée.")}</p></div><div style="margin-top:1rem;display:flex;gap:.6rem;flex-wrap:wrap"><a class="btn btn-orange btn-sm" href="tel:${esc(c.tel.replace(/\s/g, ""))}">${ICONS.phone} Appeler</a>${c.email ? `<a class="btn btn-line btn-sm" href="mailto:${esc(c.email)}">${ICONS.mail} Écrire</a>` : ""}</div>`); });
        };
        draw();
      },

      resultats(el) {
        let cid = db.classes[0].id;
        const draw = () => {
          const st = studentsOf(cid).map(s => ({s, m:Store.moyenneGenerale(s.id)})).sort((a, b) => (b.m ?? -1) - (a.m ?? -1));
          const ms = st.filter(x => x.m != null).map(x => x.m);
          el.innerHTML = `<div class="card"><div class="toolbar"><div class="field"><label>Classe</label><select id="selc">${db.classes.map(c => `<option value="${c.id}" ${c.id === cid ? "selected" : ""}>${esc(c.nom)}</option>`).join("")}</select></div><button class="btn btn-line btn-sm no-print" onclick="print()">${ICONS.print} Imprimer</button></div>
            ${kpis([["users","ic-b",st.length,"étudiants"],["chart","ic-o",fmt(ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null),"moyenne de classe"],["award","ic-g",ms.filter(x => x >= 10).length,"admis (≥ 10)"],["book","ic-y",db.matieres.filter(m => m.classe === cid).length,"matières"]])}
            <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Rang</th><th>Étudiant</th>${db.matieres.filter(m => m.classe === cid).map(m => `<th title="${esc(m.nom)}">${esc(m.nom.length > 16 ? m.nom.slice(0, 15) + "…" : m.nom)}<br><small>coef ${m.coef}</small></th>`).join("")}<th>Moy. gén.</th><th>Décision</th></tr></thead><tbody>
            ${st.map((x, i) => `<tr><td><b>${x.m != null ? i + 1 : "—"}</b></td><td><div class="stu"><span class="av">${ini(x.s)}</span><span><b>${esc(x.s.nom.toUpperCase())} ${esc(x.s.prenom)}</b><small>${x.s.matricule}</small></span></div></td>${Store.notesEtudiant(x.s.id).map(n => `<td>${fmt(n.moy)}</td>`).join("")}<td class="moy">${fmt(x.m)}</td><td>${chip(x.m)}</td></tr>`).join("")}
            </tbody></table></div></div>`;
          el.querySelector("#selc").onchange = e => { cid = e.target.value; draw(); };
        };
        draw();
      },

      contacts(el) {
        el.innerHTML = `<div class="card"><h2>Messages reçus via le formulaire de contact</h2>${db.contacts.length ? `<div class="feed">${db.contacts.map(c => `<div class="post"><div class="top"><h4>${esc(c.sujet)} — ${esc(c.nom)}</h4><small>${ago(c.date)}</small></div><p>${esc(c.message)}</p><small>${esc(c.email)} ${c.tel ? "· " + esc(c.tel) : ""}</small><div style="margin-top:.5rem"><a class="btn btn-line btn-sm" href="mailto:${esc(c.email)}?subject=${encodeURIComponent("Re: " + c.sujet)}">${ICONS.mail} Répondre</a></div></div>`).join("")}</div>` : empty("Aucun message pour le moment. Les messages envoyés depuis la page Contact apparaîtront ici.", "mail")}</div>`;
      },
    };
    shell(nav, views, admin ? "Scolarité" : "Enseignant");
  }

  /* =========================================================
     PORTAIL ÉTUDIANT
     ========================================================= */
  function student() {
    me = Store.current();
    if (!me || me.role !== "etudiant") { location.replace("espace.html?role=etudiant"); return; }
    const db = Store.db(), cl = Store.classe(me.classe);
    const profs = () => [...new Set(db.matieres.filter(m => m.classe === me.classe).map(m => m.prof))].map(Store.user);

    const nav = [
      {id:"accueil", l:"Accueil", ic:"home", s:esc(cl.nom)},
      {id:"notes", l:"Mes notes", ic:"chart", s:"Mises à jour en temps réel par vos enseignants"},
      {id:"bulletin", l:"Bulletin", ic:"print", s:"Relevé de notes imprimable"},
      {id:"annonces", l:"Annonces & devoirs", ic:"mega", s:"Informations de vos enseignants et de la scolarité"},
      {id:"edt", l:"Emploi du temps", ic:"cal", s:"Semaine type"},
      {id:"messages", l:"Messagerie", ic:"chat", s:"Écrivez à vos enseignants", badge:() => Store.unread(me.id)},
    ];

    const notesTable = rows => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Matière</th><th>Enseignant</th><th>Coef.</th><th>CC (40 %)</th><th>Examen (60 %)</th><th>Moyenne</th><th>Mention</th></tr></thead><tbody>
      ${rows.map(n => `<tr><td><b>${esc(n.nom)}</b></td><td>${esc(full(Store.user(n.prof)))}</td><td>${n.coef}</td><td>${fmt(n.cc)}</td><td>${fmt(n.exam)}</td><td class="moy">${fmt(n.moy)}</td><td>${chip(n.moy)}</td></tr>`).join("")}</tbody></table></div>`;

    const views = {
      accueil(el) {
        const rows = Store.notesEtudiant(me.id), mg = Store.moyenneGenerale(me.id), rg = Store.rang(me.id);
        const posts = Store.postsPour(me.classe), dev = posts.filter(p => p.type === "devoir" && p.echeance && new Date(p.echeance) > Date.now());
        el.innerHTML = `<div class="card" style="background:linear-gradient(110deg,var(--navy),var(--blue));color:#fff;border:0"><h2 style="color:#fff">Bonjour ${esc(me.prenom)} 👋</h2><p style="color:#cfe0ff">Matricule ${me.matricule} · ${esc(cl.nom)}</p></div>` +
          kpis([["chart","ic-b",fmt(mg),"moyenne générale"],["award","ic-o",rg ? `${rg.rang}<small style="font-size:.9rem">/${rg.total}</small>` : "—","rang dans la classe"],["book","ic-g",`${rows.filter(r => r.moy != null && r.moy >= 10).length}/${rows.length}`,"matières validées"],["chat","ic-y",Store.unread(me.id),"messages non lus"]]) +
          `<div class="cols"><div class="card"><h2>Dernières annonces <a class="btn btn-line btn-sm" href="#annonces">Tout voir</a></h2><div class="feed">${posts.slice(0, 3).map(p => postHTML(p)).join("") || empty("Aucune annonce")}</div></div>
          <div><div class="card" style="text-align:center"><h2>Ma moyenne</h2><div class="ring" style="--p:${(mg || 0) * 5}"><div><span><b>${fmt(mg)}</b><br><small>/ 20</small></span></div></div><p style="margin-top:1rem">${chip(mg)}</p></div>
          <div class="card"><h2>Devoirs à rendre</h2>${dev.length ? `<div class="feed">${dev.map(p => `<div class="post devoir"><h4>${esc(p.titre)}</h4><small>${esc(Store.matiere(p.matiere)?.nom || "")} · <b style="color:var(--orange)">avant le ${date(p.echeance)}</b></small></div>`).join("")}</div>` : empty("Rien à rendre pour le moment 🎉", "award")}</div></div></div>`;
      },
      notes(el) {
        const rows = Store.notesEtudiant(me.id), mg = Store.moyenneGenerale(me.id);
        el.innerHTML = `<div class="card"><h2>Relevé de notes — ${esc(cl.nom)}</h2>${notesTable(rows)}
          <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:1.2rem;flex-wrap:wrap"><p>Moyenne générale pondérée : <b class="moy" style="font-size:1.3rem;color:var(--navy)">${fmt(mg)}</b> ${chip(mg)}</p><a class="btn btn-navy btn-sm" href="#bulletin">${ICONS.print} Voir le bulletin</a></div></div>
          <div class="card"><h2>Mes moyennes par matière</h2><div class="bars">${rows.map(r => `<div class="b"><em>${fmt(r.moy)}</em><i style="height:${(r.moy || 0) * 5}%;${r.moy != null && r.moy < 10 ? "background:linear-gradient(180deg,#f59e8b,var(--bad))" : "background:linear-gradient(180deg,var(--sky),var(--blue))"}"></i><small title="${esc(r.nom)}">${esc(r.nom.split(" ")[0])}</small></div>`).join("")}</div></div>`;
      },
      bulletin(el) {
        const rows = Store.notesEtudiant(me.id), mg = Store.moyenneGenerale(me.id), rg = Store.rang(me.id);
        el.innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;border-bottom:3px solid var(--orange);padding-bottom:1rem;margin-bottom:1.2rem;flex-wrap:wrap">
            <div style="display:flex;gap:1rem;align-items:center"><img src="assets/img/logo-esm.svg" alt="" style="height:70px"><div><b style="font-family:var(--font-h);color:var(--navy);font-size:1.1rem">ÉCOLE SUPÉRIEURE DE LA MER</b><br><small style="color:var(--muted)">${ESM.adresse}</small></div></div>
            <div style="text-align:right"><b style="color:var(--navy)">BULLETIN DE NOTES</b><br><small>Année académique 2025 – 2026 · Semestre 1</small></div></div>
          <p><b>Étudiant(e) :</b> ${esc(me.nom.toUpperCase())} ${esc(me.prenom)} &nbsp;·&nbsp; <b>Matricule :</b> ${me.matricule}<br><b>Classe :</b> ${esc(cl.nom)}</p>
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
        const ms = db.matieres.filter(m => m.classe === me.classe), days = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi"], slots = ["08h – 10h","10h – 12h","14h – 16h"];
        let k = 0; const cell = (d, s) => { if ((d + s) % 3 === 2) return `<div></div>`; const m = ms[(k++) % ms.length]; return `<div class="c ${k % 2 ? "" : "o"}">${esc(m.nom)}<small>${esc(full(Store.user(m.prof)))} · Salle ${1 + (d + s) % 5}</small></div>`; };
        el.innerHTML = `<div class="card"><h2>Semaine type — ${esc(cl.nom)}</h2><div class="tbl-wrap" style="border:0"><div class="tt"><div class="h"></div>${days.map(d => `<div class="h">${d}</div>`).join("")}${slots.map((s, si) => `<div class="t">${s}</div>${days.map((_, di) => cell(di, si)).join("")}`).join("")}</div></div><p class="notice">Emploi du temps indicatif. Les changements de salle ou d'horaire sont publiés dans « Annonces ».</p></div>`;
      },
      messages(el) { messenger(el, profs().concat(db.users.filter(u => u.role === "admin"))); },
    };
    shell(nav, views, "Étudiant");
  }

  return {teacher, student, redrawNav:null};
})();
