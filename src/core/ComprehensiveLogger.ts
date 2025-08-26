/**
 * Comprehensive Logger - Generation 2 Implementation
 * Advanced structured logging with audit trails and security monitoring
 */

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  category: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component: string;
  stackTrace?: string;
  performance?: {
    duration: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  event: string;
  actor: string;
  resource: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  details: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: 'authentication' | 'authorization' | 'data_access' | 'suspicious_activity' | 'system_event';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: Record<string, unknown>;
  automated: boolean;
}

export class ComprehensiveLogger {
  private logs: LogEntry[] = [];
  private auditEvents: AuditEvent[] = [];
  private securityEvents: SecurityEvent[] = [];
  private maxLogSize = 10000;
  private logLevel: LogEntry['level'] = 'info';
  private enableAudit = true;
  private enableSecurity = true;

  constructor(config?: {
    maxLogSize?: number;
    logLevel?: LogEntry['level'];
    enableAudit?: boolean;
    enableSecurity?: boolean;
  }) {
    if (config) {
      this.maxLogSize = config.maxLogSize ?? this.maxLogSize;
      this.logLevel = config.logLevel ?? this.logLevel;
      this.enableAudit = config.enableAudit ?? this.enableAudit;
      this.enableSecurity = config.enableSecurity ?? this.enableSecurity;
    }
    
    console.log('📝 Comprehensive Logger initialized');
  }

  private shouldLog(level: LogEntry['level']): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'critical'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private addLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    this.logs.push(entry);
    
