import { test, expect } from './fixtures';
import { HomePage } from './pages/HomePage';

test.describe('Navigation', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('should navigate to Pricing page', async ({ page }) => {
    await homePage.navigateTo('Pricing');
    await expect(page).toHaveURL(/\/pricing$/);
    await expect(page.getByText(/Fair, flat prices/i)).toBeVisible();
  });

  test('should navigate to About page', async ({ page }) => {
    await homePage.navigateTo('About');
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByText(/We believe a visa should never stand/i)).toBeVisible();
  });
});
