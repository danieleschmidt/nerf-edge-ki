import { RobustValidator } from '../../src/core/RobustValidator';

describe('RobustValidator', () => {
  let validator: RobustValidator;

  beforeEach(() => {
    validator = new RobustValidator();
  });

  describe('NerfConfig validation', () => {
    it('should validate valid NerfConfig', () => {
      const config = {
        targetFPS: 60,
        maxResolution: [1920, 1080],
        foveatedRendering: true,
        memoryLimit: 2048,
        powerMode: 'balanced'
      };

      const result = validator.validateNerfConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedValue).toEqual(config);
    });

    it('should reject invalid targetFPS', () => {
      const config = { targetFPS: -10 };
      const result = validator.validateNerfConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('targetFPS must be a positive number between 1 and 240');
    });

    it('should warn about high targetFPS', () => {
      const config = { targetFPS: 144 };
      const result = validator.validateNerfConfig(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('targetFPS above 120 may cause performance issues');
    });

    it('should reject invalid maxResolution', () => {
      const config = { maxResolution: [1920] }; // Missing height
      const result = validator.validateNerfConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxResolution must be an array of two positive integers');
    });

    it('should sanitize maxResolution', () => {
      const config = { maxResolution: [1920.7, 1080.3] }; // Floating point values
      const result = validator.validateNerfConfig(config);

      expect(result.valid).toBe(true);
      expect(result.sanitizedValue?.maxResolution).toEqual([1921, 1080]);
    });

    it('should reject invalid powerMode', () => {
      const config = { powerMode: 'turbo' };
      const result = validator.validateNerfConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('powerMode must be "performance", "balanced", or "power-saving"');
    });
  });

  describe('RenderOptions validation', () => {
    it('should validate valid RenderOptions', () => {
      const options = {
        cameraPosition: [0, 1.6, 3],
        cameraRotation: [0, 0, 0, 1],
        fieldOfView: 75,
        near: 0.1,
        far: 100
      };

      const result = validator.validateRenderOptions(options);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid cameraPosition', () => {
      const options = {
        cameraPosition: [0, 1.6], // Missing z coordinate
        cameraRotation: [0, 0, 0, 1],
        fieldOfView: 75,
        near: 0.1,
        far: 100
      };

      const result = validator.validateRenderOptions(options);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('cameraPosition must be an array of 3 numbers');
    });

    it('should normalize quaternion', () => {
      const options = {
        cameraPosition: [0, 1.6, 3],
        cameraRotation: [0, 0, 0, 2], // Unnormalized quaternion
        fieldOfView: 75,
        near: 0.1,
        far: 100
      };

      const result = validator.validateRenderOptions(options);

      expect(result.valid).toBe(true);
      expect(result.sanitizedValue?.cameraRotation).toEqual([0, 0, 0, 1]); // Normalized
    });

    it('should reject invalid field of view', () => {
      const options = {
        cameraPosition: [0, 1.6, 3],
        cameraRotation: [0, 0, 0, 1],
        fieldOfView: 200, // Too wide
        near: 0.1,
        far: 100
      };

      const result = validator.validateRenderOptions(options);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('fieldOfView must be a number between 10 and 170 degrees');
    });

    it('should reject invalid near/far planes', () => {
      const options = {
        cameraPosition: [0, 1.6, 3],
        cameraRotation: [0, 0, 0, 1],
        fieldOfView: 75,
        near: 10,
        far: 5 // Far plane closer than near plane
      };

      const result = validator.validateRenderOptions(options);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('far plane must be greater than near plane');
    });

    it('should warn about large near/far ratio', () => {
      const options = {
        cameraPosition: [0, 1.6, 3],
        cameraRotation: [0, 0, 0, 1],
        fieldOfView: 75,
        near: 0.01,
        far: 1000000 // Very large ratio
      };

      const result = validator.validateRenderOptions(options);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Large near/far ratio may cause depth precision issues');
    });
  });

  describe('String validation', () => {
    it('should validate and sanitize strings', () => {
      const result = validator.validateString('  <script>alert("xss")</script>  ', {
        maxLength: 20
      });

      expect(result.valid).toBe(true);
      expect(result.sanitizedValue).toBe('scriptalert(xss)/scr'); // Sanitized and truncated
    });

    it('should reject strings that are too short', () => {
      const result = validator.validateString('hi', { minLength: 5 });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('String must be at least 5 characters');
    });

    it('should truncate strings that are too long', () => {
      const result = validator.validateString('this is a very long string', { maxLength: 10 });

      expect(result.valid).toBe(true);
      expect(result.sanitizedValue).toBe('this is a ');
    });

    it('should validate string patterns', () => {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const result = validator.validateString('invalid-email', { pattern: emailPattern });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('String does not match required pattern');
    });
  });

  describe('Number validation', () => {
    it('should validate valid numbers', () => {
      const result = validator.validateNumber(42.5);

      expect(result.valid).toBe(true);
      expect(result.sanitizedValue).toBe(42.5);
    });

    it('should reject string numbers (strict typing)', () => {
      const result = validator.validateNumber('123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Value must be a valid number');
    });

    it('should round to integer when required', () => {
      const result = validator.validateNumber(42.7, { integer: true });

      expect(result.valid).toBe(true);
      expect(result.sanitizedValue).toBe(43);
    });

    it('should validate number ranges', () => {
      const result = validator.validateNumber(150, { min: 0, max: 100 });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Number must be at most 100');
    });

    it('should reject invalid numbers', () => {
      const result = validator.validateNumber(NaN);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Value must be a valid number');
    });
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RobustValidator.getInstance();
      const instance2 = RobustValidator.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});