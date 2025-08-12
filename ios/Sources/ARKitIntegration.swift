import Foundation
import ARKit
import RealityKit
import simd

@available(iOS 17.0, *)
public final class ARKitIntegration: NSObject {
    
    private let arSession: ARSession
    private let arConfiguration: ARWorldTrackingConfiguration
    
    private var eyeTrackingContinuation: AsyncStream<EyeTrackingData>.Continuation?
    public private(set) var eyeTrackingData: AsyncStream<EyeTrackingData>!
    
    private var currentFrame: ARFrame?
    private var worldOrigin = simd_float4x4(1.0)
    
    public var isSessionRunning: Bool {
        return arSession.currentFrame != nil
    }
    
    public var currentCameraTransform: simd_float4x4? {
        return currentFrame?.camera.transform
    }
    
    public var currentLightEstimate: ARLightEstimate? {
        return currentFrame?.lightEstimate
    }
    
    override init() {
        self.arSession = ARSession()
        self.arConfiguration = ARWorldTrackingConfiguration()
        
        super.init()
        
        setupEyeTrackingStream()
        setupARConfiguration()
        
        arSession.delegate = self
    }
    
    private func setupEyeTrackingStream() {
        eyeTrackingData = AsyncStream<EyeTrackingData> { continuation in
            self.eyeTrackingContinuation = continuation
        }
    }
    
    private func setupARConfiguration() {
        guard ARWorldTrackingConfiguration.isSupported else {
            fatalError("ARKit World Tracking is not supported on this device")
        }
        
        arConfiguration.planeDetection = [.horizontal, .vertical]
        arConfiguration.environmentTexturing = .automatic
        arConfiguration.wantsHDREnvironmentTextures = true
        arConfiguration.frameSemantics = .smoothedSceneDepth
        
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
            arConfiguration.frameSemantics.insert(.sceneDepth)
        }
        
