/* ESM — comportements du site public */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const IMG = n => `assets/img/${n}.jpg`;

function toast(msg, type = "") {
  let t = $(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.className = "toast " + type; t.textContent = msg;
  requestAnimationFrame(() => t.classList.add("on"));
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 3200);
}

function modal(title, html) {
  let m = $("#modal");
  if (!m) {
    m = document.createElement("div"); m.id = "modal"; m.className = "modal";
    m.innerHTML = '<div class="box" role="dialog" aria-modal="true"><div class="mh"><h3></h3><button class="x" aria-label="Fermer">×</button></div><div class="mb"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", e => { if (e.target === m || e.target.closest(".x")) m.classList.remove("on"); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") m.classList.remove("on"); });
  }
  $("h3", m).textContent = title; $(".mb", m).innerHTML = html; m.classList.add("on");
  return m;
}

/* ---------- En-tête & pied de page ---------- */
function renderChrome() {
  const page = document.body.dataset.page;
  const links = [["index","Accueil"],["ecole","L'École"],["formations","Formations"],["admission","Admission"],["vie-etudiante","Vie étudiante"],["contact","Contact"],["espace","Espace numérique"]];
  const h = $("#site-header");
  if (h) h.outerHTML = `
  <div class="progress"></div>
  <div class="topbar"><div class="wrap">
    <div class="tb-l"><a href="tel:+241${ESM.tels[0].replace(/\s/g,"").slice(1)}">${ICONS.phone}${ESM.tels[0]}</a><a href="mailto:${ESM.email}">${ICONS.mail}${ESM.email}</a><span>${ICONS.pin}Libreville, Gabon</span></div>
    <div class="tb-r"><a href="espace.html?role=etudiant">${ICONS.cap}Espace étudiant</a><a href="espace.html?role=enseignant">${ICONS.lock}Espace enseignant</a></div>
  </div></div>
  <header class="header"><div class="wrap">
    <a class="brand" href="index.html"><img src="assets/img/logo-esm.svg" alt="Logo ESM"><span><b>École Supérieure<br>de la Mer</b><small>Libreville · Depuis 2013</small></span></a>
    <nav class="nav" id="nav">${links.map(([k,l]) => `<a href="${k}.html" class="${k===page?"active":""}">${l}</a>`).join("")}<a class="btn btn-orange" href="admission.html#preinscription">Pré-inscription</a></nav>
    <button class="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </div></header>`;

  const f = $("#site-footer");
  if (f) f.outerHTML = `
  <footer class="footer"><div class="wrap"><div class="grid">
    <div>
      <a class="logo-w" href="index.html"><img src="assets/img/logo-esm.svg" alt="ESM"></a>
      <p>${ESM.nom} — établissement d'enseignement supérieur partenaire de l'État gabonais, membre du ${ESM.groupe}. <em>« ${ESM.slogan} »</em></p>
      <div class="socials">
        <a href="${ESM.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${ICONS.fb}</a>
        <a href="https://wa.me/${ESM.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICONS.wa}</a>
        <a href="mailto:${ESM.email}" aria-label="E-mail">${ICONS.mail}</a>
      </div>
    </div>
    <div><h4>L'école</h4><ul>
      <li><a href="ecole.html">Présentation</a></li><li><a href="formations.html">Nos formations</a></li><li><a href="admission.html">Admission & inscription</a></li><li><a href="vie-etudiante.html">Vie étudiante</a></li><li><a href="contact.html">Contact</a></li>
    </ul></div>
    <div><h4>Formations</h4><ul>
      <li><a href="formations.html?n=licence">Licences professionnelles</a></li><li><a href="formations.html?n=master">Masters professionnels</a></li><li><a href="formations.html?n=cadre">Master pour cadres</a></li><li><a href="admission.html#calendrier">Calendrier de rentrée</a></li>
    </ul></div>
    <div><h4>Espace numérique</h4>
      <ul><li><a href="espace.html?role=etudiant">Espace étudiants</a></li><li><a href="espace.html?role=enseignant">Enseignants</a></li><li><a href="espace.html?role=admin">Scolarité / Administration</a></li></ul>
      <div class="staff-box"><b>Vous êtes enseignant ?</b><p>Accédez au back-office pour saisir les notes, publier des annonces et échanger avec vos étudiants.</p><a class="btn btn-orange btn-sm" href="espace.html?role=enseignant">${ICONS.lock} Accès enseignants</a></div>
    </div>
  </div>
  <div class="foot-bottom"><span>© ${new Date().getFullYear()} ${ESM.nom} · ${ESM.adresse}</span><span>${ESM.agrement}</span></div>
  <div class="foot-credit">© ${new Date().getFullYear()} Tous droits réservés · Site conçu et développé par <b>Rouana</b></div>
  </div></footer>
  <a class="wa" href="https://wa.me/${ESM.whatsapp}?text=${encodeURIComponent("Bonjour ESM, je souhaite avoir des informations sur vos formations.")}" target="_blank" rel="noopener" aria-label="Écrire sur WhatsApp">${ICONS.wa}</a>
  <button class="totop" aria-label="Haut de page">↑</button>`;
}

