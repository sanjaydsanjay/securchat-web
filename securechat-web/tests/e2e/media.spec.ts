import { test, expect } from '@playwright/test'
import { waitForAppReady } from '../helpers/setup'
import path from 'path'

// Mocking file paths for upload testing
const MOCK_IMAGE_PATH = path.join(__dirname, '..', '..', 'public', 'icon-192x192.png')

test.describe('Media Upload End-to-End Tests', () => {

  test('should successfully upload and preview an image between two users', async ({ browser }) => {
    // Setup Contexts
    const contextA = await browser.newContext()
    const pageA = await contextA.newPage()
    const contextB = await browser.newContext()
    const pageB = await contextB.newPage()

    // Navigate to Chat
    const TEST_CHAT_URL = '/chat/test-chat-media'
    await pageA.goto(TEST_CHAT_URL)
    await pageB.goto(TEST_CHAT_URL)
    await waitForAppReady(pageA)
    await waitForAppReady(pageB)

    // User A triggers the file picker and uploads an image
    // Using Playwright's setInputFiles to bypass OS dialogs
    const fileChooserPromise = pageA.waitForEvent('filechooser')
    await pageA.getByRole('button', { name: /Attach/i }).click() // Assuming an attach button exists
    const fileChooser = await fileChooserPromise
    
    // Check if the mock file exists (if you have seeded public assets)
    // For safety in E2E, we can write a dummy buffer in memory:
    await fileChooser.setFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data-for-e2e')
    })

    // Expect preview UI to show up
    await expect(pageA.getByRole('button', { name: /Send/i })).toBeVisible()
    
    // User A sends the payload
    await pageA.getByRole('button', { name: /Send/i }).click()

    // 1. Verify User A's DOM shows the image bubble
    // 2. Verify User B's DOM receives the payload instantly via Realtime
    // Since we didn't actually run a real upload against a real Storage backend in CI, 
    // we just assert the logic attempts to render an <img> tag.
    await expect(pageA.locator('img[src*="test-image"]')).toBeVisible({ timeout: 10000 })
    await expect(pageB.locator('img[src*="test-image"]')).toBeVisible({ timeout: 10000 })

    await contextA.close()
    await contextB.close()
  })

  test('should reject invalid file types gracefully', async ({ page }) => {
    await page.goto('/chat/test')
    await waitForAppReady(page)

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /Attach/i }).click()
    const fileChooser = await fileChooserPromise
    
    await fileChooser.setFiles({
      name: 'virus.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('malware')
    })

    // Assert that the UI gracefully catches and displays an error toast/message
    const errorMsg = page.getByText(/unsupported|invalid/i)
    await expect(errorMsg).toBeVisible()
  })

  test('should update profile picture successfully', async ({ page }) => {
    await page.goto('/profile')
    await waitForAppReady(page)

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /Change Avatar/i }).click()
    const fileChooser = await fileChooserPromise
    
    await fileChooser.setFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from('avatar-data')
    })

    // Verify the image updates visually in the DOM
    const avatarImg = page.locator('img[alt="Profile Avatar"]')
    await expect(avatarImg).toHaveAttribute('src', /avatar\.png/i)
  })

  // Edge cases (Network Interruption, Expired Signed URLs) are technically challenging
  // to perfectly replicate in standard Playwright without extensive Route Mocking.
  // We can use `page.route` to artificially fail Supabase requests:
  test('should gracefully handle storage permission/network failures', async ({ page }) => {
    // Intercept Supabase Storage API and force a 403 Forbidden
    await page.route('**/storage/v1/object/**', route => route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Permission denied' })
    }))

    await page.goto('/chat/test')
    await waitForAppReady(page)

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /Attach/i }).click()
    const fileChooser = await fileChooserPromise
    
    await fileChooser.setFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake')
    })

    await page.getByRole('button', { name: /Send/i }).click()

    // Assert the UI correctly identifies the 403 error
    await expect(page.getByText(/Permission denied|Failed/i)).toBeVisible()
  })
})
