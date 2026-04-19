/**
 * VenusSprite - 金星精灵（Tier 2）
 *
 * 视觉效果：浓密黄白色云层 + Fresnel 大气光晕
 * 浓厚大气使表面不可见
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface VenusSpriteConfig extends CelestialSpriteConfig {
  radius?: number;
  rotationSpeed?: number;
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
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.0);
    float noise = hash(vNormal.xy * 5.0 + uTime * 0.2);
    float intensity = uIntensity * fresnel * (0.9 + noise * 0.2);
    gl_FragColor = vec4(uColor, intensity);
  }
`;

export class VenusSprite extends CelestialSprite {
  private _cloudMat!: THREE.ShaderMaterial;

  constructor(config: VenusSpriteConfig = {}) {
    super({
      tier: 2, name: 'VenusSprite',
      radius: 0.95,
      rotationSpeed: -0.002, // 金星逆自转
      ...config,
    });
  }

  mount(scene: THREE.Scene, config: VenusSpriteConfig = {}): void {
    this._scene = scene;

    const r = config.radius ?? this._radius;
    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));

    // 金星云层纹理
    this._cloudMat = this.trackMaterial(
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0xF5DEB3) },
          uIntensity: { value: 1.2 },
          uTime: { value: 0 },
        },
        vertexShader: atmosphereVertShader,
        fragmentShader: atmosphereFragShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    ) as THREE.ShaderMaterial;

    const cloudMesh = new THREE.Mesh(
      this.trackGeometry(new THREE.SphereGeometry(r, 48, 48)),
      this._cloudMat
    );
    group.add(cloudMesh);

    // 外层大气光晕
    const glowMat = this.trackMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xFFE4B5,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const glowMesh = new THREE.Mesh(
      this.trackGeometry(new THREE.SphereGeometry(r * 1.15, 32, 32)),
      glowMat
    );
    group.add(glowMesh);

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    if (this._cloudMat?.uniforms) {
      this._cloudMat.uniforms.uTime.value = this._time;
    }
  }

  // @ts-ignore - defined for potential future use (cloud shader enhancement)
  private _createCloudTexture(size: number): THREE.CanvasTexture {
    return this.createCanvasTexture(size, (ctx, w, h) => {
      ctx.fillStyle = '#E8D090';
      ctx.fillRect(0, 0, w, h);

      // 浓密云带
      for (let i = 0; i < 20; i++) {
        const y = Math.random() * h;
        const cloudW = 50 + Math.random() * 150;
        const cloudH = 10 + Math.random() * 30;
        const cloudGrad = ctx.createRadialGradient(
          Math.random() * w, y, 0,
          Math.random() * w, y, cloudW
        );
        cloudGrad.addColorStop(0, 'rgba(240,220,160,0.6)');
        cloudGrad.addColorStop(1, 'rgba(240,220,160,0)');
        ctx.fillStyle = cloudGrad;
        ctx.beginPath();
        ctx.ellipse(Math.random() * w, y, cloudW, cloudH, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

export default VenusSprite;
