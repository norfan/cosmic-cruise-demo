/**
 * MultiverseNodeSprite — 多宇宙节点 (Tier 7)
 * 7个平行宇宙泡泡环绕中央奇点 + 维度通道连线粒子 + 泡泡内宇宙缩影
 */
import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface MultiverseNodeSpriteConfig extends CelestialSpriteConfig {
  bubbleCount?: number;
  bubbleRadius?: number;
  orbitRadius?: number;
}

const bubbleVert = /* glsl */`
varying vec3 vNormal; varying vec2 vUv;
void main(){
  vNormal=normalize(normalMatrix*normal); vUv=uv;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;

const bubbleFrag = /* glsl */`
uniform float uTime; uniform vec3 uColor; uniform float uIdx;
varying vec3 vNormal; varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
  float fr=pow(1.0-max(dot(vNormal,vec3(0,0,1)),0.0),3.0);
  float nm=n(vUv*8.0+uTime*0.3+uIdx*1.7);
  float stars=step(0.97,h(floor(vUv*80.0)));
  vec3 col=uColor*(0.3+nm*0.7)+vec3(1)*stars*0.8;
  float edge=smoothstep(0.8,1.0,fr);
  col+=uColor*edge*(1.0+sin(uTime*2.0+uIdx)*1.5);
  float a=clamp(fr*(0.6+nm*0.4)+edge*0.4,0.0,1.0);
  gl_FragColor=vec4(col,a*0.85);
}`;

const connVert = /* glsl */`
attribute float aP; uniform float uTime; varying float vA;
void main(){
  float w=sin(aP*12.0-uTime*4.0)*0.5+0.5;
  vA=w*(1.0-abs(aP*2.0-1.0));
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  gl_PointSize=2.5*vA+1.0;
}`;

const connFrag = /* glsl */`
varying float vA; uniform vec3 uC;
void main(){
  float d=length(gl_PointCoord-0.5)*2.0;
  if(d>1.0)discard;
  gl_FragColor=vec4(uC,(1.0-d)*vA*0.9);
}`;

const centralVert = /* glsl */`
varying vec3 vN; varying vec2 vUv;
void main(){ vN=normalize(normalMatrix*normal); vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

const centralFrag = /* glsl */`
uniform float uTime; varying vec3 vN; varying vec2 vUv;
vec3 rainbow(float t){t=fract(t);return clamp(vec3(abs(t*6.0-3.0)-1.0,2.0-abs(t*6.0-2.0),2.0-abs(t*6.0-4.0)),0.0,1.0);}
void main(){
  float fr=pow(1.0-max(dot(vN,vec3(0,0,1)),0.0),2.0);
  vec3 col=rainbow(uTime*0.1+fr*0.5);
  float p=sin(uTime*5.0)*0.5+0.5;
  float a=fr*0.9+p*0.1+0.1;
  gl_FragColor=vec4(col*(1.0+p*2.0),min(a,1.0));
}`;

export default class MultiverseNodeSprite extends CelestialSprite {
  private _bubbleCount: number;
  private _bubbleRadius: number;
  private _orbitRadius: number;
  private _bubbleUniforms: Array<Record<string, THREE.IUniform>> = [];
  private _connUniforms: Array<Record<string, THREE.IUniform>> = [];
  private _centralUniforms?: Record<string, THREE.IUniform>;

  constructor(config: MultiverseNodeSpriteConfig = {}) {
    super(config);
    this._bubbleCount = config.bubbleCount ?? 7;
    this._bubbleRadius = config.bubbleRadius ?? 2.5;
    this._orbitRadius = config.orbitRadius ?? 10;
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

    const COLORS = ['#ff4488','#44aaff','#44ffaa','#ffaa44','#aa44ff','#ff8844','#44ffff']
      .map(c => new THREE.Color(c));

    // ── 中央奇点 ───────────────────────────────────────────
    const cUni = { uTime: { value: 0 } };
    this._centralUniforms = cUni;
    const centralMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 32, 32),
      new THREE.ShaderMaterial({ vertexShader: centralVert, fragmentShader: centralFrag,
        uniforms: cUni, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.FrontSide }),
    );
    group.add(centralMesh);

    // 中央光晕
    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 3.0, 64),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.15,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    glowRing.rotation.x = Math.PI / 2;
    group.add(glowRing);

    // ── 7个宇宙泡泡 ───────────────────────────────────────
    for (let i = 0; i < this._bubbleCount; i++) {
      const angle = (i / this._bubbleCount) * Math.PI * 2;
      const tilt = (i % 3 === 0 ? 0.4 : i % 3 === 1 ? -0.3 : 0.1);
      const x = Math.cos(angle) * this._orbitRadius;
      const y = Math.sin(tilt + i * 0.6) * 3.0;
      const z = Math.sin(angle) * this._orbitRadius;

      const uni = { uTime: { value: 0 }, uColor: { value: COLORS[i] }, uIdx: { value: i } };
      this._bubbleUniforms.push(uni);

      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(this._bubbleRadius, 32, 32),
        new THREE.ShaderMaterial({ vertexShader: bubbleVert, fragmentShader: bubbleFrag,
          uniforms: uni, transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      );
      bubble.position.set(x, y, z);
      group.add(bubble);

      // 连接通道粒子（从中心到泡泡）
      const COUNT = 80;
      const positions = new Float32Array(COUNT * 3);
      const progArr = new Float32Array(COUNT);
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(x, y, z);
      for (let k = 0; k < COUNT; k++) {
        const t = k / COUNT;
        const spread = Math.sin(t * Math.PI) * 0.6;
        const sx = (Math.random() - 0.5) * spread;
        const sy = (Math.random() - 0.5) * spread;
        positions[k * 3]     = start.x + (end.x - start.x) * t + sx;
        positions[k * 3 + 1] = start.y + (end.y - start.y) * t + sy;
        positions[k * 3 + 2] = start.z + (end.z - start.z) * t;
        progArr[k] = t;
      }
      const connGeo = new THREE.BufferGeometry();
      connGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      connGeo.setAttribute('aP', new THREE.BufferAttribute(progArr, 1));
      const connUni = { uTime: { value: 0 }, uC: { value: COLORS[i] } };
      this._connUniforms.push(connUni);
      const connPts = new THREE.Points(connGeo,
        new THREE.ShaderMaterial({ vertexShader: connVert, fragmentShader: connFrag,
          uniforms: connUni, transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending }));
      group.add(connPts);
    }

    // ── 外围宇宙维度环 ────────────────────────────────────
    for (let r = 0; r < 3; r++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(this._orbitRadius * (0.9 + r * 0.15), 0.08, 8, 128),
        new THREE.MeshBasicMaterial({ color: COLORS[r * 2],
          transparent: true, opacity: 0.15 - r * 0.03,
          blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      ring.rotation.x = (r / 3) * Math.PI;
      ring.rotation.z = (r / 3) * Math.PI * 0.7;
      group.add(ring);
    }
  }

  update(dt: number): void {
    super.update(dt);
    const t = this._time;

    if (this._centralUniforms) this._centralUniforms.uTime.value = t;
    for (const u of this._bubbleUniforms) u.uTime.value = t;
    for (const u of this._connUniforms) u.uTime.value = t;

    // 泡泡慢速公转（不同速度）
    if (this._object3D) {
      this._object3D.rotation.y += dt * 0.08;
    }
  }

  dispose(): void {
    super.dispose();
  }
}
