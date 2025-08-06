/**
 * Quantum NeRF Demo - Advanced Task Planning with Quantum Optimization
 * Demonstrates quantum-inspired task scheduling for real-time NeRF rendering
 */

import {
  QuantumTaskPlanner,
  QuantumNerfScheduler,
  QuantumUtils,
  QuantumPerformanceOptimizer,
  NerfRenderer,
  NerfScene,
  NerfService,
  initialize,
  type QuantumTask,
  type NerfRenderTask,
  type RenderOptions,
  type NerfConfig
} from '../src';

class QuantumNerfDemo {
  private quantumScheduler?: QuantumNerfScheduler;
  private quantumPlanner?: QuantumTaskPlanner;
  private performanceOptimizer: QuantumPerformanceOptimizer;
  private nerfRenderer?: NerfRenderer;
  private nerfService?: NerfService;
  private isRunning: boolean = false;

  constructor() {
    this.performanceOptimizer = new QuantumPerformanceOptimizer();
    this.setupPerformanceMetrics();
  }

  /**
   * Initialize the quantum-enhanced NeRF system
   */
  async initialize(canvas?: HTMLCanvasElement): Promise<void> {
    console.log('🌌 Initializing Quantum NeRF Demo...');

    // Initialize base NeRF system
    const nerfConfig: NerfConfig = {
      targetFPS: 90,
      maxResolution: [2880, 1800], // Vision Pro resolution per eye
      foveatedRendering: true,
      memoryLimit: 1024,
      powerMode: 'performance'
    };

    const { renderer, service } = await initialize(nerfConfig);
    this.nerfRenderer = renderer;
    this.nerfService = service;

    if (canvas) {
      await renderer.initialize(canvas);
    }

    // Initialize quantum scheduler
    this.quantumScheduler = new QuantumNerfScheduler(
      {
        targetFPS: 90,
        maxLatency: 11, // 11ms for 90 FPS
        qualityThreshold: 0.9,
        enableFoveation: true,
        quantumOptimization: true
      },
      nerfConfig
    );

    // Initialize quantum task planner
    this.quantumPlanner = new QuantumTaskPlanner({
      temperature: 0.05,
      annealingTime: 500
    });

    this.setupQuantumEvents();
    console.log('✨ Quantum NeRF system initialized');
  }

  /**
   * Start the quantum-enhanced rendering system
   */
  async start(): Promise<void> {
    if (!this.quantumScheduler || !this.quantumPlanner || !this.nerfRenderer) {
      throw new Error('System not initialized. Call initialize() first.');
    }

    console.log('🚀 Starting quantum NeRF rendering...');
    this.isRunning = true;

    // Create demo scene
    const scene = await this.createQuantumOptimizedScene();
    this.nerfRenderer.setScene(scene);

    // Start quantum scheduler
    await this.quantumScheduler.start();

    // Start quantum planner
    this.quantumPlanner.start();

    // Create various rendering tasks to demonstrate quantum optimization
    await this.createDemoRenderingTasks();

    // Start adaptive rendering loop
    this.startQuantumRenderLoop();

    console.log('🎬 Quantum NeRF rendering active!');
  }

  /**
   * Stop the quantum system
   */
  stop(): void {
    console.log('🛑 Stopping quantum NeRF system...');
    this.isRunning = false;

    this.quantumScheduler?.stop();
    this.quantumPlanner?.stop();

    console.log('✅ Quantum system stopped');
  }

  /**
   * Demonstrate quantum task entanglement
   */
  async demonstrateQuantumEntanglement(): Promise<void> {
    console.log('🔗 Demonstrating quantum task entanglement...');

    if (!this.quantumPlanner) return;

    // Create entangled rendering tasks
    const rayMarchingTask: QuantumTask = {
      id: 'ray_marching_demo',
      name: 'Demo Ray Marching',
      priority: 0.9,
      estimatedDuration: 8,
      dependencies: [],
      resourceRequirements: {
        cpu: 0.3,
        memory: 256,
        gpu: 0.8,
        bandwidth: 100
      },
      quantumState: {
        superposition: 0.8,
        entanglement: [],
        coherence: 0.95,
        amplitude: { real: 0.9, imaginary: 0.1 }
      },
      metadata: { demo: true }
    };

    const neuralInferenceTask: QuantumTask = {
      id: 'neural_inference_demo',
      name: 'Demo Neural Inference',
      priority: 0.95,
      estimatedDuration: 12,
      dependencies: ['ray_marching_demo'],
      resourceRequirements: {
        cpu: 0.2,
        memory: 512,
        gpu: 0.9,
        bandwidth: 50
      },
      quantumState: {
        superposition: 0.85,
        entanglement: [],
        coherence: 0.9,
        amplitude: { real: 0.95, imaginary: 0.05 }
      },
      metadata: { demo: true }
    };

    // Add tasks to planner
    this.quantumPlanner.addTask(rayMarchingTask);
    this.quantumPlanner.addTask(neuralInferenceTask);

    // Create quantum entanglement
    this.quantumPlanner.entangleTasks(rayMarchingTask.id, neuralInferenceTask.id);

    // Plan and execute
    const result = await this.quantumPlanner.planOptimal();
    console.log(`🎯 Quantum advantage achieved: ${(result.quantumAdvantage * 100).toFixed(2)}%`);

    // Execute entangled tasks
    console.log('⚡ Executing quantum-entangled tasks...');
    await this.quantumPlanner.executeNext();
    await this.quantumPlanner.executeNext();

    console.log('✨ Quantum entanglement demonstration complete');
  }

