import { test, expect } from '@playwright/test';

// Assume auth state is shared and loaded via setup for agent role

test.describe('Agent Portal Flow', () => {
  // Use a predefined storage state if you want to bypass login for Agent
  // test.use({ storageState: 'playwright/.auth/agent.json' });

  test('View Agent Dashboard & Students List', async ({ page }) => {
    // Mock the agent students API
    await page.route('**/api/agent/students', async route => {
      const json = [
        { id: 1, name: 'Alice Smith', status: 'Visa Approved' },
        { id: 2, name: 'Bob Jones', status: 'Documents Pending' }
      ];
      await route.fulfill({ json });
    });

    await page.goto('/agent-dashboard');
    
    // Verify Dashboard loads
    await expect(page.locator('[data-testid="agent-dashboard-header"]')).toBeVisible();

    // Navigate to students list
    await page.click('[data-testid="nav-students"]');
    
    // Verify students are rendered
    await expect(page.locator('[data-testid="student-row-1"]')).toBeVisible();
    await expect(page.locator('text=Alice Smith')).toBeVisible();
  });
});
