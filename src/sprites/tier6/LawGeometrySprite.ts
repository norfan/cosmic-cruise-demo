/**
 * LawGeometrySprite — 法则几何
 * 表现：宇宙运行法则的几何形态具现化
 *       神圣几何（正多面体嵌套）+ 能量线条 + 旋转晶格
 *       每一层以不同速度旋转，形成复杂的空间图案
 *
 * 适用文明等级：Tier 6 (创世)
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface LawGeometrySpriteConfig extends CelestialSpriteConfig {
  nestingLevels?: number;    // 嵌套层数
  edgeGlow?: number;         // 边缘辉光强度
  spinSpeed?: number;        // 旋转速度倍率
}

// ── Shader ──────────────────────────────────────────────
const wireVertGLSL = /* glsl */ `
  precision highp float;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const wireFragGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3  uColor;
  uniform float uAlpha;
  varying vec3  vNormal;
  varying vec3  vWorldPos;

  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 3.0);
    float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
    float brightness = 0.7 + fresnel * 0.5 + pulse * 0.2;
    gl_FragColor = vec4(uColor * brightness, uAlpha * brightness);
  }
`;

// ── Class ───────────────────────────────────────────────
export default class LawGeometrySprite extends CelestialSprite {
  private _nestingLevels: number;
  // _edgeGlow 预留配置
  private _spinSpeed: number;

  private _layers: THREE.Group[] = [];
  private _layerUniforms: Record<string, THREE.IUniform>[] = [];
  private _energyLines?: THREE.LineSegments;
  private _mandalaGroup?: THREE.Group;

  constructor(config: LawGeometrySpriteConfig = {}) {
    super(config);
    this._nestingLevels = config.nestingLevels ?? 5;
    this._spinSpeed = config.spinSpeed ?? 1.0;
  }

