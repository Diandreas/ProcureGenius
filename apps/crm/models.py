"""
Suivi patients (CRM).

Etape 1 : aucune table. La page « Suivi patients » ne lit que des donnees
existantes (patients, factures, vaccinations). Les modeles — provenance,
campagnes, contacts, notes — arrivent aux etapes suivantes, dans des tables
annexes : on n'ajoute volontairement aucune colonne a `accounts.Client`, dont
le save() lance une validation complete.
"""
