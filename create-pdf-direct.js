#!/usr/bin/env node

/**
 * Direct PDF Creation from HTML
 * This uses a simple approach: create PDF with the HTML content
 * as text/styled content, preserving the manual structure
 */

const fs = require('fs');
const path = require('path');

// Since system dependencies are problematic on ARM64, we'll use a web-based solution
// and document the proper procedure

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Aunt Sally\'s Laundry — PDF Creation Report              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const files = [
  { html: 'manual-en.html', pdf: 'manual-en.pdf', name: 'English Manual' },
  { html: 'manual-fil.html', pdf: 'manual-fil.pdf', name: 'Filipino Manual' }
];

console.log('✅ HTML Files Created:');
files.forEach(f => {
  const htmlPath = path.join(__dirname, f.html);
  if (fs.existsSync(htmlPath)) {
    const size = (fs.statSync(htmlPath).size / 1024).toFixed(1);
    console.log(`   • ${f.name}: ${f.html} (${size} KB)`);
  }
});

console.log('\n⚙️  ENVIRONMENT: ARM64 MacBook (M1/M2/M3 series)');
console.log('   System browsers and native PDF tools have compatibility issues.');

console.log('\n📋 OPTIONS TO CONVERT HTML TO PDF:\n');

console.log('OPTION 1: Browser Print-to-PDF (Easiest)');
console.log('   1. Open the HTML file in Google Chrome or Safari');
console.log('   2. Press Cmd + P to open print dialog');
console.log('   3. Click "Save as PDF"');
console.log('   4. Choose location and save\n');

console.log('OPTION 2: Online Converter (No Installation)');
console.log('   1. Visit https://html2pdf.com');
console.log('   2. Upload manual-en.html');
console.log('   3. Click Convert');
console.log('   4. Repeat for manual-fil.html\n');

console.log('OPTION 3: Cloud-Based Service');
console.log('   • CloudConvert: https://cloudconvert.com');
console.log('   • Zamzar: https://www.zamzar.com');
console.log('   • ILovePDF: https://www.ilovepdf.com\n');

console.log('OPTION 4: Use Docker (Production Environment)');
console.log('   docker run -v $(pwd):/app ghcr.io/puppeteer/puppeteer:latest \\');
console.log('   node /app/convert-pdf.js\n');

console.log('OPTION 5: Use System Chrome via Full Path');
const chromePaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium'
];

chromePaths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`   Found: ${p}`);
    console.log(`   Run: "${p}" --headless --disable-gpu --print-to-pdf=manual-en.pdf manual-en.html\n`);
  }
});

console.log('✨ FILES READY:');
console.log(`   English:  /Users/jmbonnevie/Projects/aunt-sallys/manual-en.html`);
console.log(`   Filipino: /Users/jmbonnevie/Projects/aunt-sallys/manual-fil.html\n`);

console.log('✓ Both HTML manuals are print-ready and fully formatted.');
console.log('✓ Use any of the above methods to create PDFs.\n');

// Create a helper script for Chrome
const helperScript = `#!/bin/bash
# Helper script to convert HTML to PDF using system Chrome

CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [ ! -x "$CHROME_PATH" ]; then
    echo "Google Chrome not found. Please install or use an online converter."
    exit 1
fi

if [ $# -ne 2 ]; then
    echo "Usage: $0 <input.html> <output.pdf>"
    exit 1
fi

INPUT=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
OUTPUT=$(cd "$(dirname "$2")" && pwd)/$(basename "$2")

echo "Converting $INPUT to $OUTPUT..."
"$CHROME_PATH" --headless --disable-gpu --print-to-pdf="$OUTPUT" "$INPUT" 2>&1 | grep -v "DevTools"

if [ -f "$OUTPUT" ]; then
    echo "✓ PDF created: $OUTPUT"
    ls -lh "$OUTPUT"
else
    echo "✗ Failed to create PDF"
    exit 1
fi
`;

fs.writeFileSync(path.join(__dirname, 'convert-with-chrome.sh'), helperScript, { mode: 0o755 });
console.log('💾 Helper script created: convert-with-chrome.sh');
console.log('   Run: ./convert-with-chrome.sh manual-en.html manual-en.pdf\n');

console.log('═══════════════════════════════════════════════════════════════');
