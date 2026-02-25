"""
Migration : Ajout du modèle PatientFollowUp.
Opération 100 % additive — aucune table existante n'est modifiée.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0003_add_vaccination_physiotherapy_service_types'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='PatientFollowUp',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('chief_complaint', models.TextField(blank=True, help_text="Motif principal de la visite de suivi", verbose_name='Plaintes du jour')),
                ('physical_examination', models.TextField(blank=True, help_text="Résultats de l'examen clinique", verbose_name='Examen physique')),
                ('diagnosis', models.TextField(blank=True, help_text='Diagnostic ou orientation diagnostique', verbose_name='Diagnostic')),
                ('evolution', models.TextField(blank=True, help_text='Évolution par rapport à la dernière visite', verbose_name='Évolution')),
                ('treatment', models.TextField(blank=True, help_text='Traitement prescrit ou examens demandés', verbose_name='Traitement / Examens')),
                ('notes', models.TextField(blank=True, verbose_name='Notes complémentaires')),
                ('temperature', models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True, verbose_name='Température (°C)')),
                ('blood_pressure_systolic', models.IntegerField(blank=True, null=True, verbose_name='Tension systolique (mmHg)')),
                ('blood_pressure_diastolic', models.IntegerField(blank=True, null=True, verbose_name='Tension diastolique (mmHg)')),
                ('heart_rate', models.IntegerField(blank=True, null=True, verbose_name='Fréquence cardiaque (bpm)')),
                ('oxygen_saturation', models.IntegerField(blank=True, null=True, verbose_name='SpO2 (%)')),
                ('respiratory_rate', models.IntegerField(blank=True, null=True, verbose_name='Fréquence respiratoire (cycle/min)')),
                ('weight', models.DecimalField(blank=True, decimal_places=1, max_digits=5, null=True, verbose_name='Poids (kg)')),
                ('blood_glucose', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, verbose_name='Glycémie (mg/dL)')),
                ('follow_up_date', models.DateTimeField(default=django.utils.timezone.now, verbose_name='Date du suivi')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('organization', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='follow_ups',
                    to='accounts.organization',
                    verbose_name='Organisation',
                )),
                ('patient', models.ForeignKey(
                    limit_choices_to={'client_type__in': ['patient', 'both']},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='follow_ups',
                    to='accounts.client',
                    verbose_name='Patient',
                )),
                ('provided_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='patient_follow_ups',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Effectué par',
                )),
                ('visit', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='follow_ups',
                    to='patients.patientvisit',
                    verbose_name='Visite liée',
                )),
            ],
            options={
                'verbose_name': 'Suivi Patient',
                'verbose_name_plural': 'Suivis Patients',
                'ordering': ['-follow_up_date'],
            },
        ),
        migrations.AddIndex(
            model_name='patientfollowup',
            index=models.Index(fields=['patient', '-follow_up_date'], name='patients_followup_pat_date_idx'),
        ),
        migrations.AddIndex(
            model_name='patientfollowup',
            index=models.Index(fields=['organization', '-follow_up_date'], name='patients_followup_org_date_idx'),
        ),
    ]
