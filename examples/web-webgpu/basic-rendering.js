// NeRF Edge Kit Web Example
import { NerfRenderer, initialize } from 'nerf-edge-kit';

async function main() {
  await initialize({
    targetFPS: 60,
    maxResolution: [1920, 1080],
    foveatedRendering: false
  });
  
  const renderer = new NerfRenderer();
  const canvas = document.getElementById('nerf-canvas');
  
  await renderer.initialize(canvas);
  
  // Load and render NeRF model
  const scene = await renderer.createScene();
  await scene.loadModel('/models/example.nerf');
  
  renderer.startRenderLoop();
}

main().catch(console.error);