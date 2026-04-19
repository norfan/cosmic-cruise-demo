/**
 * SpiralGalaxySprite - 螺旋星系精灵（Tier 3）
 *
 * 视觉效果：
 *   - 两条旋臂（螺旋臂曲线）
 *   - 中心核球（发光核心 + shader 光晕）
 *   - 数千颗恒星点（自定义 shader 闪烁）
 *   - 整体缓慢旋转
 *
 * 使用自定义 Shader 实现流畅的闪烁和颜色渐变效果
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface SpiralGalaxySpriteConfig extends CelestialSpriteConfig {
  /** 旋臂数量（默认 2） */
  armCount?: number;
  /** 星系半径（默认 15） */
  radius?: number;
  /** 旋臂角度（默认 Math.PI） */
  armAngle?: number;
  /** 核心亮度（默认 2.0） */
  coreBrightness?: number;
  /** 恒星数量（默认 3000） */
  starCount?: number;
}

export class SpiralGalaxySprite extends CelestialSprite {
  readonly category = 'celestial' as const;

  private _armCount: number;
  private _galaxyRadius: number;
  private _armAngle: number;
  private _coreBrightness: number;
  private _starCount: number;

  private _pointsMesh?: THREE.Points;
  private _coreMesh?: THREE.Mesh;
  private _haloMesh?: THREE.Mesh;
  private _positions!: Float32Array;
  private _phases!: Float32Array;
  private _coreFactors!: Float32Array;
  private _galaxyGroup!: THREE.Group;
  private _uniforms!: Record<string, THREE.IUniform>;

  constructor(config: SpiralGalaxySpriteConfig = {}) {
    super({ tier: 3, name: 'SpiralGalaxySprite', ...config });
    this._armCount = config.armCount ?? 2;
    this._galaxyRadius = config.radius ?? 15;
    this._armAngle = config.armAngle ?? Math.PI;
    this._coreBrightness = config.coreBrightness ?? 2.0;
    this._starCount = config.starCount ?? 3000;
  }

