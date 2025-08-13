import Foundation
import Metal
import ARKit
import simd

@available(iOS 17.0, *)
public final class FoveatedRenderer {
    
    private let device: MTLDevice
    private let commandQueue: MTLCommandQueue
    private let library: MTLLibrary
    
    private var foveatedPipelineState: MTLComputePipelineState?
    private var qualityLevels: [QualityLevel] = []
    
    private var isRendering = false
    private var renderingTask: Task<Void, Error>?
    
    private var gazeBuffer: MTLBuffer?
    private var qualityMapBuffer: MTLBuffer?
    
    public init(device: MTLDevice) {
        self.device = device
        
        guard let commandQueue = device.makeCommandQueue() else {
            fatalError("Failed to create Metal command queue")
        }
        self.commandQueue = commandQueue
        
        guard let library = device.makeDefaultLibrary() else {
            fatalError("Failed to create Metal library")
        }
        self.library = library
        
        setupQualityLevels()
    }
    
    public func initialize() async throws {
        try await createPipelineStates()
        try await allocateBuffers()
    }
    
    private func setupQualityLevels() {
        qualityLevels = [
            QualityLevel(
                name: "Ultra",
                radius: 0.1,
                samplesPerRay: 128,
                resolution: 1.0,
                neuralNetworkLayers: 8
            ),
            QualityLevel(
                name: "High",
                radius: 0.3,
                samplesPerRay: 64,
                resolution: 0.75,
                neuralNetworkLayers: 6
            ),
            QualityLevel(
                name: "Medium",
                radius: 0.6,
                samplesPerRay: 32,
                resolution: 0.5,
                neuralNetworkLayers: 4
            ),
            QualityLevel(
                name: "Low",
                radius: 1.0,
                samplesPerRay: 16,
                resolution: 0.25,
                neuralNetworkLayers: 2
            )
        ]
    }
    
    private func createPipelineStates() async throws {
        guard let foveationFunction = library.makeFunction(name: "foveated_rendering") else {
            throw NerfEdgeKitError.modelLoadFailed("Missing foveated rendering shader")
        }
        
        do {
            foveatedPipelineState = try device.makeComputePipelineState(function: foveationFunction)
        } catch {
            throw NerfEdgeKitError.metalNotSupported
        }
    }
    
    private func allocateBuffers() async throws {
        let gazeBufferSize = MemoryLayout<GazeData>.stride
        gazeBuffer = device.makeBuffer(length: gazeBufferSize, options: .storageModeShared)
        
        let qualityMapSize = 4096 * 4096 * MemoryLayout<UInt8>.stride
        qualityMapBuffer = device.makeBuffer(length: qualityMapSize, options: .storageModeShared)
        
        guard gazeBuffer != nil && qualityMapBuffer != nil else {
            throw NerfEdgeKitError.metalNotSupported
        }
    }
    
    public func startRendering(
        model: NerfModel,
        targetFPS: Int,
        eyeTrackingData: AsyncStream<EyeTrackingData>
    ) async throws {
        guard !isRendering else { return }
        isRendering = true
        
        let targetFrameTime = 1.0 / Double(targetFPS)
        
        renderingTask = Task {
            var lastGazeData: EyeTrackingData?
            
            for await gazeData in eyeTrackingData {
                guard !Task.isCancelled && isRendering else { break }
                
                let frameStartTime = CACurrentMediaTime()
                lastGazeData = gazeData
                
                try await renderFoveatedFrame(model: model, gazeData: gazeData)
                
                let frameTime = CACurrentMediaTime() - frameStartTime
                let sleepTime = max(0, targetFrameTime - frameTime)
                
                if sleepTime > 0 {
                    try await Task.sleep(nanoseconds: UInt64(sleepTime * 1_000_000_000))
                }
            }
        }
    }
    
    public func stopRendering() {
        isRendering = false
        renderingTask?.cancel()
        renderingTask = nil
    }
    
    private func renderFoveatedFrame(model: NerfModel, gazeData: EyeTrackingData) async throws {
        try await updateQualityMap(gazeData: gazeData, resolution: model.resolution)
        try await renderWithFoveation(model: model)
    }
    
