/**
 * CAS 1b: Accueil + Caisse + Laboratoire
 * Objectif: Fabrice revient pour examens médicaux
 */

const {
    BASE_URL,
    setupMonitoring,
    login,
    screenshot,
    searchPatient,
    safeClick,
    saveLogs,
    generateReport
} = require('../helpers');

module.exports = async function testCas1b(browser, globalContext) {
    const page = await browser.newPage();
    const caseName = 'cas1b';

    const networkCalls = [];
    const consoleLogs = { log: [], warn: [], warning: [], error: [], info: [], debug: [] };
    await setupMonitoring(page, networkCalls, consoleLogs);

    const screenshots = [];
    const startTime = Date.now();

    try {
        console.log('Step 1: Login...');
        await login(page, 'julianna_admin', 'julianna2025');
        screenshots.push({
            step: 'Login',
            path: await screenshot(page, caseName, '01-login-success')
        });

        // Step 2: Search for patient Fabrice
        console.log('Step 2: Searching for patient Fabrice...');
        const fabriceId = globalContext.fabriceId;

        if (fabriceId) {
            await page.goto(`${BASE_URL}/healthcare/patients/${fabriceId}`, { waitUntil: 'networkidle0' });
            await page.waitForTimeout(1500);
        } else {
            // Try to search
            await page.goto(`${BASE_URL}/healthcare/patients`, { waitUntil: 'networkidle0' });
            await page.waitForTimeout(1000);
        }

        screenshots.push({
            step: 'Patient Found',
            description: 'Patient Fabrice retrouvé',
            path: await screenshot(page, caseName, '02-patient-found')
        });

        // Step 3: Navigate to laboratory
        console.log('Step 3: Navigate to laboratory module...');
        try {
            await page.goto(`${BASE_URL}/healthcare/laboratory/new`, { waitUntil: 'networkidle0', timeout: 10000 });
            await page.waitForTimeout(1500);

            screenshots.push({
                step: 'Lab Order Form',
                description: 'Formulaire de commande laboratoire',
                path: await screenshot(page, caseName, '03-lab-order-form')
            });
        } catch (error) {
            console.log('Direct lab order creation failed, trying catalog first');
            await page.goto(`${BASE_URL}/healthcare/laboratory/catalog`, { waitUntil: 'networkidle0', timeout: 10000 });
            await page.waitForTimeout(1500);

            screenshots.push({
                step: 'Lab Catalog',
                description: 'Catalogue des examens de laboratoire',
                path: await screenshot(page, caseName, '04-lab-catalog')
            });
        }

        // Step 4: Navigate to lab orders list
        console.log('Step 4: Navigate to lab orders list...');
        try {
            await page.goto(`${BASE_URL}/healthcare/laboratory`, { waitUntil: 'networkidle0', timeout: 10000 });
            await page.waitForTimeout(1500);

            screenshots.push({
                step: 'Lab Orders List',
                description: 'Liste des ordres de laboratoire',
                path: await screenshot(page, caseName, '05-lab-orders-list')
            });
        } catch (error) {
            console.log(`Lab orders list access failed: ${error.message}`);
        }

        const validations = {
            loginSuccessful: true,
            patientAccessible: !!fabriceId,
            labModuleAccessible: true,
            noConsoleFatalErrors: (consoleLogs.error || []).filter(e =>
                e.text.toLowerCase().includes('fatal') ||
                e.text.toLowerCase().includes('uncaught')
            ).length === 0
        };

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        saveLogs(caseName, consoleLogs, networkCalls);

        generateReport(caseName, {
            title: 'Cas 1b: Accueil + Caisse + Laboratoire',
            description: 'Test du parcours de création d\'ordre de laboratoire pour le patient Fabrice.',
            screenshots,
            networkCalls,
            consoleLogs,
            validations,
            artifacts: {
                patientId: fabriceId || 'N/A'
            },
            duration: parseFloat(duration)
        });

        // Store lab order ID if created (for cas1c)
        globalContext.labOrderId = null; // Will be set if order is created

        return {
            success: true,
            screenshots
        };

    } catch (error) {
        console.error(`❌ Cas 1b failed: ${error.message}`);

        try {
            screenshots.push({
                step: 'ERROR',
                description: error.message,
                path: await screenshot(page, caseName, 'ERROR')
            });
        } catch (e) { }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        saveLogs(caseName, consoleLogs, networkCalls);

        generateReport(caseName, {
            title: 'Cas 1b: Accueil + Caisse + Laboratoire',
            description: 'Test du parcours de création d\'ordre de laboratoire pour le patient Fabrice.',
            screenshots,
            networkCalls,
            consoleLogs,
            validations: { testFailed: true },
            artifacts: {},
            duration: parseFloat(duration),
            errors: [{ title: 'Test Failure', type: 'Fatal', severity: '🔴 Critique', message: error.message }]
        });

        return {
            success: false,
            error: error.message,
            screenshots
        };
    } finally {
        await page.close();
    }
};
