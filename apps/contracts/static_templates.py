# -*- coding: utf-8 -*-
"""
Templates statiques HTML pour chaque type de section de contrat.
Utilisés comme contenu par défaut quand les sections sont créées.
L'IA ne régénère que les sections que l'utilisateur veut personnaliser.

Les variables {{variable}} seront substituées côté backend ou frontend
avec les données réelles du contrat.
"""

# ======================================================================
# Textes par défaut par type de section
# Utilisables par TOUS les types de contrats
# ======================================================================

DEFAULT_SECTION_CONTENT = {
    'parties': (
        '<p><strong>ENTRE :</strong></p>'
        '<p>{{organization_name}}, dont le siège social est situé au {{organization_address}}, '
        'représentée par son représentant dûment autorisé,</p>'
        '<p>Ci-après dénommée <strong>« la Partie A »</strong> ou <strong>« le Donneur d\'ordre »</strong>,</p>'
        '<p><strong>ET :</strong></p>'
        '<p>{{counterpart_name}}, dont le siège social est situé au {{counterpart_address}}, '
        'représentée par son représentant dûment autorisé,</p>'
        '<p>Ci-après dénommée <strong>« la Partie B »</strong> ou <strong>« le Prestataire »</strong>,</p>'
        '<p>Ci-après désignées collectivement <strong>« les Parties »</strong> et individuellement <strong>« une Partie »</strong>.</p>'
    ),

    'object': (
        '<p>Le présent contrat a pour objet de définir les conditions dans lesquelles '
        'la Partie B s\'engage à fournir à la Partie A les prestations décrites ci-après.</p>'
        '<p><strong>Description des prestations :</strong></p>'
        '<p>{{description}}</p>'
        '<p>Les Parties conviennent que toute modification de l\'objet du présent contrat '
        'devra faire l\'objet d\'un avenant écrit signé par les deux Parties.</p>'
    ),

    'duration': (
        '<p>Le présent contrat prend effet à compter du <strong>{{start_date}}</strong> '
        'et est conclu pour une durée déterminée jusqu\'au <strong>{{end_date}}</strong>.</p>'
        '<p>À l\'expiration de cette période, le contrat pourra être renouvelé par accord '
        'exprès des Parties, formalisé par un avenant écrit.</p>'
        '<p>Chaque Partie pourra s\'opposer au renouvellement en notifiant l\'autre Partie '
        'par lettre recommandée avec accusé de réception, dans un délai de trente (30) jours '
        'avant la date d\'expiration.</p>'
    ),

    'obligations_provider': (
        '<p>La Partie B s\'engage à :</p>'
        '<ul>'
        '<li>Exécuter les prestations objet du présent contrat avec diligence et professionnalisme, '
        'conformément aux règles de l\'art et aux normes applicables ;</li>'
        '<li>Affecter à l\'exécution des prestations du personnel qualifié disposant des compétences requises ;</li>'
        '<li>Respecter les délais convenus et informer la Partie A sans délai de toute difficulté susceptible '
        'd\'affecter l\'exécution du contrat ;</li>'
        '<li>Remettre à la Partie A tous les livrables et documents prévus au contrat ;</li>'
        '<li>Respecter les obligations de confidentialité prévues au présent contrat.</li>'
        '</ul>'
    ),

    'obligations_client': (
        '<p>La Partie A s\'engage à :</p>'
        '<ul>'
        '<li>Fournir à la Partie B toutes les informations et documents nécessaires à la bonne exécution des prestations ;</li>'
        '<li>Désigner un interlocuteur unique chargé de coordonner les échanges avec la Partie B ;</li>'
        '<li>Procéder au paiement des prestations conformément aux conditions financières prévues au contrat ;</li>'
        '<li>Faciliter l\'accès de la Partie B aux locaux et équipements nécessaires, le cas échéant ;</li>'
        '<li>Valider les livrables dans un délai raisonnable suivant leur remise.</li>'
        '</ul>'
    ),

    'financial': (
        '<p>En contrepartie de l\'exécution des prestations prévues au présent contrat, '
        'la Partie A versera à la Partie B la somme totale de <strong>{{total_value}} {{currency}}</strong>, '
        'hors taxes.</p>'
        '<p>Ce montant comprend l\'ensemble des frais liés à l\'exécution des prestations, '
        'sauf stipulation contraire expressément prévue au présent contrat.</p>'
        '<p>Les prix sont fermes et non révisables pendant la durée du contrat, '
        'sauf accord écrit des Parties.</p>'
    ),

    'payment_terms': (
        '<p>Les paiements seront effectués selon les modalités suivantes :</p>'
        '<p>{{payment_terms}}</p>'
        '<p>Les factures devront être adressées à la Partie A et seront payables dans un délai '
        'de trente (30) jours à compter de leur réception.</p>'
        '<p>En cas de retard de paiement, des pénalités de retard seront appliquées au taux légal '
        'en vigueur, sans qu\'un rappel soit nécessaire.</p>'
    ),

    'delivery': (
        '<p>La Partie B s\'engage à livrer les biens ou prestations conformément au calendrier convenu entre les Parties.</p>'
        '<p>La livraison est réputée effectuée à la date de réception par la Partie A, confirmée par un procès-verbal '
        'de réception signé par les deux Parties.</p>'
        '<p>Tout retard de livraison non justifié par un cas de force majeure pourra donner lieu à l\'application '
        'de pénalités de retard d\'un montant de un pour cent (1%) du montant total par semaine de retard, '
        'plafonnées à dix pour cent (10%) du montant total du contrat.</p>'
    ),

    'intellectual_property': (
        '<p>Sauf disposition contraire expressément prévue, chaque Partie conserve la propriété '
        'de ses droits de propriété intellectuelle préexistants.</p>'
        '<p>Les créations, développements et livrables réalisés dans le cadre du présent contrat '
        'seront la propriété exclusive de la Partie A dès leur paiement intégral.</p>'
        '<p>La Partie B garantit que les prestations et livrables ne portent pas atteinte aux droits '
        'de propriété intellectuelle de tiers et s\'engage à indemniser la Partie A de tout '
        'préjudice résultant d\'une éventuelle contrefaçon.</p>'
    ),

    'acceptance': (
        '<p>Les livrables seront soumis à une procédure de vérification et d\'acceptation par la Partie A.</p>'
        '<p>La Partie A disposera d\'un délai de quinze (15) jours ouvrables à compter de la livraison '
        'pour procéder à la vérification et notifier par écrit son acceptation ou ses réserves motivées.</p>'
        '<p>En l\'absence de notification dans ce délai, les livrables seront réputés acceptés.</p>'
        '<p>En cas de réserves, la Partie B disposera d\'un délai raisonnable pour procéder aux corrections nécessaires.</p>'
    ),

    'subcontracting': (
        '<p>La Partie B ne pourra sous-traiter tout ou partie des prestations objet du présent contrat '
        'sans l\'accord préalable et écrit de la Partie A.</p>'
        '<p>En cas de sous-traitance autorisée, la Partie B demeure seule responsable de la bonne '
        'exécution des prestations vis-à-vis de la Partie A.</p>'
        '<p>La Partie B s\'engage à faire respecter par ses sous-traitants l\'ensemble des obligations '
        'prévues au présent contrat, notamment en matière de confidentialité.</p>'
    ),

    'warranty': (
        '<p>La Partie B garantit que les prestations et livrables fournis seront conformes aux '
        'spécifications convenues et exempts de tout défaut.</p>'
        '<p>Cette garantie est valable pendant une durée de douze (12) mois à compter de la date '
        'd\'acceptation des livrables.</p>'
        '<p>En cas de non-conformité ou de défaut constaté pendant la période de garantie, '
        'la Partie B s\'engage à procéder aux corrections nécessaires à ses frais et dans un délai raisonnable.</p>'
    ),

    'liability': (
        '<p>Chaque Partie est responsable des dommages directs causés à l\'autre Partie résultant '
        'd\'un manquement à ses obligations contractuelles.</p>'
        '<p>La responsabilité de chaque Partie au titre du présent contrat est limitée au montant '
        'total du contrat, soit <strong>{{total_value}} {{currency}}</strong>.</p>'
        '<p>En aucun cas, une Partie ne pourra être tenue responsable des dommages indirects, '
        'tels que la perte de bénéfices, la perte de données ou le manque à gagner.</p>'
        '<p>Les limitations de responsabilité prévues au présent article ne s\'appliquent pas '
        'en cas de faute lourde, de dol ou de violation des obligations de confidentialité.</p>'
    ),

    'confidentiality': (
        '<p>Chaque Partie s\'engage à garder strictement confidentielles toutes les informations '
        'de nature commerciale, technique, financière ou stratégique communiquées par l\'autre Partie '
        'dans le cadre du présent contrat.</p>'
        '<p>Cette obligation de confidentialité s\'applique pendant toute la durée du contrat et '
        'pendant une période de trois (3) ans après son expiration ou sa résiliation.</p>'
        '<p>Ne sont pas considérées comme confidentielles les informations :</p>'
        '<ul>'
        '<li>Qui sont ou deviennent publiquement disponibles sans violation du présent contrat ;</li>'
        '<li>Qui étaient déjà en possession de la Partie réceptrice avant leur communication ;</li>'
        '<li>Qui sont reçues d\'un tiers autorisé à les divulguer ;</li>'
        '<li>Dont la divulgation est exigée par la loi ou une autorité compétente.</li>'
        '</ul>'
    ),

    'data_protection': (
        '<p>Les Parties s\'engagent à respecter la réglementation applicable en matière de protection '
        'des données personnelles, notamment le Règlement Général sur la Protection des Données (RGPD) '
        'et les lois nationales applicables.</p>'
        '<p>Chaque Partie met en œuvre les mesures techniques et organisationnelles appropriées pour '
        'assurer la sécurité et la confidentialité des données personnelles traitées dans le cadre '
        'du présent contrat.</p>'
        '<p>En cas de sous-traitance de traitement de données personnelles, un accord spécifique '
        'de traitement de données (DPA) sera conclu entre les Parties.</p>'
    ),

    'termination': (
        '<p>Le présent contrat pourra être résilié :</p>'
        '<ul>'
        '<li><strong>D\'un commun accord</strong> des Parties, par écrit ;</li>'
        '<li><strong>Pour manquement grave</strong> de l\'une des Parties à ses obligations, '
        'après mise en demeure restée sans effet pendant un délai de trente (30) jours ;</li>'
        '<li><strong>Pour cas de force majeure</strong> rendant impossible l\'exécution du contrat '
        'pendant une période continue de plus de soixante (60) jours.</li>'
        '</ul>'
        '<p>En cas de résiliation, chaque Partie restituera à l\'autre tout document ou matériel '
        'appartenant à cette dernière. Les sommes dues pour les prestations déjà réalisées '
        'resteront exigibles.</p>'
    ),

    'applicable_law': (
        '<p>Le présent contrat est régi et interprété conformément au droit applicable '
        'dans la juridiction du siège social de la Partie A.</p>'
        '<p>En cas de litige relatif à l\'interprétation, l\'exécution ou la résiliation '
        'du présent contrat, les Parties s\'engagent à rechercher une solution amiable '
        'dans un délai de trente (30) jours.</p>'
        '<p>À défaut de résolution amiable, tout litige sera soumis aux tribunaux compétents '
        'du ressort du siège social de la Partie A.</p>'
    ),

    'general_provisions': (
        '<p><strong>Intégralité de l\'accord :</strong> Le présent contrat constitue l\'intégralité '
        'de l\'accord entre les Parties et annule et remplace toute négociation, engagement ou accord '
        'antérieur relatif à son objet.</p>'
        '<p><strong>Modifications :</strong> Toute modification du présent contrat devra faire l\'objet '
        'd\'un avenant écrit signé par les deux Parties.</p>'
        '<p><strong>Incessibilité :</strong> Le présent contrat ne pourra être cédé par l\'une '
        'des Parties sans l\'accord préalable et écrit de l\'autre Partie.</p>'
        '<p><strong>Indépendance des clauses :</strong> Si l\'une quelconque des stipulations du '
        'présent contrat est déclarée nulle, les autres stipulations conserveront leur plein effet.</p>'
        '<p><strong>Renonciation :</strong> Le fait pour l\'une des Parties de ne pas se prévaloir '
        'd\'un manquement de l\'autre Partie ne saurait être interprété comme une renonciation '
        'à se prévaloir de ce manquement.</p>'
    ),

    'annexes': (
        '<p>Les annexes suivantes font partie intégrante du présent contrat :</p>'
        '<ul>'
        '<li><strong>Annexe 1</strong> — Cahier des charges / Spécifications techniques</li>'
        '<li><strong>Annexe 2</strong> — Calendrier d\'exécution</li>'
        '<li><strong>Annexe 3</strong> — Conditions tarifaires détaillées</li>'
        '</ul>'
        '<p>En cas de contradiction entre les stipulations du corps du contrat et celles d\'une annexe, '
        'les stipulations du corps du contrat prévaudront.</p>'
    ),

    'signatures': (
        '<p>Fait en deux (2) exemplaires originaux, à __________________, le __________________.</p>'
        '<br/>'
        '<p><strong>Pour la Partie A :</strong></p>'
        '<p>{{organization_name}}</p>'
        '<p>Nom : _________________________</p>'
        '<p>Qualité : _________________________</p>'
        '<p>Signature : _________________________</p>'
        '<br/>'
        '<p><strong>Pour la Partie B :</strong></p>'
        '<p>{{counterpart_name}}</p>'
        '<p>Nom : _________________________</p>'
        '<p>Qualité : _________________________</p>'
        '<p>Signature : _________________________</p>'
    ),

    # Fallback pour les types inconnus
    'custom': (
        '<p>Contenu de cette section à définir selon les besoins des Parties.</p>'
    ),
}


def get_section_default_content(section_type: str, context: dict = None) -> str:
    """
    Retourne le contenu par défaut d'une section, avec substitution des variables
    si un contexte est fourni.
    """
    content = DEFAULT_SECTION_CONTENT.get(section_type, DEFAULT_SECTION_CONTENT['custom'])

    if context:
        replacements = {
            '{{organization_name}}': context.get('organization_name', '_______________'),
            '{{organization_address}}': context.get('organization_address', '_______________'),
            '{{counterpart_name}}': context.get('counterpart_name', '_______________'),
            '{{counterpart_address}}': context.get('counterpart_address', '_______________'),
            '{{description}}': context.get('description', '(Description des prestations à définir)'),
            '{{start_date}}': context.get('start_date', '_______________'),
            '{{end_date}}': context.get('end_date', '_______________'),
            '{{total_value}}': str(context.get('total_value', '_______________')),
            '{{currency}}': context.get('currency', 'CAD'),
            '{{payment_terms}}': context.get('payment_terms', '(Modalités de paiement à définir)'),
        }
        for key, value in replacements.items():
            content = content.replace(key, value)

    return content
