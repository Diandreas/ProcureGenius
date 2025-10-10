# Generated manually for Mode IA Permanent implementation

import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_client_remove_customuser_ai_notifications_and_more'),
    ]

    operations = [
        # Créer le modèle Organization
        migrations.CreateModel(
            name='Organization',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200, verbose_name='Nom de l\'organisation')),
                ('subscription_type', models.CharField(
                    choices=[
                        ('free', 'Gratuit'),
                        ('basic', 'Basique'),
                        ('professional', 'Professionnel'),
                        ('enterprise', 'Entreprise'),
                    ],
                    default='free',
                    max_length=50,
                    verbose_name='Type d\'abonnement'
                )),
                ('enabled_modules', models.JSONField(
                    default=list,
                    help_text='Liste des modules disponibles pour l\'organisation',
                    verbose_name='Modules activés'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Organisation',
                'verbose_name_plural': 'Organisations',
                'ordering': ['name'],
            },
        ),
        # Ajouter le rôle à CustomUser
        migrations.AddField(
            model_name='customuser',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Administrateur'),
                    ('manager', 'Gestionnaire'),
                    ('buyer', 'Acheteur'),
                    ('accountant', 'Comptable'),
                    ('viewer', 'Consultation'),
                ],
                default='buyer',
                max_length=50,
                verbose_name='Rôle'
            ),
        ),
        # Ajouter l'organisation à CustomUser
        migrations.AddField(
            model_name='customuser',
            name='organization',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='users',
                to='accounts.organization',
                verbose_name='Organisation'
            ),
        ),
        # Créer UserPreferences
        migrations.CreateModel(
            name='UserPreferences',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('enabled_modules', models.JSONField(
                    default=list,
                    help_text='Liste des modules auxquels l\'utilisateur a accès',
                    verbose_name='Modules activés pour l\'utilisateur'
                )),
                ('onboarding_completed', models.BooleanField(
                    default=False,
                    verbose_name='Onboarding complété'
                )),
                ('onboarding_data', models.JSONField(
                    default=dict,
                    help_text='Réponses du questionnaire d\'onboarding',
                    verbose_name='Données d\'onboarding'
                )),
                ('dashboard_layout', models.JSONField(
                    default=dict,
                    verbose_name='Mise en page du tableau de bord'
                )),
                ('notification_settings', models.JSONField(
                    default=dict,
                    verbose_name='Paramètres de notification'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='preferences',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Utilisateur'
                )),
            ],
            options={
                'verbose_name': 'Préférence utilisateur',
                'verbose_name_plural': 'Préférences utilisateur',
            },
        ),
        # Créer UserPermissions
        migrations.CreateModel(
            name='UserPermissions',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('can_manage_users', models.BooleanField(
                    default=False,
                    help_text='Peut créer, modifier et supprimer des utilisateurs',
                    verbose_name='Gérer les utilisateurs'
                )),
                ('can_manage_settings', models.BooleanField(
                    default=False,
                    help_text='Peut modifier les paramètres de l\'organisation',
                    verbose_name='Gérer les paramètres'
                )),
                ('can_view_analytics', models.BooleanField(
                    default=True,
                    help_text='Peut accéder aux rapports et analytics',
                    verbose_name='Voir les analytics'
                )),
                ('can_approve_purchases', models.BooleanField(
                    default=False,
                    help_text='Peut approuver les bons de commande',
                    verbose_name='Approuver les achats'
                )),
                ('module_access', models.JSONField(
                    default=list,
                    help_text='Liste des modules accessibles (sous-ensemble des modules de l\'organisation)',
                    verbose_name='Accès aux modules'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='permissions',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Utilisateur'
                )),
            ],
            options={
                'verbose_name': 'Permission utilisateur',
                'verbose_name_plural': 'Permissions utilisateur',
            },
        ),
    ]

