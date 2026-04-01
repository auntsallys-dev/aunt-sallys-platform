const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    // Test with English manual
    console.log('Converting manual-en.html to PDF...');
    const enPage = await browser.newPage();
    
    const enPath = `file://${path.resolve(__dirname, 'manual-en.html')}`;
    console.log(`Loading: ${enPath}`);
    
    const response = await enPage.goto(enPath, {
      waitUntil: 'networkidle2',
      timeout: 90000
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load page: ${response.status()}`);
    }
    
    console.log('Page loaded. Generating PDF...');
    
    await enPage.pdf({
      path: path.resolve(__dirname, 'manual-en.pdf'),
      format: 'A4',
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    });
    
    console.log('✓ manual-en.pdf created');
    await enPage.close();

    // Test with Filipino manual
    console.log('\nConverting manual-fil.html to PDF...');
    const filPage = await browser.newPage();
    
    const filPath = `file://${path.resolve(__dirname, 'manual-fil.html')}`;
    console.log(`Loading: ${filPath}`);
    
    const filResponse = await filPage.goto(filPath, {
      waitUntil: 'networkidle2',
      timeout: 90000
    });
    
    if (!filResponse.ok) {
      throw new Error(`Failed to load page: ${filResponse.status()}`);
    }
    
    console.log('Page loaded. Generating PDF...');
    
    await filPage.pdf({
      path: path.resolve(__dirname, 'manual-fil.pdf'),
      format: 'A4',
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    });
    
    console.log('✓ manual-fil.pdf created');
    await filPage.close();

    console.log('\n✅ Both PDFs completed successfully!');
    console.log(`English: /Users/jmbonnevie/Projects/aunt-sallys/manual-en.pdf`);
    console.log(`Filipino: /Users/jmbonnevie/Projects/aunt-sallys/manual-fil.pdf`);
    
    // Verify files exist
    const enPdfExists = fs.existsSync(path.resolve(__dirname, 'manual-en.pdf'));
    const filPdfExists = fs.existsSync(path.resolve(__dirname, 'manual-fil.pdf'));
    
    console.log(`\nFile verification:`);
    console.log(`  manual-en.pdf: ${enPdfExists ? '✓ exists' : '✗ missing'}`);
    console.log(`  manual-fil.pdf: ${filPdfExists ? '✓ exists' : '✗ missing'}`);

  } catch (error) {
    console.error('\n❌ Error during PDF conversion:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
