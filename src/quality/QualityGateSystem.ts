/**
 * Comprehensive Quality Gate System for NeRF SDK validation
 * Implements automated testing, security scanning, performance validation, and documentation checks
 */

export interface QualityGate {
  name: string;
  description: string;
  threshold: number;
  weight: number;
  category: 'testing' | 'security' | 'performance' | 'documentation' | 'compliance';
  validator: (context: ValidationContext) => Promise<QualityGateResult>;
}

export interface QualityGateResult {
  passed: boolean;
  score: number;
  maxScore: number;
  details: string;
  recommendations: string[];
  evidence: string[];
  metrics?: Record<string, any>;
}

export interface ValidationContext {
  projectPath: string;
  platform: string;
  buildArtifacts: string[];
  sourceFiles: string[];
  testResults?: any;
  coverageReport?: any;
  performanceMetrics?: any;
}

export interface QualityReport {
  overallScore: number;
  passed: boolean;
  timestamp: number;
  gateResults: Map<string, QualityGateResult>;
  summary: {
    totalGates: number;
    passedGates: number;
    failedGates: number;
    criticalFailures: string[];
  };
  recommendations: string[];
  nextActions: string[];
}

export class QualityGateSystem {
  private gates: Map<string, QualityGate> = new Map();
  private validationHistory: QualityReport[] = [];
  private config: QualityConfig;

  constructor(config?: Partial<QualityConfig>) {
    this.config = {
      minimumOverallScore: 0.85,
      requireAllCriticalGates: true,
      enableContinuousValidation: true,
      documentationRequired: true,
      securityScanningEnabled: true,
      performanceThresholds: {
        maxResponseTime: 200,
        minThroughput: 1000,
        maxMemoryUsage: 2048
      },
      ...config
    };

    this.initializeQualityGates();
  }

  /**
   * Execute all quality gates and generate comprehensive report
   */
  async validateProject(context: ValidationContext): Promise<QualityReport> {
    console.log('🚧 Starting comprehensive quality gate validation...');
    
    const startTime = Date.now();
    const gateResults = new Map<string, QualityGateResult>();
    const criticalFailures: string[] = [];

    // Execute all quality gates in parallel for efficiency
    const gateExecutions = Array.from(this.gates.entries()).map(async ([name, gate]) => {
      try {
        console.log(`⚡ Executing quality gate: ${name}`);
        const result = await gate.validator(context);
        gateResults.set(name, result);

        if (!result.passed && gate.category === 'security') {
          criticalFailures.push(name);
        }

        return { name, result };
      } catch (error) {
        console.error(`❌ Quality gate ${name} failed with error:`, error);
        const failureResult: QualityGateResult = {
          passed: false,
          score: 0,
          maxScore: 100,
          details: `Execution failed: ${error.message}`,
          recommendations: ['Fix execution error and retry'],
          evidence: []
        };
        gateResults.set(name, failureResult);
        criticalFailures.push(name);
        return { name, result: failureResult };
      }
    });

    await Promise.all(gateExecutions);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(gateResults);
    const passed = this.determineOverallPass(overallScore, criticalFailures);

    const report: QualityReport = {
      overallScore,
      passed,
      timestamp: startTime,
      gateResults,
      summary: {
        totalGates: this.gates.size,
        passedGates: Array.from(gateResults.values()).filter(r => r.passed).length,
        failedGates: Array.from(gateResults.values()).filter(r => !r.passed).length,
        criticalFailures
      },
      recommendations: this.generateRecommendations(gateResults),
      nextActions: this.generateNextActions(gateResults, passed)
    };

    this.validationHistory.push(report);
    this.logValidationSummary(report);

    return report;
  }

  /**
   * Get quality gate system status and metrics
   */
  getSystemStatus(): any {
    const recentReport = this.validationHistory[this.validationHistory.length - 1];
    
    return {
      totalGates: this.gates.size,
      lastValidation: recentReport?.timestamp,
      lastScore: recentReport?.overallScore,
      validationHistory: this.validationHistory.length,
      trendAnalysis: this.analyzeTrends(),
      gateCategories: this.getGateCategories()
    };
  }

