const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('Attempting to navigate to dashboard...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    
    const url = page.url();
    console.log('Final URL:', url);
    
    // Check if we have the Sidebar element (only on authenticated pages)
    const hasSidebar = await page.$('.app-sidebar') !== null;
    console.log('Has sidebar:', hasSidebar);
    
    // Take a screenshot regardless
    await page.screenshot({ path: '/tmp/dashboard-attempt.png', fullPage: true });
    console.log('✓ Screenshot saved: /tmp/dashboard-attempt.png');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
