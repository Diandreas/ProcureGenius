"""
WSGI config for saas_procurement project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')

application = get_wsgi_application()