/**
 * PulsarSprite - 脉冲星精灵（Tier 3）
 *
 * 视觉效果：
 *   - 高速旋转的中子星核心（带 shader 光晕）
 *   - 两极束流（光柱 shader）
 *   - 脉冲环（随旋转明暗变化的 shader 效果）
 *   - 强烈的蓝白光芒
 *
 * 使用自定义 Shader 实现流畅的脉冲和光柱效果
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface PulsarSpriteConfig extends CelestialSpriteConfig {
  /** 脉冲周期（秒，默认 1.0） */
  period?: number;
  /** 核心半径（默认 0.3） */
  coreRadius?: number;
  /** 束流长度（默认 8） */
  beamLength?: number;
}

export class PulsarSprite extends CelestialSprite {
  readonly category = 'celestial' as const;

  private _period: number;
  private _coreRadius: number;
  private _beamLength: number;

  private _coreMesh?: THREE.Mesh;
  private _coreHalo?: THREE.Mesh;
  private _beamMesh?: THREE.Mesh;
  private _beamMesh2?: THREE.Mesh;
  private _pulseRings!: THREE.Mesh[];
  private _coreGroup!: THREE.Group;
  private _coreUniforms!: Record<string, THREE.IUniform>;
  private _beamUniforms!: Record<string, THREE.IUniform>;

  constructor(config: PulsarSpriteConfig = {}) {
    super({ tier: 3, name: 'PulsarSprite', ...config });
    this._period = config.period ?? 1.0;
    this._coreRadius = config.coreRadius ?? 0.3;
    this._beamLength = config.beamLength ?? 8;
  }

  mount(scene: THREE.Scene, config: PulsarSpriteConfig = {}): void {
    this._scene = scene;

    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));

    this._coreGroup = group;

    // ── 中子星核心（带 shader）────────────────────────────
    this._buildCore(group);

    // ── 脉冲环（赤道盘）─────────────────────────────────
    this._buildPulseRings(group);

    // ── 极轴光柱 ───────────────────────────────────────
    this._buildBeams(group);

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  private _buildCore(parent: THREE.Group): void {
    // 核心球体
    const coreGeo = new THREE.SphereGeometry(this._coreRadius, 32, 32);
    this._coreUniforms = {
      uTime: { value: 0 },
      uPeriod: { value: this._period },
    };

    const coreMat = new THREE.ShaderMaterial({
      uniforms: this._coreUniforms,
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
        uniform float uPeriod;

        varying vec3 vNormal;

        void main() {
          // 脉冲效果
          float pulse = sin(uTime * 6.28 / uPeriod) * 0.5 + 0.5;
          pulse = pow(pulse, 0.5);

          // Fresnel
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);

          // 颜色：蓝白
          vec3 coreColor = vec3(0.9, 0.95, 1.0);
          vec3 edgeColor = vec3(0.3, 0.6, 1.0);

          vec3 color = mix(edgeColor, coreColor, fresnel);
          float intensity = 0.7 + fresnel * 0.5 + pulse * 0.3;

          gl_FragColor = vec4(color * intensity, intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this._coreMesh = new THREE.Mesh(coreGeo, coreMat);
    parent.add(this._coreMesh);

    // 核心光晕
    const haloGeo = new THREE.SphereGeometry(this._coreRadius * 3, 32, 32);
    const haloMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPeriod: { value: this._period },
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
        uniform float uPeriod;
        varying vec3 vNormal;

        void main() {
          float pulse = sin(uTime * 6.28 / uPeriod) * 0.5 + 0.5;
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          vec3 color = vec3(0.2, 0.5, 1.0);
          gl_FragColor = vec4(color, intensity * (0.3 + pulse * 0.4));
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this._coreHalo = new THREE.Mesh(haloGeo, haloMat);
    parent.add(this._coreHalo);
  }

  private _buildPulseRings(parent: THREE.Group): void {
    this._pulseRings = [];
    const ringRadii = [0.8, 1.5, 2.5, 4.0];

    ringRadii.forEach((radius, i) => {
      const geo = new THREE.RingGeometry(radius - 0.15, radius + 0.15, 64);
      const uniforms = {
        uTime: { value: 0 },
        uPeriod: { value: this._period },
        uRadius: { value: radius },
        uPhase: { value: i * 0.25 },
      };

      const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */ `
          precision highp float;
          
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          
          uniform float uTime;
          uniform float uPeriod;
          uniform float uRadius;
          uniform float uPhase;

          varying vec2 vUv;

          void main() {
            float pulse = sin(uTime * 6.28 / uPeriod + uPhase) * 0.5 + 0.5;
            pulse = pow(pulse, 0.3);

            // 颜色：青色到蓝色
            vec3 color = mix(vec3(0.0, 0.6, 1.0), vec3(0.3, 0.9, 1.0), pulse);

            float alpha = (0.15 - abs(vUv.y - 0.5) * 0.2) * (0.3 + pulse * 0.7);
            alpha = max(alpha, 0.0);

            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2;
      parent.add(ring);
      this._pulseRings.push(ring);
    });
  }

  private _buildBeams(parent: THREE.Group): void {
    // 使用平面模拟光柱（带 shader）
    const beamWidth = 0.6;

    this._beamUniforms = {
      uTime: { value: 0 },
      uPeriod: { value: this._period },
      uBeamLength: { value: this._beamLength },
    };

    // 光柱 shader
    const beamVertShader = /* glsl */ `
      precision highp float;
      
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const beamFragShader = /* glsl */ `
      precision highp float;
      
      uniform float uTime;
      uniform float uPeriod;
      uniform float uBeamLength;

      varying vec2 vUv;

      void main() {
        // 脉冲
        float pulse = sin(uTime * 6.28 / uPeriod) * 0.5 + 0.5;
        pulse = pow(pulse, 0.3);

        // 沿光柱的渐变（头部更亮）
        float lengthFade = 1.0 - vUv.y;
        lengthFade = pow(lengthFade, 0.5);

        // 宽度渐变（中心亮，边缘暗）
        float widthFade = 1.0 - abs(vUv.x - 0.5) * 2.0;
        widthFade = pow(widthFade, 0.3);

        // 流动效果
        float flow = sin(vUv.y * 20.0 - uTime * 3.0) * 0.2 + 0.8;

        float alpha = lengthFade * widthFade * pulse * flow * 0.6;
        vec3 color = vec3(0.4, 0.8, 1.0);

        gl_FragColor = vec4(color, alpha);
      }
    `;

    // 上方光柱
    const beamGeo1 = new THREE.PlaneGeometry(beamWidth, this._beamLength, 1, 8);
    const beamMat1 = new THREE.ShaderMaterial({
      uniforms: this._beamUniforms,
      vertexShader: beamVertShader,
      fragmentShader: beamFragShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this._beamMesh = new THREE.Mesh(beamGeo1, beamMat1);
    this._beamMesh.position.y = this._beamLength / 2 + this._coreRadius;
    parent.add(this._beamMesh);

    // 下方光柱
    const beamGeo2 = new THREE.PlaneGeometry(beamWidth, this._beamLength, 1, 8);
    const beamMat2 = new THREE.ShaderMaterial({
      uniforms: { ...this._beamUniforms },
      vertexShader: beamVertShader,
      fragmentShader: beamFragShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this._beamMesh2 = new THREE.Mesh(beamGeo2, beamMat2);
    this._beamMesh2.position.y = -this._beamLength / 2 - this._coreRadius;
    this._beamMesh2.rotation.z = Math.PI;
    parent.add(this._beamMesh2);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);

    if (!this._coreGroup) return;

    // 更新 shader 时间
    if (this._coreUniforms) {
      this._coreUniforms.uTime.value = this._time;
    }
    if (this._beamUniforms) {
      this._beamUniforms.uTime.value = this._time;
    }

    // 更新核心光晕
    if (this._coreHalo?.material instanceof THREE.ShaderMaterial) {
      (this._coreHalo.material.uniforms as any).uTime.value = this._time;
    }

    // 更新脉冲环
    this._pulseRings.forEach((ring) => {
      if (ring.material instanceof THREE.ShaderMaterial) {
        (ring.material.uniforms as any).uTime.value = this._time;
      }
    });

    // 高速自转
    this._coreGroup.rotation.y += deltaTime * 2.5;
    this._coreGroup.rotation.x += deltaTime * 0.2;
  }

  dispose(): void {
    this._coreMesh?.geometry.dispose();
    (this._coreMesh?.material as THREE.ShaderMaterial)?.dispose();
    this._coreHalo?.geometry.dispose();
    (this._coreHalo?.material as THREE.ShaderMaterial)?.dispose();
    this._beamMesh?.geometry.dispose();
    (this._beamMesh?.material as THREE.ShaderMaterial)?.dispose();
    this._beamMesh2?.geometry.dispose();
    (this._beamMesh2?.material as THREE.ShaderMaterial)?.dispose();
    this._pulseRings.forEach((ring) => {
      ring.geometry.dispose();
      (ring.material as THREE.ShaderMaterial)?.dispose();
    });
    super.dispose();
  }
}

export default PulsarSprite;