  mount(scene: THREE.Scene, config: SpiralGalaxySpriteConfig = {}): void {
    this._scene = scene;

    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));

    // ── 核心球体（带 shader 光晕）───────────────────────────────
    this._buildCore(group);

    // ── 恒星粒子系统（带 shader 闪烁）───────────────────────────
    this._buildStars(group);

    // ── 外围尘埃盘 ─────────────────────────────────────────────
    this._buildDustDisk(group);

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    this._galaxyGroup = group;
    scene.add(group);
  }

  private _buildCore(parent: THREE.Group): void {
    // 核心球体
    const coreGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const coreMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBrightness: { value: this._coreBrightness },
      },
      vertexShader: /* glsl */ `
        precision highp float;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        
        uniform float uTime;
        uniform float uBrightness;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Fresnel 边缘发光
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);

          // 脉冲
          float pulse = 0.8 + sin(uTime * 1.5) * 0.2;

          // 颜色：白热核心
          vec3 coreColor = vec3(1.0, 0.9, 0.7);
          vec3 edgeColor = vec3(1.0, 0.7, 0.3);

          float intensity = 0.5 + fresnel * uBrightness * pulse;
          vec3 color = mix(edgeColor, coreColor, fresnel);

          gl_FragColor = vec4(color * intensity, intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this._coreMesh = new THREE.Mesh(coreGeo, coreMat);
    parent.add(this._coreMesh);

    // 核心光晕球
    const haloGeo = new THREE.SphereGeometry(2.5, 32, 32);
    const haloMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        precision highp float;
        
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        
        uniform float uTime;
        varying vec3 vNormal;

        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          float pulse = 0.7 + sin(uTime * 0.8) * 0.3;
          gl_FragColor = vec4(1.0, 0.8, 0.4, intensity * pulse * 0.4);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this._haloMesh = new THREE.Mesh(haloGeo, haloMat);
    parent.add(this._haloMesh);
  }

  private _buildStars(parent: THREE.Group): void {
    this._positions = new Float32Array(this._starCount * 3);
    this._phases = new Float32Array(this._starCount);
    this._coreFactors = new Float32Array(this._starCount);

    for (let i = 0; i < this._starCount; i++) {
      const arm = Math.floor(Math.random() * this._armCount);
      const armOffset = (arm / this._armCount) * Math.PI * 2;

      const t = Math.random();
      const r = 1.5 + (this._galaxyRadius - 1.5) * Math.pow(t, 0.7);

      const spiralAngle = armOffset + (r / this._galaxyRadius) * this._armAngle + (Math.random() - 0.5) * 0.5;

      const x = r * Math.cos(spiralAngle);
      const z = r * Math.sin(spiralAngle);
      const y = (Math.random() - 0.5) * 1.5 * (1 - t * 0.8);

      this._positions[i * 3] = x;
      this._positions[i * 3 + 1] = y;
      this._positions[i * 3 + 2] = z;

      this._phases[i] = Math.random() * Math.PI * 2;
      this._coreFactors[i] = 1 - t;
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));
    pointsGeo.setAttribute('aPhase', new THREE.BufferAttribute(this._phases, 1));
    pointsGeo.setAttribute('aCoreFactor', new THREE.BufferAttribute(this._coreFactors, 1));

    this._uniforms = {
      uTime: { value: 0 },
    };

    const pointsMat = new THREE.ShaderMaterial({
      uniforms: this._uniforms,
      vertexShader: /* glsl */ `
        precision highp float;
        
        attribute float aPhase;
        attribute float aCoreFactor;

        uniform float uTime;

        varying float vCoreFactor;
        varying float vOpacity;

        void main() {
          vCoreFactor = aCoreFactor;

          // 多频率闪烁
          float flicker1 = sin(uTime * 1.2 + aPhase) * 0.5 + 0.5;
          float flicker2 = sin(uTime * 2.8 + aPhase * 1.5) * 0.3 + 0.7;
          float flicker = flicker1 * flicker2;

          vOpacity = 0.3 + aCoreFactor * 0.7 * flicker;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (0.8 + aCoreFactor * 0.7) * flicker * (250.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        
        varying float vCoreFactor;
        varying float vOpacity;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          // 柔和光晕
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha = pow(alpha, 1.1);

          // 颜色：核心白热，边缘蓝/黄
          vec3 coreColor = vec3(1.0, 0.98, 0.9);
          vec3 midColor = vec3(0.9, 0.95, 1.0);
          vec3 edgeColor = vec3(0.6, 0.7, 1.0);

          vec3 color;
          if (vCoreFactor > 0.6) {
            color = mix(midColor, coreColor, (vCoreFactor - 0.6) * 2.5);
          } else {
            color = mix(edgeColor, midColor, vCoreFactor / 0.6);
          }

          gl_FragColor = vec4(color, alpha * vOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this._pointsMesh = new THREE.Points(pointsGeo, pointsMat);
    parent.add(this._pointsMesh);
  }

  private _buildDustDisk(parent: THREE.Group): void {
    // 添加尘埃盘效果
    const dustCount = 500;
    const positions = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      const r = 2 + Math.random() * (this._galaxyRadius - 2);
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 0.3;

      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = r * Math.sin(theta);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        precision highp float;
        
        uniform float uTime;
        varying float vOpacity;

        void main() {
          vec3 pos = position;
          // 缓慢旋转
          float angle = uTime * 0.02;
          float x = pos.x * cos(angle) - pos.z * sin(angle);
          float z = pos.x * sin(angle) + pos.z * cos(angle);
          pos.x = x;
          pos.z = z;

          vOpacity = 0.15 + sin(uTime + position.x) * 0.05;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 2.0 * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        
        varying float vOpacity;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(0.8, 0.7, 0.6, alpha * vOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const dust = new THREE.Points(geo, mat);
    parent.add(dust);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);

    // 更新 shader 时间
    if (this._uniforms) {
      this._uniforms.uTime.value = this._time;
    }

    // 更新核心 shader
    if (this._coreMesh?.material instanceof THREE.ShaderMaterial) {
      (this._coreMesh.material.uniforms as any).uTime.value = this._time;
    }

    if (this._haloMesh?.material instanceof THREE.ShaderMaterial) {
      (this._haloMesh.material.uniforms as any).uTime.value = this._time;
    }

    // 整体旋转
    if (this._galaxyGroup) {
      this._galaxyGroup.rotation.z += deltaTime * 0.03;
    }
  }

  dispose(): void {
    this._coreMesh?.geometry.dispose();
    (this._coreMesh?.material as THREE.ShaderMaterial)?.dispose();
    this._haloMesh?.geometry.dispose();
    (this._haloMesh?.material as THREE.ShaderMaterial)?.dispose();
    this._pointsMesh?.geometry.dispose();
    (this._pointsMesh?.material as THREE.ShaderMaterial)?.dispose();
    super.dispose();
  }
}

export default SpiralGalaxySprite;