        if ARFaceTrackingConfiguration.isSupported {
            if #available(iOS 18.0, *) {
                
            } else {
                
            }
        }
    }
    
    public func initialize() async throws {
        guard ARWorldTrackingConfiguration.isSupported else {
            throw NerfEdgeKitError.arkitNotSupported
        }
        
        await MainActor.run {
            arSession.run(arConfiguration)
        }
        
        try await waitForSessionToStart()
        
        startEyeTrackingSimulation()
    }
    
    private func waitForSessionToStart() async throws {
        let timeout = 5.0
        let startTime = CACurrentMediaTime()
        
        while !isSessionRunning && (CACurrentMediaTime() - startTime) < timeout {
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        
        if !isSessionRunning {
            throw NerfEdgeKitError.arkitNotSupported
        }
    }
    
    private func startEyeTrackingSimulation() {
        Task {
            var time: Float = 0.0
            let updateInterval: UInt64 = 16_666_667
            
            while !Task.isCancelled {
                let gazeData = simulateEyeTracking(time: time)
                eyeTrackingContinuation?.yield(gazeData)
                
                time += 0.016667
                try await Task.sleep(nanoseconds: updateInterval)
            }
        }
    }
    
    private func simulateEyeTracking(time: Float) -> EyeTrackingData {
        let centerX: Float = 0.5
        let centerY: Float = 0.5
        
        let gazeRadius: Float = 0.1
        let gazeSpeed: Float = 0.5
        
        let leftOffset = SIMD2<Float>(
            sin(time * gazeSpeed) * gazeRadius * 0.5,
            cos(time * gazeSpeed * 0.7) * gazeRadius * 0.3
        )
        
        let rightOffset = SIMD2<Float>(
            sin(time * gazeSpeed + 0.1) * gazeRadius * 0.5,
            cos(time * gazeSpeed * 0.7 + 0.1) * gazeRadius * 0.3
        )
        
        let leftEyeGaze = SIMD2<Float>(centerX, centerY) + leftOffset
        let rightEyeGaze = SIMD2<Float>(centerX, centerY) + rightOffset
        let combinedGaze = (leftEyeGaze + rightEyeGaze) * 0.5
        
        let confidence: Float = 0.95 + sin(time) * 0.05
        
        return EyeTrackingData(
            leftEyeGaze: leftEyeGaze,
            rightEyeGaze: rightEyeGaze,
            combinedGaze: combinedGaze,
            confidence: confidence
        )
    }
    
    public func captureScene() async throws -> SceneCaptureData {
        guard let frame = currentFrame else {
            throw NerfEdgeKitError.arkitNotSupported
        }
        
        let cameraIntrinsics = frame.camera.intrinsics
        let cameraTransform = frame.camera.transform
        
        var depthData: CVPixelBuffer?
        var confidenceData: CVPixelBuffer?
        
        if let sceneDepth = frame.sceneDepth {
            depthData = sceneDepth.depthMap
            confidenceData = sceneDepth.confidenceMap
        }
        
        let anchors = frame.anchors.compactMap { anchor -> AnchorData? in
            guard let planeAnchor = anchor as? ARPlaneAnchor else { return nil }
            
            return AnchorData(
                identifier: anchor.identifier,
                transform: anchor.transform,
                planeClassification: planeAnchor.classification,
                planeExtent: planeAnchor.planeExtent
            )
        }
        
        return SceneCaptureData(
            cameraIntrinsics: cameraIntrinsics,
            cameraTransform: cameraTransform,
            imageBuffer: frame.capturedImage,
            depthData: depthData,
            confidenceData: confidenceData,
            anchors: anchors,
            lightEstimate: frame.lightEstimate,
            timestamp: frame.timestamp
        )
    }
    
    public func getWorldCoordinate(from screenPoint: CGPoint, frame: ARFrame) -> simd_float3? {
        let results = frame.raycastQuery(from: screenPoint, allowing: .estimatedPlane, alignment: .any)
        return results.first?.worldTransform.columns.3.xyz
    }
    
    public func convertToNerfCoordinates(_ worldPosition: simd_float3) -> simd_float3 {
        let nerfTransform = simd_float4x4(
            SIMD4<Float>(1, 0, 0, 0),
            SIMD4<Float>(0, 0, 1, 0),
            SIMD4<Float>(0, -1, 0, 0),
            SIMD4<Float>(0, 0, 0, 1)
        )
        
        let worldPos4 = SIMD4<Float>(worldPosition.x, worldPosition.y, worldPosition.z, 1.0)
        let nerfPos = nerfTransform * worldPos4
        
        return SIMD3<Float>(nerfPos.x, nerfPos.y, nerfPos.z)
    }
    
    public func setWorldOrigin(_ transform: simd_float4x4) {
        worldOrigin = transform
        arSession.setWorldOrigin(relativeTransform: transform)
    }
    
    public func pause() {
        arSession.pause()
    }
    
    public func resume() {
        arSession.run(arConfiguration, options: [.resetTracking, .removeExistingAnchors])
    }
    
    deinit {
        arSession.pause()
        eyeTrackingContinuation?.finish()
    }
}

@available(iOS 17.0, *)
extension ARKitIntegration: ARSessionDelegate {
    
    public func session(_ session: ARSession, didUpdate frame: ARFrame) {
        currentFrame = frame
    }
    
    public func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        
    }
    
    public func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        
    }
    
    public func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
        
    }
    
    public func session(_ session: ARSession, didFailWithError error: Error) {
        print("ARSession failed with error: \(error.localizedDescription)")
    }
    
    public func sessionWasInterrupted(_ session: ARSession) {
        print("ARSession was interrupted")
    }
    
    public func sessionInterruptionEnded(_ session: ARSession) {
        print("ARSession interruption ended")
        session.run(arConfiguration, options: [.resetTracking])
    }
}

public struct SceneCaptureData {
    public let cameraIntrinsics: simd_float3x3
    public let cameraTransform: simd_float4x4
    public let imageBuffer: CVPixelBuffer
    public let depthData: CVPixelBuffer?
    public let confidenceData: CVPixelBuffer?
    public let anchors: [AnchorData]
    public let lightEstimate: ARLightEstimate?
    public let timestamp: TimeInterval
}

public struct AnchorData {
    public let identifier: UUID
    public let transform: simd_float4x4
    public let planeClassification: ARPlaneAnchor.Classification
    public let planeExtent: simd_float3
}

extension simd_float4 {
    var xyz: simd_float3 {
        return simd_float3(x, y, z)
    }
}

extension ARFrame {
    func raycastQuery(from point: CGPoint, allowing target: ARRaycastQuery.Target, alignment: ARRaycastQuery.TargetAlignment) -> [ARRaycastResult] {
        let query = ARRaycastQuery(origin: camera.transform.columns.3.xyz, direction: simd_float3(0, 0, -1), allowing: target, alignment: alignment)
        return session.raycast(query)
    }
}