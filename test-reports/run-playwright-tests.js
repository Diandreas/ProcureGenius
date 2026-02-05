/**
 * Script de tests avec Playwright - Version compatible
 * Centre de Santé JULIANNA - 7 Parcours Patients
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

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

async function login(page, username, password) {
    console.log(`Logging in as ${username}...`);

    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    // Fill login form
    const inputs = await page.locator('input').all();
    if (inputs.length >= 2) {
        await inputs[0].fill(username);
        await inputs[1].fill(password);
    }

    // Submit
    const submitButton = page.locator('button[type="submit"]');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
        submitButton.click()
    ]);

    await page.waitForTimeout(1000);
    console.log('Login successful!');
}

async function runCas1a(browser) {
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    console.log('\n========== CAS 1a: Consultation ==========\n');

    const screenshotsDir = path.join(__dirname, 'screenshots', 'cas1a');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    try {
        // Login
        await login(page, 'julianna_admin', 'julianna2025');
        await page.screenshot({ path: path.join(screenshotsDir, '01-login.png'), fullPage: true });

        // Navigate to patients
        await page.goto(`${BASE_URL}/healthcare/patients/new`, { waitUntil: 'load' });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(screenshotsDir, '02-patient-form.png'), fullPage: true });

        // Go back to dashboard
        await page.goto(`${BASE_URL}`, { waitUntil: 'load' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, '03-dashboard.png'), fullPage: true });

        console.log('✅ Cas 1a completed - 3 screenshots captured');

        return { success: true, screenshots: 3 };
    } catch (error) {
        console.error(`❌ Cas 1a failed: ${error.message}`);
        return { success: false, error: error.message };
    } finally {
        await context.close();
    }
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('Tests Playwright - Centre de Santé JULIANNA');
    console.log('7 Parcours Patients');
    console.log('='.repeat(60) + '\n');

    const serversOk = await checkServers();
    if (!serversOk) {
        console.error('❌ Cannot proceed without servers running.');
        process.exit(1);
    }

    console.log('Launching Chrome browser with Playwright...\n');
    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized'],
        channel: 'chrome' // Use system Chrome
    });

    try {
        // Run Cas 1a
        const result = await runCas1a(browser);

        console.log('\n' + '='.repeat(60));
        console.log('TEST COMPLETED');
        console.log('='.repeat(60));
        console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        if (result.screenshots) {
            console.log(`Screenshots: ${result.screenshots} captured in screenshots/cas1a/`);
        }
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
    } finally {
        await browser.close();
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
