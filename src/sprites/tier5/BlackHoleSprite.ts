/**
 * BlackHoleSprite — 黑洞
 * 表现：事件视界 + 吸积盘（湍流+多普勒增强）+ 光子球层
 *       双向相对论性喷流 + Hawking 辐射粒子
 *
 * 适用文明等级：Tier 5 (极端天体)
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface BlackHoleSpriteConfig extends CelestialSpriteConfig {
  diskRadius?: number;
  diskBrightness?: number;
  jetLength?: number;
  eventHorizonR?: number;
  distortionStrength?: number;
}

// ── Shader ──────────────────────────────────────────────
const accretionVertGLSL = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const accretionFragGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uRadius;
  uniform vec3  uColor1;
  uniform vec3  uColor2;
  varying vec2  vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float d = length(vUv - center) * 2.0;
    if (d > 1.0) discard;
    float r = clamp(d / uRadius, 0.0, 1.0);
    float horizonFade = smoothstep(0.35, 0.42, r);
    float photonSphere = exp(-pow((r - 0.38) * 28.0, 2.0)) * 2.5;
    float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
    float spiral = sin(angle * 5.0 - uTime * 1.8 + r * 12.0) * 0.5 + 0.5;
    float n1 = noise(vec2(angle * 2.0 + uTime * 0.4, r * 8.0));
    float n2 = noise(vec2(r * 15.0 - uTime * 0.6, angle * 3.0));
    float turb = (n1 + n2) * 0.5;
    float doppler = dot(normalize(vUv - center), vec2(cos(uTime * 0.3), 0.0));
    float dopplerBoost = 1.0 + doppler * 0.6;
    float brightness = pow(1.0 - r, 0.6) * dopplerBoost;
    float intensity = brightness * (0.4 + turb * 0.6) * (0.5 + spiral * 0.5);
    intensity += photonSphere * (1.0 - r);
    intensity *= horizonFade;
    vec3 col = mix(uColor1, uColor2, r + turb * 0.3);
    gl_FragColor = vec4(col * intensity, intensity * 0.95);
  }
`;

const horizonVertGLSL = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;
const horizonFragGLSL = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  uniform float uTime;
  void main() {
    float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
    float edge = pow(rim, 3.0);
    float pulse = sin(uTime * 1.5) * 0.5 + 0.5;
    vec3 edgeColor = mix(vec3(0.8, 0.1, 0.0), vec3(0.4, 0.0, 0.0), pulse);
    vec3 col = mix(vec3(0.0), edgeColor, edge * 0.6);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Class ───────────────────────────────────────────────
export default class BlackHoleSprite extends CelestialSprite {
  private _diskRadius: number;
  private _jetLength: number;
  private _eventHorizonR: number;

  private _accretionDisk?: THREE.Mesh;
  private _eventHorizon?: THREE.Mesh;
  private _photonRing?: THREE.Mesh;
  private _relJetL?: THREE.Points;
  private _relJetR?: THREE.Points;
  private _hawkParticles?: THREE.Points;
  private _hawkGeo?: THREE.BufferGeometry;
  private _accretionUniforms?: Record<string, THREE.IUniform>;
  private _horizonUniforms?: Record<string, THREE.IUniform>;

  constructor(config: BlackHoleSpriteConfig = {}) {
    super(config);
    this._diskRadius = config.diskRadius ?? 7;
    this._jetLength = config.jetLength ?? 22;
    this._eventHorizonR = config.eventHorizonR ?? 1.8;
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
    this._buildAccretionDisk(parent);
    this._buildEventHorizon(parent);
    this._buildPhotonRing(parent);
    this._buildRelativisticJets(parent);
    this._buildHawkingParticles(parent);
  }

  private _buildAccretionDisk(parent: THREE.Group): void {
    const geo = new THREE.PlaneGeometry(this._diskRadius * 2, this._diskRadius * 2, 64, 64);
    const uniforms: Record<string, THREE.IUniform> = {
      uTime: { value: 0 },
      uRadius: { value: 0.45 },
      uColor1: { value: new THREE.Color('#ff7700') },
      uColor2: { value: new THREE.Color('#ffffcc') },
    };
    this._accretionUniforms = uniforms;

    const mat = new THREE.ShaderMaterial({
      vertexShader: accretionVertGLSL,
      fragmentShader: accretionFragGLSL,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const disk = new THREE.Mesh(geo, mat);
    disk.rotation.x = -Math.PI / 2;
    parent.add(disk);
    this._accretionDisk = disk;
  }

  private _buildEventHorizon(parent: THREE.Group): void {
    const geo = new THREE.SphereGeometry(this._eventHorizonR, 32, 32);
    const uniforms = { uTime: { value: 0 } };
    this._horizonUniforms = uniforms;

    const mat = new THREE.ShaderMaterial({
      vertexShader: horizonVertGLSL,
      fragmentShader: horizonFragGLSL,
      uniforms,
      side: THREE.FrontSide,
    });

    parent.add(new THREE.Mesh(geo, mat));
    this._eventHorizon = parent.children[parent.children.length - 1] as THREE.Mesh;
  }

  private _buildPhotonRing(parent: THREE.Group): void {
    const r = this._eventHorizonR * 1.52;
    const geo = new THREE.TorusGeometry(r, 0.04, 8, 80);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: 0.7 });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    parent.add(ring);
    this._photonRing = ring;
  }

  private _buildRelativisticJets(parent: THREE.Group): void {
    const count = 300;
    const makeJet = (): { geo: THREE.BufferGeometry; mat: THREE.ShaderMaterial } => {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const offsets = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const r = Math.random() * 0.2;
        const theta = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * r;
        positions[i * 3 + 1] = (Math.random() - 0.5) * this._jetLength;
        positions[i * 3 + 2] = Math.sin(theta) * r;
        offsets[i] = Math.random();
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));

      const uniforms = { uTime: { value: 0 } };
      const mat = new THREE.ShaderMaterial({
        vertexShader: `
          precision highp float;
          attribute float aOffset;
          uniform float uTime;
          varying float vAlpha;
          void main() {
            float t = mod(uTime * 0.8 + aOffset, 1.0);
            vAlpha = 1.0 - t;
            vec3 pos = position;
            pos.y = pos.y * t;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = (1.0 - t * 0.7) * 3.0;
          }
        `,
        fragmentShader: `
          precision highp float;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0) discard;
            float a = (1.0 - d) * vAlpha;
            vec3 col = mix(vec3(0.2, 0.6, 1.0), vec3(1.0, 1.0, 1.0), vAlpha * 0.5);
            gl_FragColor = vec4(col, a * 0.8);
          }
        `,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      return { geo, mat };
    };

    const { geo: geoL, mat: matL } = makeJet();
    const jetL = new THREE.Points(geoL, matL);
    jetL.position.y = this._jetLength / 2;
    parent.add(jetL);
    this._relJetL = jetL;

    const { geo: geoR, mat: matR } = makeJet();
    const jetR = new THREE.Points(geoR, matR);
    jetR.position.y = -this._jetLength / 2;
    jetR.rotation.z = Math.PI;
    parent.add(jetR);
    this._relJetR = jetR;
  }

  private _buildHawkingParticles(parent: THREE.Group): void {
    const count = 180;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = this._eventHorizonR * 1.3 + Math.random() * 0.5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      vels[i * 3] = (Math.random() - 0.5) * 0.04;
      vels[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
      vels[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    (geo as any).userData.vels = vels;

    const mat = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 0.06,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pts = new THREE.Points(geo, mat);
    parent.add(pts);
    this._hawkParticles = pts;
    this._hawkGeo = geo;
  }

  update(dt: number): void {
    super.update(dt);

    if (this._accretionDisk) this._accretionDisk.rotation.z += dt * 0.3;
    if (this._photonRing) {
      const p = Math.sin(this._time * 2.0) * 0.5 + 0.5;
      ((this._photonRing.material as THREE.MeshBasicMaterial).opacity) = 0.5 + p * 0.4;
    }
    if (this._horizonUniforms) this._horizonUniforms.uTime.value = this._time;
    if (this._accretionUniforms) this._accretionUniforms.uTime.value = this._time;
    if (this._relJetL) ((this._relJetL.material as THREE.ShaderMaterial).uniforms.uTime as any).value = this._time;
    if (this._relJetR) ((this._relJetR.material as THREE.ShaderMaterial).uniforms.uTime as any).value = this._time;

    if (this._hawkGeo) {
      const pos = this._hawkGeo.attributes.position as THREE.BufferAttribute;
      const vels = (this._hawkGeo as any).userData.vels as Float32Array;
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(i, pos.getX(i) + vels[i * 3], pos.getY(i) + vels[i * 3 + 1], pos.getZ(i) + vels[i * 3 + 2]);
        const dist = Math.sqrt(pos.getX(i) ** 2 + pos.getY(i) ** 2 + pos.getZ(i) ** 2);
        if (dist > this._eventHorizonR * 3.5) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const r = this._eventHorizonR * 1.3;
          pos.setXYZ(i, r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
        }
      }
      pos.needsUpdate = true;
    }
  }

  dispose(): void {
    this._accretionDisk?.geometry.dispose();
    ((this._accretionDisk as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._eventHorizon?.geometry.dispose();
    ((this._eventHorizon as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._photonRing?.geometry.dispose();
    ((this._photonRing as any)?.material as THREE.MeshBasicMaterial)?.dispose();
    this._relJetL?.geometry.dispose();
    ((this._relJetL as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._relJetR?.geometry.dispose();
    ((this._relJetR as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._hawkParticles?.geometry.dispose();
    ((this._hawkParticles as any)?.material as THREE.PointsMaterial)?.dispose();
    super.dispose();
  }
}
