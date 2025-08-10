/**
 * Temporal NeRF prediction system for motion compensation and future frame estimation
 */

export interface TemporalFrame {
  timestamp: number;
  cameraPosition: [number, number, number];
  cameraRotation: [number, number, number, number];
  velocity: [number, number, number];
  angularVelocity: [number, number, number];
  sceneChanges: SceneChange[];
}

export interface SceneChange {
  type: 'object_motion' | 'lighting_change' | 'occlusion' | 'appearance_change';
  objectId?: string;
  confidence: number;
  deltaTransform?: {
    position: [number, number, number];
    rotation: [number, number, number, number];
  };
  deltaAppearance?: {
    color: [number, number, number];
    roughness: number;
    metallic: number;
  };
}

export interface PredictionModel {
  type: 'linear' | 'kalman' | 'lstm' | 'transformer';
  parameters: Map<string, number>;
  confidence: number;
  trainingFrames: number;
}

export interface TemporalConfig {
  historyLength: number; // frames
  predictionHorizon: number; // frames 
  motionCompensation: boolean;
  adaptivePrediction: boolean;
  confidenceThreshold: number;
}

export class TemporalNerfPrediction {
  private config: TemporalConfig;
  private frameHistory: TemporalFrame[] = [];
  private predictionModels: Map<string, PredictionModel> = new Map();
  private motionField: Map<string, [number, number, number]> = new Map();
  
  // Neural temporal networks
  private temporalNetwork: any = null; // Would be actual neural network
  private motionNetwork: any = null;
  
  constructor(config: TemporalConfig) {
    this.config = config;
    this.initializePredictionModels();
  }

  /**
   * Add new frame to temporal history and update predictions
   */
  addFrame(frame: TemporalFrame): void {
    this.frameHistory.push(frame);
    
    // Trim history to configured length
    if (this.frameHistory.length > this.config.historyLength) {
      this.frameHistory.shift();
    }
    
    // Update motion field
    this.updateMotionField(frame);
    
    // Retrain prediction models with new data
    if (this.frameHistory.length >= 5) {
      this.updatePredictionModels();
    }
  }

  /**
   * Predict future camera and scene state
   */
  predictFutureFrame(stepsAhead: number): TemporalFrame {
    if (this.frameHistory.length < 2) {
      // Not enough data, return current frame
      return this.frameHistory[this.frameHistory.length - 1];
    }

    const latestFrame = this.frameHistory[this.frameHistory.length - 1];
    const dt = stepsAhead * (1/60); // Assume 60 FPS
    
    // Predict camera motion
    const predictedCamera = this.predictCameraMotion(stepsAhead);
    
    // Predict scene changes
    const predictedSceneChanges = this.predictSceneChanges(stepsAhead);
    
    const predictedFrame: TemporalFrame = {
      timestamp: latestFrame.timestamp + dt * 1000,
      cameraPosition: predictedCamera.position,
      cameraRotation: predictedCamera.rotation,
      velocity: predictedCamera.velocity,
      angularVelocity: predictedCamera.angularVelocity,
      sceneChanges: predictedSceneChanges
    };

    return predictedFrame;
  }

  /**
   * Predict camera motion using multiple models
   */
  private predictCameraMotion(steps: number): {
    position: [number, number, number];
    rotation: [number, number, number, number];
    velocity: [number, number, number];
    angularVelocity: [number, number, number];
  } {
    const latest = this.frameHistory[this.frameHistory.length - 1];
    
    // Linear prediction
    const linearPrediction = this.linearMotionPrediction(steps);
    
    // Kalman filter prediction
    const kalmanPrediction = this.kalmanFilterPrediction(steps);
    
    // Neural network prediction
    const neuralPrediction = this.neuralMotionPrediction(steps);
    
    // Weighted combination based on confidence
    const linearWeight = this.predictionModels.get('linear')?.confidence || 0.3;
    const kalmanWeight = this.predictionModels.get('kalman')?.confidence || 0.4;
    const neuralWeight = this.predictionModels.get('neural')?.confidence || 0.3;
    
    const totalWeight = linearWeight + kalmanWeight + neuralWeight;
    
    const combinedPosition: [number, number, number] = [
      (linearPrediction.position[0] * linearWeight +
       kalmanPrediction.position[0] * kalmanWeight +
       neuralPrediction.position[0] * neuralWeight) / totalWeight,
      (linearPrediction.position[1] * linearWeight +
       kalmanPrediction.position[1] * kalmanWeight +
       neuralPrediction.position[1] * neuralWeight) / totalWeight,
      (linearPrediction.position[2] * linearWeight +
       kalmanPrediction.position[2] * kalmanWeight +
       neuralPrediction.position[2] * neuralWeight) / totalWeight
    ];
    
    // Combine other properties similarly
    const combinedRotation: [number, number, number, number] = this.combineQuaternions([
      { q: linearPrediction.rotation, w: linearWeight },
      { q: kalmanPrediction.rotation, w: kalmanWeight },
      { q: neuralPrediction.rotation, w: neuralWeight }
    ]);

    return {
      position: combinedPosition,
      rotation: combinedRotation,
      velocity: latest.velocity, // Simplified
      angularVelocity: latest.angularVelocity
    };
  }

