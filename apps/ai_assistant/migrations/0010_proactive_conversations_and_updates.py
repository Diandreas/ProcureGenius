# Generated manually for ProactiveConversation model and updates

from django.db import migrations, models
import django.db.models.deletion
import uuid
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('ai_assistant', '0009_importreview'),
        ('accounts', '0011_emailconfiguration'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add fields to Conversation model
        migrations.AddField(
            model_name='conversation',
            name='is_proactive',
            field=models.BooleanField(default=False, verbose_name='Conversation proactive'),
        ),
        migrations.AddField(
            model_name='conversation',
            name='proactive_source_id',
            field=models.UUIDField(blank=True, null=True, verbose_name='ID source proactive'),
        ),
        # Add fields to AINotification model
        migrations.AddField(
            model_name='ainotification',
            name='organization',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='ai_notifications', to='accounts.organization'),
        ),
        migrations.AddField(
            model_name='ainotification',
            name='priority',
            field=models.IntegerField(default=5, verbose_name='Priorité'),
        ),
        migrations.AddField(
            model_name='ainotification',
            name='metadata',
            field=models.JSONField(default=dict, verbose_name='Métadonnées'),
        ),
        # Create ProactiveConversation model
        migrations.CreateModel(
            name='ProactiveConversation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200, verbose_name='Titre')),
                ('starter_message', models.TextField(verbose_name='Message de démarrage')),
                ('context_data', models.JSONField(default=dict, verbose_name='Données contextuelles')),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('accepted', 'Acceptée'), ('dismissed', 'Ignorée')], default='pending', max_length=20, verbose_name='Statut')),
                ('accepted_at', models.DateTimeField(blank=True, null=True, verbose_name='Date d\'acceptation')),
                ('dismissed_at', models.DateTimeField(blank=True, null=True, verbose_name='Date d\'ignorance')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('conversation', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='proactive_source', to='ai_assistant.conversation', verbose_name='Conversation')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='proactive_conversations', to='accounts.organization', verbose_name='Organisation')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='proactive_conversations', to=settings.AUTH_USER_MODEL, verbose_name='Utilisateur')),
            ],
            options={
                'verbose_name': 'Conversation proactive',
                'verbose_name_plural': 'Conversations proactives',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='proactiveconversation',
            index=models.Index(fields=['user', 'status', 'created_at'], name='ai_assistan_user_id_idx'),
        ),
        migrations.AddIndex(
            model_name='proactiveconversation',
            index=models.Index(fields=['organization', 'status', 'created_at'], name='ai_assistan_organiz_idx'),
        ),
    ]

