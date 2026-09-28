/* ESM — couche de données.
   Mode démonstration : les données sont enregistrées dans le navigateur (localStorage).
   Toutes les méthodes sont asynchrones pour pouvoir brancher plus tard une vraie
   base de données (Supabase, Firebase, API PHP…) sans modifier les pages. */
const Store = (() => {
  const KEY = "esm_db_v1", SKEY = "esm_session";
  const PONDERATION = {cc: 0.4, exam: 0.6};

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
    const notes = {};
    const q = x => Math.round(x * 4) / 4;
    matieres.forEach(m => {
      notes[m.id] = {};
      const empty = m.id === "m6", noExam = m.id === "m8";
      users.filter(u => u.classe === m.classe).forEach(u => {
        if (empty) return;
        const lvl = 8 + r() * 9;
        const cc = q(Math.min(20, Math.max(3, lvl + (r() - .5) * 5)));
        const exam = noExam ? null : q(Math.min(20, Math.max(2, lvl + (r() - .5) * 6)));
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
    return {v:1, classes, users, matieres, notes, posts, messages, candidatures, contacts:[]};
  }

  let db;
  function load() { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; } if (!db || db.v !== 1) { db = seed(); save(); } return db; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const ok = v => Promise.resolve(v);
  load();

  const moyenne = n => { if (!n || n.cc == null) return null; if (n.exam == null) return null; return Math.round((n.cc * PONDERATION.cc + n.exam * PONDERATION.exam) * 100) / 100; };
  const mention = m => m == null ? ["En attente","neu"] : m < 10 ? ["Ajourné","bad"] : m < 12 ? ["Passable","warn"] : m < 14 ? ["Assez bien","info"] : m < 16 ? ["Bien","ok"] : ["Très bien","ok"];

  return {
    PONDERATION, moyenne, mention,
    db: () => db,
    user: id => db.users.find(u => u.id === id),
    classe: id => db.classes.find(c => c.id === id),
    matiere: id => db.matieres.find(m => m.id === id),
    // Session
    login(login, pwd, role) {
      const u = db.users.find(x => x.login.toLowerCase() === String(login).trim().toLowerCase() && x.pwd === pwd && (!role || x.role === role));
      if (u) try { sessionStorage.setItem(SKEY, u.id); } catch (e) {}
      return ok(u || null);
    },
    current() { let id; try { id = sessionStorage.getItem(SKEY); } catch (e) {} return id ? this.user(id) : null; },
    logout() { try { sessionStorage.removeItem(SKEY); } catch (e) {} },
    // Notes
    saveNotes(matiereId, rows) {
      const cur = db.notes[matiereId] || (db.notes[matiereId] = {});
      Object.entries(rows).forEach(([sid, n]) => { cur[sid] = {cc:n.cc, exam:n.exam, maj:new Date().toISOString()}; });
      save(); return ok(true);
    },
    notesEtudiant(sid) {
      const u = this.user(sid);
      return db.matieres.filter(m => m.classe === u.classe).map(m => { const n = (db.notes[m.id] || {})[sid] || {}; return {...m, cc:n.cc ?? null, exam:n.exam ?? null, moy:moyenne(n), maj:n.maj}; });
    },
    moyenneGenerale(sid) {
      const l = this.notesEtudiant(sid).filter(x => x.moy != null); if (!l.length) return null;
      const c = l.reduce((a, x) => a + x.coef, 0); return Math.round(l.reduce((a, x) => a + x.moy * x.coef, 0) / c * 100) / 100;
    },
    rang(sid) {
      const u = this.user(sid), cl = db.users.filter(x => x.classe === u.classe);
      const list = cl.map(x => ({id:x.id, m:this.moyenneGenerale(x.id)})).filter(x => x.m != null).sort((a, b) => b.m - a.m);
      const i = list.findIndex(x => x.id === sid); return i < 0 ? null : {rang:i + 1, total:list.length};
    },
    // Publications
    addPost(p) { const n = {...p, id:uid("p"), date:new Date().toISOString()}; db.posts.unshift(n); save(); return ok(n); },
    deletePost(id) { db.posts = db.posts.filter(p => p.id !== id); save(); return ok(true); },
    postsPour(classe) { return db.posts.filter(p => p.classe === "*" || p.classe === classe).sort((a, b) => b.date.localeCompare(a.date)); },
    // Messagerie
    send(from, to, texte) { const m = {id:uid("x"), from, to, texte, date:new Date().toISOString(), lu:false}; db.messages.push(m); save(); return ok(m); },
    thread(a, b) { return db.messages.filter(m => (m.from === a && m.to === b) || (m.from === b && m.to === a)).sort((x, y) => x.date.localeCompare(y.date)); },
    markRead(me, other) { db.messages.forEach(m => { if (m.to === me && m.from === other) m.lu = true; }); save(); },
    unread(me) { return db.messages.filter(m => m.to === me && !m.lu).length; },
    contactsDe(me) {
      const ids = new Set(); db.messages.forEach(m => { if (m.from === me) ids.add(m.to); if (m.to === me) ids.add(m.from); });
      return [...ids].map(id => { const t = this.thread(me, id); return {user:this.user(id), last:t[t.length - 1], unread:t.filter(m => m.to === me && !m.lu).length}; }).sort((a, b) => b.last.date.localeCompare(a.last.date));
    },
    // Scolarité
    addCandidature(d) {
      const ref = "ESM-26-" + String(413 + db.candidatures.length).padStart(4, "0");
      db.candidatures.unshift({...d, id:uid("c"), ref, date:new Date().toISOString(), statut:"nouveau"}); save(); return ok(ref);
    },
    setStatut(id, statut) { const c = db.candidatures.find(x => x.id === id); if (c) { c.statut = statut; save(); } return ok(true); },
    addContact(d) { db.contacts.unshift({...d, id:uid("k"), date:new Date().toISOString()}); save(); return ok(true); },
    reset() { db = seed(); save(); },
  };
})();
