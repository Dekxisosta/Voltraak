<?php

/**
 * Comprehensive test runner script
 * Runs all backend tests and generates coverage reports
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Symfony\Component\Process\Process;

class TestRunner
{
    private array $testSuites = [
        'Unit Tests' => 'tests/Unit',
        'Feature Tests' => 'tests/Feature',
    ];

    private array $results = [];

    public function runAllTests(): void
    {
        $this->printHeader();
        
        foreach ($this->testSuites as $suiteName => $path) {
            $this->runTestSuite($suiteName, $path);
        }
        
        $this->generateCoverageReport();
        $this->printSummary();
    }

    private function runTestSuite(string $name, string $path): void
    {
        echo "\n🧪 Running {$name}...\n";
        echo str_repeat("=", 50) . "\n";

        $process = new Process([
            './vendor/bin/phpunit',
            $path,
            '--testdox',
            '--colors=always'
        ]);

        $process->setTimeout(300); // 5 minutes
        $process->run();

        $this->results[$name] = [
            'success' => $process->isSuccessful(),
            'output' => $process->getOutput(),
            'error' => $process->getErrorOutput(),
        ];

        if ($process->isSuccessful()) {
            echo "✅ {$name} passed!\n";
        } else {
            echo "❌ {$name} failed!\n";
            echo $process->getErrorOutput();
        }
    }

    private function generateCoverageReport(): void
    {
        echo "\n📊 Generating coverage report...\n";
        echo str_repeat("=", 50) . "\n";

        $process = new Process([
            './vendor/bin/phpunit',
            '--coverage-html',
            'tests/coverage',
            '--coverage-text'
        ]);

        $process->setTimeout(600); // 10 minutes
        $process->run();

        if ($process->isSuccessful()) {
            echo "✅ Coverage report generated at tests/coverage/index.html\n";
            echo $process->getOutput();
        } else {
            echo "❌ Coverage report generation failed!\n";
            echo $process->getErrorOutput();
        }
    }

    private function printHeader(): void
    {
        echo "\n";
        echo "🚀 Voltraak IMS - Backend Test Suite\n";
        echo str_repeat("=", 50) . "\n";
        echo "Running comprehensive test coverage...\n";
    }

    private function printSummary(): void
    {
        echo "\n📋 Test Summary\n";
        echo str_repeat("=", 50) . "\n";

        $totalSuites = count($this->results);
        $passedSuites = 0;

        foreach ($this->results as $suiteName => $result) {
            $status = $result['success'] ? '✅ PASSED' : '❌ FAILED';
            echo "{$status} - {$suiteName}\n";
            
            if ($result['success']) {
                $passedSuites++;
            }
        }

        echo "\n";
        echo "Summary: {$passedSuites}/{$totalSuites} test suites passed\n";

        if ($passedSuites === $totalSuites) {
            echo "🎉 All tests passed! The system is ready for deployment.\n";
        } else {
            echo "⚠️  Some tests failed. Please review and fix before deployment.\n";
            exit(1);
        }
    }
}

// Run the tests
$runner = new TestRunner();
$runner->runAllTests();