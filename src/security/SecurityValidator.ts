/**
 * Generation 2: MAKE IT ROBUST - Security Validation System
 * 
 * Comprehensive security validation for NeRF Edge Kit
 * - Input sanitization and validation
 * - WebGPU security checks
 * - Memory safety validation
 * - Network request validation
 * - GDPR/CCPA compliance checks
 */

export enum SecurityThreatLevel {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export interface SecurityThreat {
  id: string;
  type: string;
  level: SecurityThreatLevel;
  description: string;
  mitigation: string;
  timestamp: number;
}

export interface SecurityValidationResult {
  isValid: boolean;
  threats: SecurityThreat[];
  recommendations: string[];
  riskScore: number;
}

export class SecurityValidator {
  private threats: SecurityThreat[] = [];
  private readonly maxMemoryUsage = 2 * 1024 * 1024 * 1024; // 2GB limit
  private readonly allowedDomains = ['localhost', '127.0.0.1', '.terragon.ai'];
  
  /**
   * Validate NeRF model data for security threats
   */
  async validateNerfModel(modelData: ArrayBuffer | Uint8Array): Promise<SecurityValidationResult> {
    const threats: SecurityThreat[] = [];
    const recommendations: string[] = [];
    
    // Check model size
    const modelSize = modelData.byteLength || modelData.length;
    if (modelSize > this.maxMemoryUsage) {
      threats.push({
        id: `threat_${Date.now()}_1`,
        type: 'MEMORY_EXHAUSTION',
        level: SecurityThreatLevel.HIGH,
        description: `Model size ${modelSize} bytes exceeds safe limit`,
        mitigation: 'Use streaming or compression',
        timestamp: Date.now()
      });
      recommendations.push('Consider using progressive loading for large models');
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = this.detectSuspiciousPatterns(modelData);
    threats.push(...suspiciousPatterns);
    
    // Validate structure integrity
    const structureThreats = await this.validateModelStructure(modelData);
    threats.push(...structureThreats);
    
    const riskScore = this.calculateRiskScore(threats);
    
    return {
      isValid: threats.filter(t => t.level >= SecurityThreatLevel.HIGH).length === 0,
      threats,
      recommendations,
      riskScore
    };
  }
  
  /**
   * Validate WebGPU shader code for security issues
   */
  validateShaderCode(shaderCode: string): SecurityValidationResult {
    const threats: SecurityThreat[] = [];
    const recommendations: string[] = [];
    
    // Check for suspicious WGSL patterns
    const suspiciousKeywords = [
      'import', 'require', 'eval', 'function',
      'document', 'window', 'fetch', 'XMLHttpRequest'
    ];
    
    for (const keyword of suspiciousKeywords) {
      if (shaderCode.includes(keyword)) {
        threats.push({
          id: `shader_${Date.now()}_${keyword}`,
          type: 'SUSPICIOUS_SHADER_CODE',
          level: SecurityThreatLevel.HIGH,
          description: `Shader contains suspicious keyword: ${keyword}`,
          mitigation: 'Review and sanitize shader code',
          timestamp: Date.now()
        });
      }
    }
    
    // Validate WGSL syntax safety
    const syntaxThreats = this.validateWGSLSyntax(shaderCode);
    threats.push(...syntaxThreats);
    
    const riskScore = this.calculateRiskScore(threats);
    
    return {
      isValid: threats.length === 0,
      threats,
      recommendations,
      riskScore
    };
  }
  
  /**
   * Validate network requests for security compliance
   */
  validateNetworkRequest(url: string, headers: Record<string, string> = {}): SecurityValidationResult {
    const threats: SecurityThreat[] = [];
    const recommendations: string[] = [];
    
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (urlObj.protocol !== 'https:' && !this.isLocalhost(urlObj.hostname)) {
        threats.push({
          id: `network_${Date.now()}_protocol`,
          type: 'INSECURE_PROTOCOL',
          level: SecurityThreatLevel.MEDIUM,
          description: `Non-HTTPS request to ${urlObj.hostname}`,
          mitigation: 'Use HTTPS for all external requests',
          timestamp: Date.now()
        });
      }
      
      // Check domain whitelist
      if (!this.isDomainAllowed(urlObj.hostname)) {
        threats.push({
          id: `network_${Date.now()}_domain`,
          type: 'UNAUTHORIZED_DOMAIN',
          level: SecurityThreatLevel.HIGH,
          description: `Request to unauthorized domain: ${urlObj.hostname}`,
          mitigation: 'Add domain to allowlist or block request',
          timestamp: Date.now()
        });
      }
      
      // Validate headers
      const headerThreats = this.validateHeaders(headers);
      threats.push(...headerThreats);
      
    } catch (error) {
      threats.push({
        id: `network_${Date.now()}_invalid`,
        type: 'INVALID_URL',
        level: SecurityThreatLevel.HIGH,
        description: `Invalid URL format: ${url}`,
        mitigation: 'Validate and sanitize URL input',
        timestamp: Date.now()
      });
    }
    
    const riskScore = this.calculateRiskScore(threats);
    
    return {
      isValid: threats.filter(t => t.level >= SecurityThreatLevel.HIGH).length === 0,
      threats,
      recommendations,
      riskScore
    };
  }
  
