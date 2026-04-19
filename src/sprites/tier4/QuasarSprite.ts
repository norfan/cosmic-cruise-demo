/**
 * QuasarSprite — 类星体
 * 表现：宇宙中最亮的持续天体之一，中心超大质量黑洞吸积盘
 *       强烈的蓝白色光芒，两极高速喷流
 *       巨大的光变效应，周期性能量爆发
 *
 * 适用文明等级：Tier 4 / Tier 5 (极端天体)
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface QuasarSpriteConfig extends CelestialSpriteConfig {
  /** 吸积盘半径 (默认 6) */
  diskRadius?: number;
  /** 喷流长度 (默认 25) */
  jetLength?: number;
  /** 亮度等级 (0-1, 默认 0.8) */
  brightness?: number;
  /** 喷流颜色 */
  jetColor?: string;
}

export default class QuasarSprite extends CelestialSprite {
  private _diskRadius: number;
  private _jetLength: number;
  private _brightness: number;
  private _jetColor: THREE.Color;
  private _jets: THREE.Mesh[] = [];
  private _burstTimer: number = 0;

  constructor(config: QuasarSpriteConfig = {}) {
    super(config);
    this._diskRadius = config.diskRadius ?? 6;
    this._jetLength = config.jetLength ?? 25;
    this._brightness = config.brightness ?? 0.8;
    this._jetColor = new THREE.Color(config.jetColor ?? '#00ccff');
  }

  mount(scene: THREE.Scene, config: CelestialSpriteConfig = {}): void {
    this._scene = scene;
    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));

    this._build(group);

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  private _build(group: THREE.Group): void {
    this._buildBlackHoleCore(group);
    this._buildAccretionDisk(group);
    this._buildJets(group);
    this._buildOuterGlow(group);
  }

  private _buildBlackHoleCore(parent: THREE.Group): void {
    const coreGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    parent.add(new THREE.Mesh(coreGeo, coreMat));
  }

  private _buildAccretionDisk(parent: THREE.Group): void {
    const diskLayers = 5;
    for (let i = 0; i < diskLayers; i++) {
      const innerR = this._diskRadius * (0.2 + i * 0.18);
      const outerR = this._diskRadius * (0.3 + i * 0.18);
      const geo = new THREE.RingGeometry(innerR, outerR, 64);

      const t = i / (diskLayers - 1);
      const color = new THREE.Color().lerpColors(
        new THREE.Color(0xffffff),
        new THREE.Color(0xff6600),
        t
      );

      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: (1.0 - t * 0.5) * this._brightness },
          uColor: { value: color },
          uInnerRadius: { value: innerR },
          uOuterRadius: { value: outerR },
        },
        vertexShader: `
          precision highp float;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          uniform float uTime;
          uniform float uOpacity;
          uniform vec3 uColor;
          uniform float uInnerRadius;
          uniform float uOuterRadius;
          varying vec2 vUv;

          void main() {
            vec2 center = vUv - 0.5;
            float angle = atan(center.y, center.x);
            float radius = length(center);
            float rotated = angle + uTime * 2.0 / (radius + 0.1);
            float spiral = sin(rotated * 8.0) * 0.3 + 0.7;
            float alpha = smoothstep(uOuterRadius, uOuterRadius * 0.7, radius) *
                          smoothstep(uInnerRadius * 0.8, uInnerRadius * 1.2, radius);
            float brightness = mix(1.5, 0.8, radius);
            gl_FragColor = vec4(uColor * brightness * spiral, alpha * uOpacity);
          }
        `,
      });

      const disk = new THREE.Mesh(geo, mat);
      disk.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
      disk.rotation.z = (Math.random() - 0.5) * 0.1;
      parent.add(disk);
    }
  }

  private _buildJets(parent: THREE.Group): void {
    const jetColors = [
      this._jetColor,
      new THREE.Color(0x0066ff),
      new THREE.Color(0xffffff),
    ];

    for (const dir of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const jetRadius = 0.1 + i * 0.15;
        const jetLength = this._jetLength * (1.0 - i * 0.15);
        const geo = new THREE.CylinderGeometry(jetRadius * 0.3, jetRadius, jetLength, 16, 1, true);
        const mat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: (0.4 - i * 0.1) * this._brightness },
            uColor: { value: jetColors[i] },
          },
          vertexShader: `
            precision highp float;
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            precision highp float;
            uniform float uTime;
            uniform float uOpacity;
            uniform vec3 uColor;
            varying vec2 vUv;

            void main() {
              float flow = sin(vUv.y * 20.0 - uTime * 8.0) * 0.5 + 0.5;
              float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
              edge = pow(edge, 1.5);
              float alpha = edge * uOpacity * (0.6 + flow * 0.4);
              gl_FragColor = vec4(uColor, alpha);
            }
          `,
        });

        const jet = new THREE.Mesh(geo, mat);
        jet.position.y = dir * (this._diskRadius * 0.5 + jetLength / 2);
        jet.rotation.z = Math.PI / 2;
        parent.add(jet);
        this._jets.push(jet);
      }
    }
  }

  private _buildOuterGlow(parent: THREE.Group): void {
    const glowGeo = new THREE.SphereGeometry(this._diskRadius * 3, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.03,
    });
    parent.add(new THREE.Mesh(glowGeo, glowMat));
  }

  update(dt: number): void {
    super.update(dt);
    this._burstTimer += dt;

    // 更新所有 shader uniforms
    this._object3D?.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
        const mat = child.material;
        if (mat.uniforms?.uTime) {
          mat.uniforms.uTime.value = this._time;
        }
      }
    });

    // 能量爆发效果（每5秒一次）
    if (this._burstTimer > 5.0) {
      this._burstTimer = 0;
      this._jets.forEach((jet) => {
        const mat = jet.material as THREE.ShaderMaterial;
        if (mat.uniforms?.uOpacity) {
          const original = mat.uniforms.uOpacity.value;
          mat.uniforms.uOpacity.value = original * 1.5;
          setTimeout(() => {
            mat.uniforms.uOpacity.value = original;
          }, 300);
        }
      });
    }

    if (this._object3D) {
      this._object3D.rotation.y += dt * 0.05;
    }
  }

  dispose(): void {
    super.dispose();
    this._jets.forEach((jet) => {
      jet.geometry.dispose();
      (jet.material as THREE.Material).dispose();
    });
    this._jets = [];
  }
}
