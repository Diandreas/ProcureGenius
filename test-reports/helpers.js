const fs = require('fs');
const path = require('path');

/**
 * Helpers pour tests automatisés Puppeteer
 * Centre de Santé JULIANNA - Tests parcours patients
 */

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:8000/api/v1';

// Données de test
const PATIENT_FABRICE = {
    firstName: 'Fabrice',
    lastName: 'Mukendi',
    phone: '+243991234567',
    address: 'Makepe Saint-Tropez, Douala',
    quartier: 'Makepe',
    dateOfBirth: '1985-05-15',
    gender: 'M',
    email: 'fabrice.test@csj.com'
};

const PATIENT_ANGEL = {
    firstName: 'Angel',
    lastName: 'Nkomo',
    phone: '+243997654321',
    address: 'Bonapriso, Douala',
    quartier: 'Bonapriso',
    dateOfBirth: '1990-03-22',
    gender: 'F',
    email: 'angel.externe@email.com'
};

/**
 * Setup monitoring pour capturer network calls et console logs
 */
async function setupMonitoring(page, networkCalls, consoleLogs) {
    // Capture console logs
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();

        if (!consoleLogs[type]) {
            consoleLogs[type] = [];
        }
        consoleLogs[type].push({
            type,
            text,
            timestamp: new Date().toISOString()
        });
    });

    // Capture network calls
    page.on('response', async response => {
        const url = response.url();

        // Only track API calls
        if (url.includes('/api/')) {
            try {
                const request = response.request();
                const timing = response.timing();

                const call = {
                    url,
                    method: request.method(),
                    status: response.status(),
                    statusText: response.statusText(),
                    timing: timing ? Math.round(timing.responseEnd - timing.requestStart) : 0,
                    timestamp: new Date().toISOString()
                };

                // Try to capture response body for successful calls
                if (response.status() < 400) {
                    try {
                        const contentType = response.headers()['content-type'];
                        if (contentType && contentType.includes('application/json')) {
                            call.responseBody = await response.json();
                        }
                    } catch (e) {
                        // Response might not be JSON or already consumed
                    }
                }

                networkCalls.push(call);
            } catch (error) {
                console.error('Error capturing network call:', error);
            }
        }
    });
}

/**
 * Login to the application
 */
async function login(page, username, password) {
    console.log(`Logging in as ${username}...`);

    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });

    // Wait for login form
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 });

    // Fill login form
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
        await inputs[0].type(username);
        await inputs[1].type(password);
    }

    // Submit form
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
            submitButton.click()
        ]);
    }

    // Verify login success - check for auth token in localStorage
    const token = await page.evaluate(() => localStorage.getItem('authToken'));

    if (!token) {
        throw new Error('Login failed - no auth token found');
    }

    console.log('Login successful!');
    await page.waitForTimeout(1000); // Let UI settle
}

/**
 * Take a screenshot and save it
 */
async function screenshot(page, caseName, stepName) {
    const screenshotPath = path.join(__dirname, 'screenshots', caseName, `${stepName}.png`);

    // Ensure directory exists
    const dir = path.dirname(screenshotPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    await page.screenshot({
        path: screenshotPath,
        fullPage: true
    });

    console.log(`Screenshot saved: ${stepName}`);
    return `./screenshots/${caseName}/${stepName}.png`;
}

/**
 * Wait for a specific API call
 */
async function waitForAPI(page, endpointPattern, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`Timeout waiting for API: ${endpointPattern}`));
        }, timeout);

        page.on('response', async response => {
            if (response.url().includes(endpointPattern)) {
                clearTimeout(timeoutId);
                const status = response.status();
                let body = null;

                try {
                    body = await response.json();
                } catch (e) {
                    // Not JSON
                }

                resolve({ status, body, url: response.url() });
            }
        });
    });
}

/**
 * Safe click with retry
 */