  /**
   * Demonstrate quantum superposition for parallel rendering
   */
  async demonstrateQuantumSuperposition(): Promise<void> {
    console.log('🌀 Demonstrating quantum superposition...');

    if (!this.quantumScheduler) return;

    // Create multiple render requests that can be superposed
    const renderOptions: RenderOptions[] = [
      {
        cameraPosition: [0, 1.6, 3],
        cameraRotation: [0, 0, 0, 1],
        fieldOfView: 90,
        near: 0.1,
        far: 100
      },
      {
        cameraPosition: [2, 1.6, 3],
        cameraRotation: [0, 0.2, 0, 1],
        fieldOfView: 85,
        near: 0.1,
        far: 100
      },
      {
        cameraPosition: [-2, 1.6, 3],
        cameraRotation: [0, -0.2, 0, 1],
        fieldOfView: 95,
        near: 0.1,
        far: 100
      }
    ];

    // Schedule renders with quantum superposition
    console.log('📊 Scheduling superposed rendering tasks...');
    const taskIds = renderOptions.map((options, index) => 
      this.quantumScheduler!.scheduleRender(options, 0.8 + index * 0.05)
    );

    // Monitor performance during superposed execution
    const startTime = Date.now();
    const initialMetrics = this.quantumScheduler.getPerformanceMetrics();

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 200));

    const finalMetrics = this.quantumScheduler.getPerformanceMetrics();
    const executionTime = Date.now() - startTime;

    console.log(`⏱️  Superposed execution time: ${executionTime}ms`);
    console.log(`📈 FPS improvement: ${((finalMetrics.fps - initialMetrics.fps) / initialMetrics.fps * 100).toFixed(2)}%`);
    console.log(`🧠 Tasks scheduled: ${taskIds.length}`);

    console.log('✨ Quantum superposition demonstration complete');
  }

  /**
   * Demonstrate quantum annealing optimization
   */
  async demonstrateQuantumAnnealing(): Promise<void> {
    console.log('🌡️ Demonstrating quantum annealing optimization...');

    if (!this.quantumPlanner) return;

    // Create a complex scheduling problem
    const complexTasks: QuantumTask[] = [
      this.createComplexTask('scene_analysis', 15, ['data_loading'], 0.9),
      this.createComplexTask('data_loading', 25, [], 0.8),
      this.createComplexTask('mesh_generation', 30, ['scene_analysis'], 0.85),
      this.createComplexTask('texture_synthesis', 20, ['mesh_generation'], 0.75),
      this.createComplexTask('lighting_calculation', 18, ['scene_analysis'], 0.8),
      this.createComplexTask('shadow_mapping', 12, ['lighting_calculation'], 0.7),
      this.createComplexTask('final_rendering', 8, ['texture_synthesis', 'shadow_mapping'], 0.95)
    ];

    console.log(`🧩 Adding ${complexTasks.length} complex tasks...`);
    for (const task of complexTasks) {
      this.quantumPlanner.addTask(task);
    }

    // Measure quantum annealing performance
    console.log('🔥 Running quantum annealing optimization...');
    const annealingStart = Date.now();
    const result = await this.quantumPlanner.planOptimal();
    const annealingTime = Date.now() - annealingStart;

    console.log(`⏱️  Annealing time: ${annealingTime}ms`);
    console.log(`🎯 Quantum advantage: ${(result.quantumAdvantage * 100).toFixed(2)}%`);
    console.log(`⚡ Schedule efficiency: ${(result.efficiency * 100).toFixed(2)}%`);
    console.log(`⏳ Total execution time: ${result.totalTime.toFixed(2)}ms`);

    // Execute optimized schedule
    console.log('🚀 Executing quantum-optimized schedule...');
    const executionStart = Date.now();
    let executedCount = 0;

    while (this.quantumPlanner.getSchedule().length > 0) {
      const task = await this.quantumPlanner.executeNext();
      if (task) {
        executedCount++;
        console.log(`✅ Completed: ${task.name} (${executedCount}/${complexTasks.length})`);
      } else {
        break;
      }
    }

    const actualExecutionTime = Date.now() - executionStart;
    console.log(`🏁 Actual execution time: ${actualExecutionTime}ms`);
    console.log(`📊 Optimization effectiveness: ${((result.totalTime - actualExecutionTime) / result.totalTime * 100).toFixed(2)}%`);

    console.log('✨ Quantum annealing demonstration complete');
  }

  /**
   * Demonstrate performance optimization with quantum feedback
   */
  async demonstratePerformanceOptimization(): Promise<void> {
    console.log('📈 Demonstrating quantum performance optimization...');

    // Initialize performance metrics
    this.performanceOptimizer.initializeMetric('frameRate', 60);
    this.performanceOptimizer.initializeMetric('latency', 16.67);
    this.performanceOptimizer.initializeMetric('gpuUtilization', 70);
    this.performanceOptimizer.initializeMetric('memoryUsage', 512);

    // Create entanglement between related metrics
    this.performanceOptimizer.entangleMetrics('frameRate', 'latency');
    this.performanceOptimizer.entangleMetrics('gpuUtilization', 'memoryUsage');

    // Simulate performance updates with quantum optimization
    console.log('🔄 Simulating performance monitoring...');
    
    for (let i = 0; i < 10; i++) {
      // Simulate varying performance
      const newFrameRate = 60 + (Math.random() - 0.5) * 20;
      const newLatency = 1000 / newFrameRate;
      const newGPU = 50 + Math.random() * 50;
      const newMemory = 400 + Math.random() * 300;

      // Update with quantum optimization
      this.performanceOptimizer.updateMetric('frameRate', newFrameRate, 0.8);
      this.performanceOptimizer.updateMetric('latency', newLatency, 0.8);
      this.performanceOptimizer.updateMetric('gpuUtilization', newGPU, 0.7);
      this.performanceOptimizer.updateMetric('memoryUsage', newMemory, 0.7);

      // Apply decoherence
      this.performanceOptimizer.applyDecoherence(100); // 100ms elapsed

      // Get optimized values
      const optimizedFPS = this.performanceOptimizer.getOptimizedValue('frameRate');
      const optimizedLatency = this.performanceOptimizer.getOptimizedValue('latency');

      console.log(`📊 Iteration ${i + 1}: FPS ${newFrameRate.toFixed(1)} → ${optimizedFPS.toFixed(1)}, Latency ${newLatency.toFixed(2)} → ${optimizedLatency.toFixed(2)}ms`);

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Show final quantum states
    const states = this.performanceOptimizer.getQuantumStates();
    console.log('🌌 Final quantum states:');
    for (const [metric, state] of states.entries()) {
      const amplitude = QuantumUtils.calculateAmplitude(state.real, state.imaginary);
      const superposition = QuantumUtils.calculateSuperposition(state);
      console.log(`   ${metric}: coherence=${state.coherence.toFixed(3)}, amplitude=${amplitude.toFixed(3)}, superposition=${superposition.toFixed(3)}`);
    }

    console.log('✨ Performance optimization demonstration complete');
  }

  /**
   * Run full quantum demonstration
   */
  async runFullDemo(canvas?: HTMLCanvasElement): Promise<void> {
    console.log('🌟 Starting comprehensive quantum NeRF demonstration...');

    try {
      // Initialize system
      await this.initialize(canvas);
      await this.start();

      console.log('\n=== Quantum Task Entanglement Demo ===');
      await this.demonstrateQuantumEntanglement();

      console.log('\n=== Quantum Superposition Demo ===');
      await this.demonstrateQuantumSuperposition();

      console.log('\n=== Quantum Annealing Demo ===');
      await this.demonstrateQuantumAnnealing();

      console.log('\n=== Performance Optimization Demo ===');
      await this.demonstratePerformanceOptimization();

      console.log('\n🎉 Quantum NeRF demonstration complete!');
      console.log('🔬 Advanced quantum computing principles successfully applied to real-time NeRF rendering');

    } catch (error) {
      console.error('❌ Demo failed:', error);
    } finally {
      this.stop();
    }
  }

  // Private methods

  private setupPerformanceMetrics(): void {
    // Initialize quantum-optimized performance tracking
    this.performanceOptimizer.initializeMetric('quantumCoherence', 0.9);
    this.performanceOptimizer.initializeMetric('entanglementStrength', 0.8);
    this.performanceOptimizer.initializeMetric('superpositionLevel', 0.7);
  }

  private setupQuantumEvents(): void {
    if (!this.quantumScheduler) return;

    this.quantumScheduler.on('scheduleOptimized', (result) => {
      console.log(`⚡ Schedule optimized with ${(result.quantumAdvantage * 100).toFixed(1)}% quantum advantage`);
      
      // Update performance metrics
      this.performanceOptimizer.updateMetric('quantumCoherence', result.efficiency, 0.9);
    });

    this.quantumScheduler.on('renderTaskCompleted', (task) => {
      console.log(`✅ Quantum render task completed: ${(task as any).name}`);
    });

    this.quantumScheduler.on('renderTaskFailed', ({ task, error }) => {
      console.warn(`⚠️ Render task failed: ${(task as any).name}`, error.message);
    });
  }

  private async createQuantumOptimizedScene(): Promise<NerfScene> {
    console.log('🎬 Creating quantum-optimized demo scene...');
    return NerfScene.createDemoScene();
  }

  private async createDemoRenderingTasks(): Promise<void> {
    if (!this.quantumScheduler) return;

    // Create various rendering scenarios
    const scenarios = [
      { position: [0, 1.6, 3], fov: 90, priority: 0.9 },
      { position: [1, 1.6, 2], fov: 85, priority: 0.8 },
      { position: [-1, 1.6, 4], fov: 95, priority: 0.85 },
      { position: [0, 2, 1], fov: 80, priority: 0.7 }
    ];

    for (const scenario of scenarios) {
      const renderOptions: RenderOptions = {
        cameraPosition: scenario.position as [number, number, number],
        cameraRotation: [0, 0, 0, 1],
        fieldOfView: scenario.fov,
        near: 0.1,
        far: 100
      };

      this.quantumScheduler.scheduleRender(renderOptions, scenario.priority);
    }

    console.log(`📋 Created ${scenarios.length} demo rendering tasks`);
  }

  private createComplexTask(
    id: string,
    duration: number,
    dependencies: string[],
    priority: number
  ): QuantumTask {
    return {
      id,
      name: `Complex Task: ${id.replace('_', ' ')}`,
      priority,
      estimatedDuration: duration,
      dependencies,
      resourceRequirements: {
        cpu: Math.random() * 0.8 + 0.2,
        memory: Math.random() * 400 + 100,
        gpu: Math.random() * 0.7 + 0.3,
        bandwidth: Math.random() * 100 + 50
      },
      quantumState: {
        superposition: Math.random() * 0.5 + 0.5,
        entanglement: [],
        coherence: Math.random() * 0.3 + 0.7,
        amplitude: {
          real: Math.random(),
          imaginary: Math.random() * 0.5
        }
      },
      metadata: { complexity: 'high', demo: true }
    };
  }

  private startQuantumRenderLoop(): void {
    if (!this.isRunning || !this.nerfRenderer) return;

    const renderFrame = () => {
      if (!this.isRunning) return;

      // Quantum-enhanced render frame logic would go here
      // For demo, we'll just schedule the next frame
      requestAnimationFrame(renderFrame);
    };

    renderFrame();
  }
}

