/* Connexion à la base de données Supabase.
   Laisser vide = mode démonstration (données enregistrées dans le navigateur).
   Renseigner l'URL du projet et la clé publique "anon" = mode réel partagé.
   (La clé "anon" est publique par conception : la sécurité est assurée par les règles RLS de la base.) */
window.ESM_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  // Afficher les comptes de démonstration sur la page de connexion (mettre false en production)
  showDemo: true,
};