  mount(scene: THREE.Scene, config: CelestialSpriteConfig = {}): void {
    this._scene = scene;
    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));
    if (config.scale) group.scale.setScalar(config.scale);
    this._build(group);
    this._object3D = group;
    scene.add(group);
  }

  protected _build(parent: THREE.Group): void {
    this._buildNestedPolyhedra(parent);
    this._buildMandala(parent);
    this._buildEnergyGrid(parent);
    this._buildOrbitalRings(parent);
  }

  private _buildNestedPolyhedra(parent: THREE.Group): void {
    // 五种柏拉图立体：正四、正六、正八、正十二、正二十面体
    const polyhedraTypes = [
      () => new THREE.TetrahedronGeometry(1, 0),
      () => new THREE.BoxGeometry(1.8, 1.8, 1.8),
      () => new THREE.OctahedronGeometry(1.15, 0),
      () => new THREE.DodecahedronGeometry(0.9, 0),
      () => new THREE.IcosahedronGeometry(1.1, 0),
    ];

    for (let i = 0; i < this._nestingLevels; i++) {
      const scale = 1.6 + i * 2.0;
      const hue = i / this._nestingLevels;
      const color = new THREE.Color().setHSL(hue, 1.0, 0.65);

      const layer = new THREE.Group();
      const uniforms: Record<string, THREE.IUniform> = {
        uTime: { value: 0 },
        uColor: { value: color },
        uAlpha: { value: 0.75 - i * 0.1 },
      };
      this._layerUniforms.push(uniforms);

      const mat = new THREE.ShaderMaterial({
        vertexShader: wireVertGLSL,
        fragmentShader: wireFragGLSL,
        uniforms,
        transparent: true,
        side: THREE.FrontSide,
        wireframe: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const geoFn = polyhedraTypes[i % polyhedraTypes.length];
      const geo = geoFn();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.setScalar(scale);
      layer.add(mesh);

      // 同层第二个多面体反向旋转
      const mat2 = mat.clone();
      mat2.uniforms = {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color().setHSL(hue + 0.5, 1.0, 0.65) },
        uAlpha: { value: 0.45 - i * 0.07 },
      };
      const geoFn2 = polyhedraTypes[(i + 2) % polyhedraTypes.length];
      const mesh2 = new THREE.Mesh(geoFn2(), mat2);
      mesh2.scale.setScalar(scale * 1.1);
      layer.add(mesh2);

      parent.add(layer);
      this._layers.push(layer);
    }
  }

  private _buildMandala(parent: THREE.Group): void {
    const group = new THREE.Group();
    const ringCount = 8;

    for (let i = 0; i < ringCount; i++) {
      const r = 1.8 + i * 2.2;
      const segments = 12 + i * 4;
      const geo = new THREE.TorusGeometry(r, 0.04, 4, segments);
      const hue = (i / ringCount);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue, 1.0, 0.7),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        wireframe: true,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = (Math.PI / 2) + (i * Math.PI / ringCount) * 0.5;
      ring.rotation.z = i * Math.PI / ringCount;
      group.add(ring);
    }

    parent.add(group);
    this._mandalaGroup = group;
  }

  private _buildEnergyGrid(parent: THREE.Group): void {
    const linePositions: number[] = [];
    const lineColors: number[] = [];

    // 从每个顶点向中心的能量线
    const icosaGeo = new THREE.IcosahedronGeometry(12, 1);
    const positions = icosaGeo.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      linePositions.push(x, y, z, 0, 0, 0);
      const hue = (i / positions.count);
      const c = new THREE.Color().setHSL(hue, 1.0, 0.8);
      lineColors.push(c.r, c.g, c.b, c.r * 0.5, c.g * 0.5, c.b * 0.5);
    }

    icosaGeo.dispose();

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(lineColors), 3));

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });

    this._energyLines = new THREE.LineSegments(lineGeo, lineMat);
    parent.add(this._energyLines);
  }

  private _buildOrbitalRings(parent: THREE.Group): void {
    // 三组相互垂直的大圆环
    const orbits = [
      { x: 0, y: 0, z: 0 },
      { x: Math.PI / 2, y: 0, z: 0 },
      { x: 0, y: 0, z: Math.PI / 2 },
    ];

    orbits.forEach((rot, i) => {
      const geo = new THREE.TorusGeometry(10 + i, 0.08, 4, 120);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(i * 0.33, 1.0, 0.7),
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.set(rot.x, rot.y, rot.z);
      parent.add(ring);
    });
  }

  update(dt: number): void {
    super.update(dt);

    // 每层独立旋转速度和方向
    const spinSpeeds = [0.4, -0.25, 0.18, -0.15, 0.12];
    this._layers.forEach((layer, i) => {
      layer.rotation.y += dt * spinSpeeds[i % spinSpeeds.length] * this._spinSpeed;
      layer.rotation.x += dt * spinSpeeds[(i + 1) % spinSpeeds.length] * 0.4 * this._spinSpeed;
      layer.rotation.z += dt * spinSpeeds[(i + 2) % spinSpeeds.length] * 0.2 * this._spinSpeed;

      // 更新子 shader uniforms
      layer.children.forEach((mesh) => {
        const mat = (mesh as THREE.Mesh).material as THREE.ShaderMaterial;
        if (mat.uniforms?.uTime) mat.uniforms.uTime.value = this._time;
      });
    });

    // 曼陀罗旋转
    if (this._mandalaGroup) {
      this._mandalaGroup.rotation.y += dt * 0.15 * this._spinSpeed;
      this._mandalaGroup.children.forEach((ring, i) => {
        ring.rotation.z += dt * (0.1 + i * 0.02) * (i % 2 === 0 ? 1 : -1) * this._spinSpeed;
        const pulse = Math.sin(this._time * 2.0 + i * 0.5) * 0.5 + 0.5;
        ((ring as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.3 + pulse * 0.4;
      });
    }

    // 能量线脉冲
    if (this._energyLines) {
      const pulse = Math.sin(this._time * 3.0) * 0.5 + 0.5;
      (this._energyLines.material as THREE.LineBasicMaterial).opacity = 0.3 + pulse * 0.4;
      this._energyLines.rotation.y += dt * 0.1;
    }
  }

  dispose(): void {
    this._layers.forEach((layer) => {
      layer.children.forEach((mesh) => {
        (mesh as THREE.Mesh).geometry.dispose();
        ((mesh as any).material as THREE.ShaderMaterial)?.dispose();
      });
    });
    this._mandalaGroup?.children.forEach((r) => {
      (r as THREE.Mesh).geometry.dispose();
      ((r as any).material as THREE.MeshBasicMaterial)?.dispose();
    });
    this._energyLines?.geometry.dispose();
    ((this._energyLines as any)?.material as THREE.LineBasicMaterial)?.dispose();
    super.dispose();
  }
}
