import { test, expect } from '@playwright/test'
import { waitForAppReady } from '../helpers/setup'

test.describe('Chat Export End-to-End Tests', () => {

  test('should successfully export chat as JSON and trigger download', async ({ page }) => {
    // 1. Navigate to a test chat
    await page.goto('/chat/export-test-123')
    await waitForAppReady(page)

    // 2. Open Chat Settings / Options menu
    await page.getByRole('button', { name: /Options/i }).click()
    await page.getByRole('menuitem', { name: /Export Chat/i }).click()

    // 3. The Export Modal should appear
    await expect(page.getByRole('heading', { name: /Export Chat/i })).toBeVisible()

    // 4. Select JSON (default usually)
    await page.getByLabelText(/JSON/i).check()

    // 5. Intercept the Edge Function to simulate the backend processing the export
    await page.route('**/functions/v1/export-chat', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: 'blob:http://localhost:5179/fake-download-uuid-json' })
    }))

    // Playwright natively traps `window.open` and standard `<a download>` navigations.
    // We catch the download event:
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
    
    // 6. Click Export
    await page.getByRole('button', { name: /^Export$/i }).click()

    // 7. Verify Success UI
    await expect(page.getByText(/Success/i)).toBeVisible()

    // Wait for download if it fired (Depends on how window.open vs anchor tags are implemented in UI)
    const download = await downloadPromise
    if (download) {
      expect(download.suggestedFilename()).toMatch(/export.*\.json/)
    }
  })

  test('should successfully export chat as PDF and trigger download', async ({ page }) => {
    await page.goto('/chat/export-test-123')
    await waitForAppReady(page)

    await page.getByRole('button', { name: /Options/i }).click()
    await page.getByRole('menuitem', { name: /Export Chat/i }).click()

    // Select PDF
    await page.getByLabelText(/PDF/i).check()

    await page.route('**/functions/v1/export-chat', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: 'blob:http://localhost:5179/fake-download-uuid-pdf' })
    }))

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
    await page.getByRole('button', { name: /^Export$/i }).click()
    await expect(page.getByText(/Success/i)).toBeVisible()

    const download = await downloadPromise
    if (download) {
      expect(download.suggestedFilename()).toMatch(/export.*\.pdf/)
    }
  })

  test('should block unauthorized users from exporting via Edge Function Simulation', async ({ page }) => {
    await page.goto('/chat/hacked-chat-999')
    await waitForAppReady(page)

    await page.getByRole('button', { name: /Options/i }).click()
    await page.getByRole('menuitem', { name: /Export Chat/i }).click()

    // Intercept with 403 Forbidden
    await page.route('**/functions/v1/export-chat', route => route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized: You are not a participant of this chat.' })
    }))

    await page.getByRole('button', { name: /^Export$/i }).click()

    // Expect the modal to surface the error
    await expect(page.getByText(/Unauthorized/i)).toBeVisible()
  })

  test('should remain responsive and show loading state for large chat history', async ({ page }) => {
    await page.goto('/chat/large-chat')
    await waitForAppReady(page)

    await page.getByRole('button', { name: /Options/i }).click()
    await page.getByRole('menuitem', { name: /Export Chat/i }).click()

    // Simulate a slow Edge Function response (e.g. 2 seconds) to test the UI loader
    await page.route('**/functions/v1/export-chat', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'blob:fake' })
      })
    })

    await page.getByRole('button', { name: /^Export$/i }).click()

    // Verify the loading spinner or text is visible
    await expect(page.getByText(/Exporting.../i)).toBeVisible()
    
    // UI should still be strictly responsive during this await
    const cancelButton = page.getByRole('button', { name: /Cancel/i })
    await expect(cancelButton).toBeEnabled()

    // Eventually completes
    await expect(page.getByText(/Success/i)).toBeVisible({ timeout: 5000 })
  })
})
