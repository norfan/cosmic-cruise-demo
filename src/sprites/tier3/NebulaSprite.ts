/**
 * NebulaSprite - 星云精灵（Tier 3）
 *
 * 视觉效果：
 *   - 使用自定义 shader 实现程序化云雾纹理
 *   - 流畅的颜色漂移动画
 *   - 脉动光晕效果
 *   - 多层混合营造深度感
 *
 * 使用 Simplex Noise shader 实现自然的云雾流动效果
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface NebulaSpriteConfig extends CelestialSpriteConfig {
  /** 星云颜色（默认紫红） */
  color?: string;
  /** 第二颜色（默认蓝绿） */
  color2?: string;
  /** 星云半径（默认 12） */
  radius?: number;
  /** 层数（默认 3，shader内部分层） */
  layers?: number;
}

export class NebulaSprite extends CelestialSprite {
  readonly category = 'celestial' as const;

  private _color: THREE.Color;
  private _color2: THREE.Color;
  private _nebulaRadius: number;
  private _nebulaGroup!: THREE.Group;
  private _nebulaMesh!: THREE.Mesh;
  private _coreMesh!: THREE.Mesh;
  private _haloMesh!: THREE.Mesh;
  private _uniforms!: Record<string, THREE.IUniform>;

  constructor(config: NebulaSpriteConfig = {}) {
    super({ tier: 3, name: 'NebulaSprite', ...config });
    this._color = new THREE.Color(config.color ?? '#9933FF');
    this._color2 = new THREE.Color(config.color2 ?? '#00CCFF');
    this._nebulaRadius = config.radius ?? 12;
  }