function initChrome() {
  const header = $(".header"), prog = $(".progress"), top = $(".totop");
  const onScroll = () => {
    const y = scrollY, H = document.documentElement.scrollHeight - innerHeight;
    header && header.classList.toggle("scrolled", y > 30);
    if (prog) prog.style.width = (H > 0 ? (y / H) * 100 : 0) + "%";
    top && top.classList.toggle("on", y > 600);
  };
  addEventListener("scroll", onScroll, {passive:true}); onScroll();
  top && top.addEventListener("click", () => scrollTo({top:0, behavior:"smooth"}));
  const b = $(".burger"), nav = $("#nav");
  b && b.addEventListener("click", () => { const o = nav.classList.toggle("open"); b.setAttribute("aria-expanded", o); });
}

/* ---------- Animations ---------- */
function initReveal() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), {threshold:.12});
  $$(".rv").forEach(el => io.observe(el));
  const co = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; co.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, t0 = performance.now(), dur = 1600;
    const step = t => { const p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + (el.dataset.suffix || ""); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), {threshold:.6});
  $$("[data-count]").forEach(el => co.observe(el));
}

function initHero() {
  const figs = $$(".hero-slides figure"); if (!figs.length) return;
  const dots = $(".hero-dots"); let i = 0, h;
  dots.innerHTML = figs.map((_, k) => `<button aria-label="Diapositive ${k+1}" class="${k?"":"on"}"></button>`).join("");
  const go = k => { figs[i].classList.remove("on"); dots.children[i].classList.remove("on"); i = (k + figs.length) % figs.length; figs[i].classList.add("on"); dots.children[i].classList.add("on"); };
  const play = () => { clearInterval(h); h = setInterval(() => go(i + 1), 6500); };
  [...dots.children].forEach((d, k) => d.addEventListener("click", () => { go(k); play(); }));
  play();
}

