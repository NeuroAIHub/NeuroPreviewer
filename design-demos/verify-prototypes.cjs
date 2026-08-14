const { chromium } = require('playwright')
const { pathToFileURL } = require('node:url')
const path = require('node:path')

const root = __dirname

async function verifyPage(browser, file, exercise) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto(pathToFileURL(path.join(root, file)).href)
  await exercise(page)
  if (errors.length > 0) throw new Error(`${file}: ${errors.join('; ')}`)
  await page.close()
  process.stdout.write(`PASS ${file}\n`)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    await verifyPage(browser, 'direction-a-gallery-focus.html', async page => {
      await page.click('[data-axis="coronal"]')
      if (!(await page.locator('#mainImage').getAttribute('src')).includes('fmri-coronal')) throw new Error('axis switch failed')
      await page.locator('#x').evaluate(element => {
        element.value = '48'
        element.dispatchEvent(new Event('input', { bubbles: true }))
      })
      if (!(await page.locator('#xOut').textContent()).startsWith('48')) throw new Error('spatial slider failed')
      await page.click('#next')
    })
    await verifyPage(browser, 'direction-b-mpr-workbench.html', async page => {
      await page.click('#next')
      if (!(await page.locator('#tOut').textContent()).startsWith('121')) throw new Error('time step failed')
      await page.locator('[data-view="axial"]').click({ position: { x: 120, y: 100 } })
      if ((await page.locator('#x').inputValue()) === '32') throw new Error('linked cursor failed')
    })
    await verifyPage(browser, 'direction-c-direct-manipulation.html', async page => {
      await page.locator('#t').evaluate(element => {
        element.value = '180'
        element.dispatchEvent(new Event('input', { bubbles: true }))
      })
      if (!(await page.locator('#mainImage').getAttribute('src')).includes('fmri-t180')) throw new Error('time scrub failed')
      await page.locator('.image-wrap').click({ position: { x: 160, y: 160 } })
      if ((await page.locator('#readCoord').textContent()) === '32, 32, 17') throw new Error('direct positioning failed')
    })
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
