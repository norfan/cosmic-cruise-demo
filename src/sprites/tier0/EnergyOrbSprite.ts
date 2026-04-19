/**
 * EnergyOrbSprite - 能量球精灵（Tier 0，可收集）
 *
 * 视觉效果（优化版）：
 *   - 自定义 Shader 核心：FBM 噪声 + Fresnel 边缘光 + 多色脉冲
 *   - 环绕粒子尾迹：PointsMaterial 沿球面公转
 *   - 收集爆炸：能量环扩散 + 粒子四散
 *   - PointLight 随脉冲呼吸闪烁
 *
 * 交互：
 *   - onInteract() 触发收集，发出 'energyCollected' 事件
 */

import * as THREE from 'three';
import EnvironmentSprite, { EnvironmentSpriteConfig } from '../EnvironmentSprite';
import { SpriteInteractionResult } from '../Sprite';

// ── Shader ──────────────────────────────────────────────
const coreVertGLSL = /* glsl */ `
  precision highp float;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coreFragGLSL = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3  uColor;
  uniform vec3  uGlowColor;

  varying vec3 vNormal;
  varying vec2 vUv;

  // Hash / Noise / FBM
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i),           hash(i + vec3(1,0,0)), f.x),
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
      p = p * 2.1 + vec3(1.7, 9.2, 3.5);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Fresnel 边缘发光
    float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);

    // 动态 FBM 噪声（随时间流动）
    vec3 p = vNormal * 4.0 + vec3(uTime * 0.6, uTime * 0.4, uTime * 0.3);
    float n = fbm(p);
    float n2 = fbm(p * 2.0 + vec3(5.3, 1.7, 9.1));

    // 多频率脉冲
    float pulse1 = sin(uTime * 3.5) * 0.5 + 0.5;
    float pulse2 = sin(uTime * 1.8 + 1.2) * 0.5 + 0.5;
    float pulse  = pulse1 * 0.6 + pulse2 * 0.4;

    // 核心→边缘 颜色插值
    vec3 coreColor = mix(uColor, vec3(1.0, 1.0, 0.85), 0.5);
    vec3 edgeColor = uGlowColor;
    vec3 color = mix(edgeColor, coreColor, fresnel * (0.6 + n * 0.4));

    // 亮度：核心高光 + 噪声起伏 + 脉冲
    float brightness = (1.0 + n2 * 1.5) * (1.0 + pulse * 0.8);
    brightness += fresnel * 2.0 * (0.5 + pulse * 0.5);

    gl_FragColor = vec4(color * brightness, min(brightness * 0.9, 1.0));
  }
`;

// 能量环扩散 shader（收集爆炸用）
const ringVertGLSL = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragGLSL = /* glsl */ `
  precision highp float;
  uniform float uProgress;  // 0→1 扩散进度
  uniform float uOpacity;
  uniform vec3  uColor;
  varying vec2  vUv;
  void main() {
    vec2 center = vec2(0.5, 0.5);
    float d = length(vUv - center) * 2.0;
    // 只保留环状（外缘）
    float ring = smoothstep(uProgress - 0.15, uProgress, d) * smoothstep(uProgress + 0.05, uProgress, d);
    float fade = pow(1.0 - uProgress, 1.5);
    gl_FragColor = vec4(uColor * ring, ring * fade * uOpacity);
  }
`;

// ── Class ───────────────────────────────────────────────
export interface EnergyOrbSpriteConfig extends EnvironmentSpriteConfig {
  color?: number;
  glowColor?: number;
  radius?: number;
  pulseSpeed?: number;
  energyValue?: number;
  floatAmplitude?: number;
  trailCount?: number;   // 尾迹粒子数
}

export class EnergyOrbSprite extends EnvironmentSprite {
  private _energyValue: number;
  private _pulseSpeed: number;
  private _floatAmplitude: number;
  private _baseY: number = 0;
  private _light!: THREE.PointLight;
  private _radius: number = 0.25; // 核心球半径，供 update 使用

  // 核心
  private _core!: THREE.Mesh;
  private _coreUniforms!: Record<string, THREE.IUniform>;

  // 尾迹粒子
  private _trailPoints!: THREE.Points;
  private _trailGeo!: THREE.BufferGeometry;
  private _trailPhase!: Float32Array;
  private _trailCount: number;

  // 收集爆炸
  private _collected: boolean = false;
  private _dissolveTimer: number = 0;
  private _dissolving: boolean = false;
  private _burstRing!: THREE.Mesh;
  private _burstParticles!: THREE.Points;
  private _burstGeo!: THREE.BufferGeometry;
  private _burstVel!: Float32Array;
  private _group!: THREE.Group;