// Export for use in other demos
export default QuantumNerfDemo;

// CLI interface for running the demo
if (require.main === module) {
  console.log('🌌 Quantum NeRF Demo - Interactive Mode');
  
  const demo = new QuantumNerfDemo();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'full':
      demo.runFullDemo().catch(console.error);
      break;
    
    case 'entanglement':
      demo.initialize().then(() => demo.demonstrateQuantumEntanglement()).catch(console.error);
      break;
    
    case 'superposition':
      demo.initialize().then(() => demo.demonstrateQuantumSuperposition()).catch(console.error);
      break;
    
    case 'annealing':
      demo.initialize().then(() => demo.demonstrateQuantumAnnealing()).catch(console.error);
      break;
    
    case 'performance':
      demo.initialize().then(() => demo.demonstratePerformanceOptimization()).catch(console.error);
      break;
    
    default:
      console.log('Usage: node quantum-nerf-demo.js [full|entanglement|superposition|annealing|performance]');
      console.log('');
      console.log('Commands:');
      console.log('  full         - Run complete quantum demonstration');
      console.log('  entanglement - Demonstrate quantum task entanglement');
      console.log('  superposition- Demonstrate quantum superposition');
      console.log('  annealing    - Demonstrate quantum annealing optimization');
      console.log('  performance  - Demonstrate quantum performance optimization');
      break;
  }
}