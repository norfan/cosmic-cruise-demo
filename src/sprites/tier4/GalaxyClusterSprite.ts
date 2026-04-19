/**
 * GalaxyClusterSprite — 星系团
 * 表现：多个星系（椭圆/螺旋）聚集在一个引力束缚的系统中
 *       每个子星系自带旋转，周围有共同的暗物质晕光晕
 *
 * 适用文明等级：Tier 4 (宇宙网)
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface GalaxyClusterSpriteConfig extends CelestialSpriteConfig {
  /** 星系数量 (默认 8) */
  galaxyCount?: number;
  /** 团半径 (默认 20) */
  clusterRadius?: number;
  /** 中心亮度 */
  coreBrightness?: number;
  /** 暗物质晕半径系数 */
  haloScale?: number;
}

export default class GalaxyClusterSprite extends CelestialSprite {
  private _galaxyCount: number;
  private _clusterRadius: number;
  private _coreBrightness: number;
  private _haloScale: number;
  private _subGalaxies: THREE.Group[] = [];
  private _haloMesh?: THREE.Mesh;

  constructor(config: GalaxyClusterSpriteConfig = {}) {
    super(config);
    this._galaxyCount = config.galaxyCount ?? 8;
    this._clusterRadius = config.clusterRadius ?? 20;
    this._coreBrightness = config.coreBrightness ?? 0.5;
    this._haloScale = config.haloScale ?? 2.5;
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
    // ── 1. 暗物质晕光晕 ────────────────────────────
    this._buildDarkMatterHalo(group);

    // ── 2. 子星系群 ────────────────────────────────
    this._buildSubGalaxies(group);

    // ── 3. 团中心光晕 ──────────────────────────────
    this._buildCoreGlow(group);
  }

  private _buildDarkMatterHalo(parent: THREE.Group): void {
    const haloGeo = new THREE.SphereGeometry(
      this._clusterRadius * this._haloScale,
      32, 32
    );
    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x1a0533) },
        uOpacity: { value: 0.15 },
      },
      vertexShader: `
        precision highp float;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vPosition;

        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        }

        void main() {
          float fresnel = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          fresnel = pow(fresnel, 2.0);
          float n = noise(vPosition * 0.5 + uTime * 0.05);
          float alpha = fresnel * uOpacity * (0.8 + n * 0.4);
          gl_FragColor = vec4(uColor + n * 0.1, alpha);
        }
      `,
    });

    const halo = new THREE.Mesh(haloGeo, haloMat);
    parent.add(halo);
    this._haloMesh = halo;
  }

  private _buildSubGalaxies(parent: THREE.Group): void {
    const colors = [0x4488ff, 0xff6644, 0xffdd44, 0x88ffaa, 0xff44aa, 0x44ffff, 0xaa88ff, 0xffffff];

    for (let i = 0; i < this._galaxyCount; i++) {
      const galaxy = new THREE.Group();

      // 随机位置（球形分布）
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = this._clusterRadius * (0.2 + Math.random() * 0.7);
      galaxy.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) * 0.3,
        r * Math.cos(phi)
      );

      const size = 1.0 + Math.random() * 2.0;
      galaxy.scale.setScalar(size);

      const color = colors[i % colors.length];
      galaxy.add(this._createMiniGalaxy(color));

      galaxy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      parent.add(galaxy);
      this._subGalaxies.push(galaxy);
    }
  }

  private _createMiniGalaxy(color: number): THREE.Mesh {
    const geo = new THREE.SphereGeometry(1, 16, 16);
    geo.scale(1, 0.15, 1);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
    });
    return new THREE.Mesh(geo, mat);
  }

  private _buildCoreGlow(parent: THREE.Group): void {
    const coreGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: this._coreBrightness,
    });
    parent.add(new THREE.Mesh(coreGeo, coreMat));

    const glowGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x8866ff,
      transparent: true,
      opacity: this._coreBrightness * 0.4,
    });
    parent.add(new THREE.Mesh(glowGeo, glowMat));
  }

  update(dt: number): void {
    super.update(dt);

    if (this._haloMesh) {
      const mat = this._haloMesh.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = this._time;
    }

    for (const galaxy of this._subGalaxies) {
      galaxy.rotation.y += dt * 0.05;
      galaxy.rotation.x += dt * 0.02;
    }

    if (this._object3D) {
      this._object3D.rotation.y += dt * 0.02;
    }
  }

  dispose(): void {
    super.dispose();
    this._subGalaxies = [];
  }
}
