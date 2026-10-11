"""
Créations idempotentes pour la file hors ligne de l'app.

L'app envoie un en-tête « Idempotency-Key » (UUID) avec chaque création. Si la même clé revient
(réponse perdue sur un réseau instable, synchro relancée, deuxième onglet), on renvoie l'objet
déjà créé au lieu d'en créer un doublon. Sans en-tête, rien ne change.
"""
from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.response import Response

from .models import IdempotencyKey


class IdempotentCreateMixin:
    def create(self, request, *args, **kwargs):
        key = (request.headers.get('Idempotency-Key') or '').strip()[:64]
        user = request.user
        if not key or not getattr(user, 'is_authenticated', False):
            return super().create(request, *args, **kwargs)

        done = IdempotencyKey.objects.filter(user=user, key=key).first()
        if done:
            return self._idempotent_replay(done)
        try:
            with transaction.atomic():
                response = super().create(request, *args, **kwargs)
                obj_id = response.data.get('id') if isinstance(response.data, dict) else None
                if 200 <= response.status_code < 300 and obj_id:
                    IdempotencyKey.objects.create(
                        user=user, key=key, scope=getattr(self, 'basename', '') or '', object_id=str(obj_id),
                    )
                return response
        except IntegrityError:
            # Deux requêtes identiques en même temps : la seconde a perdu la course
            done = IdempotencyKey.objects.filter(user=user, key=key).first()
            if done:
                return self._idempotent_replay(done)
            raise

    def _idempotent_replay(self, done):
        obj = self.get_queryset().filter(pk=done.object_id).first()
        headers = {'Idempotent-Replay': 'true'}
        if obj is None:
            # Créé puis supprimé depuis : la création a bien eu lieu, rien à refaire
            return Response({'id': done.object_id, 'deleted': True}, status=status.HTTP_200_OK, headers=headers)
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK, headers=headers)
