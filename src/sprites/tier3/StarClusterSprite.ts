/**
 * StarClusterSprite - 星团精灵（Tier 3）
 *
 * 视觉效果：
 *   - 密集恒星群（数千颗）
 *   - 球状分布 + 自定义 shader 闪烁
 *   - 颜色渐变（核心白热 → 边缘冷色）
 *   - 流畅的脉冲动画
 *
 * 使用自定义 Shader 实现流畅的闪烁和颜色渐变效果
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface StarClusterSpriteConfig extends CelestialSpriteConfig {
  /** 星团半径（默认 5） */
  radius?: number;
  /** 恒星数量（默认 2000） */
  starCount?: number;
  /** 是否球状（false=疏散） */
  globular?: boolean;
  /** 核心颜色 */
  coreColor?: string;
  /** 边缘颜色 */
  edgeColor?: string;
}

export class StarClusterSprite extends CelestialSprite {
  readonly category = 'celestial' as const;

  private _clusterRadius: number;
  private _starCount: number;
  private _globular: boolean;
  private _coreColor: THREE.Color;
  private _edgeColor: THREE.Color;
  private _points!: THREE.Points;
  private _geo!: THREE.BufferGeometry;
  private _mat!: THREE.ShaderMaterial;
  private _uniforms!: Record<string, THREE.IUniform>;

  constructor(config: StarClusterSpriteConfig = {}) {
    super({ tier: 3, name: 'StarClusterSprite', ...config });
    this._clusterRadius = config.radius ?? 5;
    this._starCount = config.starCount ?? 2000;
    this._globular = config.globular ?? true;
    this._coreColor = new THREE.Color(config.coreColor ?? '#FFEEDD');
    this._edgeColor = new THREE.Color(config.edgeColor ?? '#4488FF');
  }

  mount(scene: THREE.Scene, config: StarClusterSpriteConfig = {}): void {
    this._scene = scene;

    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));

    // 生成恒星位置
    const positions = new Float32Array(this._starCount * 3);
    const sizes = new Float32Array(this._starCount);
    const phases = new Float32Array(this._starCount); // 闪烁相位
    const coreFactors = new Float32Array(this._starCount); // 距离核心的因子

    for (let i = 0; i < this._starCount; i++) {
      let x: number, y: number, z: number;

      if (this._globular) {
        // 球状分布（球坐标随机，更集中的核心）
        const r = this._clusterRadius * Math.pow(Math.random(), 1 / 3);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
        coreFactors[i] = 1 - r / this._clusterRadius; // 核心处为1，边缘为0
      } else {
        // 疏散分布（盘状）
        const r = this._clusterRadius * Math.random();
        const theta = Math.random() * Math.PI * 2;
        const localY = (Math.random() - 0.5) * this._clusterRadius * 0.3;
        x = r * Math.cos(theta);
        y = localY;
        z = r * Math.sin(theta);
        coreFactors[i] = 0.5 + Math.random() * 0.5;
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 更大的尺寸范围，更自然的分布
      sizes[i] = 0.5 + Math.random() * 2.5;
      // 随机闪烁相位，避免同步闪烁
      phases[i] = Math.random() * Math.PI * 2;
    }

    this._geo = this.trackGeometry(new THREE.BufferGeometry());
    this._geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this._geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this._geo.setAttribute('aCoreFactor', new THREE.BufferAttribute(coreFactors, 1));

    // Shader uniforms
    this._uniforms = {
      uTime: { value: 0 },
      uCoreColor: { value: this._coreColor },
      uEdgeColor: { value: this._edgeColor },
    };

    // 自定义 shader 实现流畅的闪烁和颜色渐变
    this._mat = this.trackMaterial(
      new THREE.ShaderMaterial({
        uniforms: this._uniforms,
        vertexShader: /* glsl */ `
          precision highp float;
          
          attribute float aSize;
          attribute float aPhase;
          attribute float aCoreFactor;

          uniform float uTime;
          uniform vec3 uCoreColor;
          uniform vec3 uEdgeColor;

          varying vec3 vColor;
          varying float vOpacity;
          varying float vCoreFactor;

          void main() {
            // 距离中心的距离（归一化）
            float dist = length(position) / 5.0;
            vCoreFactor = aCoreFactor;

            // 多频率闪烁 - 更自然
            float flicker1 = sin(uTime * 1.5 + aPhase) * 0.5 + 0.5;
            float flicker2 = sin(uTime * 3.7 + aPhase * 1.3) * 0.3 + 0.7;
            float flicker3 = sin(uTime * 0.8 + aPhase * 0.7) * 0.2 + 0.8;
            float flicker = flicker1 * flicker2 * flicker3;

            // 颜色插值：核心白热 → 边缘冷色
            vec3 coreColor = vec3(1.0, 0.95, 0.9); // 近白色
            vec3 midColor = uCoreColor;              // 配置的核心色
            vec3 edgeColor = uEdgeColor;            // 边缘冷色

            if (aCoreFactor > 0.6) {
              vColor = mix(midColor, coreColor, (aCoreFactor - 0.6) * 2.5);
            } else {
              vColor = mix(edgeColor, midColor, aCoreFactor / 0.6);
            }

            // 透明度：核心更亮，边缘更透明
            vOpacity = 0.4 + aCoreFactor * 0.6 * flicker;

            // 脉冲效果
            float pulse = 1.0 + sin(uTime * 2.0 + aPhase * 0.5) * 0.15 * aCoreFactor;

            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * pulse * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          
          varying vec3 vColor;
          varying float vOpacity;
          varying float vCoreFactor;

          void main() {
            // 圆形光点，带柔和边缘
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);

            // 柔和光晕边缘
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            alpha = pow(alpha, 1.2); // 更自然的衰减

            // 核心更亮
            float brightness = 1.0 + (1.0 - dist * 2.0) * 0.5;
            brightness = max(brightness, 0.5);

            vec3 finalColor = vColor * brightness;

            // 边缘有轻微色偏
            if (dist > 0.2) {
              finalColor = mix(finalColor, vColor * 0.7, (dist - 0.2) * 2.0);
            }

            gl_FragColor = vec4(finalColor, alpha * vOpacity);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this._points = new THREE.Points(this._geo, this._mat);
    group.add(this._points);

    // 添加外围星芒效果
    this._addGlowHalo(group);

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  private _addGlowHalo(group: THREE.Group): void {
    // 外围光晕球
    const haloGeo = new THREE.SphereGeometry(this._clusterRadius * 1.5, 32, 32);
    const haloMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: this._edgeColor.clone().multiplyScalar(0.5) },
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
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          float pulse = 0.7 + sin(uTime * 0.5) * 0.3;
          gl_FragColor = vec4(uColor, intensity * pulse * 0.3);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    group.add(halo);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);

    // 更新 shader 时间
    if (this._uniforms) {
      this._uniforms.uTime.value = this._time;
    }

    // 整体缓慢旋转
    if (this._object3D) {
      this._object3D.rotation.y += deltaTime * 0.03;
      this._object3D.rotation.x += deltaTime * 0.01;
    }
  }
}

export default StarClusterSprite;
