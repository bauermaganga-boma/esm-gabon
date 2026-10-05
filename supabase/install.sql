-- =====================================================================
--  ESM – École Supérieure de la Mer · Base de données Supabase
--  À exécuter UNE FOIS dans : Supabase > SQL Editor > New query > Run
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
create table if not exists public.classes (
  id  text primary key,
  nom text not null
);

create table if not exists public.profiles (
  id        uuid primary key references auth.users on delete cascade,
  role      text not null check (role in ('admin','enseignant','etudiant')),
  login     text not null unique,
  prenom    text not null,
  nom       text not null,
  civ       text,
  titre     text,
  classe    text references public.classes on delete set null,
  matricule text
);

create table if not exists public.matieres (
  id     text primary key default ('m' || substr(md5(random()::text), 1, 8)),
  nom    text not null,
  classe text not null references public.classes on delete cascade,
  prof   uuid references public.profiles on delete set null,
  coef   int  not null default 1 check (coef between 1 and 20)
);

create table if not exists public.notes (
  matiere  text references public.matieres on delete cascade,
  etudiant uuid references public.profiles on delete cascade,
  cc       numeric(4,2) check (cc between 0 and 20),
  exam     numeric(4,2) check (exam between 0 and 20),
  maj      timestamptz not null default now(),
  primary key (matiere, etudiant)
);

create table if not exists public.posts (
  id       uuid primary key default gen_random_uuid(),
  auteur   uuid not null default auth.uid() references public.profiles on delete cascade,
  classe   text not null,                       -- '*' = toute l'école
  matiere  text references public.matieres on delete set null,
  type     text not null check (type in ('annonce','devoir','urgent')),
  titre    text not null check (length(titre) between 1 and 120),
  texte    text not null check (length(texte) between 1 and 5000),
  echeance timestamptz,
  date     timestamptz not null default now()
);

create table if not exists public.messages (
  id      uuid primary key default gen_random_uuid(),
  from_id uuid not null default auth.uid() references public.profiles on delete cascade,
  to_id   uuid not null references public.profiles on delete cascade,
  texte   text not null check (length(texte) between 1 and 4000),
  date    timestamptz not null default now(),
  lu      boolean not null default false
);

create sequence if not exists public.candidature_seq;
create table if not exists public.candidatures (
  id              uuid primary key default gen_random_uuid(),
  ref             text unique not null,
  prenom          text not null, nom text not null, tel text not null, email text,
  naissance       date, ville text,
  formation       text, formation_label text, niveau text, serie text,
  motivation      text, source text,
  statut          text not null default 'nouveau' check (statut in ('nouveau','en cours','admis','refusé')),
  date            timestamptz not null default now()
);

create table if not exists public.contacts (
  id      uuid primary key default gen_random_uuid(),
  nom     text not null check (length(nom) between 1 and 120),
  email   text not null check (length(email) between 3 and 200),
  tel     text,
  sujet   text,
  message text not null check (length(message) between 1 and 5000),
  date    timestamptz not null default now()
);

-- Planning : emploi du temps (cours hebdomadaires) et événements datés
create table if not exists public.seances (
  id      uuid primary key default gen_random_uuid(),
  classe  text not null references public.classes on delete cascade,
  matiere text not null references public.matieres on delete cascade,
  jour    int  not null check (jour between 1 and 6),          -- 1 = lundi … 6 = samedi
  debut   time not null,
  fin     time not null,
  salle   text check (length(salle) <= 60),
  type    text not null default 'Cours' check (type in ('Cours','TD','TP')),
  check (fin > debut)
);

create table if not exists public.evenements (
  id      uuid primary key default gen_random_uuid(),
  auteur  uuid not null default auth.uid() references public.profiles on delete cascade,
  classe  text not null,                                       -- '*' = toute l'école
  matiere text references public.matieres on delete set null,
  type    text not null check (type in ('examen','reunion','evenement','conge')),
  titre   text not null check (length(titre) between 1 and 120),
  details text check (length(details) <= 2000),
  date    date not null,
  debut   time,
  fin     time,
  lieu    text check (length(lieu) <= 100),
  check (fin is null or debut is null or fin > debut)
);

-- ---------------------------------------------------------------------
-- 2. Fonctions utilitaires (utilisées par les règles de sécurité)
-- ---------------------------------------------------------------------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function public.my_classe() returns text
language sql stable security definer set search_path = public as
$$ select classe from profiles where id = auth.uid() $$;

create or replace function public.teaches(m text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from matieres where id = m and prof = auth.uid()) $$;

