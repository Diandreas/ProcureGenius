"""
Django settings for saas_procurement project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv()

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-your-secret-key-here')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = ['*']  # À configurer pour production

# Mistral AI Configuration
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY', '4Ck3BnQOXSLJb0SpahFmqUt7mjHm8xsV')
MISTRAL_MODEL = os.getenv('MISTRAL_MODEL', 'mistral-large-latest')

# Note: Tenant support désactivé pour SQLite en développement
# DATABASE_ROUTERS = (
#     'django_tenants.routers.TenantSyncRouter',
# )

# Application definition
TENANT_APPS = [
    # Tenant-specific apps
    'apps.purchase_orders',
    'apps.invoicing',
    'apps.suppliers',
    'apps.analytics',
    'apps.ai_assistant',
    'apps.integrations',
    'apps.core',
    'apps.e_sourcing',
    'apps.contracts',
    'apps.data_migration',
    'apps.reports',
]

SHARED_APPS = [
    # Django core apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',  # Requis pour django-allauth

    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_filters',
    'crispy_forms',
    'crispy_bootstrap5',

    # Authentication avec Google OAuth
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',

    # 'import_export',
    # 'channels',
    # 'django_celery_beat',
    # 'django_celery_results',

    # Local shared apps
    'apps.accounts',
    'apps.subscriptions',  # Système d'abonnement (Free, Standard, Premium)
]

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # 'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',  # Requis pour django-allauth
]

ROOT_URLCONF = 'saas_procurement.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.i18n',
            ],
        },
    },
]

WSGI_APPLICATION = 'saas_procurement.wsgi.application'
ASGI_APPLICATION = 'saas_procurement.asgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Tenant configuration
TENANT_MODEL = "accounts.Tenant"
TENANT_DOMAIN_MODEL = "accounts.Domain"

# Redis configuration for Channels and Celery
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [REDIS_URL],
        },
    },
}

# Celery configuration
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'America/Toronto'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Custom user model
AUTH_USER_MODEL = 'accounts.CustomUser'

# Internationalization
LANGUAGE_CODE = 'fr'
TIME_ZONE = 'America/Toronto'
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ('fr', 'Français'),
    ('en', 'English'),
]

LOCALE_PATHS = [
    BASE_DIR / 'locale',
]

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Crispy Forms
CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
CRISPY_TEMPLATE_PACK = "bootstrap5"

# Authentication configuration (allauth désactivé)
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

LOGIN_URL = '/admin/login/'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'

# Email configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@procuregenius.com')

# Mistral AI configuration
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY', '')

# Google Cloud Speech-to-Text configuration
GOOGLE_CLOUD_PROJECT = os.getenv('GOOGLE_CLOUD_PROJECT', '')
GOOGLE_APPLICATION_CREDENTIALS = os.getenv(
    'GOOGLE_APPLICATION_CREDENTIALS',
    str(BASE_DIR / 'google_credentials' / 'service-account.json')
)

# Configuration pour Google Speech-to-Text
GOOGLE_SPEECH_CONFIG = {
    'language_code': 'fr-FR',  # Code de langue par défaut (français)
    'alternative_language_codes': ['en-US', 'en-CA'],  # Langues alternatives
    'sample_rate_hertz': 48000,  # Taux d'échantillonnage
    'enable_automatic_punctuation': True,  # Ponctuation automatique
    'model': 'default',  # Modèle de reconnaissance ('default', 'latest_long', 'latest_short')
    'use_enhanced': True,  # Utiliser le modèle amélioré si disponible
}

# PayPal configuration
PAYPAL_CLIENT_ID = os.getenv('PAYPAL_CLIENT_ID', '')
PAYPAL_CLIENT_SECRET = os.getenv('PAYPAL_CLIENT_SECRET', '')
PAYPAL_MODE = os.getenv('PAYPAL_MODE', 'sandbox')  # 'sandbox' or 'live'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'apps': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# Security settings for production
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

# ============================================================
# DJANGO-ALLAUTH CONFIGURATION
# ============================================================

# Authentication backends
AUTHENTICATION_BACKENDS = [
    # Django ModelBackend (email/password classique)
    'django.contrib.auth.backends.ModelBackend',
    # django-allauth backend (Google OAuth)
    'allauth.account.auth_backends.AuthenticationBackend',
]

# Site ID pour django.contrib.sites
SITE_ID = 1

# Configuration allauth générale
ACCOUNT_AUTHENTICATION_METHOD = 'email'  # Utiliser email au lieu de username
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'  # Confirmation email obligatoire
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = 3
ACCOUNT_LOGIN_ATTEMPTS_LIMIT = 5
ACCOUNT_LOGIN_ATTEMPTS_TIMEOUT = 300  # 5 minutes

# Redirection après login/logout
LOGIN_REDIRECT_URL = '/dashboard'
ACCOUNT_LOGOUT_REDIRECT_URL = '/login'
ACCOUNT_LOGOUT_ON_GET = False

# Configuration signup
ACCOUNT_SIGNUP_EMAIL_ENTER_TWICE = False
ACCOUNT_SIGNUP_PASSWORD_ENTER_TWICE = True
SOCIALACCOUNT_AUTO_SIGNUP = True  # Auto-signup pour Google OAuth

# Templates emails
ACCOUNT_EMAIL_SUBJECT_PREFIX = '[ProcureGenius] '

# Configuration Google OAuth
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'APP': {
            'client_id': os.getenv('GOOGLE_OAUTH_CLIENT_ID', ''),
            'secret': os.getenv('GOOGLE_OAUTH_CLIENT_SECRET', ''),
            'key': ''
        }
    }
}

# Adapter personnalisé pour gérer la création de UserPreferences et Organization
SOCIALACCOUNT_ADAPTER = 'apps.accounts.adapters.CustomSocialAccountAdapter'
ACCOUNT_ADAPTER = 'apps.accounts.adapters.CustomAccountAdapter'