/* ---------- Formations ---------- */
function formationCard(f) {
  const n = NIVEAUX[f.niv];
  return `<article class="fcard rv" data-niv="${f.niv}"><span class="tag ${n.c}">${n.l}</span>
    <div class="ic">${ICONS[f.ic]}</div><h3>${f.t}</h3><p>${f.d}</p>
    <button class="more" data-f="${f.id}">En savoir plus ${ICONS.arrow.replace('<svg','<svg width="16" height="16"')}</button></article>`;
}
function initFormations() {
  const box = $("#formations-grid"); if (!box) return;
  const limit = +box.dataset.limit || 0;
  const tabs = $("#formations-tabs");
  const counts = {tout:FORMATIONS.length}; FORMATIONS.forEach(f => counts[f.niv] = (counts[f.niv] || 0) + 1);
  const render = niv => {
    let list = FORMATIONS.filter(f => niv === "tout" || f.niv === niv);
    if (limit) list = list.slice(0, limit);
    box.innerHTML = list.map(formationCard).join("");
    requestAnimationFrame(() => $$(".rv", box).forEach((el, k) => setTimeout(() => el.classList.add("in"), k * 50)));
  };
  if (tabs) {
    const opts = [["tout","Toutes"],["licence","Licences Pro"],["master","Masters Pro"],["cadre","Master Cadres"]];
    tabs.innerHTML = opts.map(([k,l]) => `<button class="tab" data-n="${k}">${l}<span class="n">${counts[k]}</span></button>`).join("");
    const start = new URLSearchParams(location.search).get("n") || "tout";
    const set = k => { $$(".tab", tabs).forEach(t => t.classList.toggle("on", t.dataset.n === k)); render(k); };
    tabs.addEventListener("click", e => { const t = e.target.closest(".tab"); if (t) set(t.dataset.n); });
    set(opts.some(o => o[0] === start) ? start : "tout");
  } else render("tout");
  box.addEventListener("click", e => {
    const b = e.target.closest(".more"); if (!b) return;
    const f = FORMATIONS.find(x => x.id === b.dataset.f), n = NIVEAUX[f.niv];
    modal(f.t, `<p class="chip info" style="margin-bottom:1rem">${n.full}</p><p class="lead-p">${f.d}</p>
      <h4 style="margin:1.3rem 0 .6rem;color:var(--navy)">Débouchés</h4><ul class="checks" style="margin:0 0 1.5rem">${f.deb.map(d => `<li>${d}</li>`).join("")}</ul>
      <h4 style="margin-bottom:.6rem;color:var(--navy)">Pédagogie</h4><p style="color:var(--muted)">Cours théoriques, travaux pratiques, sorties de terrain, visites d'entreprises et stage professionnel encadré par nos partenaires.</p>
      <div style="display:flex;gap:.6rem;margin-top:1.6rem;flex-wrap:wrap"><a class="btn btn-orange" href="admission.html?f=${f.id}#preinscription">Je me pré-inscris</a><a class="btn btn-line" href="https://wa.me/${ESM.whatsapp}?text=${encodeURIComponent("Bonjour, je souhaite des informations sur la formation : " + f.t)}" target="_blank" rel="noopener">${ICONS.wa} Poser une question</a></div>`);
  });
}

