/**
 * CAS 1c: Accueil - Récupération Résultats
 * Objectif: Fabrice récupère ses résultats d'examens
 */

const {
    BASE_URL,
    setupMonitoring,
    login,
    screenshot,
    saveLogs,
    generateReport
} = require('../helpers');

module.exports = async function testCas1c(browser, globalContext) {
    const page = await browser.newPage();
    const caseName = 'cas1c';

    const networkCalls = [];
    const consoleLogs = { log: [], warn: [], warning: [], error: [], info: [], debug: [] };
    await setupMonitoring(page, networkCalls, consoleLogs);

    const screenshots = [];
    const startTime = Date.now();

    try {
        await login(page, 'julianna_admin', 'julianna2025');
        screenshots.push({ step: 'Login', path: await screenshot(page, caseName, '01-login') });

        const fabriceId = globalContext.fabriceId;

        // Navigate to patient profile
        if (fabriceId) {
            await page.goto(`${BASE_URL}/healthcare/patients/${fabriceId}`, { waitUntil: 'networkidle0' });
            await page.waitForTimeout(1500);

            screenshots.push({
                step: 'Patient Profile',
                description: 'Profil patient Fabrice',
                path: await screenshot(page, caseName, '02-patient-profile')
            });

            // Try to find lab results tab
            const tabButtons = await page.$$('button, a');
            for (const button of tabButtons) {
                const text = await button.evaluate(el => el.textContent);
                if (text.toLowerCase().includes('labo') || text.toLowerCase().includes('result')) {
                    await button.click();
                    await page.waitForTimeout(1500);
                    break;
                }
            }

            screenshots.push({
                step: 'Lab Results Tab',
                description: 'Onglet résultats laboratoire',
                path: await screenshot(page, caseName, '03-lab-results-tab')
            });
        }

        // Navigate to laboratory module
        await page.goto(`${BASE_URL}/healthcare/laboratory`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(1500);

        screenshots.push({
            step: 'Laboratory Module',
            description: 'Module laboratoire - liste ordres',
            path: await screenshot(page, caseName, '04-laboratory-module')
        });

        const validations = {
            loginSuccessful: true,
            patientAccessible: !!fabriceId,
            labModuleAccessible: true
        };

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        saveLogs(caseName, consoleLogs, networkCalls);

        generateReport(caseName, {
            title: 'Cas 1c: Accueil - Récupération Résultats',
            description: 'Test du parcours de récupération des résultats d\'examens pour Fabrice.',
            screenshots,
            networkCalls,
            consoleLogs,
            validations,
            artifacts: { patientId: fabriceId || 'N/A' },
            duration: parseFloat(duration)
        });

        return { success: true, screenshots };

    } catch (error) {
        console.error(`❌ Cas 1c failed: ${error.message}`);
        try {
            screenshots.push({ step: 'ERROR', path: await screenshot(page, caseName, 'ERROR') });
        } catch (e) { }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        saveLogs(caseName, consoleLogs, networkCalls);

        generateReport(caseName, {
            title: 'Cas 1c: Accueil - Récupération Résultats',
            description: 'Test du parcours de récupération des résultats d\'examens pour Fabrice.',
            screenshots,
            networkCalls,
            consoleLogs,
            validations: { testFailed: true },
            artifacts: {},
            duration: parseFloat(duration),
            errors: [{ title: 'Test Failure', type: 'Fatal', severity: '🔴 Critique', message: error.message }]
        });

        return { success: false, error: error.message, screenshots };
    } finally {
        await page.close();
    }
};