  constructor(config: EnergyOrbSpriteConfig = {}) {
    super({ tier: 0, name: 'EnergyOrbSprite', ...config });
    this._energyValue = config.energyValue ?? 10;
    this._pulseSpeed = config.pulseSpeed ?? 2.0;
    this._floatAmplitude = config.floatAmplitude ?? 0.15;
    this._trailCount = config.trailCount ?? 80;
  }

  mount(scene: THREE.Scene, config: EnergyOrbSpriteConfig = {}): void {
    this._scene = scene;

    const r = config.radius ?? 0.25;
    const color = config.color ?? 0x00ff88;
    const glowColor = config.glowColor ?? 0x00d4ff;
    const pos = config.position ?? new THREE.Vector3(0, 1.5, 0);
    this._baseY = pos.y;
    this._radius = r; // 记录半径供 update() 使用

    this._group = new THREE.Group();
    this._group.position.copy(pos);

    // ── 核心球（Shader） ───────────────────────────
    this._coreUniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uGlowColor: { value: new THREE.Color(glowColor) },
    };
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: coreVertGLSL,
      fragmentShader: coreFragGLSL,
      uniforms: this._coreUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._core = new THREE.Mesh(
      this.trackGeometry(new THREE.SphereGeometry(r, 32, 32)),
      this.trackMaterial(coreMat)
    );
    this._group.add(this._core);

    // ── 环绕尾迹粒子 ───────────────────────────────
    this._buildTrail(r, glowColor);

    // ── 点光源 ─────────────────────────────────────
    this._light = new THREE.PointLight(glowColor, 0.8, r * 12);
    this._group.add(this._light);

    // ── 收集爆炸（隐藏，待激活） ──────────────────
    this._buildBurstSystem(r, color, glowColor);
    this._burstRing.visible = false;
    this._burstParticles.visible = false;