    // Maintain log size limit
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-Math.floor(this.maxLogSize * 0.8));
    }

    // Console output for development
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.component}]`;
    
    switch (entry.level) {
      case 'debug':
        console.debug(`🔍 ${prefix} ${entry.message}`, entry.metadata);
        break;
      case 'info':
        console.info(`ℹ️ ${prefix} ${entry.message}`, entry.metadata);
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix} ${entry.message}`, entry.metadata);
        break;
      case 'error':
      case 'critical':
        console.error(`❌ ${prefix} ${entry.message}`, entry.metadata, entry.stackTrace);
        break;
    }
  }

  debug(message: string, component: string, metadata?: Record<string, unknown>): void {
    this.addLog({
      timestamp: Date.now(),
      level: 'debug',
      message,
      category: 'debug',
      component,
      metadata
    });
  }

  info(message: string, component: string, metadata?: Record<string, unknown>): void {
    this.addLog({
      timestamp: Date.now(),
      level: 'info',
      message,
      category: 'info',
      component,
      metadata
    });
  }

  warn(message: string, component: string, metadata?: Record<string, unknown>): void {
    this.addLog({
      timestamp: Date.now(),
      level: 'warn',
      message,
      category: 'warning',
      component,
      metadata
    });
  }

  error(message: string, component: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.addLog({
      timestamp: Date.now(),
      level: 'error',
      message,
      category: 'error',
      component,
      metadata: {
        ...metadata,
        errorName: error?.name,
        errorMessage: error?.message
      },
      stackTrace: error?.stack
    });
  }

  critical(message: string, component: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.addLog({
      timestamp: Date.now(),
      level: 'critical',
      message,
      category: 'critical',
      component,
      metadata: {
        ...metadata,
        errorName: error?.name,
        errorMessage: error?.message
      },
      stackTrace: error?.stack
    });
  }

  performance(
    message: string, 
    component: string, 
    duration: number, 
    metadata?: Record<string, unknown>
  ): void {
    const memoryUsage = process.memoryUsage?.()?.heapUsed || 0;
    const cpuUsage = process.cpuUsage?.()?.user || 0;

    this.addLog({
      timestamp: Date.now(),
      level: 'info',
      message,
      category: 'performance',
      component,
      metadata,
      performance: {
        duration,
        memoryUsage,
        cpuUsage
      }
    });
  }

  // Audit logging
  audit(
    event: string,
    actor: string,
    resource: string,
    action: string,
    outcome: 'success' | 'failure' | 'partial',
    details: Record<string, unknown> = {},
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): void {
    if (!this.enableAudit) return;

    const auditEvent: AuditEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      event,
      actor,
      resource,
      action,
      outcome,
      details,
      riskLevel
    };

    this.auditEvents.push(auditEvent);

    // Maintain audit log size
    if (this.auditEvents.length > this.maxLogSize) {
      this.auditEvents = this.auditEvents.slice(-Math.floor(this.maxLogSize * 0.8));
    }

    // Log high-risk audit events
    if (riskLevel === 'high' || riskLevel === 'critical') {
      this.warn(`🔒 High-risk audit event: ${event}`, 'audit', {
        actor,
        resource,
        action,
        outcome,
        riskLevel
      });
    }

    console.log(`📋 AUDIT: ${actor} ${action} ${resource} -> ${outcome.toUpperCase()}`);
  }

  // Security event logging
  security(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    source: string,
    details: Record<string, unknown>,
    automated: boolean = true
  ): void {
    if (!this.enableSecurity) return;

    const securityEvent: SecurityEvent = {
      id: `security-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      severity,
      source,
      details,
      automated
    };

    this.securityEvents.push(securityEvent);

    // Maintain security log size
    if (this.securityEvents.length > this.maxLogSize) {
      this.securityEvents = this.securityEvents.slice(-Math.floor(this.maxLogSize * 0.8));
    }

    // Log critical security events
    if (severity === 'critical') {
      this.critical(`🚨 Critical security event: ${type}`, 'security', undefined, {
        source,
        details,
        automated
      });
    } else if (severity === 'high') {
      this.error(`🔐 High-severity security event: ${type}`, 'security', undefined, {
        source,
        details,
        automated
      });
    }

    console.log(`🔐 SECURITY: ${severity.toUpperCase()} ${type} from ${source}`);
  }

  // Query methods
  getLogs(options?: {
    level?: LogEntry['level'];
    component?: string;
    category?: string;
    since?: number;
    limit?: number;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (options?.level) {
      filtered = filtered.filter(log => log.level === options.level);
    }

    if (options?.component) {
      filtered = filtered.filter(log => log.component === options.component);
    }

    if (options?.category) {
      filtered = filtered.filter(log => log.category === options.category);
    }

    if (options?.since) {
      filtered = filtered.filter(log => log.timestamp >= options.since);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  getAuditEvents(options?: {
    event?: string;
    actor?: string;
    resource?: string;
    outcome?: 'success' | 'failure' | 'partial';
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    since?: number;
    limit?: number;
  }): AuditEvent[] {
    let filtered = [...this.auditEvents];

    if (options?.event) {
      filtered = filtered.filter(evt => evt.event.includes(options.event));
    }

    if (options?.actor) {
      filtered = filtered.filter(evt => evt.actor === options.actor);
    }

    if (options?.resource) {
      filtered = filtered.filter(evt => evt.resource.includes(options.resource));
    }

    if (options?.outcome) {
      filtered = filtered.filter(evt => evt.outcome === options.outcome);
    }

    if (options?.riskLevel) {
      filtered = filtered.filter(evt => evt.riskLevel === options.riskLevel);
    }

    if (options?.since) {
      filtered = filtered.filter(evt => evt.timestamp >= options.since);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  getSecurityEvents(options?: {
    type?: SecurityEvent['type'];
    severity?: SecurityEvent['severity'];
    source?: string;
    since?: number;
    limit?: number;
  }): SecurityEvent[] {
    let filtered = [...this.securityEvents];

    if (options?.type) {
      filtered = filtered.filter(evt => evt.type === options.type);
    }

    if (options?.severity) {
      filtered = filtered.filter(evt => evt.severity === options.severity);
    }

    if (options?.source) {
      filtered = filtered.filter(evt => evt.source.includes(options.source));
    }

    if (options?.since) {
      filtered = filtered.filter(evt => evt.timestamp >= options.since);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  // Statistics
  getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byComponent: Record<string, number>;
    byCategory: Record<string, number>;
    lastHour: number;
  } {
    const oneHourAgo = Date.now() - 3600000;
    const lastHour = this.logs.filter(log => log.timestamp > oneHourAgo).length;

    const byLevel: Record<string, number> = {};
    const byComponent: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    this.logs.forEach(log => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byComponent[log.component] = (byComponent[log.component] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });

    return {
      total: this.logs.length,
      byLevel,
      byComponent,
      byCategory,
      lastHour
    };
  }

  // Export functionality
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify({
        logs: this.logs,
        auditEvents: this.auditEvents,
        securityEvents: this.securityEvents,
        exportedAt: Date.now()
      }, null, 2);
    }

    // CSV export for logs
    const headers = ['timestamp', 'level', 'component', 'message', 'category'];
    const rows = this.logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.component,
      log.message.replace(/"/g, '""'),
      log.category
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  // Clear methods
  clearLogs(): void {
    this.logs = [];
    console.log('🧹 Application logs cleared');
  }

  clearAuditEvents(): void {
    this.auditEvents = [];
    console.log('🧹 Audit events cleared');
  }

  clearSecurityEvents(): void {
    this.securityEvents = [];
    console.log('🧹 Security events cleared');
  }

  clearAll(): void {
    this.clearLogs();
    this.clearAuditEvents();
    this.clearSecurityEvents();
    console.log('🧹 All logs and events cleared');
  }

  dispose(): void {
    this.clearAll();
    console.log('♻️ Comprehensive Logger disposed');
  }
}

// Global logger instance
export const logger = new ComprehensiveLogger({
  maxLogSize: 10000,
  logLevel: 'info',
  enableAudit: true,
  enableSecurity: true
});

export default ComprehensiveLogger;