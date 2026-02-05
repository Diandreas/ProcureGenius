/**
 * Script principal d'exécution des tests automatisés
 * Centre de Santé JULIANNA - 7 Parcours Patients
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Import test cases
const testCas1a = require('./test-cases/cas1a-consultation');
const testCas1b = require('./test-cases/cas1b-laboratoire');
const testCas1c = require('./test-cases/cas1c-resultats');
const testCas1d = require('./test-cases/cas1d-pharmacie');
const testCas2 = require('./test-cases/cas2-patient-externe');
const testCas6 = require('./test-cases/cas6-historique-medecin');
const testCas7 = require('./test-cases/cas7-historique-patient');

const TEST_CASES = [
    { name: 'cas1a', title: 'Accueil + Consultation', test: testCas1a },
    { name: 'cas1b', title: 'Laboratoire', test: testCas1b },
    { name: 'cas1c', title: 'Résultats', test: testCas1c },
    { name: 'cas1d', title: 'Pharmacie', test: testCas1d },
    { name: 'cas2', title: 'Patient Externe', test: testCas2 },
    { name: 'cas6', title: 'Historique Médecin', test: testCas6 },
    { name: 'cas7', title: 'Historique Patient', test: testCas7 }
];

/**
 * Check if servers are running
 */
async function checkServers() {
    console.log('\n=== Vérification des serveurs ===\n');

    const http = require('http');

    const checkServer = (host, port, name) => {
        return new Promise((resolve, reject) => {
            const req = http.get(`http://${host}:${port}`, (res) => {
                console.log(`✅ ${name} is running on port ${port}`);
                resolve(true);
            });

            req.on('error', (error) => {
                console.log(`❌ ${name} is NOT running on port ${port}`);
                reject(new Error(`${name} not accessible`));
            });

            req.setTimeout(5000, () => {
                req.abort();
                reject(new Error(`${name} timeout`));
            });
        });
    };

    try {
        await checkServer('localhost', 3000, 'Frontend (React)');
        await checkServer('localhost', 8000, 'Backend (Django)');
        console.log('\n✅ All servers are running!\n');
        return true;
    } catch (error) {
        console.error(`\n❌ Server check failed: ${error.message}`);
        console.error('Please ensure both frontend (port 3000) and backend (port 8000) are running.\n');
        return false;
    }
}

/**
 * Run a single test case
 */
