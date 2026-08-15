const { chromium } = require('playwright')

const baseURL = process.argv[2] ?? 'http://127.0.0.1:3080'
const datasetPath = process.argv[3]
const expectedFormat = process.argv[4]
const screenshotPath = process.argv[5] ?? 'design-demos/screenshots/dsh-signal-workbench.png'
if (!datasetPath || !expectedFormat) throw new Error('usage: node verify-signal-integration.cjs URL DATASET_PATH FORMAT')

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  try {
    await page.goto(baseURL)
    const continueButton = page.getByRole('button', { name: 'Continue', exact: true })
    if (await continueButton.isVisible({ timeout: 3_000 }).catch(() => false)) await continueButton.click()
    await page.getByTitle('Open NeuroPreviewer').evaluate(element => element.click())
    const listedLabel = await page.locator('.np-picker-path').textContent().catch(() => null)
    const listedPath = listedLabel?.split(' · ').at(-1)
    if (listedPath && (datasetPath === listedPath || datasetPath.startsWith(`${listedPath}/`))) {
      const relativeParts = datasetPath.slice(listedPath.length).split('/').filter(Boolean)
      for (const part of relativeParts) await page.locator('.np-picker-row').filter({ has: page.getByText(part, { exact: true }) }).click()
      await page.getByRole('button', { name: 'Open viewer' }).click()
    } else {
      await page.getByRole('button', { name: 'Open another host path…' }).click()
      await page.getByLabel('Dataset path').fill(datasetPath)
      await page.getByRole('button', { name: 'Open path' }).click()
    }
    const openStarted = Date.now()
    await page.getByRole('dialog', { name: 'NeuroPreviewer signal viewer' }).waitFor({ timeout: 30_000 })
    const openMilliseconds = Date.now() - openStarted
    const openError = await page.locator('.np-error').textContent().catch(() => null)
    if (openError) throw new Error(`signal viewer open failed: ${openError}`)
    const waveforms = page.locator('.np-signal-row svg')
    const waveformCount = await waveforms.count()
    if (waveformCount < 1 || waveformCount > 8) throw new Error(`signal viewer rendered an invalid waveform count: ${waveformCount}`)
    const pointLists = await page.locator('.np-signal-line').evaluateAll(elements => elements.map(element => element.getAttribute('points') ?? ''))
    if (pointLists.some(points => points.split(' ').length < 2 || /NaN|Infinity/.test(points))) throw new Error('signal viewer rendered invalid waveform points')
    await page.getByText(expectedFormat, { exact: true }).waitFor()
    const time = page.getByLabel('Signal time position')
    const maxTime = Number(await time.getAttribute('max'))
    await time.evaluate((element, next) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(next))
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    }, Math.floor(maxTime / 2))
    const firstLabelBefore = await page.locator('.np-signal-label').first().textContent()
    const channel = page.getByLabel('First signal channel')
    const maxChannel = Number(await channel.getAttribute('max'))
    if (maxChannel > 0) await channel.evaluate(element => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, '1')
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.waitForTimeout(500)
    if (Number(await time.inputValue()) !== Math.floor(maxTime / 2)) throw new Error('signal time navigation did not persist')
    if (maxChannel > 0 && await page.locator('.np-signal-label').first().textContent() === firstLabelBefore) throw new Error('signal channel navigation did not change the visible channel')
    const duration = page.getByLabel('Signal window duration')
    const options = await duration.locator('option').evaluateAll(elements => elements.map(element => element.value))
    if (options.length > 1) {
      const before = await duration.inputValue()
      const next = options.find(value => value !== before)
      await duration.selectOption(next)
      await page.waitForTimeout(300)
      if (await duration.inputValue() === before) throw new Error('signal duration control did not change the window')
    }
    await page.screenshot({ path: screenshotPath })
    if (errors.length > 0) throw new Error(`browser errors: ${errors.join('; ')}`)
    process.stdout.write(`PASS DSH ${expectedFormat}: ${waveformCount} waveforms, open ${openMilliseconds} ms, time/duration/channel navigation\n`)
  } finally {
    await browser.close()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
