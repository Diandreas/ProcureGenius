
📋 CHECKLIST DE DÉPLOIEMENT PROCUREGENIUS

PRÉ-DÉPLOIEMENT:
□ Clés API configurées dans .env
□ Base de données PostgreSQL prête
□ Redis installé et fonctionnel
□ Docker installé (si déploiement Docker)

DÉPLOIEMENT:
□ Exécuter: ./deploy.sh
□ Vérifier: http://localhost:8000 accessible
□ Tester: Connexion admin (admin/admin123)
□ Valider: Changement langue FR/EN

TESTS FONCTIONNELS:
□ Créer un fournisseur
□ Créer un bon de commande
□ Générer une facture
□ Tester paiement PayPal (sandbox)
□ Utiliser l'assistant IA
□ Vérifier les analytics

MISE EN PRODUCTION:
□ Configurer domaine personnalisé
□ Activer SSL/HTTPS
□ Configurer PayPal en mode live
□ Sauvegardes automatiques
□ Monitoring et logs
