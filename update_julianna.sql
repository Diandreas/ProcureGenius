-- Mise à jour des données du Centre Julianna
-- IMPORTANT: Remplacer <ORGANIZATION_ID> par l'ID réel de l'organisation
-- Pour trouver l'ID: SELECT id, name FROM accounts_organization WHERE name LIKE '%Julianna%';

-- Étape 1: Trouver l'ID de l'organisation
-- SELECT id, name FROM accounts_organization WHERE name LIKE '%Julianna%';

-- Étape 2: Vérifier si les settings existent
-- SELECT * FROM core_organizationsettings WHERE organization_id = '<ORGANIZATION_ID>';

-- Étape 3a: Si les settings existent - METTRE À JOUR
UPDATE core_organizationsettings
SET
    company_name = 'Centre Médical Julianna',
    company_phone = '655244149 / 679145198',
    company_address = E'Entrée Marie Lumière à côté du Consulat Honoraire d\'Indonésie\nMakepe Saint-Tropez - Douala',
    updated_at = NOW()
WHERE organization_id = (
    SELECT id FROM accounts_organization WHERE name LIKE '%Julianna%' LIMIT 1
);

-- Étape 3b: Si les settings n'existent pas - CRÉER (décommenter si nécessaire)
/*
INSERT INTO core_organizationsettings (
    id,
    organization_id,
    company_name,
    company_phone,
    company_address,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),  -- Pour PostgreSQL, sinon utiliser une autre méthode pour générer UUID
    id,
    'Centre Médical Julianna',
    '655244149 / 679145198',
    E'Entrée Marie Lumière à côté du Consulat Honoraire d\'Indonésie\nMakepe Saint-Tropez - Douala',
    NOW(),
    NOW()
FROM accounts_organization
WHERE name LIKE '%Julianna%'
LIMIT 1
ON CONFLICT DO NOTHING;
*/

-- Vérification
SELECT
    o.name as organisation,
    os.company_name as nom,
    os.company_phone as telephone,
    os.company_address as adresse
FROM accounts_organization o
LEFT JOIN core_organizationsettings os ON o.id = os.organization_id
WHERE o.name LIKE '%Julianna%';
