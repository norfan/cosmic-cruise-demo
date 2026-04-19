/**
 * OceanSprite - 海洋精灵（Tier 0）
 *
 * 视觉效果：
 *   - 宽阔的水面平面，带顶点动画波浪
 *   - UV 滚动的程序化水纹纹理
 *   - 半透明蓝绿色，MeshStandardMaterial 反光
 *
 * 性能优化：
 *   - 波浪动画移至 vertex shader（零 CPU 开销）
 *   - 移除每帧 computeVertexNormals()
 *   - UV offset 只更新纹理坐标
 */

import * as THREE from 'three';
import EnvironmentSprite, { EnvironmentSpriteConfig } from '../EnvironmentSprite';

const oceanVertShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uWaveAmplitude;
  uniform float uWaveFrequency;

  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float phase = length(pos.xz) * uWaveFrequency + uTime;
    float wave1 = sin(phase) * uWaveAmplitude;
    float wave2 = cos(pos.z * uWaveFrequency * 0.7 + uTime * 0.8) * uWaveAmplitude * 0.5;
    pos.y += wave1 + wave2;

    // 计算波浪法线（近似）
    float dx = cos(phase) * uWaveAmplitude * uWaveFrequency;
    float dz = -sin(pos.z * uWaveFrequency * 0.7 + uTime * 0.8) * uWaveAmplitude * 0.5 * uWaveFrequency * 0.7;
    vNormal = normalize(vec3(-dx, 1.0, -dz));

    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const oceanFragShader = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uMetalness;
  uniform float uRoughness;

  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    float diff = max(dot(vNormal, lightDir), 0.0);

    vec3 viewDir = normalize(-vWorldPos);
    vec3 reflDir = reflect(-lightDir, vNormal);
    float spec = pow(max(dot(viewDir, reflDir), 0.0), 32.0);

    vec3 ambient = uColor * 0.3;
    vec3 diffuse = uColor * diff * 0.6;
    vec3 specular = vec3(1.0) * spec * 0.4;

    vec3 color = ambient + diffuse + specular;
    gl_FragColor = vec4(color, uOpacity);
  }
`;

export interface OceanSpriteConfig extends EnvironmentSpriteConfig {
  width?: number;
  depth?: number;
  segments?: number;
  color?: number;
  waveAmplitude?: number;
  waveFrequency?: number;
  opacity?: number;
}

export class OceanSprite extends EnvironmentSprite {
  private _mesh!: THREE.Mesh;
  private _material!: THREE.ShaderMaterial;
  private _normalTex!: THREE.CanvasTexture;

  constructor(config: OceanSpriteConfig = {}) {
    super({ tier: 0, name: 'OceanSprite', ...config });
  }

  mount(scene: THREE.Scene, config: OceanSpriteConfig = {}): void {
    this._scene = scene;

    const width = config.width ?? 120;
    const depth = config.depth ?? 60;
    const segs = Math.min(config.segments ?? 80, 40);
    const color = config.color ?? 0x0066aa;
    const opacity = config.opacity ?? 0.85;
    const waveAmplitude = config.waveAmplitude ?? 0.35;
    const waveFrequency = config.waveFrequency ?? 0.6;

    const geo = this.trackGeometry(
      new THREE.PlaneGeometry(width, depth, segs, segs)
    );
    geo.rotateX(-Math.PI / 2);

    this._normalTex = this.createCanvasTexture(256, (ctx, w, h) => {
      const imgData = ctx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const nx = (Math.random() - 0.5) * 0.3;
        const ny = (Math.random() - 0.5) * 0.3;
        imgData.data[i * 4 + 0] = Math.floor((nx + 0.5) * 255);
        imgData.data[i * 4 + 1] = Math.floor((ny + 0.5) * 255);
        imgData.data[i * 4 + 2] = 255;
        imgData.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    });
    this._normalTex.wrapS = THREE.RepeatWrapping;
    this._normalTex.wrapT = THREE.RepeatWrapping;
    this._normalTex.repeat.set(6, 6);

    this._material = this.trackMaterial(
      new THREE.ShaderMaterial({
        vertexShader: oceanVertShader,
        fragmentShader: oceanFragShader,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
          uMetalness: { value: 0.1 },
          uRoughness: { value: 0.25 },
          uWaveAmplitude: { value: waveAmplitude },
          uWaveFrequency: { value: waveFrequency },
        },
        transparent: true,
        side: THREE.FrontSide,
        depthWrite: false,
      })
    );

    this._mesh = new THREE.Mesh(geo, this._material);
    this._mesh.receiveShadow = true;
    this._mesh.name = 'ocean';

    const pos = config.position ?? new THREE.Vector3(0, 0, 0);
    this._mesh.position.copy(pos);

    this._object3D = this._mesh;
    scene.add(this._mesh);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);

    if (!this._material) return;
    this._material.uniforms.uTime.value = this._time;

    this._normalTex.offset.x += deltaTime * 0.03;
    this._normalTex.offset.y += deltaTime * 0.015;
  }
}

export default OceanSprite;