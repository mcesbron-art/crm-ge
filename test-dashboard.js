const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Opening demo page...');
    await page.goto('http://localhost:3000/demo', { waitUntil: 'networkidle' });

    console.log('Page loaded successfully');

    // Take a screenshot
    await page.screenshot({ path: '/Users/admin/Desktop/dashboard-light.png', fullPage: true });
    console.log('Light mode screenshot saved');

    // Toggle dark mode
    const themeBtn = await page.locator('button:has-text("Mode sombre")');
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: '/Users/admin/Desktop/dashboard-dark.png', fullPage: true });
      console.log('Dark mode screenshot saved');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
