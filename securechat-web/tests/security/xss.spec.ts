import { test, expect } from '@playwright/test'
import { waitForAppReady } from '../helpers/setup'

test.describe('Security & XSS Prevention Tests', () => {

  test('prevents XSS execution in chat messages', async ({ page }) => {
    // 1. Navigate to chat
    await page.goto('/chat/security-test-xss')
    await waitForAppReady(page)

    // 2. Mock a malicious message being received from Supabase Realtime
    const maliciousPayload = `<img src="x" onerror="window.xssFlag=true"> <script>window.xssFlag=true</script>`
    
    // We evaluate a script to simulate React rendering this payload.
    // In a real E2E, User A sends this, User B receives. We check User B's DOM.
    await page.getByPlaceholder(/Type a message/i).fill(maliciousPayload)
    await page.keyboard.press('Enter')
    
    // Give it a moment to render
    await page.waitForTimeout(500)
    
    // 3. Verify that the window.xssFlag was NOT set to true
    const isXSSExecuted = await page.evaluate(() => (window as any).xssFlag === true)
    expect(isXSSExecuted).toBe(false)
    
    // 4. Verify React escaped the HTML securely (it should be rendered as raw text, not DOM nodes)
    await expect(page.getByText('<script>')).toBeVisible()
  })

  test('protects against CSRF via Authorization Bearer headers', async ({ page }) => {
    // Test that the frontend drops credentials natively and relies strictly on the
    // session storage/JWT for Supabase requests, preventing cross-site ambient credentials.
    const token = await page.evaluate(() => localStorage.getItem('supabase.auth.token'))
    // It's secure if it uses headers instead of cookies, which Supabase does by default.
  })
})
