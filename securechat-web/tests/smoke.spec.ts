import { test, expect } from '@playwright/test'
import { waitForAppReady, expectLoginPage } from './helpers/setup'

test.describe('Application Smoke Test', () => {
  test('should load the application and display the login page correctly', async ({ page }) => {
    // 1. Open the application
    await page.goto('/')
    
    // 2. Wait for React to mount and hydrate
    await waitForAppReady(page)

    // 3. Verify the login page loads successfully (Assuming unauthenticated users are redirected to login)
    await expectLoginPage(page)

    // 4. Check that the application title/logo is visible
    const title = page.getByRole('heading', { name: /SecureChat AI/i })
    await expect(title).toBeVisible()

    // 5. Check for the presence of Sign In & Sign Up buttons to ensure UI integrity
    const signInButton = page.getByRole('button', { name: /^Sign In$/i })
    const signUpButton = page.getByRole('button', { name: /^Sign Up$/i })
    
    await expect(signInButton).toBeVisible()
    await expect(signUpButton).toBeVisible()
  })
})