  /**
   * Linear motion prediction using velocity
   */
  private linearMotionPrediction(steps: number): {
    position: [number, number, number];
    rotation: [number, number, number, number];
  } {
    const latest = this.frameHistory[this.frameHistory.length - 1];
    const dt = steps * (1/60);
    
    // Linear position extrapolation
    const predictedPosition: [number, number, number] = [
      latest.cameraPosition[0] + latest.velocity[0] * dt,
      latest.cameraPosition[1] + latest.velocity[1] * dt,
      latest.cameraPosition[2] + latest.velocity[2] * dt
    ];
    
    // Angular extrapolation (simplified)
    const predictedRotation = this.extrapolateRotation(
      latest.cameraRotation,
      latest.angularVelocity,
      dt
    );
    
    return {
      position: predictedPosition,
      rotation: predictedRotation
    };
  }

  /**
   * Kalman filter prediction for smooth motion estimation
   */
  private kalmanFilterPrediction(steps: number): {
    position: [number, number, number];
    rotation: [number, number, number, number];
  } {
    // Simplified Kalman filter implementation
    const model = this.predictionModels.get('kalman');
    if (!model || this.frameHistory.length < 3) {
      return this.linearMotionPrediction(steps);
    }
    
    // State vector: [pos_x, pos_y, pos_z, vel_x, vel_y, vel_z]
    const latest = this.frameHistory[this.frameHistory.length - 1];
    const previous = this.frameHistory[this.frameHistory.length - 2];
    
    // Calculate current state
    const dt = (latest.timestamp - previous.timestamp) / 1000;
    const currentVel: [number, number, number] = [
      (latest.cameraPosition[0] - previous.cameraPosition[0]) / dt,
      (latest.cameraPosition[1] - previous.cameraPosition[1]) / dt,
      (latest.cameraPosition[2] - previous.cameraPosition[2]) / dt
    ];
    
    // State transition matrix (constant velocity model)
    const predictionDt = steps * (1/60);
    
    const predictedPosition: [number, number, number] = [
      latest.cameraPosition[0] + currentVel[0] * predictionDt,
      latest.cameraPosition[1] + currentVel[1] * predictionDt,
      latest.cameraPosition[2] + currentVel[2] * predictionDt
    ];
    
    // Apply noise model and uncertainty
    const processNoise = model.parameters.get('process_noise') || 0.1;
    const predictedWithNoise: [number, number, number] = [
      predictedPosition[0] + (Math.random() - 0.5) * processNoise,
      predictedPosition[1] + (Math.random() - 0.5) * processNoise,
      predictedPosition[2] + (Math.random() - 0.5) * processNoise
    ];
    
    return {
      position: predictedWithNoise,
      rotation: latest.cameraRotation // Simplified rotation prediction
    };
  }

  /**
   * Neural network motion prediction
   */
  private neuralMotionPrediction(steps: number): {
    position: [number, number, number];
    rotation: [number, number, number, number];
  } {
    if (this.frameHistory.length < 10) {
      return this.kalmanFilterPrediction(steps);
    }
    
    // Prepare temporal sequence for neural network
    const sequenceLength = Math.min(10, this.frameHistory.length);
    const sequence = this.frameHistory.slice(-sequenceLength);
    
    // Extract features for neural network
    const features = this.extractTemporalFeatures(sequence);
    
    // Mock neural network inference
    const prediction = this.mockNeuralInference(features, steps);
    
    return prediction;
  }

