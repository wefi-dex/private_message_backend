/**
 * Payment System Test Runner
 * Executes all payment system tests with proper configuration and reporting
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  retries: 3,
  parallel: false,
  coverage: true,
  reportDir: './test-reports',
  testFiles: [
    './test/payment-system.test.js',
    './test/webhook-tests.js',
    './test/admin-payment-tests.js',
  ],
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

// Helper functions
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

const logHeader = (title) => {
  log('\n' + '='.repeat(60), 'cyan')
  log(`  ${title}`, 'bright')
  log('='.repeat(60), 'cyan')
}

const logSection = (title) => {
  log('\n' + '-'.repeat(40), 'yellow')
  log(`  ${title}`, 'yellow')
  log('-'.repeat(40), 'yellow')
}

const checkPrerequisites = () => {
  logSection('Checking Prerequisites')

  // Check if server is running
  try {
    const response = execSync(
      `curl -s -o /dev/null -w "%{http_code}" ${TEST_CONFIG.baseUrl}/ping`,
      { encoding: 'utf8' },
    )
    if (response.trim() === '200') {
      log('✅ Server is running', 'green')
    } else {
      log('❌ Server is not responding correctly', 'red')
      return false
    }
  } catch (error) {
    log('❌ Server is not running', 'red')
    log('Please start the server before running tests', 'yellow')
    return false
  }

  // Check if test dependencies are installed
  try {
    require('axios')
    require('chai')
    log('✅ Test dependencies are installed', 'green')
  } catch (error) {
    log('❌ Test dependencies are missing', 'red')
    log('Please run: npm install axios chai mocha', 'yellow')
    return false
  }

  // Create test reports directory
  if (!fs.existsSync(TEST_CONFIG.reportDir)) {
    fs.mkdirSync(TEST_CONFIG.reportDir, { recursive: true })
    log('✅ Created test reports directory', 'green')
  }

  return true
}

const runSingleTest = (testFile) => {
  return new Promise((resolve, reject) => {
    try {
      log(`Running ${path.basename(testFile)}...`, 'blue')

      const startTime = Date.now()
      const result = execSync(`node ${testFile}`, {
        encoding: 'utf8',
        timeout: TEST_CONFIG.timeout,
        env: {
          ...process.env,
          TEST_BASE_URL: TEST_CONFIG.baseUrl,
          NODE_ENV: 'test',
        },
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      log(`✅ ${path.basename(testFile)} completed in ${duration}ms`, 'green')
      resolve({ success: true, duration, output: result })
    } catch (error) {
      log(`❌ ${path.basename(testFile)} failed`, 'red')
      log(error.message, 'red')
      reject({ success: false, error: error.message })
    }
  })
}

const runAllTests = async () => {
  logHeader('Payment System Test Suite')

  if (!checkPrerequisites()) {
    process.exit(1)
  }

  const results = []
  const startTime = Date.now()

  for (const testFile of TEST_CONFIG.testFiles) {
    if (fs.existsSync(testFile)) {
      try {
        const result = await runSingleTest(testFile)
        results.push({ file: testFile, ...result })
      } catch (error) {
        results.push({ file: testFile, ...error })
      }
    } else {
      log(`⚠️  Test file not found: ${testFile}`, 'yellow')
    }
  }

  const endTime = Date.now()
  const totalDuration = endTime - startTime

  // Generate test report
  generateTestReport(results, totalDuration)

  // Exit with appropriate code
  const failedTests = results.filter((r) => !r.success)
  if (failedTests.length > 0) {
    log(`\n❌ ${failedTests.length} test(s) failed`, 'red')
    process.exit(1)
  } else {
    log(`\n✅ All tests passed!`, 'green')
    process.exit(0)
  }
}

const generateTestReport = (results, totalDuration) => {
  logSection('Test Results Summary')

  const passed = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  const total = results.length

  log(`Total Tests: ${total}`, 'bright')
  log(`Passed: ${passed}`, 'green')
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green')
  log(`Duration: ${totalDuration}ms`, 'bright')

  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed,
      duration: totalDuration,
    },
    results: results.map((r) => ({
      file: path.basename(r.file),
      success: r.success,
      duration: r.duration || 0,
      error: r.error || null,
    })),
  }

  const reportFile = path.join(
    TEST_CONFIG.reportDir,
    `test-report-${Date.now()}.json`,
  )
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))
  log(`📊 Detailed report saved to: ${reportFile}`, 'cyan')

  // Generate HTML report
  generateHtmlReport(report, reportFile)
}

const generateHtmlReport = (report, jsonFile) => {
  const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <title>Payment System Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat { text-align: center; padding: 10px; border-radius: 5px; }
        .passed { background: #d4edda; color: #155724; }
        .failed { background: #f8d7da; color: #721c24; }
        .total { background: #d1ecf1; color: #0c5460; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 3px; }
        .success { background: #d4edda; border-left: 4px solid #28a745; }
        .error { background: #f8d7da; border-left: 4px solid #dc3545; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Payment System Test Report</h1>
        <p class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="stat total">
            <h3>Total</h3>
            <h2>${report.summary.total}</h2>
        </div>
        <div class="stat passed">
            <h3>Passed</h3>
            <h2>${report.summary.passed}</h2>
        </div>
        <div class="stat failed">
            <h3>Failed</h3>
            <h2>${report.summary.failed}</h2>
        </div>
    </div>

    <h2>Test Results</h2>
    ${report.results
      .map(
        (r) => `
        <div class="test-result ${r.success ? 'success' : 'error'}">
            <strong>${r.file}</strong>
            <br>
            Status: ${r.success ? '✅ PASSED' : '❌ FAILED'}
            ${r.duration ? `<br>Duration: ${r.duration}ms` : ''}
            ${r.error ? `<br>Error: ${r.error}` : ''}
        </div>
    `,
      )
      .join('')}

    <p><small>Total Duration: ${report.summary.duration}ms</small></p>
</body>
</html>`

  const htmlFile = jsonFile.replace('.json', '.html')
  fs.writeFileSync(htmlFile, htmlReport)
  log(`📄 HTML report saved to: ${htmlFile}`, 'cyan')
}

const runSpecificTest = (testName) => {
  const testFile = TEST_CONFIG.testFiles.find((f) => f.includes(testName))
  if (testFile && fs.existsSync(testFile)) {
    logHeader(`Running Specific Test: ${testName}`)
    runSingleTest(testFile)
      .then(() => log('✅ Test completed successfully', 'green'))
      .catch(() => {
        log('❌ Test failed', 'red')
        process.exit(1)
      })
  } else {
    log(`❌ Test not found: ${testName}`, 'red')
    log('Available tests:', 'yellow')
    TEST_CONFIG.testFiles.forEach((f) => log(`  - ${path.basename(f)}`, 'cyan'))
    process.exit(1)
  }
}

// Command line interface
const args = process.argv.slice(2)
const command = args[0]

switch (command) {
  case 'all':
    runAllTests()
    break
  case 'payment':
    runSpecificTest('payment-system')
    break
  case 'webhook':
    runSpecificTest('webhook')
    break
  case 'admin':
    runSpecificTest('admin-payment')
    break
  case 'help':
  default:
    logHeader('Payment System Test Runner')
    log('Usage:', 'bright')
    log('  node run-tests.js all      - Run all tests', 'cyan')
    log('  node run-tests.js payment  - Run payment system tests', 'cyan')
    log('  node run-tests.js webhook  - Run webhook tests', 'cyan')
    log('  node run-tests.js admin    - Run admin payment tests', 'cyan')
    log('  node run-tests.js help     - Show this help', 'cyan')
    log('\nEnvironment Variables:', 'bright')
    log(
      '  TEST_BASE_URL - Base URL for testing (default: http://localhost:8000)',
      'cyan',
    )
    log('  NODE_ENV=test - Set environment to test mode', 'cyan')
    break
}

module.exports = {
  runAllTests,
  runSingleTest,
  generateTestReport,
  TEST_CONFIG,
}
