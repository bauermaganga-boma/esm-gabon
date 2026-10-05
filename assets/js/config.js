/* Connexion à la base de données Supabase.
   Laisser vide = mode démonstration (données enregistrées dans le navigateur).
   Renseigner l'URL du projet et la clé publique "anon" = mode réel partagé.
   (La clé "anon" est publique par conception : la sécurité est assurée par les règles RLS de la base.) */
window.ESM_CONFIG = {
  supabaseUrl: "https://plbdaldpwpgljbzmduef.supabase.co",
  supabaseAnonKey: "sb_publishable_OVNWSARX_uh6PztVwktZjQ_uI2fNpOW",
  // Compartiment de l'école dans le projet partagé rouana-demo (voir supabase/install-esm.sql)
  schema: "esm",
  // Afficher les comptes de démonstration sur la page de connexion (mettre false en production)
  showDemo: true,
};
