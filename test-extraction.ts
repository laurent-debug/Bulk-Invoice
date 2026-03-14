
import { aiExtractWithVision, aiExtractFields } from './src/lib/ai-extract';
import { smartExtract, renderPagesAsImages } from './src/lib/pdf-utils';
import fs from 'fs';
import path from 'path';

// Mocking some browser-only stuff if needed, but pdf-utils might use canvas/pdfjs
// Let's see if we can run some basic tests.

const BENCHMARK_DIR = 'C:\\Users\\loren\\OneDrive\\Documents\\Antigravity\\Invoice-benchmark\\invoices';
const testFiles = [
  'Note de crédit 7520085.pdf',
  'Facture_SI-6007090301_20260312003416.pdf',
  '260311_25.95_Poste_dedouanement-algues.pdf'
];

async function runTest() {
  console.log('--- START BENCHMARK ---');
  for (const filename of testFiles) {
    const filePath = path.join(BENCHMARK_DIR, filename);
    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer], { type: 'application/pdf' });
    
    console.log(`\nTesting: ${filename}`);
    try {
        const { text, ocrUsed } = await smartExtract(blob);
        console.log(`Text extracted (chars: ${text.length}, OCR: ${ocrUsed})`);
        
        // We can't easily run renderPagesAsImages in node without a canvas polyfill
        // So we'll test wait for text-based extraction for now or use a mock images array if needed
        const categories = ['Rent', 'Insurance', 'Telecom', 'Supplies', 'Travel', 'Meals', 'Fees', 'Energy', 'Other'];
        
        const result = await aiExtractFields(text, categories, 'CHF', 'fr');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error processing file:', e);
    }
  }
}

// Note: This script might need to be run with a tool that handles TS and Environment variables
// We'll try to run it with 'npx tsx' if available.
runTest();
