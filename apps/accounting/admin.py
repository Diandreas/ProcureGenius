from django.contrib import admin
from .models import Account, AccountingJournal, JournalEntry, JournalEntryLine


class AccountAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'account_type', 'parent', 'is_active', 'is_system', 'organization']
    list_filter = ['account_type', 'is_active', 'is_system', 'organization']
    search_fields = ['code', 'name']
    ordering = ['code']


class JournalEntryLineInline(admin.TabularInline):
    model = JournalEntryLine
    extra = 0
    fields = ['account', 'description', 'debit', 'credit']


class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ['entry_number', 'date', 'description', 'journal', 'status', 'source', 'organization']
    list_filter = ['status', 'source', 'journal', 'organization']
    search_fields = ['entry_number', 'description', 'reference']
    inlines = [JournalEntryLineInline]
    readonly_fields = ['entry_number', 'created_at', 'updated_at']


admin.site.register(Account, AccountAdmin)
admin.site.register(AccountingJournal)
admin.site.register(JournalEntry, JournalEntryAdmin)
