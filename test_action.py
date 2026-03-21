import os
import django
import asyncio
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

from apps.ai_assistant.services import ActionExecutor, AsyncSafeUserContext
from django.contrib.auth import get_user_model

User = get_user_model()

from asgiref.sync import async_to_sync

def test():
    user = User.objects.first()
    user_context = AsyncSafeUserContext.from_user(user)
    
    executor = ActionExecutor()
    res = async_to_sync(executor.execute)(
        action='create_supplier',
        params={'name': 'TechCorp', 'email': 'contact@techcorp.com'},
        user=user_context
    )
    print("==================RESULT==================")
    print(res)

if __name__ == '__main__':
    test()