create or replace function public.teaches_classe(c text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from matieres where classe = c and prof = auth.uid()) $$;

-- ---------------------------------------------------------------------
-- 3. Sécurité au niveau des lignes (RLS)
-- ---------------------------------------------------------------------
alter table public.classes      enable row level security;
alter table public.profiles     enable row level security;
alter table public.matieres     enable row level security;
alter table public.notes        enable row level security;
alter table public.posts        enable row level security;
alter table public.messages     enable row level security;
alter table public.candidatures enable row level security;
alter table public.contacts     enable row level security;
alter table public.seances      enable row level security;
alter table public.evenements   enable row level security;

-- Classes & matières : lecture pour les connectés, écriture pour la scolarité
create policy classes_read   on public.classes  for select to authenticated using (true);
create policy classes_admin  on public.classes  for all    to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');
create policy matieres_read  on public.matieres for select to authenticated using (true);
create policy matieres_admin on public.matieres for all    to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');

-- Profils : annuaire lisible par les connectés, modifiable par la scolarité
create policy profiles_read  on public.profiles for select to authenticated using (true);
create policy profiles_admin on public.profiles for update to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');

-- Notes : l'étudiant voit les siennes, l'enseignant celles de ses matières, la scolarité tout
create policy notes_read on public.notes for select to authenticated
  using (my_role() = 'admin' or etudiant = auth.uid() or teaches(matiere));
create policy notes_insert on public.notes for insert to authenticated
  with check ((my_role() = 'admin' or teaches(matiere))
    and exists(select 1 from profiles p join matieres m on m.classe = p.classe where p.id = etudiant and m.id = matiere));
create policy notes_update on public.notes for update to authenticated
  using (my_role() = 'admin' or teaches(matiere)) with check (my_role() = 'admin' or teaches(matiere));
create policy notes_delete on public.notes for delete to authenticated
  using (my_role() = 'admin' or teaches(matiere));

-- Annonces
create policy posts_read on public.posts for select to authenticated
  using (my_role() = 'admin' or auteur = auth.uid() or classe = '*' or classe = my_classe() or teaches_classe(classe));
create policy posts_insert on public.posts for insert to authenticated
  with check (auteur = auth.uid() and (my_role() = 'admin' or (my_role() = 'enseignant' and teaches_classe(classe))));
create policy posts_delete on public.posts for delete to authenticated
  using (auteur = auth.uid() or my_role() = 'admin');

-- Messagerie : chacun ne voit que ses conversations
create policy messages_read   on public.messages for select to authenticated using (from_id = auth.uid() or to_id = auth.uid());
create policy messages_insert on public.messages for insert to authenticated with check (from_id = auth.uid());
create policy messages_update on public.messages for update to authenticated using (to_id = auth.uid()) with check (to_id = auth.uid());
revoke update on public.messages from anon, authenticated;
grant  update (lu) on public.messages to authenticated;

-- Pré-inscriptions (création via la fonction submit_candidature) & contacts
create policy cand_admin on public.candidatures for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');
create policy contacts_insert on public.contacts for insert to anon, authenticated with check (true);
create policy contacts_admin  on public.contacts for select to authenticated using (my_role() = 'admin');
create policy contacts_del    on public.contacts for delete to authenticated using (my_role() = 'admin');

-- Planning : emploi du temps lisible par tous les connectés, géré par la scolarité
create policy seances_read  on public.seances for select to authenticated using (true);
create policy seances_admin on public.seances for all    to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');
-- Événements : visibles par les classes concernées ; créés par la scolarité ou par l'enseignant pour ses classes
create policy evenements_read on public.evenements for select to authenticated
  using (my_role() = 'admin' or auteur = auth.uid() or teaches_classe(classe)
         or (my_role() = 'enseignant' and classe = '*')
         or (my_role() = 'etudiant' and type <> 'reunion' and (classe = '*' or classe = my_classe())));  -- réunions : personnel uniquement
create policy evenements_insert on public.evenements for insert to authenticated
  with check (auteur = auth.uid() and (my_role() = 'admin' or (my_role() = 'enseignant' and teaches_classe(classe))));
create policy evenements_delete on public.evenements for delete to authenticated
  using (auteur = auth.uid() or my_role() = 'admin');

