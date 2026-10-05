# ESM – École Supérieure de la Mer (Libreville, Gabon)

Site vitrine et espace numérique de l'École Supérieure de la Mer.

## Pages publiques
- `index.html` : accueil (diaporama, formations, piliers, actualités, partenaires)
- `ecole.html` : présentation, mission, parcours étudiant
- `formations.html` : 9 licences pro, 8 masters pro, 1 master cadres (filtres + fiches détaillées)
- `admission.html` : conditions, pré-inscription en ligne en 3 étapes, FAQ
- `vie-etudiante.html` : actualités et galerie photo filtrable (visionneuse)
- `contact.html` : coordonnées, formulaire, carte

## Espace numérique (`espace.html`)
| Profil | Accès | Fonctions |
|---|---|---|
| Enseignant | `enseignant.html` | planning de la semaine (toutes classes), programmation d'examens et d'événements, saisie des notes (CC 40 % / examen 60 %, moyenne et mention auto), statistiques de classe, export CSV, annonces et devoirs, messagerie |
| Scolarité | `enseignant.html` | planning : emploi du temps des classes (détection des conflits classe/enseignant/salle), examens, réunions, congés ; pré-inscriptions reçues (statuts), résultats et classements par classe, messages du site, annonces à toute l'école |
| Étudiant | `etudiant.html` | notes, moyenne générale, rang, bulletin imprimable, annonces, devoirs, emploi du temps réel et prochains examens, messagerie |

### Comptes de démonstration
- Enseignants : `p.ndong`, `c.mba`, `s.obiang` / `prof2026`
- Scolarité : `scolarite` / `admin2026`
- Étudiants : `ESM25-001` à `ESM25-028` / `esm2026`

## Base de données (Supabase)
- `supabase/install.sql` : tables, règles de sécurité (RLS) par rôle, fonctions, temps réel et comptes de démonstration.
- `assets/js/config.js` : URL du projet et clé publique « anon ». Vide = mode démonstration (données dans le navigateur).
- La scolarité crée les comptes, classes et matières depuis le back-office (« Comptes », « Classes & matières »).
- Avant la mise en production : changer ou supprimer les comptes de démonstration et passer `showDemo` à `false`.

## Déploiement
Site statique hébergé sur GitHub Pages — aucune compilation nécessaire.