  /**
   * Extract temporal features for neural networks
   */
  private extractTemporalFeatures(sequence: TemporalFrame[]): Float32Array {
    const featureCount = 12; // 3 pos + 4 rot + 3 vel + 3 angvel per frame
    const features = new Float32Array(sequence.length * featureCount);
    
    for (let i = 0; i < sequence.length; i++) {
      const frame = sequence[i];
      const offset = i * featureCount;
      
      // Position
      features[offset] = frame.cameraPosition[0];
      features[offset + 1] = frame.cameraPosition[1];
      features[offset + 2] = frame.cameraPosition[2];
      
      // Rotation (quaternion)
      features[offset + 3] = frame.cameraRotation[0];
      features[offset + 4] = frame.cameraRotation[1];
      features[offset + 5] = frame.cameraRotation[2];
      features[offset + 6] = frame.cameraRotation[3];
      
      // Velocity
      features[offset + 7] = frame.velocity[0];
      features[offset + 8] = frame.velocity[1];
      features[offset + 9] = frame.velocity[2];
      
      // Angular velocity
      features[offset + 10] = frame.angularVelocity[0];
      features[offset + 11] = frame.angularVelocity[1];
      features[offset + 12] = frame.angularVelocity[2];
    }
    
    return features;
  }

  /**
   * Mock neural network inference
   */
  private mockNeuralInference(features: Float32Array, steps: number): {
    position: [number, number, number];
    rotation: [number, number, number, number];
  } {
    // Mock LSTM-style temporal prediction
    const latest = this.frameHistory[this.frameHistory.length - 1];
    
    // Simple recurrent computation
    let hiddenState = new Float32Array(128);
    
    // Process sequence
    for (let i = 0; i < features.length / 12; i++) {
      const frameFeatures = features.slice(i * 12, (i + 1) * 12);
      hiddenState = this.lstmStep(hiddenState, frameFeatures);
    }
    
    // Generate prediction
    const predictionFeatures = this.generatePrediction(hiddenState, steps);
    
    return {
      position: [predictionFeatures[0], predictionFeatures[1], predictionFeatures[2]],
      rotation: [predictionFeatures[3], predictionFeatures[4], predictionFeatures[5], predictionFeatures[6]]
    };
  }

  /**
   * Mock LSTM step
   */
  private lstmStep(hiddenState: Float32Array, input: Float32Array): Float32Array {
    const newState = new Float32Array(hiddenState.length);
    
    // Simplified LSTM computation
    for (let i = 0; i < newState.length; i++) {
      const inputIndex = i % input.length;
      const forget = 1 / (1 + Math.exp(-(hiddenState[i] + input[inputIndex])));
      const update = Math.tanh(hiddenState[i] * 0.5 + input[inputIndex] * 0.5);
      newState[i] = hiddenState[i] * forget + update * (1 - forget);
    }
    
    return newState;
  }

  /**
   * Generate prediction from hidden state
   */
  private generatePrediction(hiddenState: Float32Array, steps: number): Float32Array {
    const output = new Float32Array(7); // 3 pos + 4 rot
    
    // Mock output layer
    for (let i = 0; i < output.length; i++) {
      let sum = 0;
      for (let j = 0; j < hiddenState.length; j++) {
        sum += hiddenState[j] * Math.sin(i + j * 0.1) * 0.1;
      }
      output[i] = sum * steps * 0.01; // Scale by prediction steps
    }
    
    return output;
  }

  /**
   * Predict scene changes using temporal analysis
   */
  private predictSceneChanges(steps: number): SceneChange[] {
    const changes: SceneChange[] = [];
    
    // Analyze recent scene changes for patterns
    const recentChanges = this.getRecentSceneChanges();
    
    // Predict object motions
    const motionPredictions = this.predictObjectMotions(steps);
    changes.push(...motionPredictions);
    
    // Predict lighting changes
    const lightingPredictions = this.predictLightingChanges(steps);
    changes.push(...lightingPredictions);
    
    return changes;
  }

  /**
   * Get recent scene changes from frame history
   */
  private getRecentSceneChanges(): SceneChange[] {
    const allChanges: SceneChange[] = [];
    
    for (const frame of this.frameHistory.slice(-5)) {
      allChanges.push(...frame.sceneChanges);
    }
    
    return allChanges;
  }