async function safeClick(page, selector, options = {}) {
    const maxRetries = 3;
    const { timeout = 10000, waitAfter = 500 } = options;

    for (let i = 0; i < maxRetries; i++) {
        try {
            await page.waitForSelector(selector, { timeout, visible: true });
            await page.click(selector);
            await page.waitForTimeout(waitAfter);
            return true;
        } catch (error) {
            if (i === maxRetries - 1) {
                throw new Error(`Failed to click ${selector}: ${error.message}`);
            }
            console.log(`Retry ${i + 1} for clicking ${selector}`);
            await page.waitForTimeout(1000);
        }
    }
}

/**
 * Safe type with retry
 */
async function safeType(page, selector, text, options = {}) {
    const maxRetries = 3;
    const { timeout = 10000, delay = 50 } = options;

    for (let i = 0; i < maxRetries; i++) {
        try {
            await page.waitForSelector(selector, { timeout, visible: true });
            await page.click(selector); // Focus
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            await page.type(selector, text, { delay });
            return true;
        } catch (error) {
            if (i === maxRetries - 1) {
                throw new Error(`Failed to type in ${selector}: ${error.message}`);
            }
            console.log(`Retry ${i + 1} for typing in ${selector}`);
            await page.waitForTimeout(1000);
        }
    }
}

/**
 * Search for a patient
 */
async function searchPatient(page, name) {
    console.log(`Searching for patient: ${name}...`);

    // Try to find search input
    const searchSelectors = [
        'input[placeholder*="Rechercher"]',
        'input[placeholder*="Search"]',
        'input[type="search"]',
        'input[name="search"]'
    ];

    let searchInput = null;
    for (const selector of searchSelectors) {
        searchInput = await page.$(selector);
        if (searchInput) break;
    }

    if (!searchInput) {
        console.log('No search input found, navigating to patients list');
        await page.goto(`${BASE_URL}/healthcare/patients`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(1000);
    } else {
        await searchInput.type(name);
        await page.waitForTimeout(1500); // Wait for search results
    }

    // Try to find patient in results
    const patientLinks = await page.$$('a[href*="/healthcare/patients/"]');

    if (patientLinks.length > 0) {
        console.log(`Found ${patientLinks.length} patient(s)`);
        const firstPatient = patientLinks[0];
        const href = await firstPatient.evaluate(el => el.href);
        const match = href.match(/\/healthcare\/patients\/(\d+)/);
        if (match) {
            const patientId = parseInt(match[1]);
            console.log(`Patient ID: ${patientId}`);
            return patientId;
        }
    }

    return null;
}

/**
 * Create a new patient
 */
async function createPatient(page, patientData) {
    console.log(`Creating patient: ${patientData.firstName} ${patientData.lastName}...`);

    await page.goto(`${BASE_URL}/healthcare/patients/new`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(1000);

    // Fill form fields
    const fillField = async (labelText, value) => {
        try {
            // Try to find input by label
            const labels = await page.$$('label');
            for (const label of labels) {
                const text = await label.evaluate(el => el.textContent);
                if (text.toLowerCase().includes(labelText.toLowerCase())) {
                    const forAttr = await label.evaluate(el => el.getAttribute('for'));
                    if (forAttr) {
                        await safeType(page, `#${forAttr}`, value);
                        return;
                    }
                    // Try sibling input
                    const input = await label.evaluateHandle(el =>
                        el.nextElementSibling?.querySelector('input') ||
                        el.querySelector('input') ||
                        el.closest('div')?.querySelector('input')
                    );
                    if (input) {
                        await input.type(value);
                        return;
                    }
                }
            }

            // Fallback: try by name attribute
            const nameSelectors = [
                `input[name*="${labelText}"]`,
                `input[id*="${labelText}"]`
            ];
            for (const selector of nameSelectors) {
                const input = await page.$(selector);
                if (input) {
                    await input.type(value);
                    return;
                }
            }
        } catch (error) {
            console.log(`Could not fill field "${labelText}": ${error.message}`);
        }
    };

    // Fill all fields
    await fillField('prénom', patientData.firstName);
    await fillField('nom', patientData.lastName);
    await fillField('téléphone', patientData.phone);
    await fillField('adresse', patientData.address);
    await fillField('email', patientData.email);

    // Handle date of birth
    const dobInput = await page.$('input[type="date"]');
    if (dobInput) {
        await dobInput.type(patientData.dateOfBirth);
    }

    // Handle gender select
    const genderSelect = await page.$('select');
    if (genderSelect) {
        await genderSelect.select(patientData.gender);
    }

    // Submit form
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
            submitButton.click()
        ]);
    }

    await page.waitForTimeout(2000);

    // Try to extract patient ID from URL
    const url = page.url();
    const match = url.match(/\/healthcare\/patients\/(\d+)/);
    if (match) {
        const patientId = parseInt(match[1]);
        console.log(`Patient created with ID: ${patientId}`);
        return patientId;
    }

    return null;
}

