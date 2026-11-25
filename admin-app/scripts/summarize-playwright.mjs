import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const file = 'test-results/playwright.json';
const release = process.env.E2E_RELEASE === '1';
let summary = 'No Playwright report was produced.';
if (existsSync(file)) {
  const { stats } = JSON.parse(readFileSync(file, 'utf8'));
  summary = `Playwright: ${stats.expected} passed, ${stats.skipped} skipped, ${stats.unexpected} failed, ${stats.flaky} flaky.`;
  if (release && (stats.expected !== 1 || stats.skipped || stats.unexpected || stats.flaky)) {
    process.exitCode = 1;
  }
} else if (release) {
  process.exitCode = 1;
}
if (!release) summary += ' Credentialed scenarios require fixtures and are covered by the staging release job.';
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
