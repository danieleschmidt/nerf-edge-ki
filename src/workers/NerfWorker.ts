/**
 * Web Worker for NeRF processing
 */

export interface WorkerMessage {
  type: string;
  payload: unknown;
}

export interface WorkerResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class NerfWorker {
  async process(_data: unknown): Promise<unknown> {
    return { processed: true };
  }

  terminate(): void {
    console.log('NerfWorker terminated');
  }
}

export default NerfWorker;