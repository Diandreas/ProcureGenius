from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/ai-chat/(?P<conversation_id>[0-9a-f-]+)/$', consumers.AIChatConsumer.as_asgi()),
    re_path(r'ws/ai-notifications/$', consumers.AINotificationConsumer.as_asgi()),
]