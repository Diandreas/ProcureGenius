# Generated manually for EmailConfiguration model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_add_currency_and_language_preferences'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailConfiguration',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('smtp_host', models.CharField(max_length=255, verbose_name='Serveur SMTP')),
                ('smtp_port', models.IntegerField(default=587, verbose_name='Port SMTP')),
                ('smtp_username', models.CharField(max_length=255, verbose_name='Nom dutilisateur SMTP')),
                ('smtp_password_encrypted', models.TextField(verbose_name='Mot de passe SMTP (chiffré)')),
                ('use_tls', models.BooleanField(default=True, verbose_name='Utiliser TLS')),
                ('use_ssl', models.BooleanField(default=False, verbose_name='Utiliser SSL')),
                ('default_from_email', models.EmailField(max_length=254, verbose_name='Email expéditeur par défaut')),
                ('default_from_name', models.CharField(max_length=100, verbose_name='Nom expéditeur par défaut')),
                ('is_verified', models.BooleanField(default=False, verbose_name='Vérifié')),
                ('last_verified_at', models.DateTimeField(blank=True, null=True, verbose_name='Dernière vérification')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('organization', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='email_config', to='accounts.organization', verbose_name='Organisation')),
            ],
            options={
                'verbose_name': 'Configuration email',
                'verbose_name_plural': 'Configurations email',
                'ordering': ['-updated_at'],
            },
        ),
    ]
