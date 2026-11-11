# -*- coding: utf-8 -*-
"""Remplit les noms figés sur les commandes d'imagerie déjà enregistrées."""
from django.db import migrations


def remplir(apps, schema_editor):
    ImagingOrderItem = apps.get_model('imaging', 'ImagingOrderItem')
    lignes = ImagingOrderItem.objects.select_related('exam_type', 'panel').filter(
        exam_type_name=''
    )
    a_ecrire = []
    for l in lignes.iterator():
        l.exam_type_name = getattr(l.exam_type, 'name', '') or ''
        l.panel_name = getattr(l.panel, 'name', '') or '' if l.panel_id else ''
        a_ecrire.append(l)
        if len(a_ecrire) >= 500:
            ImagingOrderItem.objects.bulk_update(a_ecrire, ['exam_type_name', 'panel_name'])
            a_ecrire = []
    if a_ecrire:
        ImagingOrderItem.objects.bulk_update(a_ecrire, ['exam_type_name', 'panel_name'])


def vider(apps, schema_editor):
    ImagingOrderItem = apps.get_model('imaging', 'ImagingOrderItem')
    ImagingOrderItem.objects.update(exam_type_name='', panel_name='')


class Migration(migrations.Migration):

    dependencies = [
        ('imaging', '0003_noms_figes_sur_commande'),
    ]

    operations = [
        migrations.RunPython(remplir, vider),
    ]
