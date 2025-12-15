"""
Management command pour créer des données de test pour les notifications IA
Usage: python manage.py create_test_notifications
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.ai_assistant.models import AINotification, ProactiveSuggestion, ImportReview
from apps.accounts.models import Organization
from django.utils import timezone
import uuid

User = get_user_model()


class Command(BaseCommand):
    help = 'Crée des données de test pour les notifications IA et les imports en révision'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=str,
            help='ID de l\'utilisateur pour lequel créer les notifications (optionnel)',
        )
        parser.add_argument(
            '--count',
            type=int,
            default=5,
            help='Nombre de notifications à créer (défaut: 5)',
        )

    def handle(self, *args, **options):
        user_id = options.get('user_id')
        count = options.get('count', 5)

        # Récupérer l'utilisateur
        if user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Utilisateur avec ID {user_id} introuvable'))
                return
        else:
            # Prendre le premier utilisateur disponible
            user = User.objects.first()
            if not user:
                self.stdout.write(self.style.ERROR('Aucun utilisateur trouvé dans la base de données'))
                return

        self.stdout.write(f'Création de {count} notifications de test pour {user.username}...')

        # Créer des notifications de différents types
        notification_types = ['suggestion', 'alert', 'insight', 'achievement']
        
        for i in range(count):
            notif_type = notification_types[i % len(notification_types)]
            
            titles = {
                'suggestion': [
                    '💡 Optimisez vos commandes récurrentes',
                    '📊 Analysez vos meilleurs produits',
                    '🤖 Automatisez vos factures',
                ],
                'alert': [
                    '⚠️ Rupture de stock imminente',
                    '🚨 Facture inhabituelle détectée',
                    '📉 Baisse de marge détectée',
                ],
                'insight': [
                    '⭐ Vos produits stars ce mois',
                    '🎯 Client inactif depuis 60 jours',
                    '📈 Opportunité d\'augmentation des ventes',
                ],
                'achievement': [
                    '🏆 100 factures créées !',
                    '🎉 Premier bon de commande automatisé',
                    '✨ Module IA activé avec succès',
                ],
            }
            
            messages = {
                'suggestion': [
                    'L\'IA peut vous aider à automatiser vos commandes récurrentes et gagner du temps.',
                    'Analysez les performances de vos produits pour optimiser vos stocks.',
                    'Configurez l\'envoi automatique de factures par email.',
                ],
                'alert': [
                    'Le produit "iPhone 15" sera en rupture dans 3 jours selon vos ventes actuelles.',
                    'La facture #INV-2024-001 est 250% plus élevée que la moyenne pour ce client.',
                    'La marge sur "MacBook Pro" a baissé de 18% ce mois-ci.',
                ],
                'insight': [
                    'Vos 3 produits les plus vendus génèrent 45% de vos revenus ce mois.',
                    'Le client "TechCorp" n\'a pas commandé depuis 67 jours. Proposez une offre personnalisée.',
                    'Augmentez vos ventes de 20% en mettant en avant vos produits stars.',
                ],
                'achievement': [
                    'Félicitations ! Vous avez créé 100 factures. Continuez comme ça !',
                    'Votre premier bon de commande a été créé automatiquement par l\'IA.',
                    'Le module IA est maintenant pleinement opérationnel pour votre organisation.',
                ],
            }
            
            title_list = titles.get(notif_type, ['Notification'])
            message_list = messages.get(notif_type, ['Message de test'])
            
            AINotification.objects.create(
                user=user,
                notification_type=notif_type,
                title=title_list[i % len(title_list)],
                message=message_list[i % len(message_list)],
                action_label='Voir les détails' if notif_type != 'achievement' else '',
                action_url='/ai-chat' if notif_type != 'achievement' else '',
                is_read=i % 3 == 0,  # 1/3 des notifications lues
            )

        self.stdout.write(self.style.SUCCESS(f'✓ {count} notifications créées'))

        # Créer quelques imports en révision de test
        self.stdout.write('Création d\'imports en révision de test...')
        
        sample_extracted_data = [
            {
                'invoice_number': 'INV-TEST-001',
                'client_name': 'Client Test',
                'client_email': 'client@test.com',
                'total_amount': 1250.00,
                'issue_date': '2024-01-15',
                'items': [
                    {'description': 'Produit A', 'quantity': 2, 'unit_price': 500.00},
                    {'description': 'Produit B', 'quantity': 1, 'unit_price': 250.00},
                ]
            },
            {
                'po_number': 'BC-TEST-001',
                'supplier_name': 'Fournisseur Test',
                'supplier_email': 'supplier@test.com',
                'order_date': '2024-01-20',
            },
        ]

        for i, data in enumerate(sample_extracted_data[:2]):
            ImportReview.objects.create(
                user=user,
                organization=user.organization,
                entity_type='invoice' if 'invoice_number' in data else 'purchase_order',
                extracted_data=data,
                status='pending',
            )

        self.stdout.write(self.style.SUCCESS('✓ 2 imports en révision créés'))
        self.stdout.write(self.style.SUCCESS('\n✅ Données de test créées avec succès !'))