    this._object3D = this._group;
    scene.add(this._group);
  }

  private _buildTrail(r: number, glowColor: number): void {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this._trailCount * 3);
    const colors = new Float32Array(this._trailCount * 3);
    this._trailPhase = new Float32Array(this._trailCount);

    for (let i = 0; i < this._trailCount; i++) {
      positions[i * 3]     = 0;
      positions[i * 3 + 1]  = 0;
      positions[i * 3 + 2]  = 0;
      this._trailPhase[i] = (i / this._trailCount) * Math.PI * 2;

      const c = new THREE.Color(glowColor);
      const brightness = 0.4 + Math.random() * 0.6;
      colors[i * 3]     = c.r * brightness;
      colors[i * 3 + 1] = c.g * brightness;
      colors[i * 3 + 2] = c.b * brightness;
    }

    const phases = new Float32Array(this._trailCount);
    for (let i = 0; i < this._trailCount; i++) {
      phases[i] = i / this._trailCount;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const trailVertexShader = /* glsl */ `
      attribute float aPhase;
      uniform float uTime;
      uniform float uRadius;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = color;
        float phase = aPhase * 6.28318 + uTime * (1.2 + mod(aPhase * 10.0, 0.75));
        float tilt = mod(aPhase, 1.0) * 3.14159;
        float orbit = uRadius * (1.5 + mod(aPhase * 3.0, 0.9));

        vec3 pos = vec3(
          cos(phase) * sin(tilt) * orbit,
          cos(tilt) * orbit * 0.5,
          sin(phase) * sin(tilt) * orbit
        );

        vAlpha = 0.8 - mod(uTime * 0.3, 1.0) * 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = 22.0;
      }
    `;

    const trailFragmentShader = /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.2, d) * vAlpha;
        gl_FragColor = vec4(vColor, alpha);
      }
    `;

    const mat = new THREE.ShaderMaterial({
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: r },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this._trailPoints = new THREE.Points(geo, mat);
    this._group.add(this._trailPoints);
    this._trailGeo = geo;
  }

  private _buildBurstSystem(r: number, color: number, glowColor: number): void {
    // 扩散环
    const ringGeo = new THREE.PlaneGeometry(r * 8, r * 8, 1, 1);
    const ringMat = new THREE.ShaderMaterial({
      vertexShader: ringVertGLSL,
      fragmentShader: ringFragGLSL,
      uniforms: {
        uProgress: { value: 0 },
        uOpacity:  { value: 1.0 },
        uColor:    { value: new THREE.Color(glowColor) },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._burstRing = new THREE.Mesh(ringGeo, this.trackMaterial(ringMat));
    this._burstRing.rotation.x = -Math.PI / 2;
    this._group.add(this._burstRing);

    // 爆发粒子
    const count = 120;
    const bGeo = new THREE.BufferGeometry();
    const bPos = new Float32Array(count * 3);
    const bCol = new Float32Array(count * 3);
    this._burstVel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      bPos[i * 3] = 0; bPos[i * 3+1] = 0; bPos[i * 3+2] = 0;
      const c = new THREE.Color(Math.random() > 0.5 ? color : glowColor);
      bCol[i*3]=c.r; bCol[i*3+1]=c.g; bCol[i*3+2]=c.b;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;
      const speed = 0.05 + Math.random() * 0.15;
      this._burstVel[i*3]   = Math.sin(phi)*Math.cos(theta)*speed;
      this._burstVel[i*3+1] = Math.cos(phi)*speed;
      this._burstVel[i*3+2] = Math.sin(phi)*Math.sin(theta)*speed;
    }

    bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
    bGeo.setAttribute('color',    new THREE.BufferAttribute(bCol, 3));
    const bMat = new THREE.PointsMaterial({
      size: r * 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._burstParticles = new THREE.Points(bGeo, this.trackMaterial(bMat));
    this._group.add(this._burstParticles);
    this._burstGeo = bGeo;
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    if (!this._object3D) return;

    // ── 消散爆炸动画 ───────────────────────────────
    if (this._dissolving) {
      this._dissolveTimer += deltaTime;
      const progress = Math.min(this._dissolveTimer / 0.6, 1);

      // 环扩散
      const ringMat = (this._burstRing.material as THREE.ShaderMaterial).uniforms;
      ringMat.uProgress.value = progress;
      ringMat.uOpacity.value   = Math.max(0, 1 - progress);

      // 粒子四散
      const pos = this._burstGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(
          i,
          pos.getX(i) + this._burstVel[i * 3],
          pos.getY(i) + this._burstVel[i * 3 + 1],
          pos.getZ(i) + this._burstVel[i * 3 + 2],
        );
      }
      pos.needsUpdate = true;
      (this._burstParticles.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - progress * 1.2);

      if (progress >= 1) this.dispose();
      return;
    }

    // ── 正常动画 ───────────────────────────────────
    // 核心 shader 时间
    this._coreUniforms.uTime.value = this._time;

    // 脉冲缩放（更自然的非线性）
    const pulse1 = Math.sin(this._time * this._pulseSpeed) * 0.5 + 0.5;
    const pulse2 = Math.sin(this._time * this._pulseSpeed * 1.7) * 0.5 + 0.5;
    const pulse  = 1 + (pulse1 * 0.08 + pulse2 * 0.07);
    this._object3D.scale.setScalar(pulse);

    // 悬浮
    this._object3D.position.y = this._baseY + Math.sin(this._time * 1.5) * this._floatAmplitude;

    // 自转
    this._object3D.rotation.y += deltaTime * 0.8;

    // 灯光呼吸
    this._light.intensity = 0.4 + pulse1 * 0.5 + pulse2 * 0.3;

    // 粒子环绕尾迹 - GPU 动画（零 CPU 开销）
    const trailMat = this._trailPoints.material as THREE.ShaderMaterial;
    if (trailMat.uniforms.uTime) {
      trailMat.uniforms.uTime.value = this._time;
    }
  }

  onInteract(): SpriteInteractionResult {
    if (this._collected) return {};
    this._collected = true;
    this._dissolving = true;

    // 隐藏核心和尾迹，显示爆炸系统
    this._core.visible         = false;
    this._trailPoints.visible  = false;
    this._light.intensity      = 0;
    this._burstRing.visible     = true;
    this._burstParticles.visible = true;

    this.emit('energyCollected', {
      id: this.id,
      energyDelta: this._energyValue,
      position: this._object3D?.position.clone(),
    });

    return {
      energyDelta: this._energyValue,
      message: `+${this._energyValue} 能量`,
    };
  }

  dispose(): void {
    this._core?.geometry.dispose();
    (this._core?.material as THREE.ShaderMaterial)?.dispose();
    this._trailGeo?.dispose();
    (this._trailPoints?.material as THREE.PointsMaterial)?.dispose();
    this._burstRing?.geometry.dispose();
    (this._burstRing?.material as THREE.ShaderMaterial)?.dispose();
    this._burstGeo?.dispose();
    (this._burstParticles?.material as THREE.PointsMaterial)?.dispose();
    super.dispose();
  }
}

export default EnergyOrbSprite;
