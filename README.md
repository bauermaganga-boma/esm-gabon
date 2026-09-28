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
| Enseignant | `enseignant.html` | saisie des notes (CC 40 % / examen 60 %, moyenne et mention auto), statistiques de classe, export CSV, annonces et devoirs, messagerie |
| Scolarité | `enseignant.html` | pré-inscriptions reçues (statuts), résultats et classements par classe, messages du site, annonces à toute l'école |
| Étudiant | `etudiant.html` | notes, moyenne générale, rang, bulletin imprimable, annonces, devoirs, emploi du temps, messagerie |

### Comptes de démonstration
- Enseignants : `p.ndong`, `c.mba`, `s.obiang` / `prof2026`
- Scolarité : `scolarite` / `admin2026`
- Étudiants : `ESM25-001` à `ESM25-028` / `esm2026`

## Données
En mode démonstration, les données sont stockées dans le navigateur (`localStorage`, voir `assets/js/store.js`).
Toutes les méthodes du `Store` sont asynchrones : pour un usage réel (notes partagées entre tous les appareils,
comptes sécurisés), il suffit de remplacer leur implémentation par des appels à une base en ligne (Supabase, Firebase ou une API).

## Déploiement
Site statique hébergé sur GitHub Pages — aucune compilation nécessaire.
