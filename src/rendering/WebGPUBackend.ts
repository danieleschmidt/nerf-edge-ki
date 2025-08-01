/**
 * WebGPU rendering backend
 */

export class WebGPUBackend {
  private device?: any;
  private adapter?: any;

  async initialize(): Promise<void> {
    if (!(navigator as any).gpu) {
      throw new Error('WebGPU not supported');
    }

    this.adapter = await (navigator as any).gpu.requestAdapter();
    if (!this.adapter) {
      throw new Error('Failed to get WebGPU adapter');
    }

    this.device = await this.adapter.requestDevice();
    console.log('WebGPU backend initialized');
  }

  getDevice(): any | undefined {
    return this.device;
  }

  isSupported(): boolean {
    return !!(navigator as any).gpu;
  }
}