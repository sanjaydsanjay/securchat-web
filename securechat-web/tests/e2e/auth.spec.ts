import { test, expect } from '@playwright/test'
import { waitForAppReady, expectLoginPage } from '../helpers/setup'

// Generate a unique test user for this run to avoid collisions
const testId = Date.now()
const testEmail = `playwright.test.${testId}@example.com`
const testPassword = 'SecurePassword123!'
const testDisplayName = `Test User ${testId}`

test.describe('Authentication End-to-End Tests', () => {

  test('should redirect unauthenticated users from protected routes to login', async ({ page }) => {
    await page.goto('/chat')
    await waitForAppReady(page)
    await expectLoginPage(page)
  })

  test('should handle invalid login credentials correctly', async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)

    await page.getByPlaceholder('you@example.com').fill('fake@example.com')
    await page.getByPlaceholder('Min 6 characters').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()

    const errorMsg = page.locator('.text-red-500')
    await expect(errorMsg).toBeVisible()
    await expect(errorMsg).toContainText(/invalid/i)
  })

  test('should complete the user registration flow', async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)

    // Switch to Sign Up
    await page.getByRole('button', { name: 'Sign Up' }).click()

    // Fill form
    await page.getByPlaceholder('How others will see you').fill(testDisplayName)
    await page.getByPlaceholder('you@example.com').fill(testEmail)
    await page.getByPlaceholder('Min 6 characters').fill(testPassword)

    await page.getByRole('button', { name: 'Create Account' }).click()

    // Assuming Supabase requires email verification, we should see the check email screen
    const verifyHeading = page.getByRole('heading', { name: /Verify your email/i })
    await expect(verifyHeading).toBeVisible({ timeout: 10000 })
  })

  test('should execute the forgot password flow', async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)

    await page.getByText('Forgot password?').click()
    
    // Verify we are on the forgot password page
    await expect(page.getByRole('heading', { name: /Reset Password/i })).toBeVisible()
    
    await page.getByPlaceholder('you@example.com').fill(testEmail)
    await page.getByRole('button', { name: 'Send Reset Link' }).click()

    // Wait for success message
    await expect(page.getByText(/Check your email/i)).toBeVisible()
  })

  // Note: "Email verification callback", "Successful login", "Password reset flow", 
  // and "Logout flow" often require intercepting emails in an E2E environment. 
  // For standard automated runs against a real local Supabase without an email inbox trap, 
  // we normally test the UI states up until the email is fired, or use a test bypass 
  // (like Supabase Auth Admin API) to auto-confirm the user before testing the Login/Logout.
})
