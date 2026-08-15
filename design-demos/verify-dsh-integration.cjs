const { chromium } = require('playwright')

const baseURL = process.argv[2] ?? 'http://127.0.0.1:3080'
const datasetPath = process.argv[3]
if (!datasetPath) throw new Error('usage: node verify-dsh-integration.cjs URL DATASET_PATH')

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  try {
    await page.goto(baseURL)
    const continueButton = page.getByRole('button', { name: 'Continue', exact: true })
    await continueButton.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click()
      await continueButton.waitFor({ state: 'hidden' })
    }
    // A fresh DSH_HOME opens product onboarding above all plugin UI. Force the
    // plugin action so this smoke test can exercise the plugin without storing
    // fake model credentials in the temporary profile.
    await page.getByTitle('Open NeuroPreviewer').evaluate(element => element.click())
    await page.waitForTimeout(300)
    await page.screenshot({ path: 'design-demos/screenshots/dsh-after-trigger.png' })
    const pickerBox = await page.getByRole('dialog', { name: 'Choose neuroscience data from workspace' }).boundingBox()
    if (pickerBox && pickerBox.width > 700) throw new Error('workspace picker should remain a compact popup')
    const listedLabel = await page.locator('.np-picker-path').textContent().catch(() => null)
    const listedPath = listedLabel?.split(' · ').at(-1)
    if (listedPath && (datasetPath === listedPath || datasetPath.startsWith(`${listedPath}/`))) {
      const relativeParts = datasetPath.slice(listedPath.length).split('/').filter(Boolean)
      for (const part of relativeParts) {
        await page.locator('.np-picker-row').filter({ has: page.getByText(part, { exact: true }) }).click()
      }
      if (!await page.getByText('Workspace root', { exact: true }).isVisible()) throw new Error('tree lost its workspace root')
      await page.getByRole('button', { name: 'Open viewer' }).click()
    } else {
      await page.getByRole('button', { name: 'Open another host path…' }).click()
      await page.getByLabel('Dataset path').fill(datasetPath)
      await page.getByRole('button', { name: 'Open path' }).click()
    }
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'design-demos/screenshots/dsh-after-open.png' })
    const openError = await page.locator('.np-error').textContent().catch(() => null)
    if (openError) throw new Error(`viewer open failed: ${openError}`)
    await page.locator('.np-shell canvas').first().waitFor({ state: 'visible', timeout: 20_000 })
    if (await page.locator('.np-shell canvas').count() !== 3) throw new Error('expected three linked MPR canvases')

    await page.getByLabel('x position').evaluate(element => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, '40')
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.getByLabel('Time volume').evaluate(element => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, '120')
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'design-demos/screenshots/dsh-interactive-workbench.png' })
    if (!await page.getByText('T 120', { exact: true }).isVisible()) throw new Error('time control did not move to volume 120')
    if (errors.length > 0) throw new Error(`browser errors: ${errors.join('; ')}`)
    process.stdout.write('PASS DSH sidebar entry, workspace tree popup, and interactive MPR workbench\n')
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
