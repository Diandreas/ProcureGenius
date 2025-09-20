from django.shortcuts import render
from django.http import JsonResponse


def ai_chat(request):
    """Chat IA simplifié"""
    return JsonResponse({'message': 'AI Chat - Version simplifiée'})


def ai_suggestions(request):
    """Suggestions IA simplifiées"""
    return JsonResponse({'message': 'AI Suggestions - Version simplifiée'})
