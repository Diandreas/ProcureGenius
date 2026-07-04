# Feedback utilisateur (pouce haut/bas) sur les réponses IA.
#
# NB : les opérations parasites auto-détectées sur NotificationLog (rename
# d'index / BigAutoField) venaient d'une dérive de version Django locale et
# ont été retirées : cette migration ne porte QUE MessageFeedback.

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_assistant', '0016_notification_log'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MessageFeedback',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('rating', models.SmallIntegerField(choices=[(1, 'Utile'), (-1, 'Pas utile')], verbose_name='Évaluation')),
                ('comment', models.TextField(blank=True, verbose_name='Commentaire')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='feedbacks', to='ai_assistant.message', verbose_name='Message')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ai_message_feedbacks', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Feedback message IA',
                'verbose_name_plural': 'Feedbacks messages IA',
                'ordering': ['-created_at'],
                'unique_together': {('message', 'user')},
            },
        ),
        migrations.AddIndex(
            model_name='messagefeedback',
            index=models.Index(fields=['rating', '-created_at'], name='ai_assistan_rating_4a6240_idx'),
        ),
    ]
