/**
 * Test Complet de TOUS les Modules
 * Teste chaque module: Navigation, Filtres, Recherche, CRUD, Affichage
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

// Liste de tous les modules à tester
const MODULES = [
    {
        name: 'Dashboard',
        url: '/',
        features: ['widgets', 'navigation', 'stats']
    },
    {
        name: 'Patients',
        url: '/healthcare/patients',
        features: ['liste', 'recherche', 'filtres', 'création', 'détails', 'modification']
    },
    {
        name: 'Réception',
        url: '/healthcare/reception',
        features: ['check-in', 'liste_arrivées', 'triage']
    },
    {
        name: 'Consultations',
        url: '/healthcare/consultations',
        features: ['liste', 'création', 'paramètres_vitaux', 'diagnostic']
    },
    {
        name: 'Laboratoire - Catalogue',
        url: '/healthcare/laboratory/catalog',
        features: ['liste_examens', 'catégories', 'tarifs']
    },
    {
        name: 'Laboratoire - Ordres',
        url: '/healthcare/laboratory',
        features: ['liste', 'création', 'recherche', 'statuts', 'résultats']
    },
    {
        name: 'Pharmacie - Inventaire',
        url: '/healthcare/pharmacy/inventory',
        features: ['liste_médicaments', 'stock', 'recherche', 'filtres']
    },
    {
        name: 'Pharmacie - Dispensation',
        url: '/healthcare/pharmacy/dispensing',
        features: ['liste', 'création', 'historique']
    },
    {
        name: 'Factures',
        url: '/invoices',
        features: ['liste', 'création', 'paiement', 'recherche', 'filtres', 'statuts']
    },
    {
        name: 'Produits',
        url: '/products',
        features: ['liste', 'catégories', 'stock', 'prix']
    },
    {
        name: 'Analytique - Examens',
        url: '/healthcare/analytics/exam-status',
        features: ['graphiques', 'statistiques', 'filtres_dates']
    },
    {
        name: 'Analytique - Revenus',
        url: '/healthcare/analytics/revenue',
        features: ['graphiques', 'statistiques', 'périodes']
    },
    {
        name: 'Analytique - Démographie',
        url: '/healthcare/analytics/demographics',
        features: ['graphiques', 'répartition']
    }
];

// Helpers
async function login(page) {
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1500);

    const inputs = await page.locator('input').all();
    if (inputs.length >= 2) {
        await inputs[0].fill('julianna_admin');
        await inputs[1].fill('julianna2025');
    }

    const submitButton = page.locator('button[type="submit"]');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
        submitButton.click()
    ]);

    await page.waitForTimeout(1500);
}

async function takeScreenshot(moduleName, page, stepName) {
    const dir = path.join(__dirname, 'screenshots', 'modules', moduleName.toLowerCase().replace(/ /g, '-'));
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${stepName}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    return `./screenshots/modules/${moduleName.toLowerCase().replace(/ /g, '-')}/${stepName}.png`;
}

async function analyzeModule(page, moduleName) {
    const analysis = {
        moduleName,
        url: page.url(),
        timestamp: new Date().toISOString(),
        elements: {},
        features: {},
        errors: []
    };

    // Compter les éléments
    analysis.elements = {
        buttons: await page.locator('button').count(),
        links: await page.locator('a').count(),
        inputs: await page.locator('input').count(),
        selects: await page.locator('select').count(),
        tables: await page.locator('table').count(),
        forms: await page.locator('form').count(),
        cards: await page.locator('[class*="card"], [class*="Card"]').count(),
        lists: await page.locator('ul, ol').count()
    };

    // Détecter les features
    const searchInput = await page.locator('input[type="search"], input[placeholder*="recherch"], input[placeholder*="Search"]').count();
    analysis.features.search = searchInput > 0;

    const filterButton = await page.locator('button:has-text("Filtre"), button:has-text("Filter"), [class*="filter"]').count();
    analysis.features.filter = filterButton > 0;

    const addButton = await page.locator('button:has-text("Ajouter"), button:has-text("Nouveau"), button:has-text("Add"), button:has-text("New")').count();
    analysis.features.create = addButton > 0;

    const exportButton = await page.locator('button:has-text("Export"), button:has-text("Télécharger"), button:has-text("Download")').count();
    analysis.features.export = exportButton > 0;

    const pagination = await page.locator('[class*="pagination"], [role="navigation"][aria-label*="pagination"]').count();
    analysis.features.pagination = pagination > 0;

    // Extraire les titres
    const headings = await page.locator('h1, h2, h3').allTextContents();
    analysis.headings = headings.filter(h => h.trim().length > 0).slice(0, 5);

    // Chercher des erreurs visibles
    const errorMessages = await page.locator('[class*="error"], [role="alert"], .MuiAlert-standardError').allTextContents();
    if (errorMessages.length > 0) {
        analysis.errors = errorMessages.filter(e => e.trim().length > 0);
    }

    return analysis;
}

async function testModule(browser, module) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TEST MODULE: ${module.name}`);
    console.log(`URL: ${module.url}`);
    console.log(`${'='.repeat(70)}`);

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    const screenshots = [];
    const startTime = Date.now();

    try {
        // Naviguer vers le module
        await page.goto(`${BASE_URL}${module.url}`, { waitUntil: 'load', timeout: 15000 });
        await page.waitForTimeout(2000);

        console.log(`  ✅ Module chargé`);

        // Screenshot principal
        screenshots.push({
            name: '01-main-view',
            path: await takeScreenshot(module.name, page, '01-main-view')
        });

        // Analyser le module
        const analysis = await analyzeModule(page, module.name);

        console.log(`\n  Éléments trouvés:`);
        console.log(`    - Boutons: ${analysis.elements.buttons}`);
        console.log(`    - Inputs: ${analysis.elements.inputs}`);
        console.log(`    - Tableaux: ${analysis.elements.tables}`);
        console.log(`    - Cards: ${analysis.elements.cards}`);

        console.log(`\n  Features détectées:`);
        console.log(`    - Recherche: ${analysis.features.search ? '✅' : '❌'}`);
        console.log(`    - Filtres: ${analysis.features.filter ? '✅' : '❌'}`);
        console.log(`    - Création: ${analysis.features.create ? '✅' : '❌'}`);
        console.log(`    - Export: ${analysis.features.export ? '✅' : '❌'}`);
        console.log(`    - Pagination: ${analysis.features.pagination ? '✅' : '❌'}`);

        // Tester la recherche si disponible
        if (analysis.features.search) {
            console.log(`\n  → Test de la fonction recherche...`);
            const searchInput = page.locator('input[type="search"], input[placeholder*="recherch"], input[placeholder*="Search"]').first();
            await searchInput.fill('test');
            await page.waitForTimeout(1500);
            screenshots.push({
                name: '02-search-test',
                path: await takeScreenshot(module.name, page, '02-search-test')
            });
            await searchInput.clear();
            await page.waitForTimeout(1000);
        }

        // Tester les filtres si disponibles
        if (analysis.features.filter) {
            console.log(`\n  → Test des filtres...`);
            const filterButton = page.locator('button:has-text("Filtre"), button:has-text("Filter")').first();
            try {
                await filterButton.click();
                await page.waitForTimeout(1500);
                screenshots.push({
                    name: '03-filters-open',
                    path: await takeScreenshot(module.name, page, '03-filters-open')
                });
            } catch (e) {
                console.log(`    ⚠️  Impossible d'ouvrir les filtres`);
            }
        }

        // Tester le bouton de création si disponible
        if (analysis.features.create) {
            console.log(`\n  → Test du bouton création...`);
            const addButton = page.locator('button:has-text("Ajouter"), button:has-text("Nouveau"), a[href*="/new"]').first();
            try {
                await addButton.click();
                await page.waitForTimeout(1500);
                screenshots.push({
                    name: '04-create-form',
                    path: await takeScreenshot(module.name, page, '04-create-form')
                });

                // Retour
                await page.goBack();
                await page.waitForTimeout(1000);
            } catch (e) {
                console.log(`    ⚠️  Impossible d'accéder au formulaire de création`);
            }
        }

        // Tester responsive
        console.log(`\n  → Test responsive...`);
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(1000);
        screenshots.push({
            name: '05-responsive-tablet',
            path: await takeScreenshot(module.name, page, '05-responsive-tablet')
        });

        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(1000);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`\n  ✅ Test terminé en ${duration}s - ${screenshots.length} screenshots`);

        await context.close();

        return {
            success: true,
            module: module.name,
            analysis,
            screenshots,
            duration
        };

    } catch (error) {
        console.log(`\n  ❌ Erreur: ${error.message}`);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        await context.close();

        return {
            success: false,
            module: module.name,
            error: error.message,
            screenshots,
            duration
        };
    }
}

function generateGlobalReport(results) {
    let report = `# Test de Tous les Modules - Rapport Global\n\n`;
    report += `## Vue d'Ensemble\n`;
    report += `- **Date**: ${new Date().toLocaleString('fr-FR')}\n`;
    report += `- **Modules testés**: ${results.length}\n`;
    report += `- **Modules fonctionnels**: ${results.filter(r => r.success).length}\n`;
    report += `- **Taux de réussite**: ${((results.filter(r => r.success).length / results.length) * 100).toFixed(1)}%\n\n`;

    report += `## Résumé par Module\n\n`;
    report += `| Module | Status | Screenshots | Durée | Recherche | Filtres | Création |\n`;
    report += `|--------|--------|-------------|-------|-----------|---------|----------|\n`;

    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const search = result.analysis?.features?.search ? '✅' : '❌';
        const filter = result.analysis?.features?.filter ? '✅' : '❌';
        const create = result.analysis?.features?.create ? '✅' : '❌';

        report += `| ${result.module} | ${status} | ${result.screenshots.length} | ${result.duration}s | ${search} | ${filter} | ${create} |\n`;
    });

    report += `\n## Détails par Module\n\n`;

    results.forEach(result => {
        report += `### ${result.module}\n`;
        report += `- **Status**: ${result.success ? '✅ Fonctionnel' : '❌ Erreur'}\n`;
        report += `- **URL**: ${result.analysis?.url || 'N/A'}\n`;
        report += `- **Durée**: ${result.duration}s\n`;

        if (result.analysis) {
            report += `- **Éléments**: ${result.analysis.elements.buttons} boutons, ${result.analysis.elements.inputs} inputs, ${result.analysis.elements.tables} tableaux\n`;
            report += `- **Features**: Recherche ${result.analysis.features.search ? '✅' : '❌'}, Filtres ${result.analysis.features.filter ? '✅' : '❌'}, Création ${result.analysis.features.create ? '✅' : '❌'}\n`;

            if (result.analysis.headings.length > 0) {
                report += `- **Titres**: ${result.analysis.headings.join(', ')}\n`;
            }

            if (result.analysis.errors.length > 0) {
                report += `- **⚠️ Erreurs**: ${result.analysis.errors.join(', ')}\n`;
            }
        }

        if (result.error) {
            report += `- **❌ Erreur**: ${result.error}\n`;
        }

        report += `\n**Screenshots**:\n`;
        result.screenshots.forEach((screenshot, index) => {
            report += `${index + 1}. ![${screenshot.name}](${screenshot.path})\n`;
        });

        report += `\n---\n\n`;
    });

    report += `## Recommandations\n\n`;
    const successRate = (results.filter(r => r.success).length / results.length) * 100;

    if (successRate >= 90) {
        report += `✅ **L'application fonctionne très bien!** Tous les modules sont accessibles et fonctionnels.\n\n`;
    } else if (successRate >= 70) {
        report += `⚠️ **L'application fonctionne globalement bien** mais certains modules nécessitent attention.\n\n`;
    } else {
        report += `❌ **Plusieurs modules présentent des problèmes.** Vérification approfondie recommandée.\n\n`;
    }

    report += `---\n*Test automatisé avec Playwright - ${new Date().toLocaleString('fr-FR')}*\n`;

    const reportPath = path.join(__dirname, 'rapport-tous-modules.md');
    fs.writeFileSync(reportPath, report);
    console.log('\n📄 Rapport global généré: rapport-tous-modules.md');
}

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST DE TOUS LES MODULES');
    console.log(`${MODULES.length} modules à tester`);
    console.log('='.repeat(70));

    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized'],
        channel: 'chrome'
    });

    // Login une fois
    const loginContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const loginPage = await loginContext.newPage();
    await login(loginPage);
    await loginContext.close();

    const results = [];

    // Tester chaque module
    for (const module of MODULES) {
        const result = await testModule(browser, module);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Pause entre modules
    }

    await browser.close();

    // Générer rapport global
    generateGlobalReport(results);

    console.log('\n' + '='.repeat(70));
    console.log('RÉSUMÉ GLOBAL');
    console.log('='.repeat(70));
    console.log(`Modules testés: ${results.length}`);
    console.log(`Modules OK: ${results.filter(r => r.success).length} ✅`);
    console.log(`Modules KO: ${results.filter(r => !r.success).length} ❌`);
    console.log(`Screenshots: ${results.reduce((sum, r) => sum + r.screenshots.length, 0)}`);
    console.log('='.repeat(70) + '\n');
}

main().catch(console.error);
