#include <metal_stdlib>
using namespace metal;

struct VertexOut {
    float4 position [[position]];
    float2 texCoord;
};

struct RayData {
    float3 origin;
    float3 direction;
    float tMin;
    float tMax;
};

struct NerfUniforms {
    float4x4 viewMatrix;
    float4x4 projectionMatrix;
    uint2 resolution;
    float time;
};

constant float3 vertices[] = {
    float3(-1.0, -1.0, 0.0),
    float3( 1.0, -1.0, 0.0),
    float3(-1.0,  1.0, 0.0),
    float3( 1.0,  1.0, 0.0)
};

constant float2 texCoords[] = {
    float2(0.0, 1.0),
    float2(1.0, 1.0),
    float2(0.0, 0.0),
    float2(1.0, 0.0)
};

vertex VertexOut vertex_main(uint vertexID [[vertex_id]]) {
    VertexOut out;
    out.position = float4(vertices[vertexID], 1.0);
    out.texCoord = texCoords[vertexID];
    return out;
}

float3 sampleNerf(float3 position, float3 direction, constant float* weights) {
    float3 encoded_pos = sin(position * 10.0);
    float3 encoded_dir = sin(direction * 5.0);
    
    float3 features = encoded_pos * 0.5 + encoded_dir * 0.3;
    
    float density = max(0.0, dot(features, float3(0.3, 0.4, 0.3)) - 0.5);
    float3 color = float3(
        sin(features.x * 2.0) * 0.5 + 0.5,
        sin(features.y * 3.0 + 1.57) * 0.5 + 0.5,
        sin(features.z * 4.0 + 3.14) * 0.5 + 0.5
    );
    
    return color * density;
}

float3 rayMarch(float3 origin, float3 direction, constant float* weights) {
    float3 color = float3(0.0);
    float alpha = 0.0;
    
    const int numSamples = 64;
    const float stepSize = 2.0 / float(numSamples);
    
    for (int i = 0; i < numSamples; i++) {
        float t = 0.1 + float(i) * stepSize;
        float3 position = origin + direction * t;
        
        float3 sample = sampleNerf(position, direction, weights);
        float sampleAlpha = length(sample);
        
        color += sample * (1.0 - alpha);
        alpha += sampleAlpha * (1.0 - alpha);
        
        if (alpha > 0.95) break;
    }
    
    return color;
}

fragment float4 fragment_nerf(VertexOut in [[stage_in]],
                             constant NerfUniforms& uniforms [[buffer(0)]],
                             constant float* weights [[buffer(1)]]) {
    float2 ndc = in.texCoord * 2.0 - 1.0;
    ndc.y = -ndc.y;
    
    float4x4 invView = uniforms.viewMatrix;
    float4x4 invProj = uniforms.projectionMatrix;
    
    float3 rayOrigin = float3(0.0, 0.0, 0.0);
    float3 rayDirection = normalize(float3(ndc.x, ndc.y, -1.0));
    
    float3 color = rayMarch(rayOrigin, rayDirection, weights);
    
    return float4(color, 1.0);
}

kernel void nerf_inference(device RayData* rays [[buffer(0)]],
                          device float* features [[buffer(1)]],
                          device float4* colors [[buffer(2)]],
                          constant float* weights [[buffer(3)]],
                          uint2 gid [[thread_position_in_grid]],
                          uint2 gridSize [[threads_per_grid]]) {
    
    uint index = gid.y * gridSize.x + gid.x;
    
    if (gid.x >= gridSize.x || gid.y >= gridSize.y) return;
    
    RayData ray = rays[index];
    
    float3 color = rayMarch(ray.origin, ray.direction, weights);
    colors[index] = float4(color, 1.0);
}

kernel void nerf_network_inference(device float* input [[buffer(0)]],
                                  device float* output [[buffer(1)]],
                                  constant float* weights [[buffer(2)]],
                                  constant uint& inputSize [[buffer(3)]],
                                  constant uint& outputSize [[buffer(4)]],
                                  uint id [[thread_position_in_grid]]) {
    
    if (id >= outputSize) return;
    
    float result = 0.0;
    
    for (uint i = 0; i < inputSize; i++) {
        result += input[i] * weights[id * inputSize + i];
    }
    
    output[id] = max(0.0, result);
}

kernel void positional_encoding(device float3* positions [[buffer(0)]],
                               device float* encoded [[buffer(1)]],
                               constant uint& numPositions [[buffer(2)]],
                               constant uint& encodingLevels [[buffer(3)]],
                               uint id [[thread_position_in_grid]]) {
    
    if (id >= numPositions) return;
    
    float3 pos = positions[id];
    uint outputOffset = id * encodingLevels * 6;
    
    for (uint level = 0; level < encodingLevels; level++) {
        float freq = pow(2.0, float(level));
        
        encoded[outputOffset + level * 6 + 0] = sin(pos.x * freq);
        encoded[outputOffset + level * 6 + 1] = cos(pos.x * freq);
        encoded[outputOffset + level * 6 + 2] = sin(pos.y * freq);
        encoded[outputOffset + level * 6 + 3] = cos(pos.y * freq);
        encoded[outputOffset + level * 6 + 4] = sin(pos.z * freq);
        encoded[outputOffset + level * 6 + 5] = cos(pos.z * freq);
    }
}

kernel void volume_rendering(device float4* densityColor [[buffer(0)]],
                           device float4* output [[buffer(1)]],
                           constant uint& numSamples [[buffer(2)]],
                           constant float& stepSize [[buffer(3)]],
                           uint id [[thread_position_in_grid]]) {
    
    if (id >= numSamples) return;
    
    float4 color = float4(0.0);
    float transmittance = 1.0;
    
    for (uint i = 0; i < numSamples; i++) {
        float4 sample = densityColor[id * numSamples + i];
        float density = sample.w;
        float3 rgb = sample.xyz;
        
        float alpha = 1.0 - exp(-density * stepSize);
        
        color.xyz += transmittance * alpha * rgb;
        transmittance *= (1.0 - alpha);
        
        if (transmittance < 0.01) break;
    }
    
    color.w = 1.0 - transmittance;
    output[id] = color;
}

struct GazeData {
    float2 leftEyeGaze;
    float2 rightEyeGaze;
    float2 combinedGaze;
    float confidence;
};

kernel void foveated_rendering(constant GazeData& gazeData [[buffer(0)]],
                             device uchar* qualityMap [[buffer(1)]],
                             constant uint2& resolution [[buffer(2)]],
                             uint2 gid [[thread_position_in_grid]]) {
    
    if (gid.x >= resolution.x || gid.y >= resolution.y) return;
    
    uint index = gid.y * resolution.x + gid.x;
    
    float2 pixel = float2(float(gid.x) / float(resolution.x), float(gid.y) / float(resolution.y));
    float2 gazePoint = gazeData.combinedGaze;
    
    float distance = length(pixel - gazePoint);
    
    uchar qualityLevel;
    if (distance <= 0.1) {
        qualityLevel = 0; // Ultra quality
    } else if (distance <= 0.3) {
        qualityLevel = 1; // High quality
    } else if (distance <= 0.6) {
        qualityLevel = 2; // Medium quality
    } else {
        qualityLevel = 3; // Low quality
    }
    
    qualityMap[index] = qualityLevel;
}