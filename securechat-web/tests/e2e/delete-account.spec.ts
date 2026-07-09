import { test, expect } from '@playwright/test'
import { waitForAppReady } from '../helpers/setup'

test.describe('Delete Account End-to-End Tests', () => {

  test('should completely delete the account and securely log the user out', async ({ page }) => {
    // 1. Navigate to Settings -> Delete Account
    await page.goto('/settings')
    await waitForAppReady(page)

    // 2. Open the Delete Account Modal
    await page.getByRole('button', { name: /Delete Account/i }).click()
    
    const modalHeading = page.getByRole('heading', { name: /Delete Account/i })
    await expect(modalHeading).toBeVisible()

    // 3. Perform Validation (Button should be disabled initially)
    const deleteButton = page.getByRole('button', { name: /Confirm Delete/i })
    await expect(deleteButton).toBeDisabled()

    // 4. Fill in confirmation
    await page.getByPlaceholderText(/Type DELETE/i).fill('DELETE')
    
    // 5. Button should now be enabled
    await expect(deleteButton).toBeEnabled()

    // 6. Intercept Edge Function call to simulate successful deletion
    await page.route('**/functions/v1/delete-account', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    }))

    // 7. Execute Delete
    await deleteButton.click()

    // 8. Wait for Automatic Logout & Redirect to Login Page
    // Since our AccountService resets the AuthStore natively on a 200 response,
    // the ProtectedRoute wrapper should instantly boot us back to '/' or '/login'
    await expect(page).toHaveURL(/.*\/login|^\/$/)
    
    // 9. Verify Login screen is fully rendered
    const loginHeading = page.getByRole('heading', { name: /SecureChat AI/i })
    await expect(loginHeading).toBeVisible()
  })

  test('should handle network/storage deletion failures gracefully', async ({ page }) => {
    await page.goto('/settings')
    await waitForAppReady(page)

    await page.getByRole('button', { name: /Delete Account/i }).click()
    await page.getByPlaceholderText(/Type DELETE/i).fill('DELETE')
    
    // Intercept and simulate a rollback/failure from the Edge Function
    await page.route('**/functions/v1/delete-account', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Storage deletion failed, transaction rolled back' })
    }))

    await page.getByRole('button', { name: /Confirm Delete/i }).click()

    // 1. Should NOT redirect to login (Session remains active)
    await expect(page).not.toHaveURL(/.*\/login|^\/$/)
    
    // 2. Should display error toast or inline message
    await expect(page.getByText(/transaction rolled back/i)).toBeVisible()
  })
})
