import Foundation
import Metal
import CoreML
import simd

@available(iOS 17.0, *)
public final class NerfModel {
    
    public let modelId: String
    public let resolution: (width: Int, height: Int)
    public let boundingBox: (min: SIMD3<Float>, max: SIMD3<Float>)
    
    let weightBuffer: MTLBuffer
    private let device: MTLDevice
    private let mlModel: MLModel?
    
    private let networkLayers: [NetworkLayer]
    private let encodingParams: PositionalEncodingParams
    
    public var memoryFootprint: UInt64 {
        return UInt64(weightBuffer.length)
    }
    
    public var isOptimized: Bool = false
    
    private init(
        modelId: String,
        resolution: (width: Int, height: Int),
        boundingBox: (min: SIMD3<Float>, max: SIMD3<Float>),
        weightBuffer: MTLBuffer,
        device: MTLDevice,
        mlModel: MLModel?,
        networkLayers: [NetworkLayer],
        encodingParams: PositionalEncodingParams
    ) {
        self.modelId = modelId
        self.resolution = resolution
        self.boundingBox = boundingBox
        self.weightBuffer = weightBuffer
        self.device = device
        self.mlModel = mlModel
        self.networkLayers = networkLayers
        self.encodingParams = encodingParams
    }
    
    public static func load(from url: URL, using device: MTLDevice) async throws -> NerfModel {
        let data = try Data(contentsOf: url)
        return try await loadFromData(data, using: device)
    }
    
    public static func loadFromData(_ data: Data, using device: MTLDevice) async throws -> NerfModel {
        do {
            let modelData = try JSONDecoder().decode(NerfModelData.self, from: data)
            return try await createModel(from: modelData, using: device)
        } catch {
            throw NerfEdgeKitError.modelLoadFailed("Invalid model format: \(error.localizedDescription)")
        }
    }
    
    private static func createModel(from data: NerfModelData, using device: MTLDevice) async throws -> NerfModel {
        let weightData = try loadWeights(from: data.weights)
        
        guard let weightBuffer = device.makeBuffer(
            bytes: weightData,
            length: weightData.count * MemoryLayout<Float>.stride,
            options: .storageModeShared
        ) else {
            throw NerfEdgeKitError.modelLoadFailed("Failed to create weight buffer")
        }
        
        let networkLayers = data.architecture.layers.map { layerData in
            NetworkLayer(
                type: layerData.type,
                inputSize: layerData.inputSize,
                outputSize: layerData.outputSize,
                activation: layerData.activation,
                weightOffset: layerData.weightOffset
            )
        }
        
        let encodingParams = PositionalEncodingParams(
            positionLevels: data.encoding.positionLevels,
            directionLevels: data.encoding.directionLevels,
            positionScale: data.encoding.positionScale
        )
        
        var mlModel: MLModel?
        if let coreMLPath = data.coreMLPath {
            do {
                let modelURL = URL(fileURLWithPath: coreMLPath)
                mlModel = try MLModel(contentsOf: modelURL)
            } catch {
                print("Warning: Failed to load CoreML model: \(error)")
            }
        }
        
        return NerfModel(
            modelId: data.modelId,
            resolution: (data.resolution.width, data.resolution.height),
            boundingBox: (
                min: SIMD3<Float>(data.boundingBox.min.x, data.boundingBox.min.y, data.boundingBox.min.z),
                max: SIMD3<Float>(data.boundingBox.max.x, data.boundingBox.max.y, data.boundingBox.max.z)
            ),
            weightBuffer: weightBuffer,
            device: device,
            mlModel: mlModel,
            networkLayers: networkLayers,
            encodingParams: encodingParams
        )
    }
    
    private static func loadWeights(from weightData: [Float]) throws -> [Float] {
        guard !weightData.isEmpty else {
            throw NerfEdgeKitError.modelLoadFailed("Empty weight data")
        }
        return weightData
    }
    
    public func inference(
        positions: [SIMD3<Float>],
        directions: [SIMD3<Float>]
    ) async throws -> [SIMD4<Float>] {
        
        if let coreMLModel = mlModel {
            return try await coreMLInference(
                positions: positions,
                directions: directions,
                model: coreMLModel
            )
        } else {
            return try await metalInference(
                positions: positions,
                directions: directions
            )
        }
    }
    
