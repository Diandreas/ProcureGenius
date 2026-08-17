"""
URL patterns for Support (SAV) app
"""
from django.urls import path
from . import api

app_name = 'support'

urlpatterns = [
    path('tickets/', api.SupportTicketCreateView.as_view(), name='ticket-create'),
    path('tickets/list/', api.SupportTicketListView.as_view(), name='ticket-list'),
    path('tickets/mine/', api.MySupportTicketsView.as_view(), name='ticket-mine'),
    path('tickets/<uuid:pk>/', api.SupportTicketDetailView.as_view(), name='ticket-detail'),
]
