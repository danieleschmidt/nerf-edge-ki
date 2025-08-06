# QuantumTaskPlanner API Reference

> Core quantum task scheduling and optimization engine

## Overview

The `QuantumTaskPlanner` is the heart of the quantum-inspired task planning system. It uses quantum computing principles like superposition, entanglement, and quantum annealing to optimize task scheduling and resource allocation.

## Constructor

```typescript
new QuantumTaskPlanner(config?: Partial<QuantumPlannerConfig>)
```

### Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `config` | `Partial<QuantumPlannerConfig>` | Configuration options | `{}` |

### QuantumPlannerConfig

```typescript
interface QuantumPlannerConfig {
  temperature?: number;        // Quantum annealing temperature (0-1)
  annealingTime?: number;      // Annealing optimization time (ms)
  annealingConfig?: {
    initialTemperature: number;
    finalTemperature: number;
    coolingRate: number;
    maxIterations: number;
  };
}
```

### Example

```typescript
const planner = new QuantumTaskPlanner({
  temperature: 0.1,
  annealingTime: 1000,
  annealingConfig: {
    initialTemperature: 10,
    finalTemperature: 0.01,
    coolingRate: 0.95,
    maxIterations: 1000
  }
});
```

## Methods

### addTask(task)

Adds a quantum task to the planning system.

```typescript
addTask(task: QuantumTask): void
```

#### Parameters

- **task** (`QuantumTask`): The quantum task to add

#### QuantumTask Interface

```typescript
interface QuantumTask {
  id: string;                           // Unique task identifier
  name: string;                         // Human-readable task name
  priority: number;                     // Priority (0-1, higher is more important)
  estimatedDuration: number;            // Expected duration in milliseconds
  dependencies: string[];               // Array of task IDs this task depends on
  resourceRequirements: ResourceRequirements;
  quantumState: QuantumState;
  metadata: Record<string, any>;        // Additional task metadata
}

interface ResourceRequirements {
  cpu: number;                          // CPU utilization (0-1)
  memory: number;                       // Memory requirement in MB
  gpu: number;                          // GPU utilization (0-1)
  bandwidth: number;                    // Bandwidth requirement in MB/s
}

interface QuantumState {
  superposition: number;                // Superposition level (0-1)
  entanglement: string[];               // IDs of entangled tasks
  coherence: number;                    // Quantum coherence level (0-1)
  amplitude: Complex;                   // Quantum amplitude
}

interface Complex {
  real: number;                         // Real component
  imaginary: number;                    // Imaginary component
}
```

#### Example

```typescript
const task = {
  id: 'render-scene-1',
  name: 'Render NeRF Scene 1',
  priority: 0.9,
  estimatedDuration: 16,
  dependencies: [],
  resourceRequirements: {
    cpu: 0.4,
    memory: 512,
    gpu: 0.8,
    bandwidth: 200
  },
  quantumState: {
    superposition: 0.7,
    entanglement: [],
    coherence: 0.9,
    amplitude: { real: 1, imaginary: 0 }
  },
  metadata: {
    sceneId: 'scene-1',
    quality: 'ultra'
  }
};

planner.addTask(task);
```

### removeTask(taskId)

Removes a task from the planning system.

```typescript
removeTask(taskId: string): boolean
```

#### Parameters

- **taskId** (`string`): The ID of the task to remove

#### Returns

- `boolean`: `true` if task was removed, `false` if task not found

#### Example

```typescript
const removed = planner.removeTask('render-scene-1');
console.log(`Task removed: ${removed}`);
```

### entangleTasks(taskId1, taskId2)

Creates quantum entanglement between two tasks.

```typescript
entangleTasks(taskId1: string, taskId2: string): void
```

#### Parameters

- **taskId1** (`string`): First task ID
- **taskId2** (`string`): Second task ID

#### Throws

- `Error`: If either task doesn't exist

#### Example

```typescript
// Entangle ray marching with neural inference
planner.entangleTasks('ray-marching', 'neural-inference');
```

### planOptimal()

Plans the optimal execution schedule using quantum annealing.

```typescript
planOptimal(): Promise<ScheduleResult>
```

#### Returns

- `Promise<ScheduleResult>`: The optimized schedule and metrics

#### ScheduleResult Interface

```typescript
interface ScheduleResult {
  tasks: QuantumTask[];                 // Optimally ordered tasks
  totalTime: number;                    // Total execution time (ms)
  efficiency: number;                   // Schedule efficiency (0-1)
  quantumAdvantage: number;             // Quantum improvement over classical (0-1)
}
```

