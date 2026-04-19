/**
 * MountainSprite - 远山精灵（Tier 0）
 *
 * 视觉效果（重新优化）：
 *   - 顶点 displacement：沿法线方向叠加多层 sin 波，破坏圆锥感
 *   - 程序化岩石纹理（FBM）+ 高度脸色渐变
 *   - 噪声扰动雪线（非生硬切断）
 *   - Rim lighting（轮廓光）：让山体在任何角度都有边缘高光
 *   - 大气雾效（distance fog）
 *   - 多峰山体（不同高度、错落排列）
 */

import * as THREE from 'three';
import EnvironmentSprite, { EnvironmentSpriteConfig } from '../EnvironmentSprite';

// ── Shader ──────────────────────────────────────────────
const mountainVertGLSL = /* glsl */ `
  precision highp float;

  uniform float uTime;
  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying vec3  vViewDir;
  varying float vHeight;   // 0=山脚 1=山顶
  varying float vSlope;    // 陡峭程度

  // 简易 hash / noise
  float hash(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i),           hash(i+vec3(1,0,0)), f.x),
          mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)), f.x),
          mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);

    // 归一化高度（基于 y 轴，ConeGeometry 顶点 y 范围 -0.5~0.5）
    float minY = -0.5;
    float maxY = 0.5;
    vHeight = clamp((position.y - minY) / (maxY - minY), 0.0, 1.0);

    // 斜面陡峭程度
    vSlope = 1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));

    // 顶点 displacement：沿法线方向叠加多层 sin 波，打破圆锥感
    float disp = 0.0;
    disp += noise(position * 1.5) * 0.18;
    disp += noise(position * 3.8 + 1.3) * 0.08;
    disp += noise(position * 8.0 + 4.7) * 0.03;
    vec3 displaced = position + normal * disp * (1.0 - vHeight * 0.4);

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = worldPos.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const mountainFragGLSL = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3  uCameraPos;
  uniform vec3  uBaseColor;
  uniform vec3  uMidColor;
  uniform vec3  uSnowColor;
  uniform vec3  uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3  uLightDir;  // 主光源方向

  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying float vHeight;
  varying float vSlope;

  // FBM
  float hash(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i),           hash(i+vec3(1,0,0)), f.x),
          mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)), f.x),
          mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }
  float fbm(vec3 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.0 + vec3(1.7, 9.2, 3.5);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // 程序化岩石纹理（基于世界坐标，防止 UV 拉伸）
    float n1 = fbm(vWorldPos * 2.5);
    float n2 = fbm(vWorldPos * 6.0 + 4.3);
    float rockPattern = n1 * 0.6 + n2 * 0.4;

    // 基于高度的脸色渐变：山脚深 → 山腰浅 → 山顶雪白
    vec3 baseColor  = mix(uBaseColor, uMidColor, smoothstep(0.0, 0.55, vHeight));
    vec3 rockColor  = baseColor * (0.7 + rockPattern * 0.6);

    // 雪线：0.65 以上，噪声扰动边缘，非陡壁
    float snowLine = 0.65 + noise(vWorldPos * 3.0) * 0.15;
    float snowMask = smoothstep(snowLine, snowLine + 0.18, vHeight)
                   * smoothstep(0.85, 0.3, vSlope);
    vec3 finalColor = mix(rockColor, uSnowColor, snowMask);

    // 主光源 diffuse
    vec3 lightDir = normalize(uLightDir);
    float diff    = max(dot(vNormal, lightDir), 0.0);

    // 半球光近似（天空光 + 地面反射光）
    float skyLight = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    vec3 skyColor   = uMidColor * 0.6;
    vec3 groundColor = uBaseColor * 0.4;
    vec3 hemi = mix(groundColor, skyColor, skyLight);

    // 组合光照：ambient + diffuse + 轻微高光
    vec3 ambient   = finalColor * 0.55;           // 提高环境光
    vec3 diffuse   = finalColor * diff * 0.5;
    vec3 hemisphere = finalColor * hemi * 0.25;
    vec3 color = ambient + diffuse + hemisphere;

    // Rim lighting（轮廓光）：山体边缘高光，模拟阳光勾勒
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    float rim    = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = pow(rim, 2.5);
    float rimMask = smoothstep(0.0, 0.4, rim) * (0.5 + diff * 0.5); // 向阳侧更亮
    color += uSnowColor * rimMask * 0.35; // 用雪白色打轮廓光

    // 大气雾效
    float dist  = length(vWorldPos - uCameraPos);
    float fogFactor = smoothstep(uFogNear, uFogFar, dist);
    color = mix(color, uFogColor, fogFactor);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── Class ───────────────────────────────────────────────
export interface MountainSpriteConfig extends EnvironmentSpriteConfig {
  peakCount?: number;
  color?: number;
  midColor?: number;
  snowColor?: number;
  maxHeight?: number;
  spread?: number;
  fogColor?: number;
}

export class MountainSprite extends EnvironmentSprite {
  private _uniforms!: Record<string, THREE.IUniform>;
  private _meshes: THREE.Mesh[] = [];

  constructor(config: MountainSpriteConfig = {}) {
    super({ tier: 0, name: 'MountainSprite', ...config });
  }

  mount(scene: THREE.Scene, config: MountainSpriteConfig = {}): void {
    this._scene = scene;

    const peakCount = config.peakCount ?? 4;
    const color     = config.color     ?? 0x4a4a7a;
    const midColor   = config.midColor   ?? 0x7a7aaa;
    const snowColor  = config.snowColor  ?? 0xeef2ff;
    const maxH       = config.maxHeight  ?? 8;
    const spread     = config.spread     ?? 40;
    const fogColor   = new THREE.Color(config.fogColor ?? 0x1a1a3a);

    const group = new THREE.Group();

    // 全局 uniforms
    this._uniforms = {
      uTime:       { value: 0 },
      uCameraPos:  { value: new THREE.Vector3(0, 5, 20) },
      uBaseColor:  { value: new THREE.Color(color) },
      uMidColor:   { value: new THREE.Color(midColor) },
      uSnowColor:  { value: new THREE.Color(snowColor) },
      uFogColor:   { value: fogColor },
      uFogNear:    { value: 20.0 },
      uFogFar:     { value: 120.0 },
      uLightDir:   { value: new THREE.Vector3(0.5, 1.0, 0.3).normalize() },
    };

    const mat = this.trackMaterial(
      new THREE.ShaderMaterial({
        vertexShader: mountainVertGLSL,
        fragmentShader: mountainFragGLSL,
        uniforms: this._uniforms,
      })
    );

    // 生成峰高（最高峰在中间，左右递减，错落有致）
    const heights: number[] = [];
    const offsets: number[] = [];
    for (let i = 0; i < peakCount; i++) {
      const center = (i + 0.5) / peakCount - 0.5;
      const bell   = Math.pow(1 - Math.abs(center) * 1.4, 2.0);
      heights.push(maxH * (0.5 + bell * 0.5) * (0.7 + Math.random() * 0.6));
      offsets.push((Math.random() - 0.5) * spread * 0.1);
    }

    heights.forEach((h, i) => {
      const x      = ((i / Math.max(peakCount - 1, 1)) - 0.5) * spread + offsets[i];
      const baseR  = h * 0.4 + Math.random() * h * 0.1;
      // 径向分段多一些，表面更平滑（减少 flat shading 感）
      const rSegs  = 8;
      const hSegs  = 12;

      const geo = new THREE.ConeGeometry(baseR, h, rSegs, hSegs);

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, h / 2, 0);
      // 轻微随机倾斜，让山不那么对称
      mesh.rotation.z = (Math.random() - 0.5) * 0.08;
      group.add(mesh);
      this._meshes.push(mesh);
    });

    const pos = config.position ?? new THREE.Vector3(0, -1, -30);
    group.position.copy(pos);
    if (config.scale) group.scale.setScalar(config.scale);

    this.applyShadow(group);
    this._object3D = group;
    scene.add(group);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    if (!this._uniforms) return;
    this._uniforms.uTime.value = this._time;

    // 更新相机位置（从 scene 取主相机）
    if (this._scene) {
      const cam = this._scene.userData?.mainCamera as THREE.Camera | undefined;
      if (cam) {
        (this._uniforms.uCameraPos.value as THREE.Vector3).copy(cam.position);
      }
    }
  }
}

export default MountainSprite;