-- ---------------------------------------------------------------------
-- 4. Fonctions appelées par le site
-- ---------------------------------------------------------------------
-- Pré-inscription publique : renvoie le numéro de dossier
create or replace function public.submit_candidature(d jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  if coalesce(trim(d->>'prenom'),'') = '' or coalesce(trim(d->>'nom'),'') = '' or coalesce(trim(d->>'tel'),'') = '' then
    raise exception 'Prénom, nom et téléphone sont obligatoires';
  end if;
  r := 'ESM-' || to_char(now(), 'YY') || '-' || lpad(nextval('candidature_seq')::text, 4, '0');
  insert into candidatures(ref, prenom, nom, tel, email, naissance, ville, formation, formation_label, niveau, serie, motivation, source)
  values (r, left(d->>'prenom',80), left(d->>'nom',80), left(d->>'tel',40), nullif(left(d->>'email',200),''),
          nullif(d->>'naissance','')::date, left(d->>'ville',80), left(d->>'formation',40), left(d->>'formationLabel',200),
          left(d->>'niveau',60), left(d->>'serie',40), left(d->>'motivation',4000), left(d->>'source',60));
  return r;
end $$;
grant execute on function public.submit_candidature(jsonb) to anon, authenticated;

-- Rang de l'étudiant connecté dans sa classe (sans exposer les notes des autres)
create or replace function public.mon_rang() returns table(rang int, total int)
language sql stable security definer set search_path = public as $$
  with a as (
    select p.id, sum(round(n.cc*0.4 + n.exam*0.6, 2) * m.coef) / sum(m.coef) as moy
    from profiles p
    join matieres m on m.classe = p.classe
    join notes n on n.matiere = m.id and n.etudiant = p.id and n.cc is not null and n.exam is not null
    where p.role = 'etudiant' and p.classe = (select classe from profiles where id = auth.uid())
    group by p.id),
  r as (select id, rank() over (order by moy desc) rg, count(*) over () tot from a)
  select rg::int, tot::int from r where id = auth.uid()
$$;
grant execute on function public.mon_rang() to authenticated;

-- Création d'un compte (interne)
create or replace function public._create_user(p_login text, p_password text, p_role text, p_prenom text, p_nom text,
  p_classe text default null, p_civ text default null, p_titre text default null) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := gen_random_uuid(); em text := lower(trim(p_login)) || '@esm.local';
begin
  if length(coalesce(p_password,'')) < 6 then raise exception 'Le mot de passe doit contenir au moins 6 caractères'; end if;
  if p_role not in ('admin','enseignant','etudiant') then raise exception 'Rôle invalide'; end if;
  if p_role = 'etudiant' and p_classe is null then raise exception 'Un étudiant doit avoir une classe'; end if;
  if exists(select 1 from profiles where lower(login) = lower(trim(p_login))) then raise exception 'Cet identifiant existe déjà'; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em, crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
  insert into profiles(id, role, login, prenom, nom, civ, titre, classe, matricule)
  values (uid, p_role, trim(p_login), trim(p_prenom), trim(p_nom), nullif(p_civ,''), nullif(p_titre,''),
          case when p_role = 'etudiant' then p_classe end, case when p_role = 'etudiant' then upper(trim(p_login)) end);
  return uid;
end $$;
revoke all on function public._create_user(text,text,text,text,text,text,text,text) from public, anon, authenticated;

-- Fonctions réservées à la scolarité
create or replace function public.admin_create_user(p_login text, p_password text, p_role text, p_prenom text, p_nom text,
  p_classe text default null, p_civ text default null, p_titre text default null) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Accès réservé à la scolarité'; end if;
  return _create_user(p_login, p_password, p_role, p_prenom, p_nom, p_classe, p_civ, p_titre);
end $$;

create or replace function public.admin_set_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Accès réservé à la scolarité'; end if;
  if length(coalesce(p_password,'')) < 6 then raise exception 'Le mot de passe doit contenir au moins 6 caractères'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
end $$;

create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Accès réservé à la scolarité'; end if;
  if p_user = auth.uid() then raise exception 'Vous ne pouvez pas supprimer votre propre compte'; end if;
  delete from auth.users where id = p_user;
end $$;
revoke all on function public.admin_create_user(text,text,text,text,text,text,text,text) from public, anon;
revoke all on function public.admin_set_password(uuid,text) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_create_user(text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.admin_set_password(uuid,text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Temps réel (notes, annonces, messages, pré-inscriptions)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.notes, public.posts, public.messages, public.candidatures, public.contacts, public.seances, public.evenements;

-- ---------------------------------------------------------------------
-- 6. Données de démarrage (comptes de démonstration)
--    ⚠ Changez les mots de passe (ou supprimez ces comptes) avant un usage réel.
-- ---------------------------------------------------------------------
do $$
declare
  t1 uuid; t2 uuid; t3 uuid; adm uuid; k int := 0; c text; i int;
  prenoms text[] := array['Arnaud','Grâce','Cédric','Merveille','Junior','Prisca','Loïc','Stessy','Yannick','Nadège','Brice','Ornella','Kevin','Sandrine','Davy','Aurore','Fabrice','Christelle','Rodrigue','Laetitia','Ulrich','Joëlle','Hervé','Marlène','Styve','Divine','Landry','Océane'];
  noms    text[] := array['Nzé','Mba','Ondo','Obiang','Nguema','Moussavou','Mabika','Essono','Mintsa','Boussougou','Koumba','Mouele','Ella','Oyane','Mapangou','Nzamba','Bivigou','Engone','Ntoutoume','Mengue','Assoumou','Makaya','Ekomi','Ibinga','Nkoghe','Ango','Mboumba','Ndoutoume'];
begin
  if exists(select 1 from profiles) then return; end if;
  insert into classes values
    ('L3-GAMP','Licence 3 · Gestion des Activités Maritimes et Portuaires'),
    ('L3-TL','Licence 3 · Transport et Logistique'),
    ('L2-MGP','Licence 2 · Mine, Géologie, Pétrole'),
    ('M1-QHSE','Master 1 · Qualité Hygiène Sécurité Environnement');
  adm := _create_user('scolarite','admin2026','admin','Service','Scolarité',null,null,'Administration');
  t1  := _create_user('p.ndong','prof2026','enseignant','Paul','Ndong',null,'M.','Topographie & Géosciences');
  t2  := _create_user('c.mba','prof2026','enseignant','Clarisse','Mba',null,'Mme','Droit maritime & HSE');
  t3  := _create_user('s.obiang','prof2026','enseignant','Serge','Obiang',null,'M.','Logistique & Exploitation portuaire');
  foreach c in array array['L3-GAMP','L3-TL','L2-MGP','M1-QHSE'] loop
    for i in 1..7 loop
      k := k + 1;
      perform _create_user('ESM25-' || lpad(k::text,3,'0'), 'esm2026', 'etudiant', prenoms[k], noms[k], c);
    end loop;
  end loop;
  insert into matieres(id, nom, classe, prof, coef) values
    ('m1','Cartographie marine','L3-GAMP',t1,2), ('m2','Droit maritime','L3-GAMP',t2,3), ('m3','Exploitation portuaire','L3-GAMP',t3,4),
    ('m4','Droit des transports','L3-TL',t2,2), ('m5','Supply chain management','L3-TL',t3,4), ('m6','Transport multimodal','L3-TL',t3,3),
    ('m7','Topographie','L2-MGP',t1,3), ('m8','Géologie de terrain','L2-MGP',t1,4),
    ('m9','Réglementation HSE','M1-QHSE',t2,3), ('m10','Management QHSE','M1-QHSE',t3,4);
  insert into notes(matiere, etudiant, cc, exam, maj)
  select m.id, p.id,
         round(least(20, greatest(3, l.lvl + (random()-.5)*5))::numeric * 4) / 4,
         case when m.id = 'm8' then null else round(least(20, greatest(2, l.lvl + (random()-.5)*6))::numeric * 4) / 4 end,
         now() - random() * interval '20 days'
  from matieres m
  join profiles p on p.classe = m.classe and p.role = 'etudiant'
  cross join lateral (select 8 + random()*9 + 0*length(p.nom) as lvl) l
  where m.id <> 'm6';
  insert into posts(auteur, classe, matiere, type, titre, texte, echeance, date) values
    (adm,'*',null,'annonce','Rentrée académique 2026-2027','Les pré-inscriptions sont ouvertes. Les étudiants en réinscription doivent régulariser leur dossier auprès de la scolarité avant la reprise des cours.',null, now() - interval '1 day'),
    (t1,'L2-MGP','m8','devoir','Rapport de sortie géologique','Rendre le rapport de la mission de terrain (coupe géologique + photos commentées), 10 pages maximum.', now() + interval '9 days', now() - interval '2 days'),
    (t3,'L3-TL','m5','annonce','Visite d''entreprise – terminal à conteneurs','Visite prévue avec notre partenaire portuaire. Tenue correcte, gilet et chaussures fermées obligatoires. Rendez-vous 7h30 devant l''école.',null, now() - interval '4 days'),
    (t2,'L3-GAMP','m2','urgent','Changement de salle','Le cours de Droit maritime de jeudi aura lieu en salle 4 (au lieu de la salle 2).',null, now() - interval '7 hours'),
    (t1,'L3-GAMP','m1','devoir','Exercice de lecture de carte','Exercice n°3 : tracé de route et calcul de cap sur la carte fournie en cours.', now() + interval '4 days', now() - interval '6 days');
  insert into messages(from_id, to_id, texte, date, lu) values
    ((select id from profiles where login='ESM25-015'), t1, 'Bonjour Monsieur, pour le rapport de terrain, peut-on travailler en binôme ?', now() - interval '29 hours', false),
    ((select id from profiles where login='ESM25-001'), t2, 'Bonjour Madame, serait-il possible d''avoir le support du dernier cours sur les contrats d''affrètement ?', now() - interval '60 hours', true),
    (t2, (select id from profiles where login='ESM25-001'), 'Bonjour, oui : je le dépose à la scolarité demain. Bonne révision !', now() - interval '53 hours', false),
    ((select id from profiles where login='ESM25-009'), t3, 'Bonjour Monsieur, à quelle heure est prévu le départ pour la visite ?', now() - interval '74 hours', false);
  -- Emploi du temps type (aucun conflit d'enseignant ni de salle)
  insert into seances(classe, matiere, jour, debut, fin, salle) values
    ('L3-GAMP','m1',1,'08:00','10:00','Salle 1'),('L3-GAMP','m2',1,'10:15','12:15','Salle 1'),('L3-GAMP','m3',2,'08:00','11:00','Salle 1'),
    ('L3-GAMP','m1',3,'14:00','16:00','Salle 3'),('L3-GAMP','m2',4,'08:00','10:00','Salle 1'),('L3-GAMP','m3',5,'10:15','12:15','Salle 1'),
    ('L3-TL','m4',1,'08:00','10:00','Salle 2'),('L3-TL','m5',1,'10:15','12:15','Salle 2'),('L3-TL','m6',2,'14:00','17:00','Salle 2'),
    ('L3-TL','m4',3,'10:15','12:15','Salle 2'),('L3-TL','m5',4,'08:00','11:00','Salle 2'),('L3-TL','m6',5,'08:00','10:00','Salle 2'),
    ('L2-MGP','m7',1,'10:15','12:15','Labo'),('L2-MGP','m8',2,'08:00','12:00','Terrain'),('L2-MGP','m7',3,'08:00','10:00','Labo'),
    ('L2-MGP','m8',4,'14:00','17:00','Terrain'),('L2-MGP','m7',5,'10:15','12:15','Labo'),
    ('M1-QHSE','m10',1,'14:00','17:00','Salle 4'),('M1-QHSE','m9',2,'08:00','10:00','Salle 4'),('M1-QHSE','m10',3,'08:00','11:00','Salle 4'),
    ('M1-QHSE','m9',4,'10:15','12:15','Salle 4'),('M1-QHSE','m9',5,'14:00','16:00','Salle 4');
  update seances set type = 'TP' where salle in ('Labo','Terrain');
  -- Événements à venir (dates décalées au prochain jour ouvré)
  insert into evenements(auteur, classe, matiere, type, titre, details, date, debut, fin, lieu)
  select e_aut, e_cls, e_mat, e_typ, e_tit, e_det, e_dat + case extract(isodow from e_dat) when 6 then 2 when 7 then 1 else 0 end, e_deb, e_fin, e_lieu from (values
    (adm,'*',null,'reunion','Conseil pédagogique','Bilan de mi-semestre avec l''ensemble des enseignants.', current_date + 3, '15:00'::time, '17:00'::time, 'Salle des professeurs'),
    (t1,'L2-MGP','m8','evenement','Sortie de terrain – géologie','Prévoir bottes, casquette et carnet de terrain.', current_date + 4, null, null, 'Site de terrain'),
    (t2,'L3-GAMP','m2','examen','Examen de Droit maritime','Documents non autorisés.', current_date + 7, '08:00'::time, '10:00'::time, 'Salle 1'),
    (t3,'L3-TL','m5','examen','Partiel – Supply chain management',null, current_date + 10, '08:00'::time, '11:00'::time, 'Salle 2'),
    (adm,'*',null,'evenement','Journée citoyenne de salubrité','Participation de toutes les promotions.', current_date + 12, null, null, 'Libreville')
  ) v(e_aut, e_cls, e_mat, e_typ, e_tit, e_det, e_dat, e_deb, e_fin, e_lieu);
end $$;
