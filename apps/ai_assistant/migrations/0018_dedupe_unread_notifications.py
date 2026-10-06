# Déduplique les notifications IA non lues existantes, puis pose une
# contrainte d'unicité partielle (user, title) sur les non-lues pour empêcher
# les rafales de doublons créées par des requêtes concurrentes.
from django.db import migrations, models


def dedupe_unread(apps, schema_editor):
    AINotification = apps.get_model('ai_assistant', 'AINotification')
    seen = set()
    to_delete = []
    # Du plus récent au plus ancien : on garde la première occurrence vue.
    for notif in (
        AINotification.objects.filter(is_read=False)
        .order_by('-created_at')
        .only('id', 'user_id', 'title')
        .iterator()
    ):
        key = (notif.user_id, notif.title)
        if key in seen:
            to_delete.append(notif.id)
        else:
            seen.add(key)
    if to_delete:
        AINotification.objects.filter(id__in=to_delete).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('ai_assistant', '0017_messagefeedback_and_more'),
    ]

    operations = [
        migrations.RunPython(dedupe_unread, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='ainotification',
            constraint=models.UniqueConstraint(
                fields=['user', 'title'],
                condition=models.Q(is_read=False),
                name='uniq_unread_ainotif_user_title',
            ),
        ),
    ]
