import { Page, expect } from '@playwright/test'

/**
 * Reusable helper to quickly wait for the application to settle.
 */
export async function waitForAppReady(page: Page) {
  // Wait for the main root element to be attached
  await page.waitForSelector('#root', { state: 'attached' })
  // Give React a moment to hydrate (optional, but sometimes necessary for complex initial renders)
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Validates that we are explicitly on the login page.
 */
export async function expectLoginPage(page: Page) {
  await expect(page).toHaveURL(/.*\/login|^\/$/)
  const heading = page.getByRole('heading', { name: /SecureChat AI/i })
  await expect(heading).toBeVisible()
}
