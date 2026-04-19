/**
 * DarkMatterNodeSprite — 暗物质节点
 * 表现：不可见的引力异常区，通过透镜扭曲效果和微弱的热辐射可见
 *       中心有一个引力透镜扭曲环（爱因斯坦环）
 *       周围有多层半透明扭曲球面
 *
 * 适用文明等级：Tier 4 (宇宙网)
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface DarkMatterNodeConfig extends CelestialSpriteConfig {
  /** 节点半径 (默认 4) */
  radius?: number;
  /** 透镜环半径系数 (默认 1.5) */
  lensRingScale?: number;
  /** 扭曲强度 (0-1, 默认 0.5) */
  distortionStrength?: number;
  /** 热辐射颜色 */
  glowColor?: string;
}

export default class DarkMatterNodeSprite extends CelestialSprite {
  private _nodeRadius: number;
  private _lensRingScale: number;
  private _distortionStrength: number;
  private _glowColor: THREE.Color;
  private _distortionMesh?: THREE.Mesh;
  private _lensRings: THREE.Mesh[] = [];

  constructor(config: DarkMatterNodeConfig = {}) {
    super(config);
    this._nodeRadius = config.radius ?? 4;
    this._lensRingScale = config.lensRingScale ?? 1.5;
    this._distortionStrength = config.distortionStrength ?? 0.5;
    this._glowColor = new THREE.Color(config.glowColor ?? '#ff6600');
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
    this._buildCore(group);
    this._buildLensRings(group);
    this._buildDistortionField(group);
    this._buildGlowHalo(group);
  }

  private _buildCore(parent: THREE.Group): void {
    const coreGeo = new THREE.SphereGeometry(this._nodeRadius * 0.3, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.95,
    });
    parent.add(new THREE.Mesh(coreGeo, coreMat));
  }

  private _buildLensRings(parent: THREE.Group): void {
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const ringRadius = this._nodeRadius * (1.2 + i * 0.35);
      const geo = new THREE.RingGeometry(ringRadius * 0.95, ringRadius * 1.05, 64);

      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0.15 - i * 0.03 },
          uColor: { value: new THREE.Color(0x8844ff) },
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
            float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
            float pulse = 0.7 + 0.3 * sin(uTime * 3.0 + angle * 4.0);
            float alpha = uOpacity * pulse;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      });

      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      ring.rotation.z = (Math.random() - 0.5) * 0.3;
      parent.add(ring);
      this._lensRings.push(ring);
    }
  }

  private _buildDistortionField(parent: THREE.Group): void {
    const geo = new THREE.SphereGeometry(
      this._nodeRadius * this._lensRingScale,
      32, 32
    );

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uDistortion: { value: this._distortionStrength },
        uColor: { value: new THREE.Color(0x330066) },
      },
      vertexShader: `
        precision highp float;
        uniform float uTime;
        uniform float uDistortion;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          float wave = sin(position.x * 3.0 + uTime * 1.5) *
                       sin(position.y * 3.0 + uTime * 2.0) *
                       sin(position.z * 3.0 + uTime * 1.8) * uDistortion * 0.15;
          vec3 displaced = position + normal * wave;
          vPosition = displaced;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
          float alpha = fresnel * 0.2 * (0.8 + 0.2 * sin(uTime * 2.0));
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });

    this._distortionMesh = new THREE.Mesh(geo, mat);
    parent.add(this._distortionMesh);
  }

  private _buildGlowHalo(parent: THREE.Group): void {
    const glowGeo = new THREE.SphereGeometry(this._nodeRadius * 0.8, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this._glowColor,
      transparent: true,
      opacity: 0.15,
    });
    parent.add(new THREE.Mesh(glowGeo, glowMat));

    const outerGeo = new THREE.SphereGeometry(this._nodeRadius * 1.2, 16, 16);
    const outerMat = new THREE.MeshBasicMaterial({
      color: this._glowColor.clone().multiplyScalar(0.5),
      transparent: true,
      opacity: 0.05,
    });
    parent.add(new THREE.Mesh(outerGeo, outerMat));
  }

  update(dt: number): void {
    super.update(dt);

    if (this._distortionMesh) {
      const mat = this._distortionMesh.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = this._time;
    }

    for (const ring of this._lensRings) {
      const mat = ring.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = this._time;
    }

    if (this._object3D) {
      this._object3D.rotation.y += dt * 0.04;
      this._object3D.rotation.x += dt * 0.02;
    }
  }

  dispose(): void {
    super.dispose();
    if (this._distortionMesh) {
      this._distortionMesh.geometry.dispose();
      (this._distortionMesh.material as THREE.Material).dispose();
    }
    for (const ring of this._lensRings) {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    }
    this._lensRings = [];
  }
}
