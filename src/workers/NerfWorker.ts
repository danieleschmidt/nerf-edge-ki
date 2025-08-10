/**
 * Web Worker for NeRF processing
 */

export class NerfWorker {
  async process(_data: any): Promise<any> {
    return { processed: true };
  }

  terminate(): void {
    console.log('NerfWorker terminated');
  }
}