async function runTestCase(browser, testCase, globalContext) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${testCase.title}`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();

    try {
        const result = await testCase.test(browser, globalContext);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`\n✅ ${testCase.title} completed in ${duration}s\n`);

        return {
            name: testCase.name,
            title: testCase.title,
            success: result.success !== false,
            duration: parseFloat(duration),
            ...result
        };
    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.error(`\n❌ ${testCase.title} failed: ${error.message}\n`);
        console.error(error.stack);

        return {
            name: testCase.name,
            title: testCase.title,
            success: false,
            duration: parseFloat(duration),
            error: error.message
        };
    }
}

/**
 * Generate global synthesis report
 */
function generateSynthesisReport(results) {
    const reportPath = path.join(__dirname, 'rapport-synthese.md');

    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const successRate = ((successCount / results.length) * 100).toFixed(1);

    let report = `# Rapport de Synthèse - Tests 7 Parcours Patient CSJ\n\n`;
    report += `## Vue d'ensemble\n`;
    report += `- **Date tests**: ${new Date().toLocaleString('fr-FR')}\n`;
    report += `- **Durée totale**: ${(totalDuration / 60).toFixed(1)} minutes\n`;
    report += `- **Nombre parcours**: ${results.length}\n`;
    report += `- **Taux de réussite global**: ${successRate}%\n`;
    report += `- **Compte testé**: julianna_admin\n`;
    report += `- **Environment**:\n`;
    report += `  - Backend: Django (port 8000)\n`;
    report += `  - Frontend: React (port 3000)\n`;
    report += `  - Database: SQLite (db.sqlite3)\n\n`;

    report += `## Résultats par Parcours\n\n`;
    report += `| Parcours | Titre | Status | Durée | Screenshots | Erreurs |\n`;
    report += `|----------|-------|--------|-------|-------------|----------|\n`;

    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const errors = result.error ? '1+' : '0';
        const screenshots = result.screenshots ? result.screenshots.length : '?';

        report += `| ${result.name} | ${result.title} | ${status} | ${result.duration}s | ${screenshots} | ${errors} |\n`;
    });

    report += `\n**Légende**:\n`;
    report += `- ✅ Succès complet\n`;
    report += `- ❌ Échec\n\n`;

    report += `## Statistiques Globales\n\n`;
    report += `### Résultats\n`;
    report += `- **Tests réussis**: ${successCount}/${results.length}\n`;
    report += `- **Tests échoués**: ${failureCount}/${results.length}\n`;
    report += `- **Durée moyenne**: ${(totalDuration / results.length).toFixed(1)}s\n`;
    report += `- **Durée totale**: ${totalDuration.toFixed(1)}s (${(totalDuration / 60).toFixed(1)} minutes)\n\n`;

    if (failureCount > 0) {
        report += `## Erreurs Détectées\n\n`;
        results.filter(r => !r.success).forEach(result => {
            report += `### ${result.title}\n`;
            report += `- **Erreur**: ${result.error || 'Unknown error'}\n`;
            report += `- **Fichier**: \`test-cases/${result.name}.js\`\n\n`;
        });
    }

    report += `## Artefacts Générés\n\n`;
    report += `### Patients créés durant les tests\n`;
    const fabriceId = results.find(r => r.name === 'cas1a')?.patientId;
    const angelId = results.find(r => r.name === 'cas2')?.patientId;

    if (fabriceId) {
        report += `- **Patient Fabrice**: ID ${fabriceId}\n`;
        report += `  - Consultation complétée\n`;
        report += `  - Ordre laboratoire avec résultats\n`;
        report += `  - Dispensing pharmacie\n`;
        report += `  - Historique médical complet\n\n`;
    }

    if (angelId) {
        report += `- **Patient Angel (externe)**: ID ${angelId}\n`;
        report += `  - Ordre laboratoire avec résultats\n\n`;
    }

    report += `## Fichiers de Test\n\n`;
    report += `### Rapports Détaillés\n`;
    results.forEach(result => {
        report += `- [${result.title}](./${result.name}.md)\n`;
    });

    report += `\n### Artefacts\n`;
    report += `- **Screenshots**: \`./screenshots/\` (organisés par cas)\n`;
    report += `- **Logs**: \`./logs/\` (7 fichiers console.log)\n`;
    report += `- **HAR**: \`./har/\` (7 fichiers réseau)\n`;
    report += `- **Network**: \`./network/\` (7 fichiers JSON)\n\n`;

    report += `## Validation Globale\n\n`;
    report += `**Taux de réussite**: ${successRate}%\n\n`;

    if (successRate >= 95) {
        report += `**Conclusion**: ✅ L'application fonctionne correctement pour tous les parcours testés.\n\n`;
    } else if (successRate >= 70) {
        report += `**Conclusion**: ⚠️ L'application fonctionne mais présente quelques problèmes à corriger.\n\n`;
    } else {
        report += `**Conclusion**: ❌ L'application présente des problèmes importants nécessitant correction.\n\n`;
    }

    report += `## Recommandations\n\n`;
    if (failureCount > 0) {
        report += `1. Corriger les erreurs identifiées dans les tests échoués\n`;
        report += `2. Relancer les tests après corrections\n`;
        report += `3. Vérifier les logs console pour identifier les problèmes JavaScript\n\n`;
    } else {
        report += `✅ Tous les tests sont passés avec succès. L'application est prête pour utilisation.\n\n`;
    }

    report += `---\n`;
    report += `*Rapport généré automatiquement - ${new Date().toLocaleString('fr-FR')}*\n`;
    report += `*Powered by Puppeteer Automation*\n`;

    fs.writeFileSync(reportPath, report);
    console.log(`\n✅ Synthesis report generated: rapport-synthese.md\n`);
}

/**
 * Main execution
 */
async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('Tests Automatisés - Centre de Santé JULIANNA');
    console.log('7 Parcours Patients');
    console.log('='.repeat(60) + '\n');

    // Check servers
    const serversOk = await checkServers();
    if (!serversOk) {
        console.error('❌ Cannot proceed without servers running.');
        process.exit(1);
    }

    // Launch browser
    console.log('Launching Chrome browser...\n');
    const browser = await puppeteer.launch({
        headless: false, // Visible for debugging
        defaultViewport: {
            width: 1920,
            height: 1080
        },
        args: [
            '--start-maximized',
            '--disable-blink-features=AutomationControlled'
        ],
        // Use system Chrome
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });

    const results = [];
    const globalContext = {}; // Shared data between tests (e.g., patient IDs)

    try {
        // Run all test cases sequentially
        for (const testCase of TEST_CASES) {
            const result = await runTestCase(browser, testCase, globalContext);
            results.push(result);

            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Generate synthesis report
        console.log('\n' + '='.repeat(60));
        console.log('Generating synthesis report...');
        console.log('='.repeat(60) + '\n');

        generateSynthesisReport(results);

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60) + '\n');

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        console.log(`Total tests: ${results.length}`);
        console.log(`Passed: ${successCount} ✅`);
        console.log(`Failed: ${failureCount} ❌`);
        console.log(`Success rate: ${((successCount / results.length) * 100).toFixed(1)}%`);

        console.log('\n' + '='.repeat(60));
        console.log('All reports generated in ./test-reports/');
        console.log('View rapport-synthese.md for complete summary');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ Fatal error during test execution:');
        console.error(error);
    } finally {
        // Close browser
        await browser.close();
        console.log('Browser closed.\n');
    }

    // Exit with appropriate code
    const hasFailures = results.some(r => !r.success);
    process.exit(hasFailures ? 1 : 0);
}

// Run
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
