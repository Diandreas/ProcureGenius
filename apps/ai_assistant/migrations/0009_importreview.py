# Generated manually for ImportReview model

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('ai_assistant', '0008_add_ai_notifications'),
        ('accounts', '0011_emailconfiguration'),
    ]

    operations = [
        migrations.CreateModel(
            name='ImportReview',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('entity_type', models.CharField(choices=[('invoice', 'Facture'), ('purchase_order', 'Bon de commande'), ('supplier', 'Fournisseur'), ('product', 'Produit')], max_length=50, verbose_name='Type dentité')),
                ('extracted_data', models.JSONField(verbose_name='Données extraites')),
                ('modified_data', models.JSONField(blank=True, null=True, verbose_name='Données modifiées')),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('approved', 'Approuvé'), ('rejected', 'Rejeté'), ('modified', 'Modifié')], default='pending', max_length=20, verbose_name='Statut')),
                ('reviewed_at', models.DateTimeField(blank=True, null=True, verbose_name='Date de révision')),
                ('created_entity_id', models.UUIDField(blank=True, null=True, verbose_name='ID entité créée')),
                ('notes', models.TextField(blank=True, verbose_name='Notes')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='import_reviews', to='accounts.organization', verbose_name='Organisation')),
                ('source_document', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='import_reviews', to='ai_assistant.documentscan', verbose_name='Document source')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='import_reviews', to='accounts.customuser', verbose_name='Utilisateur')),
            ],
            options={
                'verbose_name': 'Révision dimport',
                'verbose_name_plural': 'Révisions dimport',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='importreview',
            index=models.Index(fields=['user', 'status', 'created_at'], name='ai_assistan_user_sta_idx'),
        ),
        migrations.AddIndex(
            model_name='importreview',
            index=models.Index(fields=['organization', 'status', 'created_at'], name='ai_assistan_organ_sta_idx'),
        ),
    ]