    private func updateQualityMap(gazeData: EyeTrackingData, resolution: (width: Int, height: Int)) async throws {
        guard let commandBuffer = commandQueue.makeCommandBuffer(),
              let computeEncoder = commandBuffer.makeComputeCommandEncoder(),
              let pipelineState = foveatedPipelineState,
              let gazeBuffer = gazeBuffer,
              let qualityMapBuffer = qualityMapBuffer else {
            throw NerfEdgeKitError.renderingFailed("Failed to create Metal command buffer")
        }
        
        let gazePointer = gazeBuffer.contents().bindMemory(to: GazeData.self, capacity: 1)
        gazePointer.pointee = GazeData(
            leftEyeGaze: gazeData.leftEyeGaze,
            rightEyeGaze: gazeData.rightEyeGaze,
            combinedGaze: gazeData.combinedGaze,
            confidence: gazeData.confidence
        )
        
        computeEncoder.setComputePipelineState(pipelineState)
        computeEncoder.setBuffer(gazeBuffer, offset: 0, index: 0)
        computeEncoder.setBuffer(qualityMapBuffer, offset: 0, index: 1)
        
        var resolutionData = SIMD2<UInt32>(UInt32(resolution.width), UInt32(resolution.height))
        computeEncoder.setBytes(&resolutionData, length: MemoryLayout<SIMD2<UInt32>>.stride, index: 2)
        
        let threadgroupSize = MTLSize(width: 8, height: 8, depth: 1)
        let threadgroups = MTLSize(
            width: (resolution.width + threadgroupSize.width - 1) / threadgroupSize.width,
            height: (resolution.height + threadgroupSize.height - 1) / threadgroupSize.height,
            depth: 1
        )
        
        computeEncoder.dispatchThreadgroups(threadgroups, threadsPerThreadgroup: threadgroupSize)
        computeEncoder.endEncoding()
        
        commandBuffer.commit()
        commandBuffer.waitUntilCompleted()
        
        if let error = commandBuffer.error {
            throw NerfEdgeKitError.renderingFailed(error.localizedDescription)
        }
    }
    
    private func renderWithFoveation(model: NerfModel) async throws {
        
    }
    
    private func calculateQualityLevel(for pixel: SIMD2<Float>, gazePoint: SIMD2<Float>) -> Int {
        let distance = simd_distance(pixel, gazePoint)
        
        for (index, level) in qualityLevels.enumerated() {
            if distance <= level.radius {
                return index
            }
        }
        
        return qualityLevels.count - 1
    }
    
    public func getPerformanceMetrics() -> FoveatedRenderingMetrics {
        guard let qualityMapBuffer = qualityMapBuffer else {
            return FoveatedRenderingMetrics(
                foveaPixels: 0,
                peripheryPixels: 0,
                qualityDistribution: [:],
                averageQualityLevel: 0,
                renderingSpeedup: 1.0
            )
        }
        
        let qualityMap = qualityMapBuffer.contents().bindMemory(to: UInt8.self, capacity: qualityMapBuffer.length)
        var qualityDistribution: [Int: Int] = [:]
        var totalQuality: Float = 0
        
        for i in 0..<qualityMapBuffer.length {
            let quality = Int(qualityMap[i])
            qualityDistribution[quality, default: 0] += 1
            totalQuality += Float(quality)
        }
        
        let averageQuality = totalQuality / Float(qualityMapBuffer.length)
        let foveaPixels = qualityDistribution[0, default: 0] + qualityDistribution[1, default: 0]
        let peripheryPixels = qualityDistribution[2, default: 0] + qualityDistribution[3, default: 0]
        
        let speedup = calculateRenderingSpeedup(qualityDistribution: qualityDistribution)
        
        return FoveatedRenderingMetrics(
            foveaPixels: foveaPixels,
            peripheryPixels: peripheryPixels,
            qualityDistribution: qualityDistribution,
            averageQualityLevel: averageQuality,
            renderingSpeedup: speedup
        )
    }
    
    private func calculateRenderingSpeedup(qualityDistribution: [Int: Int]) -> Float {
        var totalCost: Float = 0
        var fullQualityCost: Float = 0
        
        let totalPixels = qualityDistribution.values.reduce(0, +)
        
        for (qualityLevel, pixelCount) in qualityDistribution {
            let quality = qualityLevels[min(qualityLevel, qualityLevels.count - 1)]
            let cost = Float(quality.samplesPerRay * quality.neuralNetworkLayers) * quality.resolution
            totalCost += cost * Float(pixelCount)
            fullQualityCost += Float(qualityLevels[0].samplesPerRay * qualityLevels[0].neuralNetworkLayers) * Float(pixelCount)
        }
        
        return fullQualityCost / max(totalCost, 1.0)
    }
}

struct QualityLevel {
    let name: String
    let radius: Float
    let samplesPerRay: Int
    let resolution: Float
    let neuralNetworkLayers: Int
}

struct GazeData {
    let leftEyeGaze: SIMD2<Float>
    let rightEyeGaze: SIMD2<Float>
    let combinedGaze: SIMD2<Float>
    let confidence: Float
}

public struct EyeTrackingData {
    public let leftEyeGaze: SIMD2<Float>
    public let rightEyeGaze: SIMD2<Float>
    public let combinedGaze: SIMD2<Float>
    public let confidence: Float
    
    public init(leftEyeGaze: SIMD2<Float>, rightEyeGaze: SIMD2<Float>, combinedGaze: SIMD2<Float>, confidence: Float) {
        self.leftEyeGaze = leftEyeGaze
        self.rightEyeGaze = rightEyeGaze
        self.combinedGaze = combinedGaze
        self.confidence = confidence
    }
}

public struct FoveatedRenderingMetrics {
    public let foveaPixels: Int
    public let peripheryPixels: Int
    public let qualityDistribution: [Int: Int]
    public let averageQualityLevel: Float
    public let renderingSpeedup: Float
}