  /**
   * Validate user input for XSS and injection attacks
   */
  validateUserInput(input: string, context: string = 'general'): SecurityValidationResult {
    const threats: SecurityThreat[] = [];
    const recommendations: string[] = [];
    
    // XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        threats.push({
          id: `input_${Date.now()}_xss`,
          type: 'XSS_ATTEMPT',
          level: SecurityThreatLevel.CRITICAL,
          description: `Potential XSS attack detected in ${context}`,
          mitigation: 'Sanitize input and encode output',
          timestamp: Date.now()
        });
      }
    }
    
    // SQL injection patterns (if applicable)
    const sqlPatterns = [
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b)/gi,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
      /(--|\/\*|\*\/)/gi
    ];
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        threats.push({
          id: `input_${Date.now()}_sql`,
          type: 'SQL_INJECTION',
          level: SecurityThreatLevel.HIGH,
          description: `Potential SQL injection in ${context}`,
          mitigation: 'Use parameterized queries',
          timestamp: Date.now()
        });
      }
    }
    
    const riskScore = this.calculateRiskScore(threats);
    
    return {
      isValid: threats.length === 0,
      threats,
      recommendations,
      riskScore
    };
  }
  
  /**
   * GDPR/CCPA compliance validation
   */
  validateDataPrivacy(userData: Record<string, unknown>): SecurityValidationResult {
    const threats: SecurityThreat[] = [];
    const recommendations: string[] = ['Ensure user consent for data collection'];
    
    // Check for PII
    const piiFields = ['email', 'phone', 'ssn', 'address', 'name', 'birthdate'];
    const foundPII: string[] = [];
    
    for (const [key, value] of Object.entries(userData)) {
      if (piiFields.some(pii => key.toLowerCase().includes(pii))) {
        foundPII.push(key);
      }
    }
    
    if (foundPII.length > 0) {
      threats.push({
        id: `privacy_${Date.now()}_pii`,
        type: 'PII_DETECTED',
        level: SecurityThreatLevel.MEDIUM,
        description: `PII fields detected: ${foundPII.join(', ')}`,
        mitigation: 'Implement data encryption and access controls',
        timestamp: Date.now()
      });
      recommendations.push('Encrypt PII data at rest and in transit');
      recommendations.push('Implement data retention policies');
    }
    
    const riskScore = this.calculateRiskScore(threats);
    
    return {
      isValid: true, // Privacy violations are warnings, not blocking
      threats,
      recommendations,
      riskScore
    };
  }
  
  /**
   * Get security summary and recommendations
   */
  getSecuritySummary(): {
    totalThreats: number;
    threatsByLevel: Record<SecurityThreatLevel, number>;
    recommendations: string[];
  } {
    const threatsByLevel = {
      [SecurityThreatLevel.LOW]: 0,
      [SecurityThreatLevel.MEDIUM]: 0,
      [SecurityThreatLevel.HIGH]: 0,
      [SecurityThreatLevel.CRITICAL]: 0
    };
    
    for (const threat of this.threats) {
      threatsByLevel[threat.level]++;
    }
    
    return {
      totalThreats: this.threats.length,
      threatsByLevel,
      recommendations: [
        'Regular security audits recommended',
        'Keep WebGPU drivers updated',
        'Implement Content Security Policy',
        'Use HTTPS for all communications',
        'Validate all user inputs',
        'Monitor for suspicious activities'
      ]
    };
  }
  
  // Private helper methods
  
  private detectSuspiciousPatterns(data: ArrayBuffer | Uint8Array): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    
    // Convert to Uint8Array if needed
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    
    // Check for executable signatures
    const executableSignatures = [
      [0x4D, 0x5A], // PE executable (MZ)
      [0x7F, 0x45, 0x4C, 0x46], // ELF executable
      [0xFE, 0xED, 0xFA, 0xCE], // Mach-O executable
    ];
    
    for (const signature of executableSignatures) {
      if (this.bytesStartWith(bytes, signature)) {
        threats.push({
          id: `pattern_${Date.now()}_executable`,
          type: 'EXECUTABLE_CONTENT',
          level: SecurityThreatLevel.CRITICAL,
          description: 'Executable code detected in model data',
          mitigation: 'Remove executable content',
          timestamp: Date.now()
        });
      }
    }
    
    return threats;
  }
  
  private async validateModelStructure(data: ArrayBuffer | Uint8Array): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    
    // Basic structure validation
    // In a real implementation, this would validate NeRF-specific formats
    const size = data.byteLength || data.length;
    
    if (size < 1024) {
      threats.push({
        id: `structure_${Date.now()}_size`,
        type: 'SUSPICIOUS_MODEL_SIZE',
        level: SecurityThreatLevel.MEDIUM,
        description: 'Model size is suspiciously small',
        mitigation: 'Verify model integrity',
        timestamp: Date.now()
      });
    }
    
    return threats;
  }
  
  private validateWGSLSyntax(shaderCode: string): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    
    // Check for infinite loops
    if (shaderCode.includes('while(true)') || shaderCode.includes('for(;;)')) {
      threats.push({
        id: `wgsl_${Date.now()}_infinite`,
        type: 'INFINITE_LOOP',
        level: SecurityThreatLevel.HIGH,
        description: 'Potential infinite loop in shader',
        mitigation: 'Add loop bounds checking',
        timestamp: Date.now()
      });
    }
    
    return threats;
  }
  
  private validateHeaders(headers: Record<string, string>): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    
    // Check for sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        if (value.length < 10) {
          threats.push({
            id: `header_${Date.now()}_weak`,
            type: 'WEAK_AUTHENTICATION',
            level: SecurityThreatLevel.MEDIUM,
            description: `Weak ${key} header detected`,
            mitigation: 'Use strong authentication tokens',
            timestamp: Date.now()
          });
        }
      }
    }
    
    return threats;
  }
  
  private isLocalhost(hostname: string): boolean {
    return ['localhost', '127.0.0.1', '::1'].includes(hostname);
  }
  
  private isDomainAllowed(hostname: string): boolean {
    if (this.isLocalhost(hostname)) return true;
    
    return this.allowedDomains.some(domain => {
      if (domain.startsWith('.')) {
        return hostname.endsWith(domain);
      }
      return hostname === domain;
    });
  }
  
  private bytesStartWith(bytes: Uint8Array, signature: number[]): boolean {
    if (bytes.length < signature.length) return false;
    
    for (let i = 0; i < signature.length; i++) {
      if (bytes[i] !== signature[i]) return false;
    }
    
    return true;
  }
  
  private calculateRiskScore(threats: SecurityThreat[]): number {
    let score = 0;
    
    for (const threat of threats) {
      switch (threat.level) {
        case SecurityThreatLevel.LOW:
          score += 1;
          break;
        case SecurityThreatLevel.MEDIUM:
          score += 3;
          break;
        case SecurityThreatLevel.HIGH:
          score += 7;
          break;
        case SecurityThreatLevel.CRITICAL:
          score += 15;
          break;
      }
    }
    
    return Math.min(100, score);
  }
}