/* ---------- Partenaires, actus, galerie ---------- */
function initPartners() {
  const t = $("#partners"); if (!t) return;
  const one = PARTENAIRES.map(p => `<div class="partner"><span class="pl" style="background:${p.c}">${p.n.split(/\s+/).filter(w => /^[A-ZÉ]/.test(w)).map(w => w[0]).join("").slice(0,3)}</span><span><b>${p.n}</b><small>${p.s}</small></span></div>`).join("");
  t.innerHTML = one + one;
}
function initNews() {
  const box = $("#news"); if (!box) return;
  const n = +box.dataset.limit || ACTUS.length;
  box.innerHTML = ACTUS.slice(0, n).map((a, k) => `<article class="ncard rv d${k%3}"><div class="ph"><img src="${IMG(a.img)}" alt="${a.t}" loading="lazy"><span class="cat">${a.cat}</span></div><div class="bd"><h3>${a.t}</h3><p>${a.d}</p></div></article>`).join("");
}
function initGallery() {
  const g = $("#gallery"); if (!g) return;
  const cats = {terrain:"Sorties de terrain", stages:"Stages & labo", ceremonies:"Cérémonies", vie:"Vie étudiante"};
  g.innerHTML = GALERIE.map((p, k) => `<figure data-cat="${p.cat}" data-i="${k}"><img src="${IMG(p.img)}" alt="${p.t}" loading="lazy"><figcaption><small>${cats[p.cat]}</small>${p.t}</figcaption></figure>`).join("");
  const f = $("#gallery-filters");
  if (f) {
    f.innerHTML = `<button class="tab on" data-c="all">Tout</button>` + Object.entries(cats).map(([k,v]) => `<button class="tab" data-c="${k}">${v}</button>`).join("");
    f.addEventListener("click", e => { const b = e.target.closest(".tab"); if (!b) return; $$(".tab", f).forEach(x => x.classList.toggle("on", x === b)); $$("figure", g).forEach(fig => fig.classList.toggle("hide", b.dataset.c !== "all" && fig.dataset.cat !== b.dataset.c)); });
  }
  const lb = document.createElement("div"); lb.className = "lightbox";
  lb.innerHTML = '<button class="lb-x" aria-label="Fermer">×</button><button class="lb-p" aria-label="Précédente">‹</button><img alt=""><button class="lb-n" aria-label="Suivante">›</button><p></p>';
  document.body.appendChild(lb);
  let cur = 0;
  const vis = () => $$("figure:not(.hide)", g).map(x => +x.dataset.i);
  const show = i => { cur = i; $("img", lb).src = IMG(GALERIE[i].img); $("p", lb).textContent = GALERIE[i].t; lb.classList.add("on"); };
  const nav = d => { const v = vis(); show(v[(v.indexOf(cur) + d + v.length) % v.length]); };
  g.addEventListener("click", e => { const fig = e.target.closest("figure"); if (fig) show(+fig.dataset.i); });
  lb.addEventListener("click", e => { if (e.target.matches(".lb-x") || e.target === lb) lb.classList.remove("on"); if (e.target.matches(".lb-p")) nav(-1); if (e.target.matches(".lb-n")) nav(1); });
  document.addEventListener("keydown", e => { if (!lb.classList.contains("on")) return; if (e.key === "Escape") lb.classList.remove("on"); if (e.key === "ArrowLeft") nav(-1); if (e.key === "ArrowRight") nav(1); });
}
function initQuotes() {
  const q = $("#quotes"); if (!q) return;
  const items = [
    ["« La formation de qualité, c'est notre métier. »","Notre devise","Au cœur de chaque programme de l'ESM"],
    ["« Une pédagogie tournée vers la pratique : terrain, laboratoires, visites d'entreprises et stages encadrés. »","Notre pédagogie","Apprendre en faisant"],
    ["« Former les experts et les leaders de demain dans les métiers de la mer, des ports, de la logistique et de l'environnement. »","Notre mission","Depuis 2013 à Libreville"],
    ["« Des partenaires professionnels et universitaires pour ouvrir à nos étudiants les portes de l'emploi. »","Notre réseau","Entreprises, universités et institutions"],
  ];
  const bq = $("blockquote", q), ci = $("cite", q), dots = $(".dots", q); let i = 0, h;
  dots.innerHTML = items.map((_, k) => `<button aria-label="Citation ${k+1}"></button>`).join("");
  const go = k => { i = k % items.length; bq.style.opacity = 0; setTimeout(() => { bq.textContent = items[i][0]; ci.innerHTML = `${items[i][1]}<span>${items[i][2]}</span>`; bq.style.opacity = 1; }, 300); [...dots.children].forEach((d, j) => d.classList.toggle("on", j === i)); };
  [...dots.children].forEach((d, k) => d.addEventListener("click", () => { go(k); clearInterval(h); h = setInterval(() => go(i + 1), 6000); }));
  go(0); h = setInterval(() => go(i + 1), 6000);
}

