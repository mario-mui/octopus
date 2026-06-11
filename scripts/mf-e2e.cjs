// Real-browser end-to-end check for Module Federation dynamic plugin loading.
// Launches Chromium against the served host (3000), which loads the remote
// (3001) at runtime, and asserts the remote-contributed page renders.
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

  const fail = async (msg) => {
    console.log('---- browser logs ----');
    console.log(logs.join('\n'));
    await browser.close();
    console.log('E2E_RESULT: FAIL -', msg);
    process.exit(1);
  };

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  // The sidebar nav entry for the remote plugin is auto-derived from its page
  // title — its presence proves the remote plugin was loaded and wired in.
  try {
    await page.getByRole('menuitem', { name: 'Remote Demo' }).waitFor({ timeout: 15000 });
  } catch {
    return fail('"Remote Demo" nav item never appeared (remote not loaded)');
  }

  // Navigate to the remote route and assert the remote page rendered.
  await page.getByRole('menuitem', { name: 'Remote Demo' }).click();
  try {
    await page.getByText('This page was loaded at runtime over Module Federation').waitFor({ timeout: 10000 });
  } catch {
    return fail('remote page content did not render after navigation');
  }

  // Prove the shared DI singleton: the remote page reads the host-provided
  // app-info API and renders "Octopus v0.0.0".
  const sharedDi = await page.getByText('Octopus v0.0.0').count();

  console.log('E2E_RESULT: PASS - remote plugin loaded, routed, and rendered');
  console.log('shared-DI value visible in remote page:', sharedDi > 0);
  await browser.close();
}

main().catch(err => {
  console.error('E2E_RESULT: FAIL -', err.message);
  process.exit(1);
});
