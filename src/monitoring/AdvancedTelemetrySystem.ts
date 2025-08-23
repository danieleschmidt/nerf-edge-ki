/**
 * Advanced Telemetry System
 * Comprehensive monitoring and observability for NeRF Edge Kit
 */

import { PerformanceMetrics } from '../core/types';

export interface TelemetryConfig {
  enableMetrics: boolean;
  enableTracing: boolean;
  enableLogging: boolean;
  samplingRate: number; // 0-1
  retentionPeriodDays: number;
  exportInterval: number; // ms
  enableRealTimeAlerts: boolean;
  alertThresholds: AlertThresholds;
  enablePerformanceProfiling: boolean;
  enableUserAnalytics: boolean;
}

export interface AlertThresholds {
  cpuUsage: number; // %
  memoryUsage: number; // MB
  errorRate: number; // errors per minute
  responseTime: number; // ms
  frameRate: number; // FPS
}

export interface TelemetryEvent {
  id: string;
  timestamp: number;
  type: 'metric' | 'trace' | 'log' | 'alert' | 'user_event';
  category: string;
  name: string;
  value?: number;
  attributes: Record<string, any>;
  severity?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
}

export interface PerformanceTrace {
  traceId: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  spans: TraceSpan[];
  attributes: Record<string, any>;
  status: 'pending' | 'success' | 'error';
}

export interface TraceSpan {
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Record<string, any>;
  logs: TraceLog[];
  status: 'pending' | 'success' | 'error';
}

export interface TraceLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  attributes?: Record<string, any>;
}

export interface MetricAggregation {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  value: number;
  count: number;
  min: number;
  max: number;
  mean: number;
  percentiles: Record<string, number>; // P50, P95, P99
  timestamp: number;
  tags: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string; // Expression to evaluate
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastTriggered?: number;
  triggerCount: number;
}

export interface UserAnalyticsEvent {
  eventType: 'page_view' | 'interaction' | 'feature_usage' | 'error' | 'performance';
  category: string;
  action: string;
  label?: string;
  value?: number;
  customDimensions?: Record<string, string>;
  timestamp: number;
  userId?: string;
  sessionId: string;
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  architecture: string;
  memory: number; // GB
  cores: number;
  gpu?: string;
  screenResolution: string;
  pixelRatio: number;
}

/**
 * Advanced Telemetry System for comprehensive monitoring
 */
export class AdvancedTelemetrySystem {
  private config: TelemetryConfig;
  private events: TelemetryEvent[] = [];
  private traces: Map<string, PerformanceTrace> = new Map();
  private metrics: Map<string, MetricAggregation> = new Map();
  private alertRules: AlertRule[] = [];
  private activeAlerts: Set<string> = new Set();
  private exportTimer: number = 0;
  private sessionId: string;
  private deviceInfo: DeviceInfo;

  constructor(config: TelemetryConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.deviceInfo = this.collectDeviceInfo();
  }

  /**
   * Initialize telemetry system
   */
  async initialize(): Promise<void> {
    console.log('Initializing Advanced Telemetry System...');
    
    // Setup metric collection
    if (this.config.enableMetrics) {
      this.startMetricCollection();
    }

    // Setup performance profiling
    if (this.config.enablePerformanceProfiling) {
      this.setupPerformanceProfiling();
    }

    // Setup alert monitoring
    if (this.config.enableRealTimeAlerts) {
      this.setupAlertMonitoring();
    }

    // Setup data export
    this.startDataExport();

    // Setup default alert rules
    this.setupDefaultAlertRules();

    console.log('Advanced Telemetry System initialized');
  }

  /**
   * Record a telemetry event
   */
  recordEvent(event: Omit<TelemetryEvent, 'id' | 'timestamp'>): void {
    if (!this.shouldSample()) return;

    const telemetryEvent: TelemetryEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      ...event
    };

    this.events.push(telemetryEvent);
    
    // Trigger real-time processing
    this.processEvent(telemetryEvent);
    
