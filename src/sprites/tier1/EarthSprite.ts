/**
 * EarthSprite - 地球精灵（Tier 1）
 *
 * 三层结构：
 *   1. 地球本体 —— 程序化纹理（陆地/海洋色块）+ MeshPhysicalMaterial
 *   2. 云层 ——— 半透明白色球壳，UV 滚动模拟云流动
 *   3. 大气层 —— Fresnel ShaderMaterial，边缘发蓝光
 *
 * 动效：
 *   - 地球自转（Y 轴）
 *   - 云层稍快自转
 *   - 大气层始终朝向相机（billboarding 不需要，BackSide 自动处理）
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface EarthSpriteConfig extends CelestialSpriteConfig {
  /** 地球半径（默认 2.5） */
  radius?: number;
  /** 自转速度（弧度/秒，默认 0.05） */
  rotationSpeed?: number;
  /** 是否显示云层（默认 true） */
  showClouds?: boolean;
  /** 是否显示大气层（默认 true） */
  showAtmosphere?: boolean;
}

// ── Fresnel 大气层着色器 ────────────────────

const atmosphereVertShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const atmosphereFragShader = /* glsl */ `
  uniform vec3 uAtmosphereColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.5);
    gl_FragColor = vec4(uAtmosphereColor, fresnel * uIntensity);
  }
`;

export class EarthSprite extends CelestialSprite {
  private _cloudMesh!: THREE.Mesh;
  private _cloudOffset: number = 0;

  constructor(config: EarthSpriteConfig = {}) {
    super({ tier: 1, name: 'EarthSprite', ...config });
    this._radius = config.radius ?? 2.5;
    this._rotationSpeed = config.rotationSpeed ?? 0.05;
  }

  mount(scene: THREE.Scene, config: EarthSpriteConfig = {}): void {
    this._scene = scene;

    const r = config.radius ?? this._radius;
    const showClouds = config.showClouds ?? true;
    const showAtmosphere = config.showAtmosphere ?? true;

    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));

    // ── 1. 地球纹理（程序化） ───────────────────
    const earthTex = this._createEarthTexture(512);

    const earthMat = this.trackMaterial(
      new THREE.MeshPhysicalMaterial({
        map: earthTex,
        roughness: 0.75,
        metalness: 0.0,
        clearcoat: 0.15,
        clearcoatRoughness: 0.4,
      })
    );
    const earthMesh = new THREE.Mesh(
      this.trackGeometry(new THREE.SphereGeometry(r, 48, 48)),
      earthMat
    );
    earthMesh.castShadow = true;
    group.add(earthMesh);

    // ── 2. 云层 ─────────────────────────────────
    if (showClouds) {
      const cloudTex = this._createCloudTexture(512);
      const cloudMat = this.trackMaterial(
        new THREE.MeshPhongMaterial({
          map: cloudTex,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        })
      );
      this._cloudMesh = new THREE.Mesh(
        this.trackGeometry(new THREE.SphereGeometry(r * 1.018, 48, 48)),
        cloudMat
      );
      group.add(this._cloudMesh);
    }

    // ── 3. Fresnel 大气层 ───────────────────────
    if (showAtmosphere) {
      const atmMat = this.trackMaterial(
        new THREE.ShaderMaterial({
          uniforms: {
            uAtmosphereColor: { value: new THREE.Color(0x88ccff) },
            uIntensity: { value: 1.2 },
          },
          vertexShader: atmosphereVertShader,
          fragmentShader: atmosphereFragShader,
          transparent: true,
          depthWrite: false,
          side: THREE.FrontSide,
          blending: THREE.AdditiveBlending,
        })
      );
      const atmMesh = new THREE.Mesh(
        this.trackGeometry(new THREE.SphereGeometry(r * 1.06, 48, 48)),
        atmMat
      );
      group.add(atmMesh);
    }

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  update(deltaTime: number): void {
    super.update(deltaTime); // 处理自转 + 轨道

    // 云层额外加速自转
    if (this._cloudMesh) {
      this._cloudOffset += deltaTime * this._rotationSpeed * 1.15;
      this._cloudMesh.rotation.y = this._cloudOffset;
    }
  }

  // ─── 纹理生成 ────────────────────────────────

  private _createEarthTexture(size: number): THREE.CanvasTexture {
    return this.createCanvasTexture(size, (ctx, w, h) => {
      // 海洋底色
      ctx.fillStyle = '#1a5f9e';
      ctx.fillRect(0, 0, w, h);

      // 简化陆地形状（多边形色块模拟大陆）
      const landMasses = [
        // 欧亚大陆
        { x: 0.52, y: 0.28, rx: 0.22, ry: 0.14 },
        // 非洲
        { x: 0.5, y: 0.48, rx: 0.09, ry: 0.17 },
        // 北美
        { x: 0.2, y: 0.3, rx: 0.12, ry: 0.14 },
        // 南美
        { x: 0.27, y: 0.56, rx: 0.07, ry: 0.15 },
        // 澳洲
        { x: 0.77, y: 0.58, rx: 0.08, ry: 0.08 },
        // 南极
        { x: 0.5, y: 0.92, rx: 0.28, ry: 0.06 },
      ];

      ctx.fillStyle = '#2e8b57';
      landMasses.forEach(({ x, y, rx, ry }) => {
        ctx.beginPath();
        ctx.ellipse(x * w, y * h, rx * w, ry * h, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // 极地冰盖
      ctx.fillStyle = '#ddeeff';
      ctx.beginPath();
      ctx.ellipse(w / 2, 0, w * 0.25, h * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w / 2, h, w * 0.3, h * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private _createCloudTexture(size: number): THREE.CanvasTexture {
    return this.createCanvasTexture(size, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0)';
      ctx.fillRect(0, 0, w, h);

      // 随机云团
      const cloudCount = 30;
      for (let i = 0; i < cloudCount; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const rw = 20 + Math.random() * 60;
        const rh = 8 + Math.random() * 20;
        const alpha = 0.4 + Math.random() * 0.5;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rw);
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

export default EarthSprite;
