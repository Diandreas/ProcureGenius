# -*- coding: utf-8 -*-
"""Remplit les noms figés sur les commandes déjà enregistrées.

Sans cela, l'historique resterait dépendant du catalogue vivant : renommer un
examen aujourd'hui changerait encore les comptes rendus rendus hier.
"""
from django.db import migrations


def remplir(apps, schema_editor):
    LabOrderItem = apps.get_model('laboratory', 'LabOrderItem')
    lignes = LabOrderItem.objects.select_related('lab_test', 'panel').filter(
        lab_test_name=''
    )
    a_ecrire = []
    for l in lignes.iterator():
        l.lab_test_name = getattr(l.lab_test, 'name', '') or ''
        l.panel_name = getattr(l.panel, 'name', '') or '' if l.panel_id else ''
        a_ecrire.append(l)
        if len(a_ecrire) >= 500:
            LabOrderItem.objects.bulk_update(a_ecrire, ['lab_test_name', 'panel_name'])
            a_ecrire = []
    if a_ecrire:
        LabOrderItem.objects.bulk_update(a_ecrire, ['lab_test_name', 'panel_name'])


def vider(apps, schema_editor):
    """Retour arrière : on efface les noms figés, les FK restent intacts."""
    LabOrderItem = apps.get_model('laboratory', 'LabOrderItem')
    LabOrderItem.objects.update(lab_test_name='', panel_name='')


class Migration(migrations.Migration):

    dependencies = [
        ('laboratory', '0031_noms_figes_sur_commande'),
    ]

    operations = [
        migrations.RunPython(remplir, vider),
    ]
