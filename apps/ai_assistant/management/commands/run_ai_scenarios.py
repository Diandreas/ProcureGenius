import json
import os
import time
import random
import string
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.conf import settings

class Command(BaseCommand):
    help = 'Exécute les scénarios de test pour le module IA'

    def add_arguments(self, parser):
        parser.add_argument(
            '--scenarios',
            type=str,
            default='apps/ai_assistant/tests/scenarios.json',
            help='Chemin vers le fichier JSON des scénarios'
        )
        parser.add_argument(
            '--output',
            type=str,
            default='ai_test_report.md',
            help='Chemin vers le fichier de rapport de sortie'
        )
        parser.add_argument(
            '--user-email',
            type=str,
            default='test@example.com',
            help='Email de l\'utilisateur de test'
        )

    def handle(self, *args, **options):
        scenarios_path = options['scenarios']
        output_path = options['output']
        user_email = options['user_email']

        if not os.path.exists(scenarios_path):
            self.stdout.write(self.style.ERROR(f"Fichier de scénarios non trouvé: {scenarios_path}"))
            return

        with open(scenarios_path, 'r', encoding='utf-8') as f:
            scenarios = json.load(f)

        User = get_user_model()
        user, created = User.objects.get_or_create(email=user_email, defaults={'username': 'testuser'})
        if created:
            user.set_password('password123')
            user.save()

        client = APIClient()
        client.force_authenticate(user=user)

        run_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

        with open(output_path, 'w', encoding='utf-8') as report:
            report.write("# Rapport de Test du Module IA\n\n")
            report.write(f"Date: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            report.write(f"Utilisateur: {user_email}\n")
            report.write(f"Scénarios: {len(scenarios)}\n\n")
            report.write("---\n\n")

            success_count = 0
            total_count = len(scenarios)

            for i, scenario in enumerate(scenarios, 1):
                self.stdout.write(f"Exécution du scénario {i}/{total_count}: {scenario['id']} - {scenario['description']}...")
                
                report.write(f"## Scénario {scenario['id']}: {scenario['description']}\n\n")
                report.write(f"**Section:** {scenario.get('section', 'N/A')}\n\n")
                
                steps = scenario.get('steps', [])
                if not steps and 'input' in scenario:
                    steps = [{'input': scenario['input'], 'expected_output_contains': scenario.get('expected_output_contains', [])}]

                conversation_id = None
                scenario_passed = True
                
                for step_idx, step in enumerate(steps, 1):
                    step_input = step['input'].replace('{random}', run_suffix)
                    
                    report.write(f"**Étape {step_idx}:** `{step_input}`\n\n")
                    
                    start_time = time.time()
                    
                    try:
                        payload = {'message': step_input}
                        if conversation_id:
                            payload['conversation_id'] = conversation_id
                            
                        response = client.post(
                            '/api/v1/ai/chat/',
                            payload,
                            format='json'
                        )
                        
                        duration = time.time() - start_time
                        
                        if response.status_code == 200:
                            data = response.json()
                            
                            # Robustly extract AI response
                            ai_response = data.get('ai_response')
                            if not ai_response and data.get('message'):
                                ai_response = data['message'].get('content', '')
                            if not ai_response:
                                ai_response = ""
                                
                            conversation_id = data.get('conversation_id')
                            
                            report.write(f"**Réponse IA:**\n```\n{ai_response}\n```\n\n")
                            
                            expected = step.get('expected_output_contains', [])
                            step_passed = True
                            missing = []
                            
                            for item in expected:
                                if item.lower() not in ai_response.lower():
                                    step_passed = False
                                    missing.append(item)
                            
                            if not step_passed:
                                scenario_passed = False
                                report.write(f"❌ **ÉCHEC ÉTAPE**: Manquant: {', '.join(missing)}\n\n")
                            else:
                                report.write("✅ **SUCCÈS ÉTAPE**\n\n")
                                
                        else:
                            scenario_passed = False
                            report.write(f"❌ **ERREUR API**: {response.status_code}\n\n")
                            
                    except Exception as e:
                        scenario_passed = False
                        report.write(f"❌ **EXCEPTION**: {str(e)}\n\n")
                    
                    time.sleep(0.5)

                if scenario_passed:
                    success_count += 1
                    report.write("✅ **RÉSULTAT SCÉNARIO: SUCCÈS**\n\n")
                    self.stdout.write(self.style.SUCCESS("  -> SUCCÈS"))
                else:
                    report.write("❌ **RÉSULTAT SCÉNARIO: ÉCHEC**\n\n")
                    self.stdout.write(self.style.ERROR("  -> ÉCHEC"))

                report.write("---\n\n")

            report.write(f"# Résumé\n\n")
            report.write(f"- Total: {total_count}\n")
            report.write(f"- Succès: {success_count}\n")
            report.write(f"- Échecs: {total_count - success_count}\n")
            
            self.stdout.write(self.style.SUCCESS(f"\nTerminé. Rapport généré: {output_path}"))