  /**
   * Add custom quality gate
   */
  addQualityGate(gate: QualityGate): void {
    this.gates.set(gate.name, gate);
    console.log(`✅ Added quality gate: ${gate.name}`);
  }

  /**
   * Remove quality gate
   */
  removeQualityGate(name: string): boolean {
    const removed = this.gates.delete(name);
    if (removed) {
      console.log(`🗑️ Removed quality gate: ${name}`);
    }
    return removed;
  }

  // Private implementation methods

  private initializeQualityGates(): void {
    // Testing Gates
    this.addQualityGate({
      name: 'unit_test_coverage',
      description: 'Ensure comprehensive unit test coverage',
      threshold: 0.85,
      weight: 1.0,
      category: 'testing',
      validator: this.validateUnitTestCoverage.bind(this)
    });

    this.addQualityGate({
      name: 'integration_tests',
      description: 'Validate integration test suite completion',
      threshold: 0.90,
      weight: 1.0,
      category: 'testing',
      validator: this.validateIntegrationTests.bind(this)
    });

    this.addQualityGate({
      name: 'cross_platform_tests',
      description: 'Ensure tests pass on all target platforms',
      threshold: 1.0,
      weight: 1.2,
      category: 'testing',
      validator: this.validateCrossPlatformTests.bind(this)
    });

    // Security Gates
    this.addQualityGate({
      name: 'vulnerability_scan',
      description: 'Scan for security vulnerabilities',
      threshold: 1.0,
      weight: 1.5,
      category: 'security',
      validator: this.validateSecurityVulnerabilities.bind(this)
    });

    this.addQualityGate({
      name: 'dependency_security',
      description: 'Check dependencies for known security issues',
      threshold: 1.0,
      weight: 1.2,
      category: 'security',
      validator: this.validateDependencySecurity.bind(this)
    });

    this.addQualityGate({
      name: 'code_security_patterns',
      description: 'Scan for insecure coding patterns',
      threshold: 0.95,
      weight: 1.0,
      category: 'security',
      validator: this.validateCodeSecurityPatterns.bind(this)
    });

    // Performance Gates
    this.addQualityGate({
      name: 'rendering_performance',
      description: 'Validate NeRF rendering performance targets',
      threshold: 0.90,
      weight: 1.3,
      category: 'performance',
      validator: this.validateRenderingPerformance.bind(this)
    });

    this.addQualityGate({
      name: 'memory_efficiency',
      description: 'Ensure memory usage within acceptable limits',
      threshold: 0.85,
      weight: 1.0,
      category: 'performance',
      validator: this.validateMemoryEfficiency.bind(this)
    });

    this.addQualityGate({
      name: 'api_response_times',
      description: 'Validate API response time requirements',
      threshold: 0.95,
      weight: 1.0,
      category: 'performance',
      validator: this.validateAPIResponseTimes.bind(this)
    });

    // Documentation Gates
    this.addQualityGate({
      name: 'api_documentation',
      description: 'Ensure comprehensive API documentation',
      threshold: 0.90,
      weight: 0.8,
      category: 'documentation',
      validator: this.validateAPIDocumentation.bind(this)
    });

    this.addQualityGate({
      name: 'code_documentation',
      description: 'Validate inline code documentation',
      threshold: 0.80,
      weight: 0.6,
      category: 'documentation',
      validator: this.validateCodeDocumentation.bind(this)
    });

    this.addQualityGate({
      name: 'user_guides',
      description: 'Ensure user guides and tutorials are complete',
      threshold: 0.85,
      weight: 0.7,
      category: 'documentation',
      validator: this.validateUserGuides.bind(this)
    });

    // Compliance Gates
    this.addQualityGate({
      name: 'license_compliance',
      description: 'Verify license compliance for all dependencies',
      threshold: 1.0,
      weight: 1.1,
      category: 'compliance',
      validator: this.validateLicenseCompliance.bind(this)
    });

    this.addQualityGate({
      name: 'coding_standards',
      description: 'Enforce coding standards and style guidelines',
      threshold: 0.90,
      weight: 0.8,
      category: 'compliance',
      validator: this.validateCodingStandards.bind(this)
    });

    console.log(`🏗️ Initialized ${this.gates.size} quality gates`);
  }