/**
 * Export HAR file
 */
async function exportHAR(client, caseName) {
    try {
        const har = await client.send('Network.getHAR');
        const harPath = path.join(__dirname, 'har', `${caseName}.har`);
        fs.writeFileSync(harPath, JSON.stringify(har, null, 2));
        console.log(`HAR exported: ${caseName}.har`);
    } catch (error) {
        console.error(`Failed to export HAR: ${error.message}`);
    }
}

/**
 * Save logs to file
 */
function saveLogs(caseName, consoleLogs, networkCalls) {
    // Save console logs
    const consoleLogPath = path.join(__dirname, 'logs', `${caseName}_console.log`);
    const consoleLogContent = Object.keys(consoleLogs).map(type => {
        return `\n=== ${type.toUpperCase()} ===\n` +
            consoleLogs[type].map(log => `[${log.timestamp}] ${log.text}`).join('\n');
    }).join('\n');
    fs.writeFileSync(consoleLogPath, consoleLogContent);

    // Save network calls
    const networkPath = path.join(__dirname, 'network', `${caseName}_api_calls.json`);
    fs.writeFileSync(networkPath, JSON.stringify(networkCalls, null, 2));

    console.log(`Logs saved for ${caseName}`);
}

/**
 * Generate markdown report
 */
function generateReport(caseName, data) {
    const {
        title,
        description,
        screenshots,
        networkCalls,
        consoleLogs,
        validations,
        artifacts,
        duration,
        errors
    } = data;

    const reportPath = path.join(__dirname, `${caseName}.md`);

    let report = `# Rapport de Test - ${title}\n\n`;
    report += `## Informations de Test\n`;
    report += `- **Date**: ${new Date().toLocaleString('fr-FR')}\n`;
    report += `- **Testeur**: Puppeteer Automation\n`;
    report += `- **Compte**: julianna_admin\n`;
    report += `- **Navigateur**: Chrome/Chromium (Puppeteer)\n`;
    report += `- **Durée totale**: ${duration}s\n\n`;

    report += `## Résumé\n`;
    report += `${description}\n\n`;

    const hasErrors = errors && errors.length > 0;
    const allValidationsPassed = validations && Object.values(validations).every(v => v === true);
    const status = hasErrors ? '❌ ÉCHEC' : (allValidationsPassed ? '✅ SUCCÈS' : '⚠️ SUCCÈS AVEC RÉSERVES');
    report += `**Résultat**: ${status}\n\n`;

    report += `## Étapes Exécutées\n\n`;
    screenshots.forEach((screenshot, index) => {
        report += `### ${index + 1}. ${screenshot.step}\n`;
        if (screenshot.description) {
            report += `${screenshot.description}\n\n`;
        }
        report += `![Screenshot](${screenshot.path})\n\n`;
    });

    report += `## Appels API Tracés\n\n`;
    report += `| # | Endpoint | Méthode | Statut | Temps | Notes |\n`;
    report += `|---|----------|---------|--------|-------|-------|\n`;

    const apiCalls = networkCalls.filter(call => call.url.includes('/api/'));
    apiCalls.forEach((call, index) => {
        const endpoint = call.url.replace(API_URL, '');
        const statusIcon = call.status < 400 ? '✅' : '❌';
        report += `| ${index + 1} | ${endpoint} | ${call.method} | ${call.status} | ${call.timing}ms | ${statusIcon} |\n`;
    });

    report += `\n**Total appels**: ${apiCalls.length}\n`;
    report += `**Appels réussis**: ${apiCalls.filter(c => c.status < 400).length}\n`;
    report += `**Appels échoués**: ${apiCalls.filter(c => c.status >= 400).length}\n\n`;

    if (errors && errors.length > 0) {
        report += `## Erreurs Détectées\n\n`;
        errors.forEach((error, index) => {
            report += `### Erreur ${index + 1}: ${error.title}\n`;
            report += `- **Type**: ${error.type}\n`;
            report += `- **Gravité**: ${error.severity}\n`;
            report += `- **Message**: ${error.message}\n\n`;
        });
    } else {
        report += `## Erreurs Détectées\n\n`;
        report += `✅ Aucune erreur détectée\n\n`;
    }

    report += `## Logs Console\n\n`;
    report += `### Errors (🔴)\n`;
    const errors_logs = consoleLogs.error || [];
    if (errors_logs.length === 0) {
        report += `Aucune\n\n`;
    } else {
        errors_logs.forEach(log => {
            report += `- ${log.text}\n`;
        });
        report += `\n`;
    }

    report += `### Warnings (🟡)\n`;
    const warnings = consoleLogs.warning || consoleLogs.warn || [];
    if (warnings.length === 0) {
        report += `Aucune\n\n`;
    } else {
        warnings.forEach(log => {
            report += `- ${log.text}\n`;
        });
        report += `\n`;
    }

    if (validations) {
        report += `## Points de Contrôle\n\n`;
        Object.keys(validations).forEach(key => {
            const icon = validations[key] ? '✅' : '❌';
            const label = key.replace(/([A-Z])/g, ' $1').trim();
            report += `- [${icon}] ${label}\n`;
        });

        const totalValidations = Object.keys(validations).length;
        const passedValidations = Object.values(validations).filter(v => v).length;
        report += `\n**Score**: ${passedValidations}/${totalValidations} points validés\n\n`;
    }

    if (artifacts) {
        report += `## Artefacts Générés\n\n`;
        Object.keys(artifacts).forEach(key => {
            report += `- **${key}**: ${artifacts[key]}\n`;
        });
        report += `\n`;
    }

    report += `## Fichiers Associés\n\n`;
    report += `- Screenshots: \`./screenshots/${caseName}/\` (${screenshots.length} fichiers)\n`;
    report += `- Logs console: \`./logs/${caseName}_console.log\`\n`;
    report += `- Network HAR: \`./har/${caseName}.har\`\n`;
    report += `- API Calls JSON: \`./network/${caseName}_api_calls.json\`\n\n`;

    report += `## Conclusion\n\n`;
    report += `**Status**: ${status}\n\n`;
    report += `---\n`;
    report += `*Rapport généré automatiquement par Puppeteer - ${new Date().toLocaleString('fr-FR')}*\n`;

    fs.writeFileSync(reportPath, report);
    console.log(`Report generated: ${caseName}.md`);
}

module.exports = {
    BASE_URL,
    API_URL,
    PATIENT_FABRICE,
    PATIENT_ANGEL,
    setupMonitoring,
    login,
    screenshot,
    waitForAPI,
    safeClick,
    safeType,
    searchPatient,
    createPatient,
    exportHAR,
    saveLogs,
    generateReport
};
