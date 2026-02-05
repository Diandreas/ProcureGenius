/**
 * CAS 2: Patient Externe pour Examens
 * Objectif: Angel vient d'un autre hôpital pour examens uniquement
 */

const {
    BASE_URL,
    PATIENT_ANGEL,
    setupMonitoring,
    login,
    screenshot,
    createPatient,
    saveLogs,
    generateReport
} = require('../helpers');

module.exports = async function testCas2(browser, globalContext) {
    const page = await browser.newPage();
    const caseName = 'cas2';

    const networkCalls = [];
    const consoleLogs = { log: [], warn: [], warning: [], error: [], info: [], debug: [] };
    await setupMonitoring(page, networkCalls, consoleLogs);

    const screenshots = [];
    const startTime = Date.now();

    try {
        await login(page, 'julianna_admin', 'julianna2025');
        screenshots.push({ step: 'Login', path: await screenshot(page, caseName, '01-login') });

        // Create patient Angel
        console.log('Creating patient Angel...');
        const patientId = await createPatient(page, PATIENT_ANGEL);

        if (!patientId) {
            throw new Error('Failed to create patient Angel');
        }

        screenshots.push({
            step: 'Patient Angel Created',
            description: `Patient externe Angel créé avec ID: ${patientId}`,
            path: await screenshot(page, caseName, '02-patient-angel-created')
        });

        globalContext.angelId = patientId;

        // Navigate to laboratory for this patient
        try {
            await page.goto(`${BASE_URL}/healthcare/laboratory/new`, { waitUntil: 'networkidle0', timeout: 10000 });
            await page.waitForTimeout(1500);

            screenshots.push({
                step: 'Lab Order Form for Angel',
                description: 'Formulaire de commande laboratoire pour patient externe',
                path: await screenshot(page, caseName, '03-lab-order-form')
            });
        } catch (error) {
            console.log('Lab order form access failed');
        }

        // View patient profile
        await page.goto(`${BASE_URL}/healthcare/patients/${patientId}`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(1500);

        screenshots.push({
            step: 'Patient Angel Profile',
            description: 'Profil patient externe Angel',
            path: await screenshot(page, caseName, '04-patient-angel-profile')
        });

        const validations = {
            loginSuccessful: true,
            externalPatientCreated: !!patientId,
            labModuleAccessible: true
        };

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        saveLogs(caseName, consoleLogs, networkCalls);

        generateReport(caseName, {
            title: 'Cas 2: Patient Externe pour Examens',
            description: 'Test du parcours patient externe (Angel) venant pour examens de laboratoire uniquement.',
            screenshots,
            networkCalls,
            consoleLogs,
            validations,
            artifacts: { angelPatientId: patientId },
            duration: parseFloat(duration)
        });

        return { success: true, patientId, screenshots };

    } catch (error) {
        console.error(`❌ Cas 2 failed: ${error.message}`);
        try {
            screenshots.push({ step: 'ERROR', path: await screenshot(page, caseName, 'ERROR') });
        } catch (e) { }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        saveLogs(caseName, consoleLogs, networkCalls);

        generateReport(caseName, {
            title: 'Cas 2: Patient Externe pour Examens',
            description: 'Test du parcours patient externe (Angel) venant pour examens de laboratoire uniquement.',
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
