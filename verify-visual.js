const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to login page
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/login-page.png', fullPage: true });
    console.log('✓ Screenshot of login page saved: /tmp/login-page.png');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