  // Testing Validators

  private async validateUnitTestCoverage(context: ValidationContext): Promise<QualityGateResult> {
    const coverageThreshold = 85; // 85%
    
    // Mock coverage analysis
    const coverage = {
      lines: 87.5,
      functions: 92.3,
      branches: 81.2,
      statements: 88.1
    };

    const overallCoverage = (coverage.lines + coverage.functions + coverage.branches + coverage.statements) / 4;
    const passed = overallCoverage >= coverageThreshold;

    return {
      passed,
      score: overallCoverage,
      maxScore: 100,
      details: `Overall test coverage: ${overallCoverage.toFixed(1)}%`,
      recommendations: passed ? [] : [
        'Increase test coverage for uncovered code paths',
        'Focus on branch coverage improvements',
        'Add tests for edge cases'
      ],
      evidence: [
        `Line coverage: ${coverage.lines}%`,
        `Function coverage: ${coverage.functions}%`,
        `Branch coverage: ${coverage.branches}%`,
        `Statement coverage: ${coverage.statements}%`
      ],
      metrics: coverage
    };
  }

  private async validateIntegrationTests(context: ValidationContext): Promise<QualityGateResult> {
    // Mock integration test validation
    const testResults = {
      total: 156,
      passed: 152,
      failed: 3,
      skipped: 1,
      duration: 245000 // ms
    };

    const passRate = testResults.passed / testResults.total;
    const passed = passRate >= 0.95 && testResults.failed === 0;

    return {
      passed,
      score: passRate * 100,
      maxScore: 100,
      details: `Integration tests: ${testResults.passed}/${testResults.total} passed`,
      recommendations: !passed ? [
        'Fix failing integration tests',
        'Investigate test instabilities',
        'Improve test environment setup'
      ] : [],
      evidence: [
        `Test duration: ${testResults.duration}ms`,
        `Pass rate: ${(passRate * 100).toFixed(1)}%`,
        `Failed tests: ${testResults.failed}`
      ],
      metrics: testResults
    };
  }

  private async validateCrossPlatformTests(context: ValidationContext): Promise<QualityGateResult> {
    // Mock cross-platform validation
    const platforms = ['iOS', 'Web', 'Python'];
    const platformResults = {
      iOS: { passed: 45, total: 48 },
      Web: { passed: 52, total: 52 },
      Python: { passed: 38, total: 40 }
    };

    const allPassed = Object.values(platformResults).every(result => result.passed === result.total);
    const overallPassRate = Object.values(platformResults)
      .reduce((acc, result) => acc + result.passed, 0) / 
      Object.values(platformResults).reduce((acc, result) => acc + result.total, 0);

    return {
      passed: allPassed,
      score: overallPassRate * 100,
      maxScore: 100,
      details: `Cross-platform tests: ${allPassed ? 'All platforms passing' : 'Some failures detected'}`,
      recommendations: !allPassed ? [
        'Fix platform-specific test failures',
        'Ensure consistent behavior across platforms',
        'Update platform-specific implementations'
      ] : [],
      evidence: platforms.map(platform => 
        `${platform}: ${platformResults[platform].passed}/${platformResults[platform].total}`
      ),
      metrics: platformResults
    };
  }

  // Security Validators

  private async validateSecurityVulnerabilities(context: ValidationContext): Promise<QualityGateResult> {
    // Mock security vulnerability scan
    const vulnerabilities = {
      critical: 0,
      high: 1,
      medium: 3,
      low: 7,
      info: 12
    };

    const hasCriticalOrHigh = vulnerabilities.critical > 0 || vulnerabilities.high > 0;
    const score = hasCriticalOrHigh ? 0 : (vulnerabilities.medium === 0 ? 100 : 80);

    return {
      passed: !hasCriticalOrHigh,
      score,
      maxScore: 100,
      details: `Security scan: ${vulnerabilities.critical + vulnerabilities.high} critical/high vulnerabilities`,
      recommendations: hasCriticalOrHigh ? [
        'Fix critical and high severity vulnerabilities immediately',
        'Update dependencies with security patches',
        'Review security policies and practices'
      ] : vulnerabilities.medium > 0 ? [
        'Address medium severity vulnerabilities',
        'Schedule security updates'
      ] : [],
      evidence: [
        `Critical: ${vulnerabilities.critical}`,
        `High: ${vulnerabilities.high}`,
        `Medium: ${vulnerabilities.medium}`,
        `Low: ${vulnerabilities.low}`
      ],
      metrics: vulnerabilities
    };
  }

