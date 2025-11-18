#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script pour ajouter {% load invoice_filters %} aux templates HTML"""
import os
import sys
import glob

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

templates_dir = 'templates/invoicing/pdf_templates'

for template_file in glob.glob(f'{templates_dir}/*.html'):
    with open(template_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Ajouter {% load invoice_filters %} au début si pas déjà présent
    if '{% load invoice_filters %}' not in content:
        content = '{% load invoice_filters %}' + content

        with open(template_file, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"OK {template_file}")

print("OK Templates mis a jour")
