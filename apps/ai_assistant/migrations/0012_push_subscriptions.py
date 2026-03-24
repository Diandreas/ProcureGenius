from django.db import migrations, models
import django.db.models.deletion
import uuid
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('ai_assistant', '0011_alter_importreview_options_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0014_change_payment_terms_default_to_cash'),
    ]

    operations = [
        migrations.CreateModel(
            name='PushSubscription',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('endpoint', models.TextField(unique=True)),
                ('p256dh', models.TextField()),
                ('auth', models.TextField()),
                ('user_agent', models.CharField(blank=True, max_length=500)),
                ('device_name', models.CharField(blank=True, max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_used_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    to='accounts.organization',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='push_subscriptions',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'verbose_name': 'Souscription Push', 'verbose_name_plural': 'Souscriptions Push', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='NotificationPreferences',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('push_stock_rupture', models.BooleanField(default=True)),
                ('push_quota_atteint', models.BooleanField(default=True)),
                ('push_facture_retard', models.BooleanField(default=True)),
                ('push_stock_bas', models.BooleanField(default=True)),
                ('push_facture_brouillon', models.BooleanField(default=True)),
                ('push_bc_retard', models.BooleanField(default=True)),
                ('push_lot_expirant', models.BooleanField(default=True)),
                ('push_insight_ia', models.BooleanField(default=True)),
                ('push_resume_hebdo', models.BooleanField(default=True)),
                ('resume_hebdo_jour', models.IntegerField(default=1)),
                ('resume_hebdo_heure', models.IntegerField(default=8)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notification_preferences',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'verbose_name': 'Préférences notifications', 'verbose_name_plural': 'Préférences notifications'},
        ),
    ]