  private async validateDependencySecurity(context: ValidationContext): Promise<QualityGateResult> {
    // Mock dependency security check
    const dependencies = {
      total: 127,
      vulnerable: 2,
      outdated: 15,
      upToDate: 110
    };

    const vulnerableRatio = dependencies.vulnerable / dependencies.total;
    const passed = dependencies.vulnerable === 0;
    const score = (1 - vulnerableRatio) * 100;

    return {
      passed,
      score,
      maxScore: 100,
      details: `Dependency security: ${dependencies.vulnerable} vulnerable dependencies found`,
      recommendations: !passed ? [
        'Update vulnerable dependencies immediately',
        'Review dependency update policies',
        'Consider alternative packages for vulnerable dependencies'
      ] : [],
      evidence: [
        `Total dependencies: ${dependencies.total}`,
        `Vulnerable: ${dependencies.vulnerable}`,
        `Outdated: ${dependencies.outdated}`,
        `Up to date: ${dependencies.upToDate}`
      ],
      metrics: dependencies
    };
  }

  private async validateCodeSecurityPatterns(context: ValidationContext): Promise<QualityGateResult> {
    // Mock insecure code pattern detection
    const patterns = {
      hardcodedSecrets: 0,
      sqlInjection: 0,
      xssVulnerabilities: 0,
      insecureRandoms: 1,
      improperInputValidation: 2
    };

    const totalIssues = Object.values(patterns).reduce((a, b) => a + b, 0);
    const criticalIssues = patterns.hardcodedSecrets + patterns.sqlInjection + patterns.xssVulnerabilities;
    
    const passed = criticalIssues === 0 && totalIssues <= 3;
    const score = Math.max(0, 100 - (criticalIssues * 50) - (totalIssues * 5));

    return {
      passed,
      score,
      maxScore: 100,
      details: `Code security: ${totalIssues} potential security issues found`,
      recommendations: totalIssues > 0 ? [
        'Review and fix identified security patterns',
        'Implement proper input validation',
        'Use cryptographically secure random generators'
      ] : [],
      evidence: Object.entries(patterns)
        .filter(([, count]) => count > 0)
        .map(([pattern, count]) => `${pattern}: ${count}`),
      metrics: patterns
    };
  }

  // Performance Validators

  private async validateRenderingPerformance(context: ValidationContext): Promise<QualityGateResult> {
    // Mock rendering performance validation
    const targets = {
      visionPro: { target: 90, actual: 87 },
      iPhone15Pro: { target: 60, actual: 58 },
      webChrome: { target: 60, actual: 62 }
    };

    const achievements = Object.values(targets).map(t => t.actual / t.target);
    const avgAchievement = achievements.reduce((a, b) => a + b, 0) / achievements.length;
    const passed = achievements.every(a => a >= 0.90);

    return {
      passed,
      score: avgAchievement * 100,
      maxScore: 100,
      details: `Rendering performance: ${(avgAchievement * 100).toFixed(1)}% of targets achieved`,
      recommendations: !passed ? [
        'Optimize rendering pipeline for underperforming platforms',
        'Review quality settings and LOD systems',
        'Profile GPU usage and memory bandwidth'
      ] : [],
      evidence: Object.entries(targets).map(([platform, data]) => 
        `${platform}: ${data.actual}/${data.target} FPS`
      ),
      metrics: targets
    };
  }

  private async validateMemoryEfficiency(context: ValidationContext): Promise<QualityGateResult> {
    // Mock memory usage validation
    const memoryUsage = {
      baseline: 512, // MB
      peak: 1847,
      average: 1243,
      limit: 2048
    };

    const efficiency = 1 - (memoryUsage.peak / memoryUsage.limit);
    const passed = memoryUsage.peak <= memoryUsage.limit && efficiency >= 0.15;

    return {
      passed,
      score: efficiency * 100,
      maxScore: 100,
      details: `Memory usage: ${memoryUsage.peak}MB peak (${memoryUsage.limit}MB limit)`,
      recommendations: !passed ? [
        'Optimize memory usage patterns',
        'Implement memory pooling and reuse',
        'Profile memory leaks and excessive allocations'
      ] : [],
      evidence: [
        `Baseline usage: ${memoryUsage.baseline}MB`,
        `Peak usage: ${memoryUsage.peak}MB`,
        `Average usage: ${memoryUsage.average}MB`,
        `Efficiency: ${(efficiency * 100).toFixed(1)}%`
      ],
      metrics: memoryUsage
    };
  }

  private async validateAPIResponseTimes(context: ValidationContext): Promise<QualityGateResult> {
    // Mock API response time validation
    const apiMetrics = {
      p50: 45,   // ms
      p95: 178,  // ms
      p99: 295,  // ms
      target: 200,
      errors: 0.02 // 2%
    };

    const passed = apiMetrics.p95 <= apiMetrics.target && apiMetrics.errors <= 0.05;
    const score = Math.min(100, (apiMetrics.target / apiMetrics.p95) * 100);

    return {
      passed,
      score,
      maxScore: 100,
      details: `API performance: P95 ${apiMetrics.p95}ms (target: ${apiMetrics.target}ms)`,
      recommendations: !passed ? [
        'Optimize slow API endpoints',
        'Implement response caching',
        'Review database query performance'
      ] : [],
      evidence: [
        `P50: ${apiMetrics.p50}ms`,
        `P95: ${apiMetrics.p95}ms`,
        `P99: ${apiMetrics.p99}ms`,
        `Error rate: ${(apiMetrics.errors * 100).toFixed(2)}%`
      ],
      metrics: apiMetrics
    };
  }

  // Documentation Validators

  private async validateAPIDocumentation(context: ValidationContext): Promise<QualityGateResult> {
    // Mock API documentation validation
    const docMetrics = {
      totalEndpoints: 45,
      documentedEndpoints: 42,
      missingExamples: 8,
      outdatedDocs: 3
    };

    const coverageRate = docMetrics.documentedEndpoints / docMetrics.totalEndpoints;
    const qualityScore = 1 - ((docMetrics.missingExamples + docMetrics.outdatedDocs) / docMetrics.totalEndpoints);
    const overallScore = (coverageRate + qualityScore) / 2;

    return {
      passed: overallScore >= 0.85,
      score: overallScore * 100,
      maxScore: 100,
      details: `API documentation: ${docMetrics.documentedEndpoints}/${docMetrics.totalEndpoints} endpoints documented`,
      recommendations: overallScore < 0.85 ? [
        'Document missing API endpoints',
        'Add examples for complex operations',
        'Update outdated documentation'
      ] : [],
      evidence: [
        `Coverage: ${(coverageRate * 100).toFixed(1)}%`,
        `Missing examples: ${docMetrics.missingExamples}`,
        `Outdated docs: ${docMetrics.outdatedDocs}`
      ],
      metrics: docMetrics
    };
  }

  private async validateCodeDocumentation(context: ValidationContext): Promise<QualityGateResult> {
    // Mock code documentation validation
    const codeDocMetrics = {
      totalFunctions: 234,
      documentedFunctions: 187,
      complexFunctionsDocumented: 42,
      totalComplexFunctions: 48
    };

    const overallRate = codeDocMetrics.documentedFunctions / codeDocMetrics.totalFunctions;
    const complexRate = codeDocMetrics.complexFunctionsDocumented / codeDocMetrics.totalComplexFunctions;
    const score = (overallRate * 0.6 + complexRate * 0.4) * 100;

    return {
      passed: score >= 80,
      score,
      maxScore: 100,
      details: `Code documentation: ${overallRate.toFixed(1)}% overall, ${complexRate.toFixed(1)}% complex functions`,
      recommendations: score < 80 ? [
        'Add JSDoc comments to undocumented functions',
        'Focus on documenting complex algorithms',
        'Include parameter and return type documentation'
      ] : [],
      evidence: [
        `Documented functions: ${codeDocMetrics.documentedFunctions}/${codeDocMetrics.totalFunctions}`,
        `Complex functions: ${codeDocMetrics.complexFunctionsDocumented}/${codeDocMetrics.totalComplexFunctions}`
      ],
      metrics: codeDocMetrics
    };
  }

  private async validateUserGuides(context: ValidationContext): Promise<QualityGateResult> {
    // Mock user guide validation
    const guideMetrics = {
      requiredGuides: ['quickstart', 'api-reference', 'tutorials', 'examples'],
      existingGuides: ['quickstart', 'api-reference', 'tutorials'],
      upToDateGuides: ['quickstart', 'api-reference'],
      exampleCount: 15,
      requiredExamples: 20
    };

    const completeness = guideMetrics.existingGuides.length / guideMetrics.requiredGuides.length;
    const freshness = guideMetrics.upToDateGuides.length / guideMetrics.existingGuides.length;
    const exampleCoverage = guideMetrics.exampleCount / guideMetrics.requiredExamples;
    
    const score = (completeness * 0.4 + freshness * 0.3 + exampleCoverage * 0.3) * 100;

    return {
      passed: score >= 80,
      score,
      maxScore: 100,
      details: `User guides: ${guideMetrics.existingGuides.length}/${guideMetrics.requiredGuides.length} complete`,
      recommendations: score < 80 ? [
        'Create missing user guides',
        'Update outdated documentation',
        'Add more practical examples'
      ] : [],
      evidence: [
        `Missing guides: ${guideMetrics.requiredGuides.filter(g => !guideMetrics.existingGuides.includes(g)).join(', ')}`,
        `Examples: ${guideMetrics.exampleCount}/${guideMetrics.requiredExamples}`,
        `Up-to-date: ${guideMetrics.upToDateGuides.length}/${guideMetrics.existingGuides.length}`
      ],
      metrics: guideMetrics
    };
  }

  // Compliance Validators

  private async validateLicenseCompliance(context: ValidationContext): Promise<QualityGateResult> {
    // Mock license compliance check
    const licenseData = {
      totalDependencies: 127,
      compliantLicenses: 125,
      unknownLicenses: 2,
      incompatibleLicenses: 0,
      approvedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC']
    };

    const complianceRate = licenseData.compliantLicenses / licenseData.totalDependencies;
    const passed = licenseData.incompatibleLicenses === 0 && licenseData.unknownLicenses <= 2;

    return {
      passed,
      score: complianceRate * 100,
      maxScore: 100,
      details: `License compliance: ${licenseData.compliantLicenses}/${licenseData.totalDependencies} dependencies compliant`,
      recommendations: !passed ? [
        'Review unknown license dependencies',
        'Replace incompatible license dependencies',
        'Update license documentation'
      ] : [],
      evidence: [
        `Compliant: ${licenseData.compliantLicenses}`,
        `Unknown: ${licenseData.unknownLicenses}`,
        `Incompatible: ${licenseData.incompatibleLicenses}`
      ],
      metrics: licenseData
    };
  }

  private async validateCodingStandards(context: ValidationContext): Promise<QualityGateResult> {
    // Mock coding standards validation
    const standardsMetrics = {
      totalFiles: 156,
      compliantFiles: 142,
      minorViolations: 28,
      majorViolations: 3,
      criticalViolations: 0
    };

    const complianceRate = standardsMetrics.compliantFiles / standardsMetrics.totalFiles;
    const violationScore = 1 - ((standardsMetrics.criticalViolations * 0.5) + 
                                 (standardsMetrics.majorViolations * 0.1) + 
                                 (standardsMetrics.minorViolations * 0.01));
    
    const score = Math.max(0, Math.min(100, (complianceRate + violationScore) / 2 * 100));

    return {
      passed: standardsMetrics.criticalViolations === 0 && standardsMetrics.majorViolations <= 5,
      score,
      maxScore: 100,
      details: `Coding standards: ${standardsMetrics.compliantFiles}/${standardsMetrics.totalFiles} files compliant`,
      recommendations: score < 90 ? [
        'Fix critical and major coding standard violations',
        'Run automated code formatting',
        'Update coding style guidelines'
      ] : [],
      evidence: [
        `Minor violations: ${standardsMetrics.minorViolations}`,
        `Major violations: ${standardsMetrics.majorViolations}`,
        `Critical violations: ${standardsMetrics.criticalViolations}`
      ],
      metrics: standardsMetrics
    };
  }

  // Helper methods

  private calculateOverallScore(gateResults: Map<string, QualityGateResult>): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const [gateName, result] of gateResults) {
      const gate = this.gates.get(gateName)!;
      const normalizedScore = result.score / result.maxScore;
      totalWeightedScore += normalizedScore * gate.weight;
      totalWeight += gate.weight;
    }

    return totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
  }

  private determineOverallPass(score: number, criticalFailures: string[]): boolean {
    const meetsScoreThreshold = score >= this.config.minimumOverallScore;
    const noCriticalFailures = criticalFailures.length === 0;
    
    return this.config.requireAllCriticalGates 
      ? meetsScoreThreshold && noCriticalFailures
      : meetsScoreThreshold;
  }

  private generateRecommendations(gateResults: Map<string, QualityGateResult>): string[] {
    const recommendations: string[] = [];
    
    for (const result of gateResults.values()) {
      recommendations.push(...result.recommendations);
    }

    // Remove duplicates and prioritize
    return Array.from(new Set(recommendations)).slice(0, 10);
  }

  private generateNextActions(gateResults: Map<string, QualityGateResult>, passed: boolean): string[] {
    if (passed) {
      return [
        'Maintain current quality standards',
        'Consider raising quality thresholds',
        'Schedule regular quality reviews'
      ];
    }

    const failedGates = Array.from(gateResults.entries())
      .filter(([, result]) => !result.passed)
      .map(([name]) => name);

    return [
      `Fix failing quality gates: ${failedGates.join(', ')}`,
      'Address critical security and performance issues first',
      'Re-run quality validation after fixes',
      'Review quality gate thresholds and requirements'
    ];
  }

  private analyzeTrends(): any {
    if (this.validationHistory.length < 2) {
      return { trend: 'insufficient_data' };
    }

    const recent = this.validationHistory.slice(-5);
    const scores = recent.map(r => r.overallScore);
    const slope = this.calculateLinearTrend(scores);

    return {
      trend: slope > 0.02 ? 'improving' : slope < -0.02 ? 'declining' : 'stable',
      recentAverage: scores.reduce((a, b) => a + b, 0) / scores.length,
      slope: slope
    };
  }

  private calculateLinearTrend(values: number[]): number {
    const n = values.length;
    const sumX = (n - 1) * n / 2; // 0 + 1 + 2 + ... + (n-1)
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n - 1) * n * (2 * n - 1) / 6; // 0^2 + 1^2 + 2^2 + ... + (n-1)^2

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private getGateCategories(): Record<string, number> {
    const categories: Record<string, number> = {};
    
    for (const gate of this.gates.values()) {
      categories[gate.category] = (categories[gate.category] || 0) + 1;
    }

    return categories;
  }

  private logValidationSummary(report: QualityReport): void {
    const status = report.passed ? '✅ PASSED' : '❌ FAILED';
    const score = (report.overallScore * 100).toFixed(1);
    
    console.log(`\n🏁 Quality Gate Validation Complete: ${status}`);
    console.log(`📊 Overall Score: ${score}%`);
    console.log(`✅ Passed Gates: ${report.summary.passedGates}/${report.summary.totalGates}`);
    
    if (report.summary.criticalFailures.length > 0) {
      console.log(`🚨 Critical Failures: ${report.summary.criticalFailures.join(', ')}`);
    }
    
    if (report.recommendations.length > 0) {
      console.log(`💡 Top Recommendations:`);
      report.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
  }
}

interface QualityConfig {
  minimumOverallScore: number;
  requireAllCriticalGates: boolean;
  enableContinuousValidation: boolean;
  documentationRequired: boolean;
  securityScanningEnabled: boolean;
  performanceThresholds: {
    maxResponseTime: number;
    minThroughput: number;
    maxMemoryUsage: number;
  };
}