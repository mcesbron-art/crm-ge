const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Try to access the home page which redirects to dashboard
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    
    // Wait a moment for any redirects
    await page.waitForLoadState('networkidle');
    
    // Check the current URL to see where we ended up
    const url = page.url();
    console.log('Current URL:', url);
    
    // Take screenshot of wherever we are
    await page.screenshot({ path: '/tmp/app-page.png', fullPage: true });
    console.log('✓ Screenshot saved: /tmp/app-page.png');
    
  } catch (e) {
    console.error('Navigation error:', e.message);
  } finally {
    await browser.close();
  }
})();
