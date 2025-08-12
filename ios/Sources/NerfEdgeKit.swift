import Foundation
import Metal
import ARKit
import simd

@available(iOS 17.0, *)
public final class NerfEdgeKit {
    
    public static let shared = NerfEdgeKit()
    
    private let metalRenderer: MetalNerfRenderer
    private let arkitIntegration: ARKitIntegration
    private let neuralAccelerator: NeuralEngineAccelerator
    private let foveatedRenderer: FoveatedRenderer
    
    private var isInitialized = false
    
    private init() {
        guard let device = MTLCreateSystemDefaultDevice() else {
            fatalError("Metal is not supported on this device")
        }
        
        self.metalRenderer = MetalNerfRenderer(device: device)
        self.arkitIntegration = ARKitIntegration()
        self.neuralAccelerator = NeuralEngineAccelerator()
        self.foveatedRenderer = FoveatedRenderer(device: device)
    }
    
    public func initialize() async throws {
        guard !isInitialized else { return }
        
        try await metalRenderer.initialize()
        try await arkitIntegration.initialize()
        try await neuralAccelerator.initialize()
        try await foveatedRenderer.initialize()
        
        isInitialized = true
    }
    
    public func loadNerfModel(from url: URL) async throws -> NerfModel {
        guard isInitialized else {
            throw NerfEdgeKitError.notInitialized
        }
        
        let model = try await NerfModel.load(from: url, using: metalRenderer.device)
        try await neuralAccelerator.optimizeModel(model)
        
        return model
    }
    
    public func startRealTimeRendering(
        model: NerfModel,
        targetFPS: Int = 90,
        enableFoveation: Bool = true
    ) async throws {
        guard isInitialized else {
            throw NerfEdgeKitError.notInitialized
        }
        
        if enableFoveation {
            try await foveatedRenderer.startRendering(
                model: model,
                targetFPS: targetFPS,
                eyeTrackingData: arkitIntegration.eyeTrackingData
            )
        } else {
            try await metalRenderer.startRendering(model: model, targetFPS: targetFPS)
        }
    }
    
    public func stopRendering() {
        metalRenderer.stopRendering()
        foveatedRenderer.stopRendering()
    }
    
    public var currentMetrics: RenderingMetrics {
        return RenderingMetrics(
            fps: metalRenderer.currentFPS,
            frameTime: metalRenderer.averageFrameTime,
            gpuUtilization: metalRenderer.gpuUtilization,
            memoryUsage: metalRenderer.memoryUsage,
            thermalState: ProcessInfo.processInfo.thermalState
        )
    }
}

public enum NerfEdgeKitError: Error {
    case notInitialized
    case metalNotSupported
    case arkitNotSupported
    case modelLoadFailed(String)
    case renderingFailed(String)
    case neuralEngineUnavailable
}

public struct RenderingMetrics {
    public let fps: Double
    public let frameTime: TimeInterval
    public let gpuUtilization: Double
    public let memoryUsage: UInt64
    public let thermalState: ProcessInfo.ThermalState
}

extension NerfEdgeKitError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .notInitialized:
            return "NerfEdgeKit must be initialized before use"
        case .metalNotSupported:
            return "Metal GPU acceleration is not supported on this device"
        case .arkitNotSupported:
            return "ARKit is not supported on this device"
        case .modelLoadFailed(let reason):
            return "Failed to load NeRF model: \(reason)"
        case .renderingFailed(let reason):
            return "Rendering failed: \(reason)"
        case .neuralEngineUnavailable:
            return "Neural Engine acceleration is not available"
        }
    }
}