/* ESM — couche de données.
   • Mode réel : base Supabase (PostgreSQL + authentification + temps réel), activé dès que
     assets/js/config.js contient l'URL et la clé publique du projet.
   • Mode démonstration : données enregistrées dans le navigateur (localStorage).
   Les pages utilisent la même interface dans les deux cas : un cache en mémoire (lecture
   synchrone) alimenté par init(), et des méthodes asynchrones pour les écritures. */
const Store = (() => {
  const CFG = window.ESM_CONFIG || {};
  const LIVE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const KEY = "esm_db_v1", SKEY = "esm_session";
  const PONDERATION = {cc: 0.4, exam: 0.6};
  const EMAIL = login => String(login).trim().toLowerCase() + "@esm.local";

  let db = {classes:[], users:[], matieres:[], notes:{}, posts:[], messages:[], candidatures:[], contacts:[], rangs:{}};
  let me = null, sb = null, readyP = null;

  /* ---------- Règles de calcul ---------- */
  const moyenne = n => (!n || n.cc == null || n.exam == null) ? null : Math.round((n.cc * PONDERATION.cc + n.exam * PONDERATION.exam) * 100) / 100;
  const mention = m => m == null ? ["En attente","neu"] : m < 10 ? ["Ajourné","bad"] : m < 12 ? ["Passable","warn"] : m < 14 ? ["Assez bien","info"] : m < 16 ? ["Bien","ok"] : ["Très bien","ok"];

  /* =========================================================
     MODE DÉMONSTRATION (localStorage)
     ========================================================= */
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const iso = d => new Date(Date.now() - d * 864e5).toISOString();
  function seed() {
    const r = rng(2026);
    const classes = [
      {id:"L3-GAMP", nom:"Licence 3 · Gestion des Activités Maritimes et Portuaires"},
      {id:"L3-TL", nom:"Licence 3 · Transport et Logistique"},
      {id:"L2-MGP", nom:"Licence 2 · Mine, Géologie, Pétrole"},
      {id:"M1-QHSE", nom:"Master 1 · Qualité Hygiène Sécurité Environnement"},
    ];
    const prenoms = "Arnaud Grâce Cédric Merveille Junior Prisca Loïc Stessy Yannick Nadège Brice Ornella Kevin Sandrine Davy Aurore Fabrice Christelle Rodrigue Laetitia Ulrich Joëlle Hervé Marlène Styve Divine Landry Océane".split(" ");
    const noms = "Nzé Mba Ondo Obiang Nguema Moussavou Mabika Essono Mintsa Boussougou Koumba Mouele Ella Oyane Mapangou Nzamba Bivigou Engone Ntoutoume Mengue Assoumou Makaya Ekomi Ibinga Nkoghe Ango Mboumba Ndoutoume".split(" ");
    const users = [
      {id:"adm", role:"admin", login:"scolarite", pwd:"admin2026", prenom:"Service", nom:"Scolarité", titre:"Administration"},
      {id:"t1", role:"enseignant", login:"p.ndong", pwd:"prof2026", prenom:"Paul", nom:"Ndong", civ:"M.", titre:"Topographie & Géosciences"},
      {id:"t2", role:"enseignant", login:"c.mba", pwd:"prof2026", prenom:"Clarisse", nom:"Mba", civ:"Mme", titre:"Droit maritime & HSE"},
      {id:"t3", role:"enseignant", login:"s.obiang", pwd:"prof2026", prenom:"Serge", nom:"Obiang", civ:"M.", titre:"Logistique & Exploitation portuaire"},
    ];
    let k = 0;
    classes.forEach(c => { for (let i = 0; i < 7; i++, k++) {
      const mat = "ESM25-" + String(k + 1).padStart(3, "0");
      users.push({id:"s" + (k + 1), role:"etudiant", login:mat, pwd:"esm2026", matricule:mat, prenom:prenoms[k], nom:noms[k], classe:c.id});
    }});
    const matieres = [
      {id:"m1", nom:"Cartographie marine", classe:"L3-GAMP", prof:"t1", coef:2},
      {id:"m2", nom:"Droit maritime", classe:"L3-GAMP", prof:"t2", coef:3},
      {id:"m3", nom:"Exploitation portuaire", classe:"L3-GAMP", prof:"t3", coef:4},
      {id:"m4", nom:"Droit des transports", classe:"L3-TL", prof:"t2", coef:2},
      {id:"m5", nom:"Supply chain management", classe:"L3-TL", prof:"t3", coef:4},
      {id:"m6", nom:"Transport multimodal", classe:"L3-TL", prof:"t3", coef:3},
      {id:"m7", nom:"Topographie", classe:"L2-MGP", prof:"t1", coef:3},
      {id:"m8", nom:"Géologie de terrain", classe:"L2-MGP", prof:"t1", coef:4},
      {id:"m9", nom:"Réglementation HSE", classe:"M1-QHSE", prof:"t2", coef:3},
      {id:"m10", nom:"Management QHSE", classe:"M1-QHSE", prof:"t3", coef:4},
    ];
    const notes = {}, q = x => Math.round(x * 4) / 4;
    matieres.forEach(m => {
      notes[m.id] = {};
      if (m.id === "m6") return;
      users.filter(u => u.classe === m.classe).forEach(u => {
        const lvl = 8 + r() * 9;
        const cc = q(Math.min(20, Math.max(3, lvl + (r() - .5) * 5)));
        const exam = m.id === "m8" ? null : q(Math.min(20, Math.max(2, lvl + (r() - .5) * 6)));
        notes[m.id][u.id] = {cc, exam, maj:iso(3 + r() * 20)};
      });
    });
    const posts = [
      {id:"p1", auteur:"adm", classe:"*", type:"annonce", titre:"Rentrée académique 2026-2027", texte:"Les pré-inscriptions sont ouvertes. Les étudiants en réinscription doivent régulariser leur dossier auprès de la scolarité avant la reprise des cours.", date:iso(1)},
      {id:"p2", auteur:"t1", classe:"L2-MGP", matiere:"m8", type:"devoir", titre:"Rapport de sortie géologique", texte:"Rendre le rapport de la mission de terrain (coupe géologique + photos commentées), 10 pages maximum.", date:iso(2), echeance:new Date(Date.now() + 9 * 864e5).toISOString()},
      {id:"p3", auteur:"t3", classe:"L3-TL", matiere:"m5", type:"annonce", titre:"Visite d'entreprise – terminal à conteneurs", texte:"Visite prévue avec notre partenaire portuaire. Tenue correcte, gilet et chaussures fermées obligatoires. Rendez-vous 7h30 devant l'école.", date:iso(4)},
      {id:"p4", auteur:"t2", classe:"L3-GAMP", matiere:"m2", type:"urgent", titre:"Changement de salle", texte:"Le cours de Droit maritime de jeudi aura lieu en salle 4 (au lieu de la salle 2).", date:iso(0.3)},
      {id:"p5", auteur:"t1", classe:"L3-GAMP", matiere:"m1", type:"devoir", titre:"Exercice de lecture de carte", texte:"Exercice n°3 : tracé de route et calcul de cap sur la carte fournie en cours.", date:iso(6), echeance:new Date(Date.now() + 4 * 864e5).toISOString()},
    ];
    const messages = [
      {id:"x1", from:"s15", to:"t1", texte:"Bonjour Monsieur, pour le rapport de terrain, peut-on travailler en binôme ?", date:iso(1.2), lu:false},
      {id:"x2", from:"s1", to:"t2", texte:"Bonjour Madame, serait-il possible d'avoir le support du dernier cours sur les contrats d'affrètement ?", date:iso(2.5), lu:true},
      {id:"x3", from:"t2", to:"s1", texte:"Bonjour, oui : je le dépose à la scolarité demain. Bonne révision !", date:iso(2.2), lu:false},
      {id:"x4", from:"s9", to:"t3", texte:"Bonjour Monsieur, à quelle heure est prévu le départ pour la visite ?", date:iso(3.1), lu:false},
    ];
    const candidatures = [
      {id:"c1", ref:"ESM-26-0412", prenom:"Rachel", nom:"Mengue", tel:"077 00 00 00", email:"rachel.m@exemple.ga", formation:"tl", formationLabel:"Transport et Logistique", niveau:"Baccalauréat", serie:"B", date:iso(1), statut:"nouveau"},
      {id:"c2", ref:"ESM-26-0409", prenom:"Dimitri", nom:"Oyono", tel:"066 00 00 00", email:"d.oyono@exemple.ga", formation:"m-qhse", formationLabel:"Qualité Hygiène Sécurité Environnement", niveau:"Licence", serie:"", date:iso(3), statut:"en cours"},
    ];
    return {v:1, classes, users, matieres, notes, posts, messages, candidatures, contacts:[], rangs:{}};
  }
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const Demo = {
    load() { let d; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (!d || d.v !== 1) { d = seed(); db = d; this.save(); } db = d; db.rangs = {}; },
    save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} },
    async init() { this.load(); let id; try { id = sessionStorage.getItem(SKEY); } catch (e) {} me = id ? db.users.find(u => u.id === id) || null : null; return me; },
    async login(login, pwd, role) {
      this.load();
      const u = db.users.find(x => x.login.toLowerCase() === String(login).trim().toLowerCase() && x.pwd === pwd && x.role === role);
      if (u) { try { sessionStorage.setItem(SKEY, u.id); } catch (e) {} me = u; }
      return u || null;
    },
    async logout() { try { sessionStorage.removeItem(SKEY); } catch (e) {} me = null; },
    async saveNotes(mid, rows) {
      const cur = db.notes[mid] || (db.notes[mid] = {});
      Object.entries(rows).forEach(([sid, n]) => { if (n.cc == null && n.exam == null) delete cur[sid]; else cur[sid] = {cc:n.cc, exam:n.exam, maj:new Date().toISOString()}; });
      this.save();
    },
    async addPost(p) { const n = {...p, id:uid("p"), auteur:me.id, date:new Date().toISOString()}; db.posts.unshift(n); this.save(); return n; },
    async deletePost(id) { db.posts = db.posts.filter(p => p.id !== id); this.save(); },
    async send(to, texte) { const m = {id:uid("x"), from:me.id, to, texte, date:new Date().toISOString(), lu:false}; db.messages.push(m); this.save(); return m; },
    async markRead(other) { db.messages.forEach(m => { if (m.to === me.id && m.from === other) m.lu = true; }); this.save(); },
    async addCandidature(d) { this.load(); const ref = "ESM-26-" + String(413 + db.candidatures.length).padStart(4, "0"); db.candidatures.unshift({...d, id:uid("c"), ref, date:new Date().toISOString(), statut:"nouveau"}); this.save(); return ref; },
    async setStatut(id, statut) { const c = db.candidatures.find(x => x.id === id); if (c) c.statut = statut; this.save(); },
    async addContact(d) { this.load(); db.contacts.unshift({...d, id:uid("k"), date:new Date().toISOString()}); this.save(); },
    async deleteContact(id) { db.contacts = db.contacts.filter(c => c.id !== id); this.save(); },
    async changePassword(pwd) { me.pwd = pwd; this.save(); },
    async createUser(u) {
      if (db.users.some(x => x.login.toLowerCase() === u.login.trim().toLowerCase())) throw new Error("Cet identifiant existe déjà");
      if ((u.password || "").length < 6) throw new Error("Le mot de passe doit contenir au moins 6 caractères");
      const n = {id:uid("u"), role:u.role, login:u.login.trim(), pwd:u.password, prenom:u.prenom, nom:u.nom, civ:u.civ || null, titre:u.titre || null, classe:u.role === "etudiant" ? u.classe : null, matricule:u.role === "etudiant" ? u.login.trim().toUpperCase() : null};
      db.users.push(n); this.save(); return n;
    },
    async setPassword(id, pwd) { if ((pwd || "").length < 6) throw new Error("Le mot de passe doit contenir au moins 6 caractères"); db.users.find(u => u.id === id).pwd = pwd; this.save(); },
    async deleteUser(id) {
      if (id === me.id) throw new Error("Vous ne pouvez pas supprimer votre propre compte");
      db.users = db.users.filter(u => u.id !== id); db.messages = db.messages.filter(m => m.from !== id && m.to !== id); db.posts = db.posts.filter(p => p.auteur !== id);
      Object.values(db.notes).forEach(n => delete n[id]); db.matieres.forEach(m => { if (m.prof === id) m.prof = null; }); this.save();
    },
    async addClasse(c) { if (db.classes.some(x => x.id === c.id)) throw new Error("Ce code de classe existe déjà"); db.classes.push(c); this.save(); },
    async deleteClasse(id) { db.classes = db.classes.filter(c => c.id !== id); db.matieres.filter(m => m.classe === id).forEach(m => delete db.notes[m.id]); db.matieres = db.matieres.filter(m => m.classe !== id); db.users.forEach(u => { if (u.classe === id) u.classe = null; }); this.save(); },
    async saveMatiere(m) { if (m.id) Object.assign(db.matieres.find(x => x.id === m.id), m); else db.matieres.push({...m, id:uid("m")}); this.save(); },
    async deleteMatiere(id) { db.matieres = db.matieres.filter(m => m.id !== id); delete db.notes[id]; this.save(); },
    subscribe(cb) { addEventListener("storage", e => { if (e.key === KEY) { const id = me && me.id; this.load(); me = db.users.find(u => u.id === id) || me; cb("all"); } }); },
  };

  /* =========================================================
     MODE RÉEL (Supabase)
     ========================================================= */
  function ready() {
    if (!readyP) readyP = new Promise((res, rej) => {
      const go = () => { sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey); res(sb); };
      if (window.supabase) return go();
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      s.onload = go; s.onerror = () => rej(new Error("Impossible de joindre la base de données"));
      document.head.appendChild(s);
    });
    return readyP;
  }
  const q = async p => { const {data, error} = await p; if (error) throw new Error(error.message); return data; };
  const mapUser = p => ({id:p.id, role:p.role, login:p.login, prenom:p.prenom, nom:p.nom, civ:p.civ, titre:p.titre, classe:p.classe, matricule:p.matricule});
  const mapMsg = m => ({id:m.id, from:m.from_id, to:m.to_id, texte:m.texte, date:m.date, lu:m.lu});
  const mapPost = p => ({...p, matiere:p.matiere || undefined, echeance:p.echeance || undefined});
  const mapCand = c => ({...c, formationLabel:c.formation_label});
  const notesMap = rows => { const o = {}; rows.forEach(n => { (o[n.matiere] || (o[n.matiere] = {}))[n.etudiant] = {cc:n.cc == null ? null : +n.cc, exam:n.exam == null ? null : +n.exam, maj:n.maj}; }); return o; };

  const Live = {
    loaders: {
      classes: async () => { db.classes = await q(sb.from("classes").select("*").order("id")); },
      users: async () => { db.users = (await q(sb.from("profiles").select("*").order("nom"))).map(mapUser); },
      matieres: async () => { db.matieres = await q(sb.from("matieres").select("*").order("classe").order("nom")); },
      notes: async () => {
        db.notes = notesMap(await q(sb.from("notes").select("*")));
        if (me && me.role === "etudiant") { const r = await q(sb.rpc("mon_rang")); db.rangs = {[me.id]: r && r[0] ? {rang:r[0].rang, total:r[0].total} : null}; }
      },
      posts: async () => { db.posts = (await q(sb.from("posts").select("*").order("date", {ascending:false}))).map(mapPost); },
      messages: async () => { db.messages = (await q(sb.from("messages").select("*").order("date"))).map(mapMsg); },
      candidatures: async () => { db.candidatures = me.role === "admin" ? (await q(sb.from("candidatures").select("*").order("date", {ascending:false}))).map(mapCand) : []; },
      contacts: async () => { db.contacts = me.role === "admin" ? await q(sb.from("contacts").select("*").order("date", {ascending:false})) : []; },
    },
    async loadAll() { await Promise.all(Object.values(this.loaders).map(f => f())); },
    async init() {
      await ready();
      const {data:{session}} = await sb.auth.getSession();
      if (!session) return null;
      const p = await q(sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle());
      if (!p) return null;
      me = mapUser(p); await this.loadAll(); me = db.users.find(u => u.id === me.id) || me;
      return me;
    },
    async login(login, pwd, role) {
      await ready();
      const {data, error} = await sb.auth.signInWithPassword({email:EMAIL(login), password:pwd});
      if (error || !data.user) return null;
      const p = await q(sb.from("profiles").select("*").eq("id", data.user.id).maybeSingle());
      if (!p || p.role !== role) { await sb.auth.signOut(); return null; }
      return (me = mapUser(p));
    },
    async logout() { await ready(); await sb.auth.signOut(); me = null; },
    async saveNotes(mid, rows) {
      const up = [], del = [];
      Object.entries(rows).forEach(([sid, n]) => (n.cc == null && n.exam == null ? del : up).push({matiere:mid, etudiant:sid, cc:n.cc, exam:n.exam, maj:new Date().toISOString()}));
      if (up.length) await q(sb.from("notes").upsert(up, {onConflict:"matiere,etudiant"}));
      if (del.length) await q(sb.from("notes").delete().eq("matiere", mid).in("etudiant", del.map(d => d.etudiant)));
      await this.loaders.notes();
    },
    async addPost(p) {
      const row = {classe:p.classe, matiere:p.matiere || null, type:p.type, titre:p.titre, texte:p.texte, echeance:p.echeance || null, auteur:me.id};
      const n = mapPost(await q(sb.from("posts").insert(row).select().single())); db.posts.unshift(n); return n;
    },
    async deletePost(id) { await q(sb.from("posts").delete().eq("id", id)); db.posts = db.posts.filter(p => p.id !== id); },
    async send(to, texte) { const m = mapMsg(await q(sb.from("messages").insert({from_id:me.id, to_id:to, texte}).select().single())); if (!db.messages.some(x => x.id === m.id)) db.messages.push(m); return m; },
    async markRead(other) {
      const ids = db.messages.filter(m => m.to === me.id && m.from === other && !m.lu).map(m => m.id);
      if (!ids.length) return; db.messages.forEach(m => { if (ids.includes(m.id)) m.lu = true; });
      await q(sb.from("messages").update({lu:true}).in("id", ids));
    },
    async addCandidature(d) { await ready(); return await q(sb.rpc("submit_candidature", {d})); },
    async setStatut(id, statut) { await q(sb.from("candidatures").update({statut}).eq("id", id)); const c = db.candidatures.find(x => x.id === id); if (c) c.statut = statut; },
    async addContact(d) { await ready(); await q(sb.from("contacts").insert({nom:d.nom, email:d.email, tel:d.tel || null, sujet:d.sujet, message:d.message})); },
    async deleteContact(id) { await q(sb.from("contacts").delete().eq("id", id)); db.contacts = db.contacts.filter(c => c.id !== id); },
    async changePassword(pwd) { const {error} = await sb.auth.updateUser({password:pwd}); if (error) throw new Error(error.message); },
    async createUser(u) {
      await q(sb.rpc("admin_create_user", {p_login:u.login, p_password:u.password, p_role:u.role, p_prenom:u.prenom, p_nom:u.nom, p_classe:u.role === "etudiant" ? u.classe : null, p_civ:u.civ || null, p_titre:u.titre || null}));
      await this.loaders.users();
    },
    async setPassword(id, pwd) { await q(sb.rpc("admin_set_password", {p_user:id, p_password:pwd})); },
    async deleteUser(id) { await q(sb.rpc("admin_delete_user", {p_user:id})); await this.loadAll(); },
    async addClasse(c) { await q(sb.from("classes").insert(c)); await this.loaders.classes(); },
    async deleteClasse(id) { await q(sb.from("classes").delete().eq("id", id)); await this.loadAll(); },
    async saveMatiere(m) {
      const row = {nom:m.nom, classe:m.classe, prof:m.prof || null, coef:+m.coef};
      if (m.id) await q(sb.from("matieres").update(row).eq("id", m.id)); else await q(sb.from("matieres").insert(row));
      await this.loaders.matieres();
    },
    async deleteMatiere(id) { await q(sb.from("matieres").delete().eq("id", id)); await this.loaders.matieres(); await this.loaders.notes(); },
    subscribe(cb) {
      const ch = sb.channel("esm-live");
      ["notes","posts","messages","candidatures","contacts"].forEach(t => ch.on("postgres_changes", {event:"*", schema:"public", table:t}, async payload => {
        try { await this.loaders[t](); } catch (e) { return; }
        cb(t, payload.new && t === "messages" ? mapMsg(payload.new) : payload.new);
      }));
      ch.subscribe();
    },
  };

  const A = LIVE ? Live : Demo;

  return {
    LIVE, PONDERATION, moyenne, mention,
    init: () => A.init(),
    ready: () => LIVE ? ready() : Promise.resolve(),
    db: () => db,
    current: () => me,
    user: id => db.users.find(u => u.id === id),
    classe: id => db.classes.find(c => c.id === id),
    matiere: id => db.matieres.find(m => m.id === id),
    login: (l, p, r) => A.login(l, p, r),
    logout: () => A.logout(),
    changePassword: p => A.changePassword(p),
    // Notes
    saveNotes: (mid, rows) => A.saveNotes(mid, rows),
    notesEtudiant(sid) {
      const u = this.user(sid);
      return db.matieres.filter(m => m.classe === u.classe).map(m => { const n = (db.notes[m.id] || {})[sid] || {}; return {...m, cc:n.cc ?? null, exam:n.exam ?? null, moy:moyenne(n), maj:n.maj}; });
    },
    moyenneGenerale(sid) {
      const l = this.notesEtudiant(sid).filter(x => x.moy != null); if (!l.length) return null;
      const c = l.reduce((a, x) => a + x.coef, 0); return Math.round(l.reduce((a, x) => a + x.moy * x.coef, 0) / c * 100) / 100;
    },
    rang(sid) {
      if (sid in db.rangs) return db.rangs[sid];
      const u = this.user(sid), cl = db.users.filter(x => x.role === "etudiant" && x.classe === u.classe);
      const list = cl.map(x => ({id:x.id, m:this.moyenneGenerale(x.id)})).filter(x => x.m != null).sort((a, b) => b.m - a.m);
      const i = list.findIndex(x => x.id === sid); return i < 0 ? null : {rang:list.findIndex(x => x.m === list[i].m) + 1, total:list.length};
    },
    // Annonces
    addPost: p => A.addPost(p),
    deletePost: id => A.deletePost(id),
    postsPour: classe => db.posts.filter(p => p.classe === "*" || p.classe === classe).sort((a, b) => b.date.localeCompare(a.date)),
    // Messagerie
    send: (to, t) => A.send(to, t),
    markRead: other => A.markRead(other).catch(() => {}),
    thread: (a, b) => db.messages.filter(m => (m.from === a && m.to === b) || (m.from === b && m.to === a)).sort((x, y) => x.date.localeCompare(y.date)),
    unread: id => db.messages.filter(m => m.to === id && !m.lu).length,
    contactsDe(id) {
      const ids = new Set(); db.messages.forEach(m => { if (m.from === id) ids.add(m.to); if (m.to === id) ids.add(m.from); });
      return [...ids].map(o => ({o, t:this.thread(id, o)})).filter(x => this.user(x.o))
        .map(({o, t}) => ({user:this.user(o), last:t[t.length - 1], unread:t.filter(m => m.to === id && !m.lu).length}))
        .sort((a, b) => b.last.date.localeCompare(a.last.date));
    },
    // Scolarité
    addCandidature: d => A.addCandidature(d),
    setStatut: (id, s) => A.setStatut(id, s),
    addContact: d => A.addContact(d),
    deleteContact: id => A.deleteContact(id),
    createUser: u => A.createUser(u),
    setPassword: (id, p) => A.setPassword(id, p),
    deleteUser: id => A.deleteUser(id),
    addClasse: c => A.addClasse(c),
    deleteClasse: id => A.deleteClasse(id),
    saveMatiere: m => A.saveMatiere(m),
    deleteMatiere: id => A.deleteMatiere(id),
    subscribe: cb => A.subscribe(cb),
  };
})();