    // Cleanup old events
    this.cleanupOldEvents();
  }

  /**
   * Start a performance trace
   */
  startTrace(operationName: string, attributes?: Record<string, any>): string {
    if (!this.config.enableTracing) return '';

    const traceId = this.generateTraceId();
    const trace: PerformanceTrace = {
      traceId,
      operationName,
      startTime: performance.now(),
      spans: [],
      attributes: attributes || {},
      status: 'pending'
    };

    this.traces.set(traceId, trace);
    
    this.recordEvent({
      type: 'trace',
      category: 'performance',
      name: 'trace_started',
      attributes: { traceId, operationName },
      traceId
    });

    return traceId;
  }

  /**
   * End a performance trace
   */
  endTrace(traceId: string, status: 'success' | 'error' = 'success'): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = status;

    this.recordEvent({
      type: 'trace',
      category: 'performance',
      name: 'trace_completed',
      value: trace.duration,
      attributes: { 
        traceId, 
        operationName: trace.operationName,
        duration: trace.duration,
        status
      },
      traceId
    });

    // Update performance metrics
    this.updateMetric('trace_duration', trace.duration, 'timer', {
      operation: trace.operationName,
      status
    });
  }

  /**
   * Add a span to a trace
   */
  addSpan(
    traceId: string, 
    operationName: string, 
    startTime?: number,
    parentSpanId?: string,
    attributes?: Record<string, any>
  ): string {
    const trace = this.traces.get(traceId);
    if (!trace) return '';

    const spanId = this.generateSpanId();
    const span: TraceSpan = {
      spanId,
      parentSpanId,
      operationName,
      startTime: startTime || performance.now(),
      attributes: attributes || {},
      logs: [],
      status: 'pending'
    };

    trace.spans.push(span);
    return spanId;
  }

  /**
   * End a span
   */
  endSpan(traceId: string, spanId: string, status: 'success' | 'error' = 'success'): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    const span = trace.spans.find(s => s.spanId === spanId);
    if (!span) return;

    span.endTime = performance.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
  }

  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number, type: MetricAggregation['type'] = 'gauge', tags?: Record<string, string>): void {
    if (!this.config.enableMetrics) return;

    this.updateMetric(name, value, type, tags);
    
    this.recordEvent({
      type: 'metric',
      category: 'measurement',
      name,
      value,
      attributes: { type, tags: tags || {} }
    });
  }

  /**
   * Record user analytics event
   */
  recordUserEvent(event: Omit<UserAnalyticsEvent, 'timestamp' | 'sessionId' | 'deviceInfo'>): void {
    if (!this.config.enableUserAnalytics) return;

    const userEvent: UserAnalyticsEvent = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      deviceInfo: this.deviceInfo,
      ...event
    };

    this.recordEvent({
      type: 'user_event',
      category: event.category,
      name: event.action,
      value: event.value,
      attributes: {
        eventType: event.eventType,
        label: event.label,
        customDimensions: event.customDimensions,
        deviceInfo: this.deviceInfo
      },
      userId: event.userId
    });
  }

  /**
   * Record an error
   */
  recordError(error: Error, context?: Record<string, any>): void {
    this.recordEvent({
      type: 'log',
      category: 'error',
      name: 'error_occurred',
      severity: 'error',
      attributes: {
        message: error.message,
        stack: error.stack,
        context: context || {}
      }
    });

    // Update error metrics
    this.updateMetric('error_count', 1, 'counter', {
      error_type: error.constructor.name
    });
  }

  /**
   * Create custom alert rule
   */
  createAlertRule(rule: Omit<AlertRule, 'id' | 'triggerCount'>): string {
    const alertRule: AlertRule = {
      id: this.generateAlertId(),
      triggerCount: 0,
      ...rule
    };

    this.alertRules.push(alertRule);
    return alertRule.id;
  }

  /**
   * Get real-time dashboard data
   */
  getDashboardData(): {
    metrics: MetricAggregation[];
    recentEvents: TelemetryEvent[];
    activeTraces: PerformanceTrace[];
    alerts: AlertRule[];
    summary: DashboardSummary;
  } {
    const recentEvents = this.events.slice(-100);
    const activeTraces = Array.from(this.traces.values())
      .filter(trace => trace.status === 'pending');
    
    const summary = this.generateDashboardSummary();

    return {
      metrics: Array.from(this.metrics.values()),
      recentEvents,
      activeTraces,
      alerts: this.alertRules,
      summary
    };
  }

  /**
   * Get performance insights
   */
  getPerformanceInsights(): {
    slowestOperations: Array<{ operation: string; avgDuration: number; count: number }>;
    errorHotspots: Array<{ component: string; errorRate: number }>;
    resourceUtilization: { cpu: number; memory: number; gpu: number };
    userExperience: { avgResponseTime: number; errorRate: number; satisfaction: number };
  } {
    const traces = Array.from(this.traces.values()).filter(t => t.duration);
    
    // Slowest operations
    const operationStats = traces.reduce((stats, trace) => {
      if (!stats[trace.operationName]) {
        stats[trace.operationName] = { total: 0, count: 0 };
      }
      stats[trace.operationName].total += trace.duration!;
      stats[trace.operationName].count++;
      return stats;
    }, {} as Record<string, { total: number; count: number }>);

    const slowestOperations = Object.entries(operationStats)
      .map(([operation, stats]) => ({
        operation,
        avgDuration: stats.total / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    // Error analysis
    const errorEvents = this.events.filter(e => e.severity === 'error');
    const errorsByComponent = errorEvents.reduce((errors, event) => {
      const component = event.category;
      if (!errors[component]) errors[component] = 0;
      errors[component]++;
      return errors;
    }, {} as Record<string, number>);

    const errorHotspots = Object.entries(errorsByComponent)
      .map(([component, count]) => ({
        component,
        errorRate: count / (Date.now() - (Date.now() - 3600000)) * 60000 // Errors per minute
      }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);

    // Resource utilization
    const cpuMetric = this.metrics.get('cpu_usage');
    const memoryMetric = this.metrics.get('memory_usage');
    const gpuMetric = this.metrics.get('gpu_utilization');

    const resourceUtilization = {
      cpu: cpuMetric?.value || 0,
      memory: memoryMetric?.value || 0,
      gpu: gpuMetric?.value || 0
    };

    // User experience
    const responseTimeMetric = this.metrics.get('response_time');
    const errorRateMetric = this.metrics.get('error_rate');
    
    const userExperience = {
      avgResponseTime: responseTimeMetric?.mean || 0,
      errorRate: errorRateMetric?.value || 0,
      satisfaction: this.calculateUserSatisfaction()
    };

    return {
      slowestOperations,
      errorHotspots,
      resourceUtilization,
      userExperience
    };
  }

  /**
   * Export telemetry data
   */
  async exportData(format: 'json' | 'csv' | 'opentelemetry' = 'json'): Promise<string> {
    const data = {
      session: this.sessionId,
      deviceInfo: this.deviceInfo,
      events: this.events,
      traces: Array.from(this.traces.values()),
      metrics: Array.from(this.metrics.values()),
      alerts: this.alertRules,
      exportTime: Date.now()
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        return this.convertToCSV(data);
      
      case 'opentelemetry':
        return this.convertToOpenTelemetry(data);
      
      default:
        return JSON.stringify(data);
    }
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private collectDeviceInfo(): DeviceInfo {
    const nav = typeof navigator !== 'undefined' ? navigator : {} as any;
    const screen = typeof window !== 'undefined' ? window.screen : {} as any;
    
    return {
      userAgent: nav.userAgent || 'unknown',
      platform: nav.platform || 'unknown',
      architecture: nav.arch || 'unknown',
      memory: nav.deviceMemory || 4,
      cores: nav.hardwareConcurrency || 4,
      gpu: this.detectGPU(),
      screenResolution: screen.width && screen.height ? `${screen.width}x${screen.height}` : 'unknown',
      pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    };
  }

  private detectGPU(): string {
    try {
      const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (!canvas) return 'unknown';
      
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'unknown';
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return 'webgl';
      
      return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'webgl';
    } catch {
      return 'unknown';
    }
  }

  private startMetricCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 1000); // Every second
  }

  private collectSystemMetrics(): void {
    // Mock system metrics - in production would collect real metrics
    this.recordMetric('cpu_usage', Math.random() * 100, 'gauge', { component: 'system' });
    this.recordMetric('memory_usage', Math.random() * 1024, 'gauge', { component: 'system' });
    this.recordMetric('gpu_utilization', Math.random() * 100, 'gauge', { component: 'system' });
    
    // Performance metrics
    const performanceEntry = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.recordMetric('performance_now', performanceEntry, 'gauge', { component: 'performance' });
  }

  private setupPerformanceProfiling(): void {
    if (typeof window !== 'undefined') {
      // Setup performance observer for long tasks
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordEvent({
              type: 'metric',
              category: 'performance',
              name: 'long_task',
              value: entry.duration,
              attributes: {
                entryType: entry.entryType,
                startTime: entry.startTime
              }
            });
          }
        });
        
        try {
          observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
          console.warn('Long task observation not supported');
        }
      }
    }
  }

  private setupAlertMonitoring(): void {
    setInterval(() => {
      this.evaluateAlertRules();
    }, 5000); // Every 5 seconds
  }

  private setupDefaultAlertRules(): void {
    const defaultRules: Omit<AlertRule, 'id' | 'triggerCount'>[] = [
      {
        name: 'High CPU Usage',
        condition: 'cpu_usage > threshold',
        threshold: this.config.alertThresholds.cpuUsage,
        severity: 'medium',
        enabled: true
      },
      {
        name: 'High Memory Usage',
        condition: 'memory_usage > threshold',
        threshold: this.config.alertThresholds.memoryUsage,
        severity: 'medium',
        enabled: true
      },
      {
        name: 'High Error Rate',
        condition: 'error_rate > threshold',
        threshold: this.config.alertThresholds.errorRate,
        severity: 'high',
        enabled: true
      },
      {
        name: 'Slow Response Time',
        condition: 'response_time > threshold',
        threshold: this.config.alertThresholds.responseTime,
        severity: 'medium',
        enabled: true
      },
      {
        name: 'Low Frame Rate',
        condition: 'frame_rate < threshold',
        threshold: this.config.alertThresholds.frameRate,
        severity: 'high',
        enabled: true
      }
    ];

    for (const rule of defaultRules) {
      this.createAlertRule(rule);
    }
  }

  private startDataExport(): void {
    this.exportTimer = setInterval(async () => {
      if (this.events.length > 0) {
        console.log(`Exporting ${this.events.length} telemetry events`);
        // In production, would export to external system
      }
    }, this.config.exportInterval) as unknown as number;
  }

  private processEvent(event: TelemetryEvent): void {
    // Real-time event processing
    if (event.severity === 'error' || event.severity === 'critical') {
      this.handleCriticalEvent(event);
    }

    // Update metrics based on event
    if (event.type === 'metric' && event.value !== undefined) {
      this.updateMetric(event.name, event.value, 'gauge');
    }
  }

  private handleCriticalEvent(event: TelemetryEvent): void {
    console.error('Critical telemetry event:', event);
    
    // Trigger immediate alert
    this.recordEvent({
      type: 'alert',
      category: 'system',
      name: 'critical_event_alert',
      severity: 'critical',
      attributes: {
        originalEvent: event,
        alertReason: 'Critical event detected'
      }
    });
  }

  private updateMetric(name: string, value: number, type: MetricAggregation['type'], tags?: Record<string, string>): void {
    const key = `${name}_${JSON.stringify(tags || {})}`;
    let metric = this.metrics.get(key);

    if (!metric) {
      metric = {
        name,
        type,
        value,
        count: 0,
        min: value,
        max: value,
        mean: value,
        percentiles: {},
        timestamp: Date.now(),
        tags: tags || {}
      };
    }

    // Update metric values
    metric.count++;
    metric.value = type === 'counter' ? metric.value + value : value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.mean = (metric.mean * (metric.count - 1) + value) / metric.count;
    metric.timestamp = Date.now();

    this.metrics.set(key, metric);
  }

  private evaluateAlertRules(): void {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      const shouldTrigger = this.evaluateAlertCondition(rule);
      
      if (shouldTrigger && !this.activeAlerts.has(rule.id)) {
        this.triggerAlert(rule);
      } else if (!shouldTrigger && this.activeAlerts.has(rule.id)) {
        this.resolveAlert(rule);
      }
    }
  }

  private evaluateAlertCondition(rule: AlertRule): boolean {
    // Simple condition evaluation - in production would use expression parser
    const metricName = rule.condition.split(' ')[0];
    const metric = Array.from(this.metrics.values()).find(m => m.name === metricName);
    
    if (!metric) return false;

    switch (rule.condition) {
      case 'cpu_usage > threshold':
        return metric.value > rule.threshold;
      case 'memory_usage > threshold':
        return metric.value > rule.threshold;
      case 'error_rate > threshold':
        return metric.value > rule.threshold;
      case 'response_time > threshold':
        return metric.mean > rule.threshold;
      case 'frame_rate < threshold':
        return metric.value < rule.threshold;
      default:
        return false;
    }
  }

  private triggerAlert(rule: AlertRule): void {
    rule.triggerCount++;
    rule.lastTriggered = Date.now();
    this.activeAlerts.add(rule.id);

    this.recordEvent({
      type: 'alert',
      category: 'monitoring',
      name: 'alert_triggered',
      severity: rule.severity,
      attributes: {
        alertId: rule.id,
        alertName: rule.name,
        condition: rule.condition,
        threshold: rule.threshold
      }
    });

    console.warn(`Alert triggered: ${rule.name}`);
  }

  private resolveAlert(rule: AlertRule): void {
    this.activeAlerts.delete(rule.id);

    this.recordEvent({
      type: 'alert',
      category: 'monitoring',
      name: 'alert_resolved',
      severity: 'info',
      attributes: {
        alertId: rule.id,
        alertName: rule.name
      }
    });

    console.log(`Alert resolved: ${rule.name}`);
  }

  private cleanupOldEvents(): void {
    const cutoffTime = Date.now() - (this.config.retentionPeriodDays * 24 * 60 * 60 * 1000);
    this.events = this.events.filter(event => event.timestamp > cutoffTime);
    
    // Cleanup old traces
    for (const [traceId, trace] of this.traces) {
      if (trace.startTime < cutoffTime) {
        this.traces.delete(traceId);
      }
    }
  }

  private generateDashboardSummary(): DashboardSummary {
    const totalEvents = this.events.length;
    const errorEvents = this.events.filter(e => e.severity === 'error').length;
    const activeTraces = Array.from(this.traces.values()).filter(t => t.status === 'pending').length;
    
    return {
      totalEvents,
      errorRate: totalEvents > 0 ? errorEvents / totalEvents : 0,
      activeTraces,
      uptime: Date.now() - (this.events[0]?.timestamp || Date.now()),
      memoryUsage: this.calculateTelemetryMemoryUsage(),
      dataPoints: this.metrics.size
    };
  }

  private calculateUserSatisfaction(): number {
    // Mock user satisfaction calculation
    const responseTimeMetric = this.metrics.get('response_time');
    const errorRateMetric = this.metrics.get('error_rate');
    
    let satisfaction = 1.0;
    
    if (responseTimeMetric && responseTimeMetric.mean > 1000) {
      satisfaction -= 0.3;
    }
    
    if (errorRateMetric && errorRateMetric.value > 0.1) {
      satisfaction -= 0.4;
    }
    
    return Math.max(0, satisfaction);
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    const events = data.events;
    const headers = ['timestamp', 'type', 'category', 'name', 'value', 'severity'];
    const rows = events.map((event: TelemetryEvent) => [
      event.timestamp,
      event.type,
      event.category,
      event.name,
      event.value || '',
      event.severity || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private convertToOpenTelemetry(data: any): string {
    // Simplified OpenTelemetry format
    const otData = {
      resourceSpans: data.traces.map((trace: PerformanceTrace) => ({
        resource: {
          attributes: trace.attributes
        },
        instrumentationLibrarySpans: [{
          instrumentationLibrary: {
            name: 'nerf-edge-kit',
            version: '1.0.0'
          },
          spans: trace.spans.map((span: TraceSpan) => ({
            traceId: trace.traceId,
            spanId: span.spanId,
            parentSpanId: span.parentSpanId,
            name: span.operationName,
            startTimeUnixNano: span.startTime * 1000000,
            endTimeUnixNano: span.endTime ? span.endTime * 1000000 : undefined,
            attributes: span.attributes,
            status: span.status
          }))
        }]
      }))
    };
    
    return JSON.stringify(otData, null, 2);
  }

  private calculateTelemetryMemoryUsage(): number {
    return (
      this.events.length * 0.001 + // 1KB per event
      this.traces.size * 0.005 + // 5KB per trace
      this.metrics.size * 0.0001 // 0.1KB per metric
    );
  }

  /**
   * Cleanup telemetry resources
   */
  dispose(): void {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
      this.exportTimer = 0;
    }
    
    this.events = [];
    this.traces.clear();
    this.metrics.clear();
    this.alertRules = [];
    this.activeAlerts.clear();
    
    console.log('Advanced Telemetry System disposed');
  }
}

interface DashboardSummary {
  totalEvents: number;
  errorRate: number;
  activeTraces: number;
  uptime: number;
  memoryUsage: number;
  dataPoints: number;
}