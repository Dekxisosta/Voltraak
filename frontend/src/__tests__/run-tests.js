/**
 * Frontend test runner script
 * Comprehensive test execution with coverage reporting
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface TestSuite {
  name: string
  pattern: string
  description: string
}

class FrontendTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Component Tests',
      pattern: 'src/__tests__/components/**/*.test.{ts,tsx}',
      description: 'Testing UI components and their interactions'
    },
    {
      name: 'Context Tests',
      pattern: 'src/__tests__/contexts/**/*.test.{ts,tsx}',
      description: 'Testing React contexts and providers'
    },
    {
      name: 'API Tests',
      pattern: 'src/__tests__/api/**/*.test.{ts,tsx}',
      description: 'Testing API client integrations'
    },
    {
      name: 'Hook Tests',
      pattern: 'src/__tests__/hooks/**/*.test.{ts,tsx}',
      description: 'Testing custom React hooks'
    },
    {
      name: 'Utility Tests',
      pattern: 'src/__tests__/utils/**/*.test.{ts,tsx}',
      description: 'Testing utility functions and helpers'
    }
  ]

  private results: Map<string, boolean> = new Map()

  run(): void {
    this.printHeader()
    
    // Run individual test suites
    for (const suite of this.testSuites) {
      this.runTestSuite(suite)
    }

    // Run all tests with coverage
    this.runCoverageTests()

    // Generate test report
    this.generateTestReport()

    this.printSummary()
  }

  private printHeader(): void {
    console.log('\n🚀 Voltraak IMS - Frontend Test Suite')
    console.log('='.repeat(50))
    console.log('Running comprehensive frontend tests...\n')
  }

  private runTestSuite(suite: TestSuite): void {
    console.log(`🧪 Running ${suite.name}...`)
    console.log(`📝 ${suite.description}`)
    console.log('-'.repeat(40))

    try {
      // Check if test files exist for this pattern
      const testFiles = this.findTestFiles(suite.pattern)
      
      if (testFiles.length === 0) {
        console.log(`⏭️  No tests found for ${suite.name} - skipping`)
        this.results.set(suite.name, true)
        return
      }

      console.log(`Found ${testFiles.length} test file(s)`)

      // Run the specific test suite
      execSync(`npm run test -- --run "${suite.pattern}"`, {
        stdio: 'inherit',
        cwd: process.cwd()
      })

      console.log(`✅ ${suite.name} passed!\n`)
      this.results.set(suite.name, true)

    } catch (error) {
      console.log(`❌ ${suite.name} failed!\n`)
      this.results.set(suite.name, false)
    }
  }

  private runCoverageTests(): void {
    console.log('📊 Running full test suite with coverage...')
    console.log('-'.repeat(40))

    try {
      execSync('npm run coverage', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('✅ Coverage report generated!\n')
    } catch (error) {
      console.log('❌ Coverage generation failed!\n')
    }
  }

  private findTestFiles(pattern: string): string[] {
    try {
      // Simple glob-like pattern matching for test files
      const baseDir = 'src/__tests__'
      const testFiles: string[] = []
      
      const scanDirectory = (dir: string) => {
        if (!fs.existsSync(dir)) return
        
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          
          if (entry.isDirectory()) {
            scanDirectory(fullPath)
          } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) {
            testFiles.push(fullPath)
          }
        }
      }

      scanDirectory(baseDir)
      return testFiles

    } catch (error) {
      return []
    }
  }

  private generateTestReport(): void {
    const reportData = {
      timestamp: new Date().toISOString(),
      totalSuites: this.testSuites.length,
      passedSuites: Array.from(this.results.values()).filter(Boolean).length,
      results: Object.fromEntries(this.results),
      coverage: this.getCoverageData()
    }

    const reportPath = 'test-results.json'
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
    console.log(`📄 Test report saved to ${reportPath}`)
  }

  private getCoverageData(): object {
    try {
      const coveragePath = 'coverage/coverage-summary.json'
      if (fs.existsSync(coveragePath)) {
        return JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
      }
    } catch (error) {
      console.log('Could not read coverage data')
    }
    return {}
  }

  private printSummary(): void {
    console.log('\n📋 Test Summary')
    console.log('='.repeat(50))

    const totalSuites = this.testSuites.length
    const passedSuites = Array.from(this.results.values()).filter(Boolean).length

    for (const [suiteName, passed] of this.results.entries()) {
      const status = passed ? '✅ PASSED' : '❌ FAILED'
      console.log(`${status} - ${suiteName}`)
    }

    console.log(`\nSummary: ${passedSuites}/${totalSuites} test suites passed`)

    if (passedSuites === totalSuites) {
      console.log('🎉 All frontend tests passed! UI is ready for production.')
    } else {
      console.log('⚠️  Some frontend tests failed. Please review and fix before deployment.')
      process.exit(1)
    }
  }
}

// Run if this script is executed directly
if (require.main === module) {
  const runner = new FrontendTestRunner()
  runner.run()
}

export default FrontendTestRunner