#### Example

```typescript
const result = await planner.planOptimal();
console.log(`Quantum advantage: ${result.quantumAdvantage * 100}%`);
console.log(`Total time: ${result.totalTime}ms`);
console.log(`Efficiency: ${result.efficiency * 100}%`);
console.log(`Tasks in optimal order: ${result.tasks.length}`);
```

### executeNext()

Executes the next task in the quantum-optimized schedule.

```typescript
executeNext(): Promise<QuantumTask | null>
```

#### Returns

- `Promise<QuantumTask | null>`: The executed task, or `null` if no tasks remaining

#### Example

```typescript
// Execute all tasks in optimal order
while (true) {
  const task = await planner.executeNext();
  if (!task) break;
  
  console.log(`Executed: ${task.name} (${task.estimatedDuration}ms)`);
}
```

### getSchedule()

Gets the current optimal schedule.

```typescript
getSchedule(): QuantumTask[]
```

#### Returns

- `QuantumTask[]`: Array of tasks in optimal execution order

#### Example

```typescript
const schedule = planner.getSchedule();
console.log(`Schedule contains ${schedule.length} tasks:`);
schedule.forEach((task, index) => {
  console.log(`${index + 1}. ${task.name} (priority: ${task.priority})`);
});
```

### start()

Starts the quantum planning system with continuous optimization.

```typescript
start(): void
```

#### Example

```typescript
planner.start();
// System will now automatically replan when tasks are added/removed
```

### stop()

Stops the quantum planning system.

```typescript
stop(): void
```

#### Example

```typescript
planner.stop();
// System stops continuous optimization
```

## Events

The `QuantumTaskPlanner` extends `EventEmitter` and emits the following events:

### taskAdded

Emitted when a task is added to the planner.

```typescript
planner.on('taskAdded', (task: QuantumTask) => {
  console.log(`Task added: ${task.name}`);
});
```

### taskRemoved

Emitted when a task is removed from the planner.

```typescript
planner.on('taskRemoved', (taskId: string) => {
  console.log(`Task removed: ${taskId}`);
});
```

### tasksEntangled

Emitted when quantum entanglement is created between tasks.

```typescript
planner.on('tasksEntangled', (taskIds: string[]) => {
  console.log(`Tasks entangled: ${taskIds.join(' ↔ ')}`);
});
```

### planningComplete

Emitted when quantum planning optimization completes.

```typescript
planner.on('planningComplete', (result: ScheduleResult) => {
  console.log(`Planning complete with ${result.quantumAdvantage * 100}% advantage`);
});
```

### taskCompleted

Emitted when a task execution completes.

```typescript
planner.on('taskCompleted', (task: QuantumTask) => {
  console.log(`Task completed: ${task.name}`);
});
```

### taskFailed

Emitted when a task execution fails.

```typescript
planner.on('taskFailed', ({ task, error }: { task: QuantumTask; error: Error }) => {
  console.error(`Task failed: ${task.name}`, error);
});
```

### planningError

Emitted when quantum planning encounters an error.

```typescript
planner.on('planningError', (error: Error) => {
  console.error('Planning error:', error);
});
```

### started

Emitted when the planner starts.

```typescript
planner.on('started', () => {
  console.log('Quantum planner started');
});
```

### stopped

Emitted when the planner stops.

```typescript
planner.on('stopped', () => {
  console.log('Quantum planner stopped');
});
```

## Usage Patterns

### Basic Task Planning

```typescript
// Create planner
const planner = new QuantumTaskPlanner();

// Add tasks with dependencies
planner.addTask(createTask('load-scene', [], 0.8));
planner.addTask(createTask('process-geometry', ['load-scene'], 0.7));
planner.addTask(createTask('render-frame', ['process-geometry'], 0.9));

// Plan and execute
const schedule = await planner.planOptimal();
console.log(`Optimized ${schedule.tasks.length} tasks`);

// Execute in optimal order
let task;
while ((task = await planner.executeNext())) {
  console.log(`Executing: ${task.name}`);
}
```

### Quantum Entanglement for Related Tasks

```typescript
// Add related tasks
planner.addTask(createRayMarchingTask());
planner.addTask(createNeuralInferenceTask());
planner.addTask(createVolumeRenderingTask());

// Create entanglement for tasks that share data
planner.entangleTasks('ray-marching', 'neural-inference');
planner.entangleTasks('neural-inference', 'volume-rendering');

// Plan with entanglement considerations
const result = await planner.planOptimal();
```

