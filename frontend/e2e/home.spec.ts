import { test, expect } from './fixtures';
import { HomePage } from './pages/HomePage';

test.describe('Home page', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('should display the hero heading', async () => {
    await expect(homePage.heroHeading).toBeVisible();
    await expect(homePage.heroHeading).toContainText(/Global visa/i);
  });

  test('should display the stats strip', async () => {
    await expect(homePage.statsStrip).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    await expect(homePage.nav.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(homePage.nav.getByRole('link', { name: 'Pricing' })).toBeVisible();
    await expect(homePage.nav.getByRole('link', { name: 'About' })).toBeVisible();
  });
});
