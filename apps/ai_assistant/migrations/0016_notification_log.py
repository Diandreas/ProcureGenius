from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ai_assistant', '0015_backfill_conversation_org'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('notification_type', models.CharField(max_length=80)),
                ('channel', models.CharField(default='push', max_length=10)),
                ('reference_id', models.CharField(blank=True, default='', max_length=100)),
                ('sent_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notification_logs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Log notification',
                'verbose_name_plural': 'Logs notifications',
            },
        ),
        migrations.AddIndex(
            model_name='notificationlog',
            index=models.Index(
                fields=['user', 'notification_type', 'sent_at'],
                name='notif_log_user_type_idx',
            ),
        ),
    ]
