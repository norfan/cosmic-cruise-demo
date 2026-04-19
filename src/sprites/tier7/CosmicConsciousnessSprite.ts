/**
 * CosmicConsciousnessSprite — 宇宙意识体 (Tier 7)
 * 巨型神经网络星海：节点间动态突触放电 + 意识涟漪波 + 思维光束
 */
import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface CosmicConsciousnessSpriteConfig extends CelestialSpriteConfig {
  nodeCount?: number;
  networkRadius?: number;
  synapseCount?: number;
}

const nodeVert = /* glsl */`
attribute float aSize; attribute float aPhase; attribute vec3 aColor;
uniform float uTime; varying vec3 vCol; varying float vA;
void main(){
  float p=sin(uTime*2.0+aPhase)*0.5+0.5;
  vA=0.5+p*0.5; vCol=aColor*(0.5+p*0.5);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  gl_PointSize=aSize*(0.8+p*1.2);
}`;

const nodeFrag = /* glsl */`
varying vec3 vCol; varying float vA;
void main(){
  float d=length(gl_PointCoord-0.5)*2.0;
  if(d>1.0)discard;
  float a=(1.0-d*d)*vA;
  gl_FragColor=vec4(vCol,a*0.9);
}`;

const rippleVert = /* glsl */`
varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

const rippleFrag = /* glsl */`
uniform float uTime; uniform float uPhase; uniform vec3 uColor;
varying vec2 vUv;
void main(){
  vec2 c=vUv-0.5; float r=length(c)*2.0;
  float t=fract(uTime*0.3+uPhase);
  float wave=sin((r-t)*18.0)*0.5+0.5;
  float fade=(1.0-t)*exp(-r*1.5);
  float a=wave*fade*0.6; if(a<0.01)discard;
  gl_FragColor=vec4(uColor*( 1.0+wave),a);
}`;

const beamVert = /* glsl */`
attribute float aT; uniform float uTime; varying float vA;
void main(){
  float w=sin(aT*8.0-uTime*5.0)*0.5+0.5;
  vA=w*(1.0-aT);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  gl_PointSize=3.0*vA+0.5;
}`;

const beamFrag = /* glsl */`
varying float vA; uniform vec3 uC;
void main(){
  float d=length(gl_PointCoord-0.5)*2.0;
  if(d>1.0)discard;
  gl_FragColor=vec4(uC,(1.0-d)*vA*0.95);
}`;

export default class CosmicConsciousnessSprite extends CelestialSprite {
  private _nodeCount: number;
  private _networkRadius: number;
  private _synapseCount: number;
  private _nodePositions: THREE.Vector3[] = [];
  private _rippleUniforms: Array<Record<string, THREE.IUniform>> = [];
  private _beamUniforms: Array<Record<string, THREE.IUniform>> = [];
  private _nodeUniforms?: Record<string, THREE.IUniform>;

  constructor(config: CosmicConsciousnessSpriteConfig = {}) {
    super(config);
    this._nodeCount = config.nodeCount ?? 120;
    this._networkRadius = config.networkRadius ?? 14;
    this._synapseCount = config.synapseCount ?? 60;
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

  private _build(group: THREE.Group): void {

    const COLORS = [
      new THREE.Color('#88ccff'),
      new THREE.Color('#cc88ff'),
      new THREE.Color('#88ffcc'),
      new THREE.Color('#ffcc88'),
    ];

    // ── 神经节点星点云 ─────────────────────────────────────
    const N = this._nodeCount;
    const posArr = new Float32Array(N * 3);
    const sizeArr = new Float32Array(N);
    const phaseArr = new Float32Array(N);
    const colorArr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // 球形分布 + 少数核心节点在中心
      const r = (i < 10 ? 1.5 : this._networkRadius * (0.3 + Math.random() * 0.7));
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.random() * Math.PI * 2;
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);
      posArr[i * 3] = x; posArr[i * 3 + 1] = y; posArr[i * 3 + 2] = z;
      this._nodePositions.push(new THREE.Vector3(x, y, z));
      sizeArr[i] = i < 10 ? 8 + Math.random() * 6 : 2 + Math.random() * 4;
      phaseArr[i] = Math.random() * Math.PI * 2;
      const c = COLORS[i % COLORS.length];
      colorArr[i * 3] = c.r; colorArr[i * 3 + 1] = c.g; colorArr[i * 3 + 2] = c.b;
    }
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(sizeArr, 1));
    nodeGeo.setAttribute('aPhase', new THREE.BufferAttribute(phaseArr, 1));
    nodeGeo.setAttribute('aColor', new THREE.BufferAttribute(colorArr, 3));
    const nodeUni = { uTime: { value: 0 } };
    this._nodeUniforms = nodeUni;
    group.add(new THREE.Points(nodeGeo,
      new THREE.ShaderMaterial({ vertexShader: nodeVert, fragmentShader: nodeFrag,
        uniforms: nodeUni, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, vertexColors: false })));

    // ── 突触连线 ──────────────────────────────────────────
    for (let s = 0; s < this._synapseCount; s++) {
      const ai = Math.floor(Math.random() * N);
      const bi = Math.floor(Math.random() * N);
      const a = this._nodePositions[ai];
      const b = this._nodePositions[bi];

      const STEPS = 50;
      const bPos = new Float32Array(STEPS * 3);
      const bT = new Float32Array(STEPS);
      for (let k = 0; k < STEPS; k++) {
        const t = k / (STEPS - 1);
        bPos[k * 3]     = a.x + (b.x - a.x) * t;
        bPos[k * 3 + 1] = a.y + (b.y - a.y) * t;
        bPos[k * 3 + 2] = a.z + (b.z - a.z) * t;
        bT[k] = t;
      }
      const bGeo = new THREE.BufferGeometry();
      bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
      bGeo.setAttribute('aT', new THREE.BufferAttribute(bT, 1));
      const col = COLORS[s % COLORS.length];
      const bUni = { uTime: { value: Math.random() * 10 }, uC: { value: col } };
      this._beamUniforms.push(bUni);
      group.add(new THREE.Points(bGeo,
        new THREE.ShaderMaterial({ vertexShader: beamVert, fragmentShader: beamFrag,
          uniforms: bUni, transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending })));
    }

    // ── 意识涟漪（5层平面波环）─────────────────────────────
    for (let r = 0; r < 5; r++) {
      const scale = (r + 1) * 5.5;
      const rUni = {
        uTime: { value: 0 },
        uPhase: { value: r * 0.2 },
        uColor: { value: COLORS[r % COLORS.length] },
      };
      this._rippleUniforms.push(rUni);
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(scale * 2, scale * 2, 1, 1),
        new THREE.ShaderMaterial({ vertexShader: rippleVert, fragmentShader: rippleFrag,
          uniforms: rUni, transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      );
      plane.rotation.x = (r / 5) * Math.PI;
      plane.rotation.z = (r / 5) * Math.PI * 0.6;
      group.add(plane);
    }

    // ── 中央意识核：发光球 ─────────────────────────────────
    const coreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 32, 32),
      new THREE.MeshBasicMaterial({ color: '#aaddff', transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    group.add(coreMesh);
    const innerGlow = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    group.add(innerGlow);
  }

  update(dt: number): void {
    super.update(dt);
    const t = this._time;
    if (this._nodeUniforms) this._nodeUniforms.uTime.value = t;
    for (const u of this._rippleUniforms) u.uTime.value = t;
    for (const u of this._beamUniforms) u.uTime.value += dt;
    if (this._object3D) {
      this._object3D.rotation.y += dt * 0.05;
      this._object3D.rotation.x = Math.sin(t * 0.2) * 0.1;
    }
  }

  dispose(): void {
    super.dispose();
  }
}
