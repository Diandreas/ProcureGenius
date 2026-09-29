from django.db import migrations, models


class Migration(migrations.Migration):
    """Ajoute « Hospitalisation » aux types d'entité du journal d'activité,
    pour que la suppression d'un dossier d'hospitalisation y soit lisible.

    Non destructif : uniquement un choix supplémentaire, aucune donnée touchée.
    """

    dependencies = [
        ('analytics', '0003_add_recipient_emails_to_weekly_report'),
    ]

    operations = [
        migrations.AlterField(
            model_name='activitylog',
            name='entity_type',
            field=models.CharField(
                choices=[
                    ('invoice', 'Facture'),
                    ('client', 'Client'),
                    ('product', 'Produit'),
                    ('purchase_order', 'Bon de commande'),
                    ('supplier', 'Fournisseur'),
                    ('stock_movement', 'Mouvement de stock'),
                    ('payment', 'Paiement'),
                    ('contract', 'Contrat'),
                    ('user', 'Utilisateur'),
                    ('organization', 'Organisation'),
                    ('report', 'Rapport'),
                    ('dashboard', 'Dashboard'),
                    ('hospitalization', 'Hospitalisation'),
                ],
                max_length=50,
                verbose_name="Type d'entité",
            ),
        ),
    ]