  /**
   * Predict object motions based on motion field
   */
  private predictObjectMotions(steps: number): SceneChange[] {
    const predictions: SceneChange[] = [];
    const dt = steps * (1/60);
    
    for (const [objectId, velocity] of this.motionField.entries()) {
      const deltaPosition: [number, number, number] = [
        velocity[0] * dt,
        velocity[1] * dt,
        velocity[2] * dt
      ];
      
      // Calculate confidence based on motion consistency
      const confidence = this.calculateMotionConfidence(objectId);
      
      if (confidence > this.config.confidenceThreshold) {
        predictions.push({
          type: 'object_motion',
          objectId,
          confidence,
          deltaTransform: {
            position: deltaPosition,
            rotation: [0, 0, 0, 1] // No rotation prediction for now
          }
        });
      }
    }
    
    return predictions;
  }

  /**
   * Predict lighting changes based on patterns
   */
  private predictLightingChanges(steps: number): SceneChange[] {
    // Mock lighting prediction - would analyze actual lighting patterns
    const changes: SceneChange[] = [];
    
    // Example: predict sun movement
    const sunAngleChange = steps * 0.001; // Mock sun movement
    
    if (Math.abs(sunAngleChange) > 0.01) {
      changes.push({
        type: 'lighting_change',
        confidence: 0.8,
        deltaAppearance: {
          color: [sunAngleChange * 0.1, sunAngleChange * 0.05, 0],
          roughness: 0,
          metallic: 0
        }
      });
    }
    
    return changes;
  }

  /**
   * Calculate motion confidence for an object
   */
  private calculateMotionConfidence(objectId: string): number {
    // Analyze consistency of object motion across frames
    const motionHistory: [number, number, number][] = [];
    
    for (const frame of this.frameHistory.slice(-5)) {
      for (const change of frame.sceneChanges) {
        if (change.objectId === objectId && change.type === 'object_motion' && change.deltaTransform) {
          motionHistory.push(change.deltaTransform.position);
        }
      }
    }
    
    if (motionHistory.length < 2) return 0.1;
    
    // Calculate motion variance
    const avgMotion = motionHistory.reduce((sum, motion) => [
      sum[0] + motion[0],
      sum[1] + motion[1],
      sum[2] + motion[2]
    ], [0, 0, 0]).map(val => val / motionHistory.length);
    
    let variance = 0;
    for (const motion of motionHistory) {
      variance += Math.pow(motion[0] - avgMotion[0], 2) + 
                  Math.pow(motion[1] - avgMotion[1], 2) + 
                  Math.pow(motion[2] - avgMotion[2], 2);
    }
    variance /= motionHistory.length;
    
    // Lower variance = higher confidence
    return Math.exp(-variance * 10);
  }

  /**
   * Update motion field with new frame data
   */
  private updateMotionField(frame: TemporalFrame): void {
    for (const change of frame.sceneChanges) {
      if (change.type === 'object_motion' && change.objectId && change.deltaTransform) {
        const velocity = change.deltaTransform.position;
        
        // Update motion field with exponential moving average
        const existing = this.motionField.get(change.objectId) || [0, 0, 0];
        const updated: [number, number, number] = [
          existing[0] * 0.8 + velocity[0] * 0.2,
          existing[1] * 0.8 + velocity[1] * 0.2,
          existing[2] * 0.8 + velocity[2] * 0.2
        ];
        
        this.motionField.set(change.objectId, updated);
      }
    }
  }

  /**
   * Initialize prediction models
   */
  private initializePredictionModels(): void {
    this.predictionModels.set('linear', {
      type: 'linear',
      parameters: new Map([['smoothing', 0.1]]),
      confidence: 0.3,
      trainingFrames: 0
    });
    
    this.predictionModels.set('kalman', {
      type: 'kalman',
      parameters: new Map([
        ['process_noise', 0.1],
        ['measurement_noise', 0.05]
      ]),
      confidence: 0.4,
      trainingFrames: 0
    });
    
    this.predictionModels.set('neural', {
      type: 'lstm',
      parameters: new Map([
        ['learning_rate', 0.001],
        ['hidden_size', 128]
      ]),
      confidence: 0.3,
      trainingFrames: 0
    });
  }

