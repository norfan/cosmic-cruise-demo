/**
 * SandSprite - 沙滩精灵（Tier 0）
 *
 * 视觉效果：
 *   - 几何化沙滩平面，ShaderMaterial 实现菱形格纹理
 *   - 沙滩色（#F5DEB3）为主，细微明暗扰动
 *   - 位于海洋水面略上方，形成海岸线
 */

import * as THREE from 'three';
import EnvironmentSprite, { EnvironmentSpriteConfig } from '../EnvironmentSprite';

export interface SandSpriteConfig extends EnvironmentSpriteConfig {
  width?: number;
  depth?: number;
  color?: number;
}

// ── GLSL 着色器 ──────────────────────────────

const vertexShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;

  // 简单哈希噪声
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }

  void main() {
    // 几何化网格纹理
    vec2 grid = abs(fract(vUv * 18.0 - 0.5) - 0.5) / fwidth(vUv * 18.0);
    float line = min(grid.x, grid.y);
    float gridMask = 1.0 - min(line, 1.0);

    // 颗粒噪声
    float grain = noise(vUv * 80.0) * 0.08 - 0.04;

    // 边缘渐变（近海边颜色加深）
    float edgeFade = smoothstep(0.0, 0.3, vUv.y);

    vec3 col = uColor * (1.0 + grain) * (0.85 + edgeFade * 0.15);
    col = mix(col, col * 0.6, gridMask * 0.12);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export class SandSprite extends EnvironmentSprite {
  private _shaderMat!: THREE.ShaderMaterial;

  constructor(config: SandSpriteConfig = {}) {
    super({ tier: 0, name: 'SandSprite', ...config });
  }

  mount(scene: THREE.Scene, config: SandSpriteConfig = {}): void {
    this._scene = scene;

    const width = config.width ?? 60;
    const depth = config.depth ?? 20;
    const color = new THREE.Color(config.color ?? 0xf5deb3);

    const geo = this.trackGeometry(
      new THREE.PlaneGeometry(width, depth, 1, 1)
    );

    this._shaderMat = this.trackMaterial(
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: color },
          uTime: { value: 0 },
        },
        vertexShader,
        fragmentShader,
        side: THREE.FrontSide,
      })
    ) as THREE.ShaderMaterial;

    const mesh = new THREE.Mesh(geo, this._shaderMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(config.position ?? new THREE.Vector3(0, 0.02, 10));
    mesh.receiveShadow = true;
    mesh.name = 'sand';

    this._object3D = mesh;
    scene.add(mesh);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    if (this._shaderMat) {
      this._shaderMat.uniforms.uTime.value = this._time;
    }
  }
}

export default SandSprite;
