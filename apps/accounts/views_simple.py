from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from .models import CustomUser, UserPreferences


def profile(request):
    """Profil utilisateur simplifié"""
    if request.user.is_authenticated:
        return render(request, 'accounts/profile.html', {
            'user': request.user
        })
    return redirect('login')


def dashboard(request):
    """Tableau de bord simplifié"""
    if request.user.is_authenticated:
        return render(request, 'core/dashboard.html', {
            'user': request.user
        })
    return redirect('login')


def api_profile(request):
    """API profil utilisateur"""
    if request.user.is_authenticated:
        return JsonResponse({
            'id': str(request.user.id),
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'role': request.user.role,
            'language': request.user.language,
        })
    return JsonResponse({'error': 'Non authentifié'}, status=401)