### Real-Time Continuous Planning

```typescript
// Start continuous planning
planner.start();

// Add tasks dynamically
setInterval(() => {
  const dynamicTask = createDynamicTask();
  planner.addTask(dynamicTask);
  // Planner automatically replans when new tasks are added
}, 1000);

// Monitor planning results
planner.on('planningComplete', (result) => {
  console.log(`Replanned with ${result.quantumAdvantage * 100}% advantage`);
});
```

### High-Performance Configuration

```typescript
// Optimize for real-time performance (Vision Pro: 90 FPS)
const planner = new QuantumTaskPlanner({
  temperature: 0.01,           // Very precise optimization
  annealingTime: 200,          // Fast annealing for 11ms frame budget
  annealingConfig: {
    initialTemperature: 5,
    finalTemperature: 0.001,
    coolingRate: 0.98,
    maxIterations: 500
  }
});
```

### Error Handling

```typescript
planner.on('taskFailed', ({ task, error }) => {
  console.error(`Task ${task.name} failed:`, error.message);
  
  // Retry with lower priority
  const retryTask = { ...task };
  retryTask.id = `${task.id}-retry`;
  retryTask.priority *= 0.8;
  retryTask.quantumState.coherence *= 0.9;
  
  planner.addTask(retryTask);
});

planner.on('planningError', (error) => {
  console.error('Planning failed, falling back to classical scheduling');
  // Implement fallback logic
});
```

## Best Practices

### 1. Task Design
- Use meaningful task IDs and names
- Set realistic duration estimates
- Define appropriate resource requirements
- Choose priority values carefully (0.0-1.0 range)

### 2. Quantum State Configuration
- **Superposition**: Higher values (0.7-0.9) for parallelizable tasks
- **Coherence**: Higher values (0.8-1.0) for stable, predictable tasks
- **Entanglement**: Use sparingly, only for truly related tasks

### 3. Dependencies
- Minimize dependency chains for better parallelism
- Avoid circular dependencies (validation will catch these)
- Group related dependencies together

### 4. Performance Optimization
- Lower temperature (0.01-0.1) for more precise scheduling
- Shorter annealing time (100-500ms) for real-time applications
- Monitor quantum advantage - values > 0.2 indicate good optimization

### 5. Error Handling
- Always handle `taskFailed` events
- Implement retry logic with exponential backoff
- Monitor `planningError` events for system issues

## Integration Examples

### With QuantumNerfScheduler

```typescript
const planner = new QuantumTaskPlanner();
const nerfScheduler = new QuantumNerfScheduler(config, nerfConfig);

// Use planner for non-rendering tasks
planner.addTask(createPreprocessingTask());

// Use NeRF scheduler for rendering
nerfScheduler.scheduleRender(renderOptions, 0.9);

// Coordinate between both systems
planner.on('taskCompleted', (task) => {
  if (task.metadata.triggersRender) {
    nerfScheduler.scheduleRender(task.metadata.renderOptions);
  }
});
```

### With QuantumMonitor

```typescript
const monitor = new QuantumMonitor();
const planner = new QuantumTaskPlanner();

monitor.start();
planner.start();

// Track task lifecycle
planner.on('taskCompleted', (task) => {
  monitor.trackTaskCompleted(task, task.estimatedDuration);
});

// Monitor quantum metrics
monitor.on('metricsCollected', (metrics) => {
  if (metrics.averageCoherence < 0.3) {
    console.warn('Low coherence detected, system may need adjustment');
  }
});
```

### With QuantumCache

```typescript
const cache = new QuantumCache();
const planner = new QuantumTaskPlanner();

// Cache task results
planner.on('taskCompleted', async (task) => {
  if (task.metadata.cacheable) {
    await cache.set(`result-${task.id}`, task.result, {
      superposition: task.quantumState.superposition,
      tags: ['task-result', task.metadata.category]
    });
  }
});

// Check cache before executing tasks
planner.on('taskAdded', async (task) => {
  const cachedResult = await cache.get(`result-${task.id}`);
  if (cachedResult) {
    // Skip execution, use cached result
    planner.removeTask(task.id);
  }
});
```

---

## See Also

- [QuantumNerfScheduler API](./QuantumNerfScheduler.md) - NeRF-specific scheduling
- [QuantumCache API](./QuantumCache.md) - Quantum-enhanced caching
- [QuantumMonitor API](./QuantumMonitor.md) - System monitoring
- [Quantum Concepts Guide](../concepts/quantum-principles.md) - Understanding quantum principles