    private func coreMLInference(
        positions: [SIMD3<Float>],
        directions: [SIMD3<Float>],
        model: MLModel
    ) async throws -> [SIMD4<Float>] {
        
        let positionArray = try MLMultiArray(
            shape: [NSNumber(value: positions.count), 3],
            dataType: .float32
        )
        
        let directionArray = try MLMultiArray(
            shape: [NSNumber(value: directions.count), 3],
            dataType: .float32
        )
        
        for (i, pos) in positions.enumerated() {
            positionArray[i * 3 + 0] = NSNumber(value: pos.x)
            positionArray[i * 3 + 1] = NSNumber(value: pos.y)
            positionArray[i * 3 + 2] = NSNumber(value: pos.z)
        }
        
        for (i, dir) in directions.enumerated() {
            directionArray[i * 3 + 0] = NSNumber(value: dir.x)
            directionArray[i * 3 + 1] = NSNumber(value: dir.y)
            directionArray[i * 3 + 2] = NSNumber(value: dir.z)
        }
        
        let input = try MLDictionaryFeatureProvider(dictionary: [
            "positions": MLFeatureValue(multiArray: positionArray),
            "directions": MLFeatureValue(multiArray: directionArray)
        ])
        
        let output = try model.prediction(from: input)
        
        guard let outputArray = output.featureValue(for: "colors")?.multiArrayValue else {
            throw NerfEdgeKitError.modelLoadFailed("Invalid CoreML output")
        }
        
        var results: [SIMD4<Float>] = []
        let count = positions.count
        
        for i in 0..<count {
            let r = Float(truncating: outputArray[i * 4 + 0])
            let g = Float(truncating: outputArray[i * 4 + 1])
            let b = Float(truncating: outputArray[i * 4 + 2])
            let a = Float(truncating: outputArray[i * 4 + 3])
            results.append(SIMD4<Float>(r, g, b, a))
        }
        
        return results
    }
    
    private func metalInference(
        positions: [SIMD3<Float>],
        directions: [SIMD3<Float>]
    ) async throws -> [SIMD4<Float>] {
        
        guard let commandQueue = device.makeCommandQueue(),
              let library = device.makeDefaultLibrary(),
              let function = library.makeFunction(name: "nerf_network_inference") else {
            throw NerfEdgeKitError.renderingFailed("Failed to create Metal resources")
        }
        
        let pipelineState = try device.makeComputePipelineState(function: function)
        
        let inputSize = positions.count * 6
        let outputSize = positions.count * 4
        
        guard let inputBuffer = device.makeBuffer(length: inputSize * MemoryLayout<Float>.stride, options: .storageModeShared),
              let outputBuffer = device.makeBuffer(length: outputSize * MemoryLayout<Float>.stride, options: .storageModeShared) else {
            throw NerfEdgeKitError.renderingFailed("Failed to create buffers")
        }
        
        let inputPointer = inputBuffer.contents().bindMemory(to: Float.self, capacity: inputSize)
        
        for (i, (pos, dir)) in zip(positions, directions).enumerated() {
            inputPointer[i * 6 + 0] = pos.x
            inputPointer[i * 6 + 1] = pos.y
            inputPointer[i * 6 + 2] = pos.z
            inputPointer[i * 6 + 3] = dir.x
            inputPointer[i * 6 + 4] = dir.y
            inputPointer[i * 6 + 5] = dir.z
        }
        
        guard let commandBuffer = commandQueue.makeCommandBuffer(),
              let computeEncoder = commandBuffer.makeComputeCommandEncoder() else {
            throw NerfEdgeKitError.renderingFailed("Failed to create command buffer")
        }
        
        computeEncoder.setComputePipelineState(pipelineState)
        computeEncoder.setBuffer(inputBuffer, offset: 0, index: 0)
        computeEncoder.setBuffer(outputBuffer, offset: 0, index: 1)
        computeEncoder.setBuffer(weightBuffer, offset: 0, index: 2)
        
        let threadgroupSize = MTLSize(width: 64, height: 1, depth: 1)
        let threadgroups = MTLSize(
            width: (outputSize + threadgroupSize.width - 1) / threadgroupSize.width,
            height: 1,
            depth: 1
        )
        
        computeEncoder.dispatchThreadgroups(threadgroups, threadsPerThreadgroup: threadgroupSize)
        computeEncoder.endEncoding()
        
        commandBuffer.commit()
        commandBuffer.waitUntilCompleted()
        
        let outputPointer = outputBuffer.contents().bindMemory(to: Float.self, capacity: outputSize)
        var results: [SIMD4<Float>] = []
        
        for i in 0..<positions.count {
            let r = outputPointer[i * 4 + 0]
            let g = outputPointer[i * 4 + 1]
            let b = outputPointer[i * 4 + 2]
            let a = outputPointer[i * 4 + 3]
            results.append(SIMD4<Float>(r, g, b, a))
        }
        
        return results
    }
}

public struct NetworkLayer {
    let type: String
    let inputSize: Int
    let outputSize: Int
    let activation: String
    let weightOffset: Int
}

public struct PositionalEncodingParams {
    let positionLevels: Int
    let directionLevels: Int
    let positionScale: Float
}

private struct NerfModelData: Codable {
    let modelId: String
    let resolution: Resolution
    let boundingBox: BoundingBox
    let weights: [Float]
    let architecture: Architecture
    let encoding: Encoding
    let coreMLPath: String?
    
    struct Resolution: Codable {
        let width: Int
        let height: Int
    }
    
    struct BoundingBox: Codable {
        let min: Point3D
        let max: Point3D
    }
    
    struct Point3D: Codable {
        let x: Float
        let y: Float
        let z: Float
    }
    
    struct Architecture: Codable {
        let layers: [LayerData]
    }
    
    struct LayerData: Codable {
        let type: String
        let inputSize: Int
        let outputSize: Int
        let activation: String
        let weightOffset: Int
    }
    
    struct Encoding: Codable {
        let positionLevels: Int
        let directionLevels: Int
        let positionScale: Float
    }
}