  /**
   * Update prediction models with new training data
   */
  private updatePredictionModels(): void {
    // Update model confidences based on recent prediction accuracy
    this.evaluatePredictionAccuracy();
    
    // Retrain models with new data
    for (const model of this.predictionModels.values()) {
      model.trainingFrames = this.frameHistory.length;
    }
  }

  /**
   * Evaluate prediction accuracy and update confidence scores
   */
  private evaluatePredictionAccuracy(): void {
    if (this.frameHistory.length < 10) return;
    
    // Test predictions against actual recent frames
    const testFrames = this.frameHistory.slice(-5);
    const trainingFrames = this.frameHistory.slice(0, -5);
    
    // Temporarily use only training data
    const originalHistory = [...this.frameHistory];
    this.frameHistory = trainingFrames;
    
    let linearError = 0;
    const kalmanError = 0;
    const neuralError = 0;
    
    for (let i = 0; i < testFrames.length - 1; i++) {
      const predicted = this.predictFutureFrame(1);
      const actual = testFrames[i + 1];
      
      // Calculate prediction errors
      linearError += this.calculatePositionError(predicted.cameraPosition, actual.cameraPosition);
      // kalmanError and neuralError would be calculated similarly
    }
    
    // Update confidences based on errors
    this.predictionModels.get('linear')!.confidence = 1 / (1 + linearError);
    this.predictionModels.get('kalman')!.confidence = 1 / (1 + kalmanError);
    this.predictionModels.get('neural')!.confidence = 1 / (1 + neuralError);
    
    // Restore full history
    this.frameHistory = originalHistory;
  }

  /**
   * Calculate position error between predicted and actual
   */
  private calculatePositionError(predicted: [number, number, number], actual: [number, number, number]): number {
    return Math.sqrt(
      Math.pow(predicted[0] - actual[0], 2) +
      Math.pow(predicted[1] - actual[1], 2) +
      Math.pow(predicted[2] - actual[2], 2)
    );
  }

  /**
   * Extrapolate rotation using angular velocity
   */
  private extrapolateRotation(rotation: [number, number, number, number], angularVel: [number, number, number], dt: number): [number, number, number, number] {
    // Simplified rotation extrapolation
    const [w, x, y, z] = rotation;
    const [wx, wy, wz] = angularVel;
    
    // Convert angular velocity to quaternion
    const angle = Math.sqrt(wx*wx + wy*wy + wz*wz) * dt;
    if (angle < 0.001) return rotation; // No significant rotation
    
    const axis = [wx/angle, wy/angle, wz/angle];
    const sinHalf = Math.sin(angle / 2);
    const cosHalf = Math.cos(angle / 2);
    
    const deltaQ: [number, number, number, number] = [
      cosHalf,
      axis[0] * sinHalf,
      axis[1] * sinHalf,
      axis[2] * sinHalf
    ];
    
    // Quaternion multiplication
    return this.multiplyQuaternions(rotation, deltaQ);
  }

  /**
   * Multiply two quaternions
   */
  private multiplyQuaternions(q1: [number, number, number, number], q2: [number, number, number, number]): [number, number, number, number] {
    const [w1, x1, y1, z1] = q1;
    const [w2, x2, y2, z2] = q2;
    
    return [
      w1*w2 - x1*x2 - y1*y2 - z1*z2,
      w1*x2 + x1*w2 + y1*z2 - z1*y2,
      w1*y2 - x1*z2 + y1*w2 + z1*x2,
      w1*z2 + x1*y2 - y1*x2 + z1*w2
    ];
  }

  /**
   * Combine quaternions with weights
   */
  private combineQuaternions(quaternions: Array<{q: [number, number, number, number], w: number}>): [number, number, number, number] {
    // Simplified quaternion averaging
    let result: [number, number, number, number] = [0, 0, 0, 0];
    let totalWeight = 0;
    
    for (const {q, w} of quaternions) {
      result[0] += q[0] * w;
      result[1] += q[1] * w;
      result[2] += q[2] * w;
      result[3] += q[3] * w;
      totalWeight += w;
    }
    
    // Normalize
    if (totalWeight > 0) {
      const invWeight = 1 / totalWeight;
      result = [result[0] * invWeight, result[1] * invWeight, result[2] * invWeight, result[3] * invWeight];
    }
    
    // Ensure unit quaternion
    const magnitude = Math.sqrt(result[0]*result[0] + result[1]*result[1] + result[2]*result[2] + result[3]*result[3]);
    if (magnitude > 0) {
      result = [result[0]/magnitude, result[1]/magnitude, result[2]/magnitude, result[3]/magnitude];
    }
    
    return result;
  }