  mount(scene: THREE.Scene, config: NebulaSpriteConfig = {}): void {
    this._scene = scene;

    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));

    // 主星云体 - 使用 shader 程序化纹理
    this._buildNebulaCore(group);

    // 发光核心
    this._buildGlowingCore(group);

    // 外围晕光
    this._buildOuterHalo(group);

    // 添加飘动的尘埃粒子
    this._buildDustParticles(group);

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    this._nebulaGroup = group;
    scene.add(group);
  }

  private _buildNebulaCore(parent: THREE.Group): void {
    const geo = new THREE.SphereGeometry(this._nebulaRadius * 0.8, 64, 64);

    this._uniforms = {
      uTime: { value: 0 },
      uColor1: { value: this._color },
      uColor2: { value: this._color2 },
      uRadius: { value: this._nebulaRadius },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this._uniforms,
      vertexShader: /* glsl */ `
        precision highp float;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;

        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uRadius;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;

        // Simplex 3D Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);

          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);

          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;

          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));

          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;

          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);

          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);

          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);

          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));

          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);

          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;

          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        float fbm(vec3 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          value += amplitude * snoise(p * frequency); frequency *= 2.0; amplitude *= 0.5;
          value += amplitude * snoise(p * frequency); frequency *= 2.0; amplitude *= 0.5;
          value += amplitude * snoise(p * frequency); frequency *= 2.0; amplitude *= 0.5;
          value += amplitude * snoise(p * frequency);
          return value;
        }

        void main() {
          vec3 noisePos = vPosition * 0.3 + vec3(uTime * 0.05);

          float noise1 = fbm(noisePos) * 0.5 + 0.5;
          float noise2 = fbm(noisePos * 2.0 + vec3(100.0)) * 0.5 + 0.5;
          float noise3 = fbm(noisePos * 0.5 + vec3(uTime * 0.02)) * 0.5 + 0.5;

          // 组合噪声
          float combinedNoise = noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1;

          // 颜色混合
          float colorMix = sin(uTime * 0.3 + combinedNoise * 3.0) * 0.5 + 0.5;
          vec3 color = mix(uColor1, uColor2, colorMix);

          // 边缘衰减
          float dist = length(vPosition) / uRadius;
          float edgeFade = 1.0 - smoothstep(0.3, 1.0, dist);

          // 脉冲效果
          float pulse = 0.8 + sin(uTime * 0.8) * 0.2;

          // 透明度
          float alpha = combinedNoise * edgeFade * pulse * 0.7;

          // 增强中心亮度
          float centerGlow = (1.0 - dist) * 0.3;
          color += vec3(centerGlow);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this._nebulaMesh = new THREE.Mesh(geo, mat);
    parent.add(this._nebulaMesh);
  }

  private _buildGlowingCore(parent: THREE.Group): void {
    // 发光核心球
    const geo = new THREE.SphereGeometry(this._nebulaRadius * 0.2, 32, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: this._color.clone().multiplyScalar(1.5) },
        uColor2: { value: this._color2.clone().multiplyScalar(1.5) },
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
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Fresnel 边缘发光
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);

          // 脉冲
          float pulse = 0.8 + sin(uTime * 2.0) * 0.2;

          // 颜色动画
          float colorMix = sin(uTime * 0.5) * 0.5 + 0.5;
          vec3 color = mix(uColor1, uColor2, colorMix);

          // 核心更亮
          float intensity = 0.6 + fresnel * 0.8;
          gl_FragColor = vec4(color * intensity * pulse, intensity * 0.9);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this._coreMesh = new THREE.Mesh(geo, mat);
    parent.add(this._coreMesh);
  }

  private _buildOuterHalo(parent: THREE.Group): void {
    // 外围大范围晕光
    const geo = new THREE.SphereGeometry(this._nebulaRadius * 1.5, 32, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: this._color2.clone().multiplyScalar(0.3) },
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
        uniform vec3 uColor;
        varying vec3 vNormal;

        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          float pulse = 0.6 + sin(uTime * 0.3) * 0.4;
          gl_FragColor = vec4(uColor, intensity * pulse * 0.4);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this._haloMesh = new THREE.Mesh(geo, mat);
    parent.add(this._haloMesh);
  }

  private _buildDustParticles(parent: THREE.Group): void {
    // 添加一些漂浮的尘埃粒子增强效果
    const particleCount = 300;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this._nebulaRadius * (0.3 + Math.random() * 0.7);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: this._color.clone().lerp(new THREE.Color('#FFFFFF'), 0.5) },
      },
      vertexShader: /* glsl */ `
        precision highp float;
        
        attribute float aSize;
        uniform float uTime;
        varying float vOpacity;

        void main() {
          vec3 pos = position;
          // 缓慢飘动
          pos.x += sin(uTime * 0.2 + position.y * 0.5) * 0.3;
          pos.y += cos(uTime * 0.15 + position.x * 0.3) * 0.2;

          float flicker = sin(uTime * 2.0 + position.x * 10.0) * 0.3 + 0.7;
          vOpacity = flicker;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * flicker * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        
        uniform vec3 uColor;
        varying float vOpacity;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(uColor, alpha * vOpacity * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geo, mat);
    parent.add(particles);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);

    // 更新所有 shader 的时间
    if (this._uniforms) {
      this._uniforms.uTime.value = this._time;
    }

    // 更新核心
    if (this._coreMesh?.material instanceof THREE.ShaderMaterial) {
      (this._coreMesh.material.uniforms as any).uTime.value = this._time;
    }

    // 更新晕光
    if (this._haloMesh?.material instanceof THREE.ShaderMaterial) {
      (this._haloMesh.material.uniforms as any).uTime.value = this._time;
    }

    // 缓慢旋转
    if (this._nebulaGroup) {
      this._nebulaGroup.rotation.y += deltaTime * 0.02;
      this._nebulaGroup.rotation.x += deltaTime * 0.01;
    }
  }

  dispose(): void {
    this._nebulaMesh?.geometry.dispose();
    (this._nebulaMesh?.material as THREE.ShaderMaterial)?.dispose();
    this._coreMesh?.geometry.dispose();
    (this._coreMesh?.material as THREE.ShaderMaterial)?.dispose();
    this._haloMesh?.geometry.dispose();
    (this._haloMesh?.material as THREE.ShaderMaterial)?.dispose();
    super.dispose();
  }
}

export default NebulaSprite;
