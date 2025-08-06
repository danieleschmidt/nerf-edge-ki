/**
 * Quantum Monitor - Real-time monitoring and alerting for quantum task planning
 * Tracks quantum states, performance metrics, and system health
 */

import { EventEmitter } from 'events';
import { QuantumTask, ResourceRequirements, ScheduleResult } from './QuantumTaskPlanner';
import { QuantumUtils } from './index';

export interface QuantumMetrics {
  timestamp: number;
  averageCoherence: number;
  totalSuperposition: number;
  entanglementCount: number;
  activeTaskCount: number;
  completedTaskCount: number;
  failedTaskCount: number;
  systemPerformance: SystemPerformanceMetrics;
  quantumEfficiency: number;
  decoherenceRate: number;
}

export interface SystemPerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  bandwidth: number;
  latency: number;
  throughput: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: QuantumMetrics) => boolean;
  severity: 'info' | 'warning' | 'critical';
  cooldownMs: number;
  message: string;
  actions?: AlertAction[];
}

export interface AlertAction {
  type: 'log' | 'email' | 'webhook' | 'callback';
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  metrics: QuantumMetrics;
  acknowledged: boolean;
}

export interface MonitoringConfig {
  metricsInterval: number; // milliseconds
  alertingEnabled: boolean;
  retentionDays: number;
  thresholds: {
    minCoherence: number;
    maxDecoherenceRate: number;
    maxLatency: number;
    minThroughput: number;
    maxMemoryUsage: number;
  };
}

export class QuantumMonitor extends EventEmitter {
  private metrics: QuantumMetrics[] = [];
  private alerts: Alert[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private lastAlertTimes: Map<string, number> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private config: MonitoringConfig;

  // Real-time state tracking
  private activeTasks: Map<string, QuantumTask> = new Map();
  private completedTasks: string[] = [];
  private failedTasks: string[] = [];
  private currentSystemMetrics: SystemPerformanceMetrics;

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    
    this.config = {
      metricsInterval: 5000, // 5 seconds
      alertingEnabled: true,
      retentionDays: 7,
      thresholds: {
        minCoherence: 0.3,
        maxDecoherenceRate: 0.1,
        maxLatency: 100, // milliseconds
        minThroughput: 10, // tasks per second
        maxMemoryUsage: 80 // percentage
      },
      ...config
    };

    this.currentSystemMetrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      gpuUsage: 0,
      bandwidth: 0,
      latency: 0,
      throughput: 0
    };

