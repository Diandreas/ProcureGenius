import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')

app = Celery('saas_procurement')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Periodic tasks (Celery Beat)
app.conf.beat_schedule = {
    'send-weekly-reports': {
        'task': 'analytics.send_weekly_reports',
        'schedule': crontab(hour=7, minute=0, day_of_week=1),  # Monday 7h
        'options': {'queue': 'reports'},
    },
    'check-batch-expiry-alerts': {
        'task': 'analytics.check_batch_expiry_alerts',
        'schedule': crontab(hour=8, minute=0),  # Daily 8h
        'options': {'queue': 'alerts'},
    },
    'check-predictive-stockout-alerts': {
        'task': 'analytics.check_predictive_stockout_alerts',
        'schedule': crontab(hour=8, minute=30),  # Daily 8h30
        'options': {'queue': 'alerts'},
    },
}


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
