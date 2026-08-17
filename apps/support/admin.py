from django.contrib import admin
from .models import SupportTicket, SupportTicketAttachment


class SupportTicketAttachmentInline(admin.TabularInline):
    model = SupportTicketAttachment
    extra = 0


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ['title', 'organization', 'module', 'category', 'status', 'priority', 'reported_by', 'created_at']
    list_filter = ['organization', 'module', 'category', 'status', 'priority']
    search_fields = ['title', 'description', 'reported_by__username']
    date_hierarchy = 'created_at'
    inlines = [SupportTicketAttachmentInline]