/* ---------- Espace numérique : accès rapides (accueil) ---------- */
function initAccess() {
  const showDemo = (window.ESM_CONFIG || {}).showDemo !== false;
  const link = e => `espace.html?role=${e.role}${showDemo ? "&demo=1" : ""}`;
  const q = $("#quick-access");
  if (q) q.innerHTML = `<span class="ql">${ICONS.lock} Espace numérique</span>` + ESPACES.map(e => `<a href="${link(e)}" class="qbtn">${ICONS[e.ic]}${e.t}</a>`).join("");
  const c = $("#access-cards");
  if (c) c.innerHTML = ESPACES.map((e, i) => `<article class="acard rv d${i}" style="--c:${e.c}">
      <div class="ah"><span class="aic">${ICONS[e.ic]}</span><span><h3>${e.t}</h3><small>${e.s}</small></span></div>
      <ul>${e.pts.map(p => `<li>${p}</li>`).join("")}</ul>
      ${showDemo ? `<div class="creds"><small>Compte de démonstration · ${e.demo.nom}</small><div><span>Identifiant <b>${e.demo.login}</b></span><span>Mot de passe <b>${e.demo.pwd}</b></span></div></div>` : ""}
      <a class="btn btn-sm acta" href="${link(e)}">${showDemo ? "Tester l'espace " + e.t.toLowerCase() : "Accéder à mon espace"} ${ICONS.arrow}</a>
    </article>`).join("");
}

/* ---------- Formulaires publics ---------- */
function initAdmission() {
  const form = $("#admission-form"); if (!form) return;
  const sel = $("[name=formation]", form);
  sel.innerHTML = '<option value="">— Choisir une formation —</option>' + Object.entries(NIVEAUX).map(([k, n]) => `<optgroup label="${n.full}">${FORMATIONS.filter(f => f.niv === k).map(f => `<option value="${f.id}">${f.t}</option>`).join("")}</optgroup>`).join("");
  const pre = new URLSearchParams(location.search).get("f"); if (pre) sel.value = pre;
  const steps = $$(".fstep", form), bars = $$(".steps span", form); let s = 0;
  const show = k => { s = k; steps.forEach((x, j) => x.classList.toggle("on", j === k)); bars.forEach((b, j) => b.classList.toggle("on", j <= k)); };
  const valid = () => { const bad = $$("[required]", steps[s]).find(i => !i.checkValidity()); if (bad) { bad.reportValidity(); return false; } return true; };
  form.addEventListener("click", e => {
    if (e.target.closest("[data-next]") && valid()) show(s + 1);
    if (e.target.closest("[data-prev]")) show(s - 1);
  });
  form.addEventListener("submit", async e => {
    e.preventDefault(); if (!valid()) return;
    const d = Object.fromEntries(new FormData(form));
    d.formationLabel = (FORMATIONS.find(f => f.id === d.formation) || {}).t || "";
    const btn = $("button[type=submit]", form); btn.disabled = true;
    let ref;
    try { ref = await Store.addCandidature(d); } catch (err) { btn.disabled = false; return toast("Envoi impossible : " + err.message, "err"); }
    btn.disabled = false;
    form.reset(); show(0);
    modal("Pré-inscription enregistrée 🎉", `<p class="lead-p">Merci <b>${d.prenom}</b> ! Votre demande pour <b>${d.formationLabel}</b> a bien été transmise au service de la scolarité.</p>
      <div class="panel" style="margin:1.2rem 0;box-shadow:none;text-align:center"><small style="color:var(--muted)">Votre numéro de dossier</small><div style="font-family:var(--font-h);font-size:1.8rem;font-weight:900;color:var(--navy)">${ref}</div></div>
      <p style="color:var(--muted)">Vous serez contacté(e) au <b>${d.tel}</b>. Pensez à préparer : copie du Bac (ou diplôme), relevés de notes, acte de naissance et photos d'identité.</p>`);
  });
  show(0);
}
function initContact() {
  const form = $("#contact-form"); if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = $("button[type=submit]", form); btn.disabled = true;
    try { await Store.addContact(Object.fromEntries(new FormData(form))); form.reset(); toast("Message envoyé ! Nous vous répondrons rapidement.", "ok"); }
    catch (err) { toast("Envoi impossible : " + err.message, "err"); }
    btn.disabled = false;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderChrome(); initChrome(); initHero(); initFormations(); initPartners(); initNews(); initGallery(); initQuotes(); initAccess(); initAdmission(); initContact();
  initReveal();
});
