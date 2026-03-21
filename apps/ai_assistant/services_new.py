"""
Service d'intégration avec Mistral AI avec function calling natif
"""
import os
import json
from typing import Dict, List, Any, Optional
from django.conf import settings
from django.core.cache import cache
from .action_manager import action_manager
import logging

logger = logging.getLogger(__name__)
