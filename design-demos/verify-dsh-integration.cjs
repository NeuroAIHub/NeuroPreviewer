const { chromium } = require('playwright')

const baseURL = process.argv[2] ?? 'http://127.0.0.1:3080'
const datasetPath = process.argv[3]
const screenshotPath = process.argv[4] ?? 'design-demos/screenshots/dsh-interactive-workbench.png'
const pickerScreenshotPath = process.argv[5]
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
    const sidebarAlignment = await page.getByTitle('Open NeuroPreviewer').evaluate(element => {
      const native = [...document.querySelectorAll('button[aria-label]')].find(button => [...button.classList].some(name => name.endsWith('_newSession')))
        ?? [...document.querySelectorAll('button[aria-label]')].find(button => /^(New session|新建会话)$/.test(button.getAttribute('aria-label') ?? ''))
      if (!(native instanceof HTMLElement)) throw new Error('native New Session button was not found')
      const pluginIcon = element.querySelector('.np-logo')
      const nativeIcon = native.querySelector('svg')
      if (!(pluginIcon instanceof SVGElement) || !(nativeIcon instanceof SVGElement)) throw new Error('sidebar icon elements were not found')
      const center = node => { const box = node.getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width, height: box.height } }
      return {
        pluginButton: center(element), nativeButton: center(native),
        pluginIcon: center(pluginIcon), nativeIcon: center(nativeIcon),
      }
    })
    if (Math.abs(sidebarAlignment.pluginButton.x - sidebarAlignment.nativeButton.x) > 1 || Math.abs(sidebarAlignment.pluginButton.width - sidebarAlignment.nativeButton.width) > 1) {
      throw new Error(`expanded NeuroPreviewer button does not match native sidebar geometry: ${JSON.stringify(sidebarAlignment)}`)
    }
    if (Math.abs(sidebarAlignment.pluginIcon.x - sidebarAlignment.nativeIcon.x) > 0.5) {
      throw new Error(`expanded NeuroPreviewer icon is not aligned with the native icon: ${JSON.stringify(sidebarAlignment)}`)
    }
    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    await page.locator('.np-trigger-compact').waitFor()
    await page.waitForTimeout(350)
    const collapsedAlignment = await page.getByTitle('Open NeuroPreviewer').evaluate(element => {
      const native = [...document.querySelectorAll('button[aria-label]')].find(button => [...button.classList].some(name => name.endsWith('_newSession')))
      if (!(native instanceof HTMLElement)) throw new Error('collapsed native New Session button was not found')
      const pluginIcon = element.querySelector('.np-logo')
      const nativeIcon = native.querySelector('svg')
      if (!(pluginIcon instanceof SVGElement) || !(nativeIcon instanceof SVGElement)) throw new Error('collapsed sidebar icons were not found')
      const center = node => { const box = node.getBoundingClientRect(); return { x: box.x + box.width / 2, width: box.width, height: box.height } }
      return { pluginButton: center(element), nativeButton: center(native), pluginIcon: center(pluginIcon), nativeIcon: center(nativeIcon), sidebarWidth: native.parentElement?.getBoundingClientRect().width }
    })
    if (Math.abs(collapsedAlignment.pluginButton.x - collapsedAlignment.nativeButton.x) > 0.5 || Math.abs(collapsedAlignment.pluginIcon.x - collapsedAlignment.nativeIcon.x) > 0.5 || collapsedAlignment.sidebarWidth > 56) {
      throw new Error(`collapsed NeuroPreviewer icon is not aligned with native icons: ${JSON.stringify(collapsedAlignment)}`)
    }
    await page.getByRole('button', { name: 'Open sidebar' }).click()
    await page.locator('.np-trigger-wide').waitFor()
    // A fresh DSH_HOME opens product onboarding above all plugin UI. Force the
    // plugin action so this smoke test can exercise the plugin without storing
    // fake model credentials in the temporary profile.
    await page.getByTitle('Open NeuroPreviewer').evaluate(element => element.click())
    await page.waitForTimeout(300)
    await page.screenshot({ path: 'design-demos/screenshots/dsh-after-trigger.png' })
    const pickerBox = await page.getByRole('dialog', { name: 'Choose neuroscience data from workspace' }).boundingBox()
    if (pickerBox && pickerBox.width > 700) throw new Error('workspace picker should remain a compact popup')
    const theme = await page.getByRole('dialog', { name: 'Choose neuroscience data from workspace' }).evaluate(element => {
      const style = getComputedStyle(element)
      return {
        background: style.backgroundColor,
        expectedBackground: style.getPropertyValue('--dsw-alias-bg-layer-2').trim(),
        color: style.color,
        expectedColor: style.getPropertyValue('--dsw-alias-label-primary').trim(),
      }
    })
    if (theme.expectedBackground && theme.background !== theme.expectedBackground) {
      throw new Error(`workspace picker background does not follow DSH theme: ${theme.background}`)
    }
    if (theme.expectedColor && theme.color !== theme.expectedColor) {
      throw new Error(`workspace picker text does not follow DSH theme: ${theme.color}`)
    }
    if (pickerScreenshotPath) await page.screenshot({ path: pickerScreenshotPath })
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

    const xControl = page.getByLabel('x position')
    const yControl = page.getByLabel('y position')
    const zControl = page.getByLabel('z position')
    async function assertPlaneClickMoves(index, name, controls, position) {
      const before = await Promise.all(controls.map(control => control.inputValue()))
      const plane = page.locator('.np-plane').nth(index)
      const box = await plane.boundingBox()
      if (!box) throw new Error(`${name} canvas has no clickable bounds`)
      await plane.click({ position: { x: box.width * position.x, y: box.height * position.y } })
      await page.waitForTimeout(100)
      const after = await Promise.all(controls.map(control => control.inputValue()))
      if (after.some((value, valueIndex) => value === before[valueIndex])) {
        throw new Error(`clicking the ${name} slice did not move the linked crosshair: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`)
      }
      const verticalLine = await plane.locator('.np-cross-v').boundingBox()
      const horizontalLine = await plane.locator('.np-cross-h').boundingBox()
      if (!verticalLine || !horizontalLine) throw new Error(`${name} crosshair is not visible`)
      const rendered = {
        x: (verticalLine.x - box.x) / box.width,
        y: (horizontalLine.y - box.y) / box.height,
      }
      if (Math.abs(rendered.x - position.x) > 0.025 || Math.abs(rendered.y - position.y) > 0.025) {
        throw new Error(`clicking the ${name} slice placed the crosshair away from the click: click=${JSON.stringify(position)} crosshair=${JSON.stringify(rendered)}`)
      }
    }
    await assertPlaneClickMoves(0, 'axial', [xControl, yControl], { x: 0.2, y: 0.75 })
    await assertPlaneClickMoves(1, 'coronal', [xControl, zControl], { x: 0.75, y: 0.2 })
    await assertPlaneClickMoves(2, 'sagittal', [yControl, zControl], { x: 0.35, y: 0.8 })

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
    await page.screenshot({ path: screenshotPath })
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
