from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    # Tableaux de bord
    path('', views.dashboard, name='dashboard'),
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('manager-dashboard/', views.manager_dashboard, name='manager_dashboard'),
    
    # Widgets
    path('widgets/add/', views.add_widget, name='add_widget'),
    path('widgets/<uuid:widget_id>/remove/', views.remove_widget, name='remove_widget'),
    path('widgets/save-layout/', views.save_widget_layout, name='save_widget_layout'),
    
    # Notifications
    path('notifications/', views.notifications, name='notifications'),
    
    # Actions rapides
    path('quick-actions/', views.quick_actions_manage, name='quick_actions_manage'),
]