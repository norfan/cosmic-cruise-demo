/**
 * RockyPlanetSprite - 类地行星精灵基类
 *
 * 支持子类：水星、金星、地球(远景)、火星
 * 提供程序化岩石纹理 + 大气层可选
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface RockyPlanetSpriteConfig extends CelestialSpriteConfig {
  /** 行星半径 */
  radius?: number;
  /** 表面主色 */
  baseColor?: string;
  /** 高地/山脉颜色 */
  highlandColor?: string;
  /** 是否显示大气层 */
  showAtmosphere?: boolean;
}

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
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.5);
    gl_FragColor = vec4(uColor, fresnel * uIntensity);
  }
`;

export class RockyPlanetSprite extends CelestialSprite {
  private _showAtmosphere: boolean;
  private _atmMesh?: THREE.Mesh;

  constructor(config: RockyPlanetSpriteConfig = {}) {
    super({ tier: 2, name: 'RockyPlanetSprite', ...config });
    this._showAtmosphere = config.showAtmosphere ?? false;
  }

  mount(scene: THREE.Scene, config: RockyPlanetSpriteConfig = {}): void {
    this._scene = scene;

    const r = config.radius ?? this._radius;
    const showAtm = config.showAtmosphere ?? this._showAtmosphere;

    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));

    const tex = this.createPlanetTexture(512, {
      base: config.baseColor ?? '#8B7355',
      highland: config.highlandColor ?? '#A08060',
    });
    const mat = this.trackMaterial(
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.05 })
    );
    const mesh = new THREE.Mesh(this.trackGeometry(new THREE.SphereGeometry(r, 32, 32)), mat);
    group.add(mesh);

    if (showAtm) {
      const atmMat = this.trackMaterial(
        new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(0x88aacc) }, uIntensity: { value: 0.8 } },
          vertexShader: atmosphereVertShader,
          fragmentShader: atmosphereFragShader,
          transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      this._atmMesh = new THREE.Mesh(this.trackGeometry(new THREE.SphereGeometry(r * 1.06, 32, 32)), atmMat);
      group.add(this._atmMesh);
    }

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  protected createPlanetTexture(
    size: number,
    colors: { base: string; highland: string }
  ): THREE.CanvasTexture {
    return this.createCanvasTexture(size, (ctx, w, h) => {
      ctx.fillStyle = colors.base;
      ctx.fillRect(0, 0, w, h);

      // 随机高地色块
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const rw = 20 + Math.random() * 60;
        const rh = 10 + Math.random() * 30;
        ctx.fillStyle = colors.highland;
        ctx.beginPath();
        ctx.ellipse(x, y, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }

      // 陨石坑
      for (let i = 0; i < 25; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const cr = 3 + Math.random() * 15;
        const craterGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        craterGrad.addColorStop(0, 'rgba(60,50,40,0.5)');
        craterGrad.addColorStop(1, 'rgba(80,70,60,0)');
        ctx.fillStyle = craterGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

export default RockyPlanetSprite;
