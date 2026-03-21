"""
Commande pour créer les modèles de contrats pré-construits
"""
from django.core.management.base import BaseCommand
from apps.contracts.models import ContractTemplate


TEMPLATES = [
    {
        "name": "Accord de confidentialité (NDA)",
        "template_type": "nda",
        "description": "Protège les informations confidentielles partagées entre les parties. Idéal avant une négociation commerciale ou un partenariat.",
        "content": """ACCORD DE CONFIDENTIALITÉ ET DE NON-DIVULGATION

Entre les soussignés :

[NOM DE VOTRE ORGANISATION], ci-après désignée « la Partie Divulgatrice »

Et

[NOM DE LA CONTREPARTIE], ci-après désignée « la Partie Réceptrice »

ARTICLE 1 – OBJET
Le présent accord a pour objet de définir les conditions dans lesquelles des informations confidentielles peuvent être échangées entre les parties dans le cadre de [décrire le contexte].

ARTICLE 2 – DÉFINITION DES INFORMATIONS CONFIDENTIELLES
Sont considérées comme confidentielles toutes les informations, données, documents, savoir-faire techniques ou commerciaux, financiers ou stratégiques, communiqués par l'une des parties à l'autre, sous quelque forme que ce soit (écrite, orale, électronique).

ARTICLE 3 – OBLIGATIONS DE CONFIDENTIALITÉ
La Partie Réceptrice s'engage à :
3.1 Garder strictement confidentielles toutes les informations reçues ;
3.2 Ne pas divulguer ces informations à des tiers sans l'accord préalable écrit de la Partie Divulgatrice ;
3.3 N'utiliser ces informations qu'aux fins prévues par le présent accord ;
3.4 Protéger ces informations avec le même niveau de soin qu'elle accorde à ses propres informations confidentielles.

ARTICLE 4 – EXCEPTIONS
Les obligations de confidentialité ne s'appliquent pas aux informations qui :
- Étaient dans le domaine public avant leur communication ;
- Deviennent publiques sans faute de la Partie Réceptrice ;
- Étaient déjà connues de la Partie Réceptrice avant leur communication.

ARTICLE 5 – DURÉE
Le présent accord est conclu pour une durée de [durée] à compter de sa signature. Les obligations de confidentialité survivent à l'expiration du présent accord pour une période de [durée supplémentaire].

ARTICLE 6 – SANCTIONS
Tout manquement aux obligations du présent accord pourra entraîner des poursuites judiciaires et donnera droit à des dommages et intérêts.

ARTICLE 7 – LOI APPLICABLE
Le présent accord est soumis à la législation de la province de Québec et aux lois du Canada.

Fait à ____________, le ____________
""",
        "ai_prompt_instructions": "Génère un NDA adapté au contexte québécois/canadien. Assure-toi d'inclure les clauses de confidentialité, les exceptions, la durée et les sanctions.",
    },
    {
        "name": "Contrat de service professionnel",
        "template_type": "service",
        "description": "Pour la prestation de services professionnels (consultation, design, développement, etc.). Définit les livrables, délais et modalités de paiement.",
        "content": """CONTRAT DE PRESTATION DE SERVICES

Entre :

[NOM DE VOTRE ORGANISATION], prestataire de services, ci-après « le Prestataire »

Et

[NOM DU CLIENT], ci-après « le Client »

ARTICLE 1 – OBJET DU CONTRAT
Le Prestataire s'engage à fournir au Client les services suivants :
[Description détaillée des services]

ARTICLE 2 – LIVRABLES
Les livrables attendus sont les suivants :
- [Livrable 1] – Échéance : [date]
- [Livrable 2] – Échéance : [date]
- [Livrable 3] – Échéance : [date]

ARTICLE 3 – DURÉE
Le présent contrat prend effet le [date de début] et se termine le [date de fin], sauf résiliation anticipée.

ARTICLE 4 – RÉMUNÉRATION ET MODALITÉS DE PAIEMENT
4.1 Honoraires : [montant] $ CAD
4.2 Modalités de paiement :
    - 50% à la signature du présent contrat
    - 50% à la livraison finale acceptée par le Client
4.3 Facturation : Les factures sont payables dans un délai de 30 jours.
4.4 Retard de paiement : Des frais de 1,5% par mois s'appliquent aux montants en retard.

ARTICLE 5 – PROPRIÉTÉ INTELLECTUELLE
5.1 Tous les livrables produits dans le cadre de ce contrat deviennent la propriété du Client après paiement intégral.
5.2 Le Prestataire conserve le droit de référencer ce projet dans son portfolio, sauf accord contraire.

ARTICLE 6 – CONFIDENTIALITÉ
Chaque partie s'engage à ne pas divulguer les informations confidentielles de l'autre partie.

ARTICLE 7 – RESPONSABILITÉS
7.1 Le Prestataire s'engage à réaliser les services avec diligence et professionnalisme.
7.2 La responsabilité du Prestataire est limitée au montant des honoraires perçus.

ARTICLE 8 – RÉSILIATION
8.1 Chaque partie peut résilier le présent contrat avec un préavis de [délai] jours.
8.2 En cas de résiliation, le Client paie les services réalisés jusqu'à la date effective.

ARTICLE 9 – LOI APPLICABLE
Ce contrat est régi par les lois de la province de Québec.

Fait à ____________, le ____________
""",
        "ai_prompt_instructions": "Génère un contrat de service adapté. Include les livrables spécifiques, les délais, les conditions de paiement et les clauses de propriété intellectuelle.",
    },
    {
        "name": "Contrat de maintenance",
        "template_type": "maintenance",
        "description": "Pour des services de maintenance récurrents (informatique, équipement, bâtiment, etc.). Inclut les niveaux de service (SLA).",
        "content": """CONTRAT DE MAINTENANCE

Entre :

[NOM DE VOTRE ORGANISATION], ci-après « le Prestataire »

Et

[NOM DU CLIENT], ci-après « le Client »

ARTICLE 1 – OBJET
Le Prestataire fournit au Client des services de maintenance pour :
[Description des équipements/systèmes concernés]

ARTICLE 2 – ÉTENDUE DES SERVICES
2.1 Services inclus :
    - Maintenance préventive : [fréquence] par [période]
    - Maintenance corrective sur appel
    - Mises à jour et correctifs
    - [Autres services]
2.2 Services exclus :
    - Réparations dues à une mauvaise utilisation
    - Remplacement de pièces usées normalement

ARTICLE 3 – NIVEAUX DE SERVICE (SLA)
3.1 Temps de réponse pour incidents critiques : [délai] heures
3.2 Temps de réponse pour incidents normaux : [délai] heures ouvrables
3.3 Disponibilité garantie : [pourcentage]%

ARTICLE 4 – HORAIRES D'INTERVENTION
Les interventions ont lieu du lundi au vendredi, de [heure] à [heure].
Service d'urgence disponible : [Oui/Non]

ARTICLE 5 – DURÉE ET RENOUVELLEMENT
Le présent contrat est conclu pour une durée de [durée] avec renouvellement automatique sauf préavis de [délai] jours.

ARTICLE 6 – RÉMUNÉRATION
6.1 Forfait mensuel : [montant] $ CAD / mois
6.2 Facturation : mensuelle, le premier de chaque mois
6.3 Révision annuelle des tarifs selon l'indice des prix à la consommation

ARTICLE 7 – OBLIGATIONS DU CLIENT
Le Client s'engage à :
- Faciliter l'accès aux équipements lors des interventions ;
- Signaler tout incident dans les meilleurs délais ;
- Ne pas modifier les équipements sans accord préalable.

ARTICLE 8 – LOI APPLICABLE
Ce contrat est régi par les lois de la province de Québec.

Fait à ____________, le ____________
""",
        "ai_prompt_instructions": "Génère un contrat de maintenance avec les niveaux de service appropriés au contexte, les fréquences d'intervention et les exclusions.",
    },
    {
        "name": "Contrat de consultation",
        "template_type": "consulting",
        "description": "Pour des missions de conseil stratégique, audit, ou expertise. Idéal pour les consultants indépendants et firmes de conseil.",
        "content": """CONTRAT DE CONSULTATION

Entre :

[NOM DU CONSULTANT / FIRME], ci-après « le Consultant »

Et

[NOM DU CLIENT], ci-après « le Client »

ARTICLE 1 – MISSION
Le Consultant est mandaté pour réaliser la mission suivante :
[Description détaillée de la mission de consultation]

ARTICLE 2 – LIVRABLES ET RAPPORT FINAL
2.1 Le Consultant produira les livrables suivants :
    - [Livrable 1]
    - [Livrable 2]
    - Rapport final de consultation
2.2 Le rapport final sera remis au plus tard le [date].

ARTICLE 3 – DURÉE DE LA MISSION
La mission débute le [date] et se termine le [date].

ARTICLE 4 – HONORAIRES
4.1 Mode de facturation : [Taux journalier / Forfait]
4.2 Taux journalier : [montant] $ CAD / jour
   OU Forfait total : [montant] $ CAD
4.3 Frais de déplacement : remboursés sur présentation de justificatifs

ARTICLE 5 – MODALITÉS DE PAIEMENT
- 30% à la signature
- 40% à mi-parcours (livraison des premiers résultats)
- 30% à la remise du rapport final

ARTICLE 6 – INDÉPENDANCE DU CONSULTANT
Le Consultant exerce sa mission en toute indépendance. Il n'est pas salarié du Client et demeure seul responsable de l'organisation de son travail.

ARTICLE 7 – CONFIDENTIALITÉ
Le Consultant s'engage à maintenir la confidentialité de toutes les informations auxquelles il aura accès dans le cadre de cette mission.

ARTICLE 8 – CONFLIT D'INTÉRÊTS
Le Consultant déclare ne pas avoir de conflit d'intérêts avec le Client et s'engage à déclarer tout conflit potentiel qui surviendrait.

ARTICLE 9 – LOI APPLICABLE
Ce contrat est régi par les lois de la province de Québec.

Fait à ____________, le ____________
""",
        "ai_prompt_instructions": "Génère un contrat de consultation avec les livrables, la méthode de facturation et les clauses d'indépendance appropriées.",
    },
    {
        "name": "Accord de partenariat",
        "template_type": "partnership",
        "description": "Pour formaliser une collaboration entre deux organisations. Définit les rôles, responsabilités, partage des revenus et gouvernance.",
        "content": """ACCORD DE PARTENARIAT COMMERCIAL

Entre :

[NOM DE L'ORGANISATION 1], ci-après « Partenaire A »

Et

[NOM DE L'ORGANISATION 2], ci-après « Partenaire B »

ARTICLE 1 – OBJET DU PARTENARIAT
Les parties s'associent pour [description de l'objet du partenariat].

ARTICLE 2 – DURÉE
Le présent accord est conclu pour une durée de [durée] renouvelable par tacite reconduction.

ARTICLE 3 – RÔLES ET RESPONSABILITÉS
3.1 Partenaire A s'engage à :
    - [Responsabilité 1]
    - [Responsabilité 2]
3.2 Partenaire B s'engage à :
    - [Responsabilité 1]
    - [Responsabilité 2]

ARTICLE 4 – PARTAGE DES REVENUS ET DES COÛTS
4.1 Les revenus générés par le partenariat seront partagés comme suit :
    - Partenaire A : [pourcentage]%
    - Partenaire B : [pourcentage]%
4.2 Les coûts opérationnels seront partagés proportionnellement.

ARTICLE 5 – GOUVERNANCE
5.1 Les décisions importantes requièrent l'accord des deux parties.
5.2 Un comité de pilotage se réunit [fréquence].

ARTICLE 6 – PROPRIÉTÉ INTELLECTUELLE
6.1 Chaque partie conserve la propriété de ses actifs intellectuels existants.
6.2 Les créations communes appartiennent aux deux parties à parts égales.

ARTICLE 7 – EXCLUSIVITÉ
[Préciser si le partenariat est exclusif ou non dans son domaine d'application]

ARTICLE 8 – RÉSILIATION
8.1 Chaque partie peut mettre fin au partenariat avec un préavis de [délai] mois.
8.2 Les actifs communs seront partagés équitablement en cas de dissolution.

ARTICLE 9 – LOI APPLICABLE
Ce contrat est régi par les lois de la province de Québec.

Fait à ____________, le ____________
""",
        "ai_prompt_instructions": "Génère un accord de partenariat équilibré avec les rôles, le partage des revenus, la gouvernance et les clauses de sortie.",
    },
    {
        "name": "Contrat de location d'espace",
        "template_type": "lease",
        "description": "Pour la location de locaux commerciaux ou d'équipements. Inclut les conditions d'occupation, loyer et responsabilités.",
        "content": """CONTRAT DE LOCATION

Entre :

[NOM DU PROPRIÉTAIRE], ci-après « le Bailleur »

Et

[NOM DU LOCATAIRE], ci-après « le Locataire »

ARTICLE 1 – OBJET
Le Bailleur loue au Locataire le bien suivant :
[Description précise du bien loué : adresse, superficie, état, équipements inclus]

ARTICLE 2 – DURÉE
Le présent bail est conclu pour une durée de [durée] à compter du [date de début].

ARTICLE 3 – LOYER ET CHARGES
3.1 Loyer mensuel : [montant] $ CAD, payable le [jour] de chaque mois
3.2 Dépôt de garantie : [montant] $ CAD (remboursable en fin de bail)
3.3 Charges incluses : [liste des charges incluses]
3.4 Charges exclues à la charge du Locataire : [liste]

ARTICLE 4 – UTILISATION DES LOCAUX
4.1 Les locaux sont destinés à usage [commercial / professionnel / autre].
4.2 Le Locataire ne peut sous-louer sans accord préalable du Bailleur.

ARTICLE 5 – ÉTAT DES LIEUX
Un état des lieux contradictoire sera effectué à l'entrée et à la sortie.

ARTICLE 6 – ENTRETIEN ET RÉPARATIONS
6.1 Entretien courant : à la charge du Locataire
6.2 Grosses réparations : à la charge du Bailleur

ARTICLE 7 – ASSURANCES
Le Locataire s'engage à souscrire une assurance responsabilité civile pour les locaux loués.

ARTICLE 8 – RÉSILIATION
8.1 Préavis requis : [délai] mois
8.2 En cas de non-paiement, le Bailleur peut résilier après mise en demeure.

ARTICLE 9 – LOI APPLICABLE
Ce contrat est régi par le Code civil du Québec.

Fait à ____________, le ____________
""",
        "ai_prompt_instructions": "Génère un contrat de location adapté au droit québécois avec les clauses de loyer, d'entretien et de résiliation appropriées.",
    },
    {
        "name": "Contrat d'achat de biens",
        "template_type": "purchase",
        "description": "Pour l'achat de biens ou de marchandises. Définit les spécifications, quantités, prix, livraison et garanties.",
        "content": """CONTRAT D'ACHAT DE BIENS

Entre :

[NOM DE L'ACHETEUR], ci-après « l'Acheteur »

Et

[NOM DU VENDEUR / FOURNISSEUR], ci-après « le Vendeur »

ARTICLE 1 – OBJET
Le Vendeur s'engage à livrer à l'Acheteur les biens suivants :
[Description détaillée des biens, spécifications techniques, quantités]

ARTICLE 2 – PRIX ET CONDITIONS DE PAIEMENT
2.1 Prix total : [montant] $ CAD, taxes applicables en sus
2.2 Modalités de paiement : [modalités]
2.3 Escompte pour paiement anticipé : [pourcentage]% si paiement dans [délai] jours

ARTICLE 3 – LIVRAISON
3.1 Lieu de livraison : [adresse]
3.2 Date de livraison prévue : [date]
3.3 Frais de livraison : [inclus / à la charge de l'Acheteur]
3.4 Risques : transfert à la livraison

ARTICLE 4 – INSPECTION ET ACCEPTATION
4.1 L'Acheteur dispose de [délai] jours pour inspecter les biens à réception.
4.2 Tout défaut doit être signalé par écrit dans ce délai.

ARTICLE 5 – GARANTIES
5.1 Le Vendeur garantit que les biens sont conformes aux spécifications.
5.2 Durée de la garantie : [durée] à compter de la livraison.
5.3 En cas de non-conformité, le Vendeur remplacera ou remboursera les biens défectueux.

ARTICLE 6 – PROPRIÉTÉ
La propriété des biens est transférée à l'Acheteur après paiement intégral.

ARTICLE 7 – FORCE MAJEURE
Aucune partie n'est responsable en cas de force majeure empêchant l'exécution du contrat.

ARTICLE 8 – LOI APPLICABLE
Ce contrat est régi par les lois de la province de Québec.

Fait à ____________, le ____________
""",
        "ai_prompt_instructions": "Génère un contrat d'achat avec les spécifications des biens, les conditions de livraison, de paiement et les garanties appropriées.",
    },
]


class Command(BaseCommand):
    help = "Crée les modèles de contrats pré-construits"

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for tpl_data in TEMPLATES:
            obj, was_created = ContractTemplate.objects.update_or_create(
                name=tpl_data["name"],
                defaults={
                    "template_type": tpl_data["template_type"],
                    "description": tpl_data["description"],
                    "content": tpl_data["content"],
                    "ai_prompt_instructions": tpl_data.get("ai_prompt_instructions", ""),
                    "is_active": True,
                }
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"  [OK] Cree: {obj.name}"))
            else:
                updated += 1
                self.stdout.write(f"  [~] Mis a jour: {obj.name}")

        self.stdout.write(self.style.SUCCESS(
            f"\n{created} modeles crees, {updated} mis a jour."
        ))
