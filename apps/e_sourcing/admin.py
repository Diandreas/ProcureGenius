from django.contrib import admin
from .models import SourcingEvent, SupplierInvitation, SupplierBid, BidItem


@admin.register(SourcingEvent)
class SourcingEventAdmin(admin.ModelAdmin):
    list_display = ['event_number', 'title', 'event_type', 'status', 'submission_deadline', 'created_by', 'created_at']
    list_filter = ['status', 'event_type', 'created_at']
    search_fields = ['event_number', 'title', 'description']
    readonly_fields = ['event_number', 'created_at', 'updated_at', 'published_at']
    date_hierarchy = 'created_at'


@admin.register(SupplierInvitation)
class SupplierInvitationAdmin(admin.ModelAdmin):
    list_display = ['sourcing_event', 'supplier', 'status', 'sent_at', 'viewed_at', 'responded_at']
    list_filter = ['status', 'created_at']
    search_fields = ['sourcing_event__event_number', 'supplier__name']
    readonly_fields = ['created_at', 'sent_at', 'viewed_at', 'responded_at']


@admin.register(SupplierBid)
class SupplierBidAdmin(admin.ModelAdmin):
    list_display = ['sourcing_event', 'supplier', 'status', 'total_amount', 'evaluation_score', 'submitted_at']
    list_filter = ['status', 'submitted_at']
    search_fields = ['sourcing_event__event_number', 'supplier__name']
    readonly_fields = ['created_at', 'updated_at', 'submitted_at', 'evaluated_at', 'subtotal', 'total_amount']


@admin.register(BidItem)
class BidItemAdmin(admin.ModelAdmin):
    list_display = ['bid', 'product_reference', 'description', 'quantity', 'unit_price', 'total_price']
    search_fields = ['product_reference', 'description']
    readonly_fields = ['total_price', 'created_at', 'updated_at']