  /**
   * Temporal interpolation for smooth frame generation
   */
  temporalInterpolate(frame1: TemporalFrame, frame2: TemporalFrame, t: number): TemporalFrame {
    const interpolated: TemporalFrame = {
      timestamp: frame1.timestamp + (frame2.timestamp - frame1.timestamp) * t,
      cameraPosition: [
        frame1.cameraPosition[0] + (frame2.cameraPosition[0] - frame1.cameraPosition[0]) * t,
        frame1.cameraPosition[1] + (frame2.cameraPosition[1] - frame1.cameraPosition[1]) * t,
        frame1.cameraPosition[2] + (frame2.cameraPosition[2] - frame1.cameraPosition[2]) * t
      ],
      cameraRotation: this.slerpQuaternions(frame1.cameraRotation, frame2.cameraRotation, t),
      velocity: [
        frame1.velocity[0] + (frame2.velocity[0] - frame1.velocity[0]) * t,
        frame1.velocity[1] + (frame2.velocity[1] - frame1.velocity[1]) * t,
        frame1.velocity[2] + (frame2.velocity[2] - frame1.velocity[2]) * t
      ],
      angularVelocity: [
        frame1.angularVelocity[0] + (frame2.angularVelocity[0] - frame1.angularVelocity[0]) * t,
        frame1.angularVelocity[1] + (frame2.angularVelocity[1] - frame1.angularVelocity[1]) * t,
        frame1.angularVelocity[2] + (frame2.angularVelocity[2] - frame1.angularVelocity[2]) * t
      ],
      sceneChanges: [] // Would interpolate scene changes
    };
    
    return interpolated;
  }

  /**
   * Spherical linear interpolation for quaternions
   */
  private slerpQuaternions(q1: [number, number, number, number], q2: [number, number, number, number], t: number): [number, number, number, number] {
    const dot = q1[0]*q2[0] + q1[1]*q2[1] + q1[2]*q2[2] + q1[3]*q2[3];
    
    if (Math.abs(dot) > 0.9995) {
      // Linear interpolation for very close quaternions
      return [
        q1[0] + (q2[0] - q1[0]) * t,
        q1[1] + (q2[1] - q1[1]) * t,
        q1[2] + (q2[2] - q1[2]) * t,
        q1[3] + (q2[3] - q1[3]) * t
      ];
    }
    
    const theta = Math.acos(Math.abs(dot));
    const sinTheta = Math.sin(theta);
    
    const w1 = Math.sin((1 - t) * theta) / sinTheta;
    const w2 = Math.sin(t * theta) / sinTheta;
    
    return [
      q1[0] * w1 + q2[0] * w2,
      q1[1] * w1 + q2[1] * w2,
      q1[2] * w1 + q2[2] * w2,
      q1[3] * w1 + q2[3] * w2
    ];
  }

  /**
   * Get prediction statistics
   */
  getPredictionStats(): {
    frameHistory: number;
    avgPredictionConfidence: number;
    modelAccuracy: Record<string, number>;
    motionFieldSize: number;
  } {
    const confidences = Array.from(this.predictionModels.values()).map(m => m.confidence);
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    const modelAccuracy: Record<string, number> = {};
    for (const [name, model] of this.predictionModels.entries()) {
      modelAccuracy[name] = model.confidence;
    }
    
    return {
      frameHistory: this.frameHistory.length,
      avgPredictionConfidence: avgConfidence,
      modelAccuracy,
      motionFieldSize: this.motionField.size
    };
  }

  /**
   * Clear temporal history
   */
  clearHistory(): void {
    this.frameHistory = [];
    this.motionField.clear();
    this.initializePredictionModels();
  }

  /**
   * Dispose temporal prediction system
   */
  dispose(): void {
    this.clearHistory();
    this.predictionModels.clear();
    this.temporalNetwork = null;
    this.motionNetwork = null;
  }
}