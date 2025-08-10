#!/usr/bin/env node

/**
 * Setup verification script for Playwright E2E tests
 * Verifies that all required components are properly configured
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = process.cwd();

console.log('🔍 Verifying Playwright E2E test setup...\n');

const checks = [
  {
    name: 'Playwright configuration',
    check: () => existsSync(join(projectRoot, 'playwright.config.js')),
    fix: 'Create playwright.config.js in project root'
  },
  {
    name: 'Package.json E2E scripts',
    check: async () => {
      const packageJson = JSON.parse(
        await readFile(join(projectRoot, 'package.json'), 'utf8')
      );
      return packageJson.scripts['test:e2e'] !== undefined;
    },
    fix: 'Add E2E test scripts to package.json'
  },
  {
    name: 'Test directory structure',
    check: () => {
      const dirs = [
        'tests/e2e/config',
        'tests/e2e/fixtures',
        'tests/e2e/fixtures/page-objects',
        'tests/e2e/fixtures/helpers',
        'tests/e2e/specs'
      ];
      return dirs.every(dir => existsSync(join(projectRoot, dir)));
    },
    fix: 'Create required test directory structure'
  },
  {
    name: 'Global setup files',
    check: () => {
      const files = [
        'tests/e2e/config/global-setup.js',
        'tests/e2e/config/global-teardown.js',
        'tests/e2e/config/test-setup.js'
      ];
      return files.every(file => existsSync(join(projectRoot, file)));
    },
    fix: 'Create global setup and teardown files'
  },
  {
    name: 'Browser configuration',
    check: () => existsSync(join(projectRoot, 'tests/e2e/config/browsers.config.js')),
    fix: 'Create browser-specific configuration file'
  },
  {
    name: 'Smoke test',
    check: () => existsSync(join(projectRoot, 'tests/e2e/specs/smoke.spec.js')),
    fix: 'Create basic smoke test'
  },
  {
    name: 'GitHub Actions workflow',
    check: () => existsSync(join(projectRoot, '.github/workflows/e2e-tests.yml')),
    fix: 'Create GitHub Actions workflow for CI/CD'
  },
  {
    name: 'Playwright dependency',
    check: async () => {
      const packageJson = JSON.parse(
        await readFile(join(projectRoot, 'package.json'), 'utf8')
      );
      return packageJson.devDependencies['@playwright/test'] !== undefined;
    },
    fix: 'Install @playwright/test as dev dependency'
  }
];

let allPassed = true;

for (const { name, check, fix } of checks) {
  try {
    const passed = await check();
    if (passed) {
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name}`);
      console.log(`   Fix: ${fix}`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${name} (Error: ${error.message})`);
    console.log(`   Fix: ${fix}`);
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! E2E test setup is complete.');
  console.log('\nNext steps:');
  console.log('1. Install Playwright browsers: npm run test:e2e:install');
  console.log('2. Run smoke tests: npm run test:e2e');
  console.log('3. Start implementing page objects and test specs');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  process.exit(1);
}

console.log('\nAvailable commands:');
console.log('  npm run test:e2e              - Run all E2E tests');
console.log('  npm run test:e2e:headed       - Run tests with visible browser');
console.log('  npm run test:e2e:debug        - Run tests with debugging');
console.log('  npm run test:e2e:ui           - Run tests with UI mode');
console.log('  npm run test:e2e:report       - View test report');
console.log('  npm run test:e2e:install      - Install Playwright browsers');