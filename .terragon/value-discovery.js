#!/usr/bin/env node

/**
 * Terragon Autonomous Value Discovery Engine
 * Continuously discovers and scores high-value work items
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ValueDiscoveryEngine {
  constructor() {
    this.config = this.loadConfig();
    this.backlog = [];
    this.executionHistory = [];
    this.metrics = {
      totalItemsDiscovered: 0,
      totalItemsCompleted: 0,
      averageCycleTime: 0,
      valueDelivered: 0
    };
  }

  loadConfig() {
    // Use default config for now - could be enhanced with yaml parser later
    return this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      scoring: { 
        weights: { 
          maturing: { wsjf: 0.6, ice: 0.1, technicalDebt: 0.2, security: 0.1 } 
        },
        thresholds: {
          minScore: 10,
          maxRisk: 0.8,
          securityBoost: 2.0,
          complianceBoost: 1.8
        }
      },
      discovery: { sources: ['gitHistory', 'staticAnalysis'] },
      execution: { maxConcurrentTasks: 1 },
      repository: {
        name: 'nerf-edge-kit',
        type: 'multi-platform-sdk',
        platforms: ['ios', 'web', 'python'],
        maturity: 'maturing'
      }
    };
  }

  async discoverValueItems() {
    console.log('🔍 Discovering value items...');
    const items = [];

    // Discover from Git history
    items.push(...await this.discoverFromGitHistory());
    
    // Discover from static analysis
    items.push(...await this.discoverFromStaticAnalysis());
    
    // Discover from package dependencies
    items.push(...await this.discoverFromDependencies());
    
    // Discover from documentation gaps
    items.push(...await this.discoverFromDocumentationGaps());

    this.metrics.totalItemsDiscovered = items.length;
    return items;
  }

  async discoverFromGitHistory() {
    const items = [];
    try {
      // Look for TODO, FIXME, HACK comments in commit messages
      const commits = execSync('git log --oneline -n 50 --grep="TODO\\|FIXME\\|HACK\\|temporary\\|quick fix"', 
        { encoding: 'utf8', cwd: process.cwd() }).split('\n').filter(Boolean);
      
      commits.forEach(commit => {
        items.push({
          id: `git-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: `Address technical debt from: ${commit.substr(0, 50)}`,
          type: 'technical-debt',
          source: 'git-history',
          description: `Technical debt identified in commit: ${commit}`,
          effort: 3,
          impact: 6,
          confidence: 7,
          userValue: 4,
          timeCriticality: 3
        });
      });
    } catch (error) {
      console.warn('Git history analysis failed:', error.message);
    }
    return items;
  }

  async discoverFromStaticAnalysis() {
    const items = [];
    
    // Check for missing source directories
    const expectedDirs = ['src', 'ios', 'python'];
    expectedDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        items.push({
          id: `missing-src-${dir}`,
          title: `Create ${dir} source directory structure`,
          type: 'architecture',
          source: 'static-analysis',
          description: `Missing ${dir} source code directory based on package.json configuration`,
          effort: 4,
          impact: 9,
          confidence: 9,
          userValue: 8,
          timeCriticality: 7
        });
      }
    });

    // Check for missing implementation files
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.main && !fs.existsSync(packageJson.main)) {
      items.push({
        id: 'missing-main-file',
        title: 'Create main entry point file',
        type: 'implementation',
        source: 'static-analysis',
        description: `Missing main entry point: ${packageJson.main}`,
        effort: 6,
        impact: 10,
        confidence: 9,
        userValue: 9,
        timeCriticality: 8
      });
    }

    return items;
  }

  async discoverFromDependencies() {
    const items = [];
    try {
      // Check for outdated dependencies
      const outdated = execSync('npm outdated --json', { encoding: 'utf8', cwd: process.cwd() });
      const outdatedPackages = JSON.parse(outdated || '{}');
      
      Object.keys(outdatedPackages).forEach(pkg => {
        const info = outdatedPackages[pkg];
        items.push({
          id: `dep-update-${pkg}`,
          title: `Update ${pkg} from ${info.current} to ${info.latest}`,
          type: 'dependency-update',
          source: 'dependency-analysis',
          description: `Outdated dependency: ${pkg}`,
          effort: 2,
          impact: 4,
          confidence: 8,
          userValue: 3,
          timeCriticality: 2
        });
      });
    } catch (error) {
      console.warn('Dependency analysis failed:', error.message);
    }
    return items;
  }

  async discoverFromDocumentationGaps() {
    const items = [];
    
    // Check for missing API documentation
    if (!fs.existsSync('docs/API.md')) {
      items.push({
        id: 'missing-api-docs',
        title: 'Create comprehensive API documentation',
        type: 'documentation',
        source: 'documentation-analysis',
        description: 'Missing API documentation for SDK consumers',
        effort: 5,
        impact: 7,
        confidence: 8,
        userValue: 8,
        timeCriticality: 4
      });
    }

    // Check for missing examples
    if (!fs.existsSync('examples') || fs.readdirSync('examples').length === 0) {
      items.push({
        id: 'missing-examples',
        title: 'Create platform-specific examples',
        type: 'documentation',
        source: 'documentation-analysis', 
        description: 'Missing working examples for iOS, Web, and Python platforms',
        effort: 8,
        impact: 9,
        confidence: 7,
        userValue: 9,
        timeCriticality: 6
      });
    }

    return items;
  }

  scoreItems(items) {
    return items.map(item => {
      const wsjf = this.calculateWSJF(item);
      const ice = this.calculateICE(item);
      const technicalDebt = this.calculateTechnicalDebtScore(item);
      const composite = this.calculateCompositeScore(wsjf, ice, technicalDebt, item);
      
      return {
        ...item,
        scores: {
          wsjf,
          ice,
          technicalDebt,
          composite
        }
      };
    });
  }

  calculateWSJF(item) {
    const costOfDelay = item.userValue + item.timeCriticality + (item.riskReduction || 5) + (item.opportunityEnablement || 3);
    return costOfDelay / item.effort;
  }

  calculateICE(item) {
    return item.impact * item.confidence * (11 - item.effort); // Ease = 11 - effort
  }

  calculateTechnicalDebtScore(item) {
    if (item.type === 'technical-debt') {
      return item.effort * 2 + (item.hotspotMultiplier || 1) * 10;
    }
    return 10;
  }

  calculateCompositeScore(wsjf, ice, technicalDebt, item) {
    const weights = this.config.scoring.weights.maturing;
    let score = weights.wsjf * wsjf + weights.ice * ice + weights.technicalDebt * technicalDebt;
    
    // Apply boosts
    if (item.type === 'security-fix') score *= this.config.scoring.thresholds.securityBoost;
    if (item.type === 'compliance') score *= this.config.scoring.thresholds.complianceBoost;
    
    return Math.round(score * 100) / 100;
  }

  async generateBacklog() {
    const items = await this.discoverValueItems();
    const scoredItems = this.scoreItems(items);
    const sortedItems = scoredItems.sort((a, b) => b.scores.composite - a.scores.composite);
    
    this.backlog = sortedItems;
    await this.saveBacklog();
    await this.generateBacklogMarkdown();
    
    return this.backlog;
  }

  async saveBacklog() {
    const backlogPath = path.join(__dirname, 'backlog.json');
    fs.writeFileSync(backlogPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      totalItems: this.backlog.length,
      metrics: this.metrics,
      items: this.backlog
    }, null, 2));
  }

  async generateBacklogMarkdown() {
    const nextItem = this.backlog[0];
    const top10 = this.backlog.slice(0, 10);
    
    const markdown = `# 📊 Autonomous Value Backlog

Last Updated: ${new Date().toISOString()}
Next Execution: ${new Date(Date.now() + 60 * 60 * 1000).toISOString()}

## 🎯 Next Best Value Item
${nextItem ? `**[${nextItem.id}] ${nextItem.title}**
- **Composite Score**: ${nextItem.scores.composite}
- **WSJF**: ${nextItem.scores.wsjf} | **ICE**: ${nextItem.scores.ice} | **Tech Debt**: ${nextItem.scores.technicalDebt}
- **Estimated Effort**: ${nextItem.effort} hours
- **Expected Impact**: ${nextItem.description}` : 'No items in backlog'}

## 📋 Top 10 Backlog Items

| Rank | ID | Title | Score | Category | Est. Hours |
|------|-----|--------|---------|----------|------------|
${top10.map((item, index) => 
  `| ${index + 1} | ${item.id} | ${item.title.substring(0, 40)}... | ${item.scores.composite} | ${item.type} | ${item.effort} |`
).join('\n')}

## 📈 Value Metrics
- **Items Discovered**: ${this.metrics.totalItemsDiscovered}
- **Items Completed**: ${this.metrics.totalItemsCompleted}
- **Average Cycle Time**: ${this.metrics.averageCycleTime} hours
- **Value Delivered**: $${this.metrics.valueDelivered} (estimated)

## 🔄 Continuous Discovery Stats
- **Discovery Sources Active**: ${this.config.discovery.sources.length}
- **Last Discovery Run**: ${new Date().toISOString()}
- **Next Scheduled Run**: ${new Date(Date.now() + 60 * 60 * 1000).toISOString()}

## 🎯 Repository Context
- **Name**: ${this.config.repository?.name || 'Unknown'}
- **Type**: ${this.config.repository?.type || 'Unknown'}
- **Maturity**: ${this.config.repository?.maturity || 'Unknown'}
- **Platforms**: ${this.config.repository?.platforms?.join(', ') || 'Unknown'}
`;

    fs.writeFileSync('BACKLOG.md', markdown);
  }

  selectNextBestValue() {
    const prioritizedItems = this.backlog.filter(item => 
      item.scores.composite >= this.config.scoring.thresholds.minScore
    );
    
    return prioritizedItems[0] || null;
  }
}

// CLI Interface
if (require.main === module) {
  const engine = new ValueDiscoveryEngine();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'discover':
      engine.generateBacklog().then(backlog => {
        console.log(`✅ Discovered ${backlog.length} value items`);
        console.log(`🎯 Next best: ${backlog[0]?.title || 'None'}`);
      });
      break;
    
    case 'next':
      engine.generateBacklog().then(() => {
        const next = engine.selectNextBestValue();
        if (next) {
          console.log(`🎯 Next Best Value Item: ${next.title}`);
          console.log(`📊 Score: ${next.scores.composite}`);
          console.log(`⏱️  Effort: ${next.effort} hours`);
          console.log(`📋 Type: ${next.type}`);
        } else {
          console.log('No items meet the minimum score threshold');
        }
      });
      break;
    
    default:
      console.log('Usage: node value-discovery.js [discover|next]');
  }
}

module.exports = ValueDiscoveryEngine;