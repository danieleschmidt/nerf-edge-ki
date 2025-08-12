import Foundation
import Metal
import MetalKit
import simd

@available(iOS 17.0, *)
public final class MetalNerfRenderer {
    
    let device: MTLDevice
    private let commandQueue: MTLCommandQueue
    private let library: MTLLibrary
    
    private var renderPipelineState: MTLRenderPipelineState?
    private var computePipelineState: MTLComputePipelineState?
    
    private var rayBuffer: MTLBuffer?
    private var featureBuffer: MTLBuffer?
    private var colorBuffer: MTLBuffer?
    
    private var isRendering = false
    private var renderingTask: Task<Void, Error>?
    
    private var frameCounter = 0
    private var lastFrameTime = CACurrentMediaTime()
    private var frameTimeAccumulator: TimeInterval = 0
    
    public private(set) var currentFPS: Double = 0
    public private(set) var averageFrameTime: TimeInterval = 0
    public private(set) var gpuUtilization: Double = 0
    public private(set) var memoryUsage: UInt64 = 0
    
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
    }
    
    public func initialize() async throws {
        try await createPipelineStates()
        try await allocateBuffers()
    }
    
    private func createPipelineStates() async throws {
        let renderDescriptor = MTLRenderPipelineDescriptor()
        renderDescriptor.vertexFunction = library.makeFunction(name: "vertex_main")
        renderDescriptor.fragmentFunction = library.makeFunction(name: "fragment_nerf")
        renderDescriptor.colorAttachments[0].pixelFormat = .bgra8Unorm
        
        do {
            renderPipelineState = try device.makeRenderPipelineState(descriptor: renderDescriptor)
        } catch {
            throw NerfEdgeKitError.metalNotSupported
        }
        
        guard let computeFunction = library.makeFunction(name: "nerf_inference") else {
            throw NerfEdgeKitError.modelLoadFailed("Missing NeRF compute shader")
        }
        
        do {
            computePipelineState = try device.makeComputePipelineState(function: computeFunction)
        } catch {
            throw NerfEdgeKitError.metalNotSupported
        }
    }
    
    private func allocateBuffers() async throws {
        let rayBufferSize = 4096 * 4096 * MemoryLayout<RayData>.stride
        rayBuffer = device.makeBuffer(length: rayBufferSize, options: .storageModeShared)
        
        let featureBufferSize = 4096 * 256 * MemoryLayout<Float>.stride
        featureBuffer = device.makeBuffer(length: featureBufferSize, options: .storageModeShared)
        
        let colorBufferSize = 4096 * 4096 * MemoryLayout<SIMD4<Float>>.stride
        colorBuffer = device.makeBuffer(length: colorBufferSize, options: .storageModeShared)
        
        guard rayBuffer != nil && featureBuffer != nil && colorBuffer != nil else {
            throw NerfEdgeKitError.metalNotSupported
        }
    }
    
    public func startRendering(model: NerfModel, targetFPS: Int) async throws {
        guard !isRendering else { return }
        isRendering = true
        
        let targetFrameTime = 1.0 / Double(targetFPS)
        
        renderingTask = Task {
            while !Task.isCancelled && isRendering {
                let frameStartTime = CACurrentMediaTime()
                
                try await renderFrame(model: model)
                updateMetrics(frameStartTime: frameStartTime)
                
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
    
    private func renderFrame(model: NerfModel) async throws {
        guard let commandBuffer = commandQueue.makeCommandBuffer(),
              let computeEncoder = commandBuffer.makeComputeCommandEncoder(),
              let computePipeline = computePipelineState,
              let rayBuffer = rayBuffer,
              let featureBuffer = featureBuffer,
              let colorBuffer = colorBuffer else {
            throw NerfEdgeKitError.renderingFailed("Failed to create Metal command buffer")
        }
        
        computeEncoder.setComputePipelineState(computePipeline)
        computeEncoder.setBuffer(rayBuffer, offset: 0, index: 0)
        computeEncoder.setBuffer(featureBuffer, offset: 0, index: 1)
        computeEncoder.setBuffer(colorBuffer, offset: 0, index: 2)
        computeEncoder.setBuffer(model.weightBuffer, offset: 0, index: 3)
        
        let threadgroupSize = MTLSize(width: 8, height: 8, depth: 1)
        let threadgroups = MTLSize(
            width: (model.resolution.width + threadgroupSize.width - 1) / threadgroupSize.width,
            height: (model.resolution.height + threadgroupSize.height - 1) / threadgroupSize.height,
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
    
    private func updateMetrics(frameStartTime: TimeInterval) {
        frameCounter += 1
        let currentTime = CACurrentMediaTime()
        let frameTime = currentTime - frameStartTime
        
        frameTimeAccumulator += frameTime
        
        if currentTime - lastFrameTime >= 1.0 {
            currentFPS = Double(frameCounter) / (currentTime - lastFrameTime)
            averageFrameTime = frameTimeAccumulator / Double(frameCounter)
            
            frameCounter = 0
            frameTimeAccumulator = 0
            lastFrameTime = currentTime
            
            updateGPUMetrics()
        }
    }
    
    private func updateGPUMetrics() {
        let memoryInfo = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size)/4
        
        let kerr: kern_return_t = withUnsafeMutablePointer(to: &memoryInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }
        
        if kerr == KERN_SUCCESS {
            memoryUsage = UInt64(memoryInfo.resident_size)
        }
        
        gpuUtilization = min(100.0, max(0.0, (1000.0 / averageFrameTime) / 10.0))
    }
}

struct RayData {
    let origin: SIMD3<Float>
    let direction: SIMD3<Float>
    let tMin: Float
    let tMax: Float
}

struct NerfUniforms {
    let viewMatrix: simd_float4x4
    let projectionMatrix: simd_float4x4
    let resolution: SIMD2<UInt32>
    let time: Float
}