    this.initializeDefaultAlertRules();
  }

  /**
   * Start monitoring quantum system
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startMetricsCollection();
    this.startAlertProcessing();
    
    this.emit('monitoringStarted');
    console.log('👁️ Quantum monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('monitoringStopped');
    console.log('🛑 Quantum monitoring stopped');
  }

  /**
   * Track task lifecycle events
   */
  trackTaskStarted(task: QuantumTask): void {
    this.activeTasks.set(task.id, task);
    this.emit('taskStarted', { task, timestamp: Date.now() });
  }

  trackTaskCompleted(task: QuantumTask, duration: number): void {
    this.activeTasks.delete(task.id);
    this.completedTasks.push(task.id);
    
    this.emit('taskCompleted', { 
      task, 
      duration, 
      timestamp: Date.now() 
    });
    
    // Update throughput metrics
    this.updateThroughputMetrics();
  }

  trackTaskFailed(task: QuantumTask, error: Error): void {
    this.activeTasks.delete(task.id);
    this.failedTasks.push(task.id);
    
    this.emit('taskFailed', { 
      task, 
      error, 
      timestamp: Date.now() 
    });
  }

  trackScheduleResult(result: ScheduleResult): void {
    this.emit('scheduleOptimized', {
      result,
      timestamp: Date.now(),
      quantumAdvantage: result.quantumAdvantage,
      efficiency: result.efficiency
    });
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    console.log(`📋 Added alert rule: ${rule.name}`);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    this.lastAlertTimes.delete(ruleId);
    console.log(`🗑️ Removed alert rule: ${ruleId}`);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      console.log(`✅ Alert acknowledged: ${alert.message}`);
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): QuantumMetrics | null {
    if (this.metrics.length === 0) return null;
    return this.metrics[this.metrics.length - 1];
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(startTime?: number, endTime?: number): QuantumMetrics[] {
    let filtered = this.metrics;
    
    if (startTime) {
      filtered = filtered.filter(m => m.timestamp >= startTime);
    }
    
    if (endTime) {
      filtered = filtered.filter(m => m.timestamp <= endTime);
    }
    
    return filtered;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    metricsCount: number;
    alertsCount: number;
    activeAlertsCount: number;
    averageMetricsInterval: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    uptime: number;
  } {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      systemHealth = 'critical';
    } else if (activeAlerts.length > 0) {
      systemHealth = 'warning';
    }

    // Calculate average metrics interval
    let avgInterval = this.config.metricsInterval;
    if (this.metrics.length > 1) {
      const intervals = [];
      for (let i = 1; i < Math.min(10, this.metrics.length); i++) {
        intervals.push(this.metrics[i].timestamp - this.metrics[i - 1].timestamp);
      }
      avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }

    return {
      metricsCount: this.metrics.length,
      alertsCount: this.alerts.length,
      activeAlertsCount: activeAlerts.length,
      averageMetricsInterval: avgInterval,
      systemHealth,
      uptime: this.isRunning ? Date.now() - (this.metrics[0]?.timestamp || Date.now()) : 0
    };
  }

  /**
   * Export metrics data
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.metricsToCSV();
    }
    
    return JSON.stringify({
      metrics: this.metrics,
      alerts: this.alerts,
      config: this.config,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Update system performance metrics manually
   */
  updateSystemMetrics(metrics: Partial<SystemPerformanceMetrics>): void {
    this.currentSystemMetrics = {
      ...this.currentSystemMetrics,
      ...metrics
    };
  }

  // Private methods

  private startMetricsCollection(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);
  }

  private collectMetrics(): void {
    const timestamp = Date.now();
    
    // Calculate quantum-specific metrics
    const activeTasksArray = Array.from(this.activeTasks.values());
    const averageCoherence = this.calculateAverageCoherence(activeTasksArray);
    const totalSuperposition = this.calculateTotalSuperposition(activeTasksArray);
    const entanglementCount = this.calculateEntanglementCount(activeTasksArray);
    const quantumEfficiency = this.calculateQuantumEfficiency();
    const decoherenceRate = this.calculateDecoherenceRate();

    // Update system performance metrics
    this.updateSystemPerformanceMetrics();

    const metrics: QuantumMetrics = {
      timestamp,
      averageCoherence,
      totalSuperposition,
      entanglementCount,
      activeTaskCount: this.activeTasks.size,
      completedTaskCount: this.completedTasks.length,
      failedTaskCount: this.failedTasks.length,
      systemPerformance: { ...this.currentSystemMetrics },
      quantumEfficiency,
      decoherenceRate
    };

    this.metrics.push(metrics);
    this.emit('metricsCollected', metrics);

    // Clean up old metrics
    this.cleanupOldMetrics();

    // Process alerts if enabled
    if (this.config.alertingEnabled) {
      this.processAlerts(metrics);
    }
  }

  private calculateAverageCoherence(tasks: QuantumTask[]): number {
    if (tasks.length === 0) return 1.0;
    
    const totalCoherence = tasks.reduce((sum, task) => sum + task.quantumState.coherence, 0);
    return totalCoherence / tasks.length;
  }

  private calculateTotalSuperposition(tasks: QuantumTask[]): number {
    return tasks.reduce((sum, task) => sum + task.quantumState.superposition, 0);
  }

  private calculateEntanglementCount(tasks: QuantumTask[]): number {
    const entanglements = new Set<string>();
    
    for (const task of tasks) {
      for (const entangledId of task.quantumState.entanglement) {
        const pair = [task.id, entangledId].sort().join('-');
        entanglements.add(pair);
      }
    }
    
    return entanglements.size;
  }

  private calculateQuantumEfficiency(): number {
    if (this.metrics.length < 2) return 1.0;
    
    const recent = this.metrics.slice(-10); // Last 10 metrics
    const completionRates = recent.map((m, i) => {
      if (i === 0) return 0;
      return (m.completedTaskCount - recent[i - 1].completedTaskCount) / 
             ((m.timestamp - recent[i - 1].timestamp) / 1000); // tasks per second
    }).filter(rate => rate > 0);
    
    if (completionRates.length === 0) return 1.0;
    
    const avgCompletionRate = completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length;
    const maxExpectedRate = 50; // tasks per second
    
    return Math.min(1.0, avgCompletionRate / maxExpectedRate);
  }

  private calculateDecoherenceRate(): number {
    if (this.metrics.length < 2) return 0;
    
    const current = this.metrics[this.metrics.length - 1];
    const previous = this.metrics[this.metrics.length - 2];
    
    const coherenceDrop = previous.averageCoherence - current.averageCoherence;
    const timeDelta = (current.timestamp - previous.timestamp) / 1000; // seconds
    
    return Math.max(0, coherenceDrop / timeDelta);
  }

  private updateSystemPerformanceMetrics(): void {
    // Simulate system metrics collection (in real implementation, would use actual system APIs)
    const memUsage = process.memoryUsage();
    
    this.currentSystemMetrics = {
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to percentage approximation
      memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      gpuUsage: Math.random() * 100, // Would use actual GPU monitoring
      bandwidth: Math.random() * 1000, // Would use actual network monitoring
      latency: Math.random() * 20 + 5, // Would measure actual latency
      throughput: this.calculateCurrentThroughput()
    };
  }

  private calculateCurrentThroughput(): number {
    if (this.metrics.length < 2) return 0;
    
    const recent = this.metrics.slice(-5); // Last 5 metrics
    if (recent.length < 2) return 0;
    
    const first = recent[0];
    const last = recent[recent.length - 1];
    const completedTasks = last.completedTaskCount - first.completedTaskCount;
    const timeSpan = (last.timestamp - first.timestamp) / 1000; // seconds
    
    return timeSpan > 0 ? completedTasks / timeSpan : 0;
  }

  private updateThroughputMetrics(): void {
    // Update the latest metrics with current throughput
    if (this.metrics.length > 0) {
      this.currentSystemMetrics.throughput = this.calculateCurrentThroughput();
    }
  }

  private processAlerts(metrics: QuantumMetrics): void {
    for (const rule of this.alertRules.values()) {
      if (this.shouldTriggerAlert(rule, metrics)) {
        this.triggerAlert(rule, metrics);
      }
    }
  }

  private shouldTriggerAlert(rule: AlertRule, metrics: QuantumMetrics): boolean {
    // Check cooldown
    const lastAlertTime = this.lastAlertTimes.get(rule.id) || 0;
    const timeSinceLastAlert = metrics.timestamp - lastAlertTime;
    
    if (timeSinceLastAlert < rule.cooldownMs) {
      return false;
    }

    // Check condition
    try {
      return rule.condition(metrics);
    } catch (error) {
      console.warn(`⚠️ Alert rule ${rule.id} condition failed:`, error);
      return false;
    }
  }

  private triggerAlert(rule: AlertRule, metrics: QuantumMetrics): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      severity: rule.severity,
      message: rule.message,
      timestamp: metrics.timestamp,
      metrics: { ...metrics },
      acknowledged: false
    };

    this.alerts.push(alert);
    this.lastAlertTimes.set(rule.id, metrics.timestamp);
    
    this.emit('alertTriggered', alert);
    
    // Execute alert actions
    if (rule.actions) {
      this.executeAlertActions(alert, rule.actions);
    }

    const emoji = rule.severity === 'critical' ? '🚨' : rule.severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} Alert: ${rule.message}`);
  }

  private executeAlertActions(alert: Alert, actions: AlertAction[]): void {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'log':
            console.log(`📝 Alert Action Log: ${alert.message}`, action.config);
            break;
          
          case 'callback':
            if (typeof action.config.callback === 'function') {
              action.config.callback(alert);
            }
            break;
          
          case 'webhook':
            // Would implement HTTP webhook call
            console.log(`🔗 Webhook alert: ${action.config.url}`);
            break;
          
          case 'email':
            // Would implement email notification
            console.log(`📧 Email alert: ${action.config.to}`);
            break;
        }
      } catch (error) {
        console.warn(`⚠️ Alert action ${action.type} failed:`, error);
      }
    }
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    const initialLength = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoffTime);
    
    const cleaned = initialLength - this.metrics.length;
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old metrics`);
    }
  }

  private metricsToCSV(): string {
    const headers = [
      'timestamp',
      'averageCoherence',
      'totalSuperposition',
      'entanglementCount',
      'activeTaskCount',
      'completedTaskCount',
      'failedTaskCount',
      'cpuUsage',
      'memoryUsage',
      'gpuUsage',
      'latency',
      'throughput',
      'quantumEfficiency',
      'decoherenceRate'
    ];

    const rows = this.metrics.map(m => [
      new Date(m.timestamp).toISOString(),
      m.averageCoherence.toFixed(3),
      m.totalSuperposition.toFixed(3),
      m.entanglementCount,
      m.activeTaskCount,
      m.completedTaskCount,
      m.failedTaskCount,
      m.systemPerformance.cpuUsage.toFixed(2),
      m.systemPerformance.memoryUsage.toFixed(2),
      m.systemPerformance.gpuUsage.toFixed(2),
      m.systemPerformance.latency.toFixed(2),
      m.systemPerformance.throughput.toFixed(2),
      m.quantumEfficiency.toFixed(3),
      m.decoherenceRate.toFixed(6)
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private initializeDefaultAlertRules(): void {
    // Low coherence alert
    this.addAlertRule({
      id: 'low_coherence',
      name: 'Low Quantum Coherence',
      condition: (metrics) => metrics.averageCoherence < this.config.thresholds.minCoherence,
      severity: 'warning',
      cooldownMs: 60000, // 1 minute
      message: 'Average quantum coherence has dropped below threshold'
    });

    // High decoherence rate alert
    this.addAlertRule({
      id: 'high_decoherence',
      name: 'High Decoherence Rate',
      condition: (metrics) => metrics.decoherenceRate > this.config.thresholds.maxDecoherenceRate,
      severity: 'critical',
      cooldownMs: 30000, // 30 seconds
      message: 'Quantum decoherence rate is critically high'
    });

    // High latency alert
    this.addAlertRule({
      id: 'high_latency',
      name: 'High System Latency',
      condition: (metrics) => metrics.systemPerformance.latency > this.config.thresholds.maxLatency,
      severity: 'warning',
      cooldownMs: 120000, // 2 minutes
      message: 'System latency exceeds acceptable threshold'
    });

    // Low throughput alert
    this.addAlertRule({
      id: 'low_throughput',
      name: 'Low Task Throughput',
      condition: (metrics) => metrics.systemPerformance.throughput < this.config.thresholds.minThroughput,
      severity: 'warning',
      cooldownMs: 300000, // 5 minutes
      message: 'Task processing throughput is below expected levels'
    });

    // High memory usage alert
    this.addAlertRule({
      id: 'high_memory',
      name: 'High Memory Usage',
      condition: (metrics) => metrics.systemPerformance.memoryUsage > this.config.thresholds.maxMemoryUsage,
      severity: 'critical',
      cooldownMs: 60000, // 1 minute
      message: 'Memory usage is critically high'
    });

    // Task failure rate alert
    this.addAlertRule({
      id: 'high_failure_rate',
      name: 'High Task Failure Rate',
      condition: (metrics) => {
        const totalTasks = metrics.completedTaskCount + metrics.failedTaskCount;
        return totalTasks > 10 && (metrics.failedTaskCount / totalTasks) > 0.1; // > 10% failure rate
      },
      severity: 'critical',
      cooldownMs: 180000, // 3 minutes
      message: 'Task failure rate exceeds 10%'
    });

    console.log('✅ Default quantum monitoring alert rules initialized');
  }

  private startAlertProcessing(): void {
    // Process alerts in background
    setInterval(() => {
      if (this.config.alertingEnabled) {
        this.cleanupAcknowledgedAlerts();
      }
    }, 300000); // Every 5 minutes
  }

  private cleanupAcknowledgedAlerts(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    const initialLength = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => 
      !alert.acknowledged || alert.timestamp > cutoffTime
    );
    
    const cleaned = initialLength - this.alerts.length;
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} acknowledged alerts`);
    }
  }
}

export default QuantumMonitor;