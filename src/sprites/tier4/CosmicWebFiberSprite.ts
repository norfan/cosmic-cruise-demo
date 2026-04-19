/**
 * CosmicWebFiberSprite — 宇宙网纤维
 * 表现：细长的发光丝状结构，连接宇宙中的星系与星系团
 *       纤维由数千个点状节点构成，沿曲线排列
 *       具有微弱的颜色漂移动画，模拟高能气体流动
 *
 * 适用文明等级：Tier 4 (宇宙网)
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface CosmicWebFiberConfig extends CelestialSpriteConfig {
  /** 纤维长度 (默认 30) */
  length?: number;
  /** 纤维曲率强度 (默认 1.0) */
  curvature?: number;
  /** 节点数量 (默认 300) */
  nodeCount?: number;
  /** 主色调 */
  color1?: string;
  /** 辅色调 */
  color2?: string;
  /** 是否闭合（连接首尾） */
  closed?: boolean;
}

export default class CosmicWebFiberSprite extends CelestialSprite {
  private _length: number;
  private _curvature: number;
  private _nodeCount: number;
  private _color1: THREE.Color;
  private _color2: THREE.Color;
  private _closed: boolean;
  private _pointsMesh?: THREE.Points;

  constructor(config: CosmicWebFiberConfig = {}) {
    super(config);
    this._length = config.length ?? 30;
    this._curvature = config.curvature ?? 1.0;
    this._nodeCount = config.nodeCount ?? 300;
    this._color1 = new THREE.Color(config.color1 ?? '#4488ff');
    this._color2 = new THREE.Color(config.color2 ?? '#aa44ff');
    this._closed = config.closed ?? false;
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
    const curve = this._generateCurve();
    this._buildNodes(group, curve);
  }

  private _generateCurve(): THREE.CatmullRomCurve3 {
    const points: THREE.Vector3[] = [];
    const segments = 20;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = (t - 0.5) * this._length;
      const y =
        Math.sin(t * Math.PI * 2 * 1.5) * this._curvature * 2 +
        Math.sin(t * Math.PI * 2 * 3.5) * this._curvature * 0.8 +
        (Math.random() - 0.5) * this._curvature * 0.5;
      const z =
        Math.cos(t * Math.PI * 2 * 2) * this._curvature * 1.5 +
        Math.cos(t * Math.PI * 2 * 4) * this._curvature * 0.5;
      points.push(new THREE.Vector3(x, y, z));
    }

    return new THREE.CatmullRomCurve3(points, this._closed, 'catmullrom', 0.5);
  }

  private _buildNodes(parent: THREE.Group, curve: THREE.CatmullRomCurve3): void {
    const positions = new Float32Array(this._nodeCount * 3);
    const colors = new Float32Array(this._nodeCount * 3);
    const sizes = new Float32Array(this._nodeCount);

    for (let i = 0; i < this._nodeCount; i++) {
      const t = i / (this._nodeCount - 1);
      const pt = curve.getPointAt(Math.max(0, Math.min(1, t)));

      positions[i * 3] = pt.x + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = pt.y + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 0.3;

      const c = this._color1.clone().lerp(this._color2, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      const edgeFade = Math.sin(t * Math.PI);
      sizes[i] = (0.3 + Math.random() * 0.4) * (0.5 + edgeFade * 0.5);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        precision highp float;
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          float pulse = 1.0 + sin(uTime * 2.0 + position.x * 0.5) * 0.15;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z) * pulse;
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = 0.4 + 0.4 * (1.0 - abs(position.x) / 15.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float alpha = (1.0 - d * 2.0) * vAlpha;
          gl_FragColor = vec4(vColor * 1.5, alpha);
        }
      `,
    });

    const points = new THREE.Points(geo, mat);
    parent.add(points);
    this._pointsMesh = points;
  }

  update(dt: number): void {
    super.update(dt);

    if (this._pointsMesh) {
      const mat = this._pointsMesh.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = this._time;
    }

    if (this._object3D) {
      this._object3D.rotation.y += dt * 0.03;
      this._object3D.rotation.x += dt * 0.01;
    }
  }

  dispose(): void {
    super.dispose();
    if (this._pointsMesh) {
      this._pointsMesh.geometry.dispose();
      (this._pointsMesh.material as THREE.Material).dispose();
    }
  }
}
