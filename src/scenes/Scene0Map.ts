/**
 * Scene0Map — 场景 0 · 原始文明沙盘地图（2D 地球纹理版）
 *
 * 视觉设计：2D 平面地球 + 真实世界纹理 + 战略据点
 *   - 底图：真实地球纹理贴图（2D 平面）
 *   - 区块：圆形战略据点 + 名称/部落标签
 *   - 路径：实线连接各据点
 *   - 主角：发光标记 + 弹跳动画
 */

import * as THREE from 'three';
import type { GameScene } from './GameScene';

// ─────────────────────────────────────────────────────────────
// RegionConfig — 15 个地理区块定义（符合真实地理位置）
// ─────────────────────────────────────────────────────────────
export interface RegionBlock {
  id: number;
  name: string;
  land: string;
  hub: string;
  color: string;
  worldPos: THREE.Vector3;
  unlocked: boolean;
  isCurrent: boolean;
  mesh?: THREE.Mesh;
  baseMesh?: THREE.Mesh;
  pulseRing?: THREE.Mesh;
  highlightMat?: THREE.MeshStandardMaterial;
}

interface RegionStatic {
  id: number;
  name: string;
  land: string;
  hub: string;
  color: string;
}

// 15个区域配置（按设计文档的真实地理位置）
export const REGION_CONFIG: RegionStatic[] = [
  { id: 1,  name: '好望角',    land: '非洲最南部',   hub: '望海部', color: '#2E8B57' }, // 起点
  { id: 2,  name: '刚果',     land: '非洲中部',     hub: '逐鹿部', color: '#32CD32' },
  { id: 3,  name: '尼罗河',   land: '埃及',          hub: '河部落', color: '#EDC9AF' },
  { id: 4,  name: '地中海',    land: '地中海',       hub: '渔部落', color: '#0077BE' },
  { id: 5,  name: '西欧',      land: '欧洲',         hub: '木灵部', color: '#228B22' },
  { id: 6,  name: '阿拉伯',    land: '阿拉伯半岛',   hub: '水泽部', color: '#C2B280' },
  { id: 7,  name: '印度',      land: '南亚',         hub: '恒河部', color: '#8B4513' },
  { id: 8,  name: '西伯利亚',  land: '俄罗斯',       hub: '冰原部', color: '#FFFFFF' },
  { id: 9,  name: '白令',      land: '白令海峡',     hub: '渡海部', color: '#F0F8FF' },
  { id: 10, name: '阿拉斯加',  land: '北美',         hub: '野牛部', color: '#A0522D' },
  { id: 11, name: '亚马逊',    land: '南美',         hub: '雨林部', color: '#006400' },
  { id: 12, name: '南极',      land: '南极',         hub: '冰寒部', color: '#B0E0E6' },
  { id: 13, name: '澳大利亚',  land: '澳洲',         hub: '袋鼠部', color: '#DEB887' },
  { id: 14, name: '中原',      land: '中国',         hub: '黄河部', color: '#FFD700' },
  { id: 15, name: '昆仑山',    land: '中国西部',     hub: '昆仑部', color: '#FF4500' }, // 终点
];

// ─────────────────────────────────────────────────────────────
// 地理坐标转换（经纬度转 2D 平面坐标）
// ─────────────────────────────────────────────────────────────
interface GeoCoord {
  lat: number;  // 纬度 (-90 ~ 90)
  lon: number; // 经度 (-180 ~ 180)
}

const GEO_COORDS: GeoCoord[] = [
  { lat: -34.4, lon: 18.5 },   // 好望角
  { lat: -4.0, lon: 22.0 },    // 刚果
  { lat: 26.0, lon: 32.0 },    // 尼罗河
  { lat: 38.0, lon: 15.0 },    // 地中海
  { lat: 48.0, lon: 2.0 },     // 西欧
  { lat: 24.0, lon: 45.0 },    // 阿拉伯
  { lat: 22.0, lon: 78.0 },    // 印度
  { lat: 60.0, lon: 90.0 },    // 西伯利亚
  { lat: 65.0, lon: -170.0 },  // 白令
  { lat: 64.0, lon: -153.0 },  // 阿拉斯加
  { lat: -5.0, lon: -60.0 },   // 亚马逊
  { lat: -82.0, lon: -100.0 }, // 南极
  { lat: -25.0, lon: 134.0 },   // 澳大利亚
  { lat: 35.0, lon: 110.0 },   // 中原
  { lat: 36.0, lon: 80.0 },     // 昆仑山
];

// 经纬度转 2D 平面坐标（墨卡托投影）
function geoToWorld(geo: GeoCoord): THREE.Vector3 {
  // 墨卡托投影转换
  // 经度: -180 ~ 180 -> -25 ~ 25
  const x = (geo.lon / 180) * 25;
  
  // 纬度: -85 ~ 85 -> 15 ~ -15
  // 墨卡托投影公式: y = ln(tan(π/4 + lat/2))
  const latRad = (geo.lat * Math.PI) / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + latRad / 2)) * 10;
  
  return new THREE.Vector3(x, 0, -y);
}

// 构建布局
function buildLayout(): THREE.Vector3[] {
  // 确保返回的数组长度与 REGION_CONFIG 一致
  const positions = GEO_COORDS.map(geo => geoToWorld(geo));
  // 如果 GEO_COORDS 长度不足，添加默认位置
  while (positions.length < REGION_CONFIG.length) {
    positions.push(new THREE.Vector3(0, 0, 0));
  }
  return positions;
}

function createNodeTexture(name: string, hub: string, color: string, isUnlocked: boolean, regionId: number): HTMLCanvasElement {
  const W = 400, H = 250;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, W, H);

  // 外部发光 - 战略风格
  if (isUnlocked) {
    const ringGrad = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, 100);
    ringGrad.addColorStop(0, hexToRgba(color, 0.5));
    ringGrad.addColorStop(0.6, hexToRgba(color, 0.15));
    ringGrad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 100, 0, Math.PI * 2);
    ctx.fillStyle = ringGrad;
    ctx.fill();
  }

  // 六边形边框
  ctx.beginPath();
  const hexSize = 70;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = W / 2 + hexSize * Math.cos(angle);
    const y = H / 2 + hexSize * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = isUnlocked ? color : '#333344';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 内部背景
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = W / 2 + (hexSize - 5) * Math.cos(angle);
    const y = H / 2 + (hexSize - 5) * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = isUnlocked ? hexToRgba(color, 0.25) : 'rgba(40, 40, 60, 0.5)';
  ctx.fill();

  // 编号
  ctx.fillStyle = isUnlocked ? '#ffffff' : '#666666';
  ctx.font = 'bold 24px "Orbitron", "Roboto Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(regionId), W / 2, H / 2 - 10);

  // 区域名称
  ctx.fillStyle = isUnlocked ? '#ffffff' : '#888888';
  ctx.font = `bold ${name.length > 4 ? 14 : 16}px "Noto Sans SC", sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(name, W / 2, H - 60);

  // 副标题
  ctx.fillStyle = isUnlocked ? hexToRgba(color, 0.9) : '#555555';
  ctx.font = '12px "Noto Sans SC", sans-serif';
  ctx.fillText(hub, W / 2, H - 40);

  return canvas;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenColor(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r}, ${g}, ${b})`;
}

// ─────────────────────────────────────────────────────────────
// 主角形状（战略标记）
// ─────────────────────────────────────────────────────────────
function createPlayerMarker(): THREE.Group {
  const group = new THREE.Group();

  // 主体球体
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xff6b35,
    emissive: 0xff4400,
    emissiveIntensity: 2.0,
    roughness: 0.2,
    metalness: 0.3,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  // 外发光环
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff8844,
    transparent: true,
    opacity: 0.4,
  });
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.9, 32), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.1;
  group.add(glow);

  // 底座
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xff9900,
    emissive: 0xff6600,
    emissiveIntensity: 1.5,
    roughness: 0.3,
    transparent: true,
    opacity: 0.8,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 32), baseMat);
  base.position.y = 0.04;
  group.add(base);

  // 垂直光柱
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xff8800,
    emissiveIntensity: 2.0,
    transparent: true,
    opacity: 0.5,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 3, 8), beamMat);
  beam.position.y = 2.0;
  group.add(beam);

  // 顶部光点
  const topMat = new THREE.MeshBasicMaterial({
    color: 0xffdd00,
    transparent: true,
    opacity: 0.8,
  });
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), topMat);
  top.position.y = 3.5;
  group.add(top);

  return group;
}

// ─────────────────────────────────────────────────────────────
// Scene0Map — 实现 GameScene 接口
// ─────────────────────────────────────────────────────────────
export class Scene0Map implements GameScene {
  private _camera!: THREE.Camera;
  private _canvas!: HTMLCanvasElement;

  private _blocks: RegionBlock[] = [];
  private _pathLine!: THREE.Line;
  private _player!: THREE.Group;
  private _currentIndex = 0;
  private _playerPos = new THREE.Vector3();
  private _targetPos = new THREE.Vector3();
  private _moveProgress = 1;
  private _moveSpeed = 4.0;

  private _raycaster = new THREE.Raycaster();
  private _mouse = new THREE.Vector2();

  private _geometries: THREE.BufferGeometry[] = [];
  private _materials: THREE.Material[] = [];
  private _textures: THREE.Texture[] = [];

  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    this._camera = camera;
    this._canvas = canvas;

    this._buildEarthBase(scene);
    this._buildPathLine(scene);
    this._buildBlocks(scene);
    this._buildPlayer(scene);

    if (camera instanceof THREE.PerspectiveCamera) {
      // 调整相机位置以适应 2D 平面地图
      camera.position.set(0, 25, 0);
      camera.lookAt(0, 0, 0);
    }
  }

  // ── 底图：2D 平面地球纹理 ────────────────────────────
  private _buildEarthBase(scene: THREE.Scene): void {
    const mapWidth = 50;
    const mapHeight = 30;

    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    if (ctx) {
      // 深色战略地图背景
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#0a1628');
      bgGrad.addColorStop(0.5, '#0d1f3c');
      bgGrad.addColorStop(1, '#061018');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 网格线 - 战略风格
      ctx.strokeStyle = 'rgba(0, 180, 255, 0.15)';
      ctx.lineWidth = 1;
      const gridSize = 64;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 主要经纬线
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.5, 0);
      ctx.lineTo(canvas.width * 0.5, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.5);
      ctx.lineTo(canvas.width, canvas.height * 0.5);
      ctx.stroke();

      // 绘制大陆块 - 战略风格
      const drawContinent = (points: number[][], color: string, opacity: number) => {
        ctx.fillStyle = `rgba(${color}, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(canvas.width * points[0][0], canvas.height * points[0][1]);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(canvas.width * points[i][0], canvas.height * points[i][1]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgba(${color}, ${opacity + 0.2})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      };

      // 非洲
      drawContinent([
        [0.28, 0.38], [0.42, 0.28], [0.48, 0.32], [0.52, 0.42],
        [0.48, 0.55], [0.38, 0.52], [0.28, 0.42]
      ], '61, 107, 53', 0.6);

      // 欧洲
      drawContinent([
        [0.38, 0.32], [0.42, 0.28], [0.46, 0.30], [0.44, 0.36], [0.38, 0.34]
      ], '100, 150, 100', 0.5);

      // 亚洲
      drawContinent([
        [0.48, 0.30], [0.58, 0.22], [0.68, 0.28], [0.72, 0.38],
        [0.65, 0.48], [0.52, 0.42], [0.48, 0.34]
      ], '70, 90, 60', 0.55);

      // 北美
      drawContinent([
        [0.12, 0.22], [0.28, 0.18], [0.32, 0.28], [0.28, 0.42],
        [0.18, 0.38], [0.12, 0.28]
      ], '80, 100, 60', 0.5);

      // 南美
      drawContinent([
        [0.18, 0.42], [0.28, 0.40], [0.32, 0.52], [0.24, 0.62], [0.16, 0.52]
      ], '50, 80, 40', 0.5);

      // 澳大利亚
      drawContinent([
        [0.72, 0.52], [0.80, 0.48], [0.82, 0.58], [0.75, 0.62]
      ], '90, 70, 50', 0.45);

      // 南极
      ctx.fillStyle = 'rgba(176, 224, 230, 0.3)';
      ctx.beginPath();
      ctx.ellipse(canvas.width * 0.5, canvas.height * 0.82, canvas.width * 0.4, canvas.height * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // 战略标记点 - 十字准星
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
      ctx.lineWidth = 1;
      [[0.28, 0.38], [0.5, 0.5], [0.7, 0.55]].forEach(([x, y]) => {
        const cx = canvas.width * x;
        const cy = canvas.height * y;
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy);
        ctx.lineTo(cx + 15, cy);
        ctx.moveTo(cx, cy - 15);
        ctx.lineTo(cx, cy + 15);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 地图标题
      ctx.fillStyle = 'rgba(0, 200, 255, 0.15)';
      ctx.font = 'bold 36px "Orbitron", "Roboto Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('COSMIC STRATEGY MAP v1.0', canvas.width - 40, canvas.height - 40);

      // 坐标指示
      ctx.fillStyle = 'rgba(0, 200, 255, 0.4)';
      ctx.font = '14px "Roboto Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('LAT: 0° | LON: 0°', 40, canvas.height - 40);
      ctx.fillText('SCALE: 1:1,000,000', 40, canvas.height - 20);
    }

const earthMaterial = this._trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x0a2030,
      roughness: 0.85,
      metalness: 0.05,
    }));

    const earthGeometry = this._trackGeometry(new THREE.PlaneGeometry(mapWidth, mapHeight));
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.rotation.x = -Math.PI / 2;
    earthMesh.position.set(0, -0.1, 0);
    earthMesh.receiveShadow = true;
    scene.add(earthMesh);

    // 战略光照 - 冷色调
    const ambientLight = new THREE.AmbientLight(0x203050, 0.9);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x4488ff, 1.2);
    directionalLight.position.set(5, 15, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(1024);
    scene.add(directionalLight);

    // 顶部聚光灯 - 突出地图
    const spotLight = new THREE.SpotLight(0x00d4ff, 0.8, 40, Math.PI / 6, 0.5);
    spotLight.position.set(0, 20, 0);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);
  }

  private _buildPathLine(scene: THREE.Scene): void {
    const positions = buildLayout();
    const pts = positions.map((p) => p.clone());

    // 战略路径 - 发光虚线效果
    const pathVertexShader = /* glsl */ `
      uniform float uTime;
      varying float vDash;
      void main() {
        vDash = position.x;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const pathFragmentShader = /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      varying float vDash;
      void main() {
        float dash = sin((vDash + uTime * 2.0) * 3.0) * 0.5 + 0.5;
        float alpha = smoothstep(0.3, 0.7, dash);
        gl_FragColor = vec4(uColor, alpha * 0.8);
      }
    `;

    const pathMaterial = this._trackMaterial(new THREE.ShaderMaterial({
      vertexShader: pathVertexShader,
      fragmentShader: pathFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x00d4ff) },
      },
      transparent: true,
      depthWrite: false,
    }));

    const geo = this._trackGeometry(new THREE.BufferGeometry().setFromPoints(pts));
    const line = new THREE.Line(geo, pathMaterial);
    scene.add(line);
    this._pathLine = line;

    // 路径节点 - 战略圆点
    const dotGeo = this._trackGeometry(new THREE.CircleGeometry(0.15, 16));
    pts.forEach((pos, i) => {
      const dotMat = this._trackMaterial(new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x00ff88 : 0x00d4ff,
        transparent: true,
        opacity: 0.9,
      }));
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      dot.position.y = 0.12;
      scene.add(dot);
    });

    // 连接线 - 外发光效果
    const glowPoints = pts.map(p => new THREE.Vector3(p.x, 0.11, p.z));
    const glowGeo = this._trackGeometry(new THREE.BufferGeometry().setFromPoints(glowPoints));
    const glowMat = this._trackMaterial(new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.3,
      linewidth: 3,
    }));
    const glowLine = new THREE.Line(glowGeo, glowMat);
    scene.add(glowLine);
  }

  // ── 战略据点 ────────────────────────────────────────
  private _buildBlocks(scene: THREE.Scene): void {
    const positions = buildLayout();
    console.log('🔍 _buildBlocks: positions.length =', positions.length, 'REGION_CONFIG.length =', REGION_CONFIG.length);

    for (let i = 0; i < REGION_CONFIG.length; i++) {
      const cfg = REGION_CONFIG[i];
      // 安全检查：确保 pos 存在
      const pos = positions[i];
      if (!pos) {
        console.error('❌ _buildBlocks: pos is undefined at index', i);
        continue;
      }
      const unlocked = i === 0;

      // 战略底座 - 六边形
      const baseGeo = this._trackGeometry(new THREE.CylinderGeometry(1.2, 1.2, 0.12, 6));
      const baseMat = this._trackMaterial(new THREE.MeshStandardMaterial({
        color: unlocked ? new THREE.Color(cfg.color).multiplyScalar(0.5) : 0x1a1a2e,
        roughness: 0.5,
        metalness: 0.3,
        transparent: true,
        opacity: 0.95,
        emissive: unlocked ? new THREE.Color(cfg.color).multiplyScalar(0.1) : 0x000000,
        emissiveIntensity: unlocked ? 0.3 : 0,
      }));
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.copy(pos);
      baseMesh.position.y = 0.06;
      baseMesh.userData.regionIndex = i;
      scene.add(baseMesh);

      // 战略标签
      const nodeTexCanvas = createNodeTexture(cfg.name, cfg.hub, cfg.color, unlocked, cfg.id);
      const nodeTex = this._trackTexture(new THREE.CanvasTexture(nodeTexCanvas));
      const nodeGeo = this._trackGeometry(new THREE.PlaneGeometry(3.5, 2.2));
      const nodeMat = this._trackMaterial(new THREE.MeshBasicMaterial({
        map: nodeTex,
        transparent: true,
        depthTest: false,
        side: THREE.DoubleSide,
      }));
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(pos);
      nodeMesh.position.y = 0.3;
      scene.add(nodeMesh);

      // 战略光环
      let pulseRing: THREE.Mesh | undefined;
      if (unlocked) {
        const ringGeo = this._trackGeometry(new THREE.RingGeometry(1.0, 1.4, 32));
        const ringMat = this._trackMaterial(new THREE.MeshBasicMaterial({
          color: new THREE.Color(cfg.color),
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          depthTest: false,
        }));
        pulseRing = new THREE.Mesh(ringGeo, ringMat);
        pulseRing.rotation.x = -Math.PI / 2;
        pulseRing.position.copy(pos);
        pulseRing.position.y = 0.13;
        scene.add(pulseRing);
      }

      this._blocks.push({
        ...cfg,
        worldPos: pos.clone(),
        unlocked,
        isCurrent: i === 0,
        mesh: nodeMesh,
        baseMesh,
        pulseRing,
      });
    }
  }

  // ── 主角标记 ────────────────────────────────────────
  private _buildPlayer(scene: THREE.Scene): void {
    this._player = createPlayerMarker();
    // 安全检查：确保 _blocks 不为空
    if (this._blocks.length > 0) {
      this._player.position.copy(this._blocks[0].worldPos);
      this._playerPos.copy(this._player.position);
      this._targetPos.copy(this._player.position);
    } else {
      // 如果没有区块，设置默认位置
      this._player.position.set(0, 0, 0);
      this._playerPos.set(0, 0, 0);
      this._targetPos.set(0, 0, 0);
    }
    scene.add(this._player);
  }

  private _trackTexture(t: THREE.Texture): THREE.Texture {
    this._textures.push(t); return t;
  }
  private _trackMaterial(m: THREE.Material): THREE.Material {
    this._materials.push(m); return m;
  }
  private _trackGeometry(g: THREE.BufferGeometry): THREE.BufferGeometry {
    this._geometries.push(g); return g;
  }

  update(_dt: number): void {
    const t = performance.now() * 0.001;

    if (!this._player) return;

    // 移动插值
    if (this._moveProgress < 1) {
      this._moveProgress = Math.min(1, this._moveProgress + _dt * this._moveSpeed * 0.15);
      const eased = this._easeInOut(this._moveProgress);
      this._player.position.lerpVectors(this._playerPos, this._targetPos, eased);
    }

    // 弹跳动画
    const bounce = 0.1 + Math.sin(t * 2.5) * 0.2;
    this._player.position.y = 0.5 + bounce;

    // 玩家标记旋转动画
    this._player.rotation.y = t * 0.5;

    // 标签面向相机
    if (this._camera instanceof THREE.PerspectiveCamera) {
      this._blocks.forEach(block => {
        if (block.mesh) {
          block.mesh.lookAt(this._camera.position);
        }
      });
    }

    // 路径动画更新
    if (this._pathLine && this._pathLine.material instanceof THREE.ShaderMaterial) {
      this._pathLine.material.uniforms.uTime.value = t;
    }

    // 当前据点呼吸动画
    for (let i = 0; i < this._blocks.length; i++) {
      const b = this._blocks[i];
      if (b.isCurrent && b.pulseRing) {
        const mat = b.pulseRing.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.3 + Math.sin(t * 2.5) * 0.2;
        b.pulseRing.scale.setScalar(1 + Math.sin(t * 2) * 0.15);
      }
    }
  }

  private _easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  handleClick(clientX: number, clientY: number): number {
    const rect = this._canvas.getBoundingClientRect();
    this._mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this._camera);
    const meshes = this._blocks.map((b) => b.baseMesh).filter(Boolean) as THREE.Mesh[];
    const hits = this._raycaster.intersectObjects(meshes);

    if (hits.length > 0) {
      return hits[0].object.userData.regionIndex as number ?? -1;
    }
    return -1;
  }

  moveTo(index: number): boolean {
    if (index < 0 || index >= this._blocks.length) return false;
    const block = this._blocks[index];
    if (!block.unlocked) {
      console.log(`🔒 [${block.name}] 尚未解锁！`);
      return false;
    }
    if (index === this._currentIndex) return true;

    this._blocks[this._currentIndex].isCurrent = false;
    this._currentIndex = index;
    this._blocks[index].isCurrent = true;

    this._playerPos.copy(this._player.position);
    this._targetPos.copy(block.worldPos);
    this._moveProgress = 0;

    console.log(`🚀 移动至：[${block.id}] ${block.name}（${block.land}）— ${block.hub}`);
    return true;
  }

  unlock(index: number): boolean {
    if (index < 0 || index >= this._blocks.length) return false;
    const b = this._blocks[index];
    if (!b.unlocked) {
      b.unlocked = true;
      console.log(`✅ 解锁：[${b.id}] ${b.name}`);
      return true;
    }
    return false;
  }

  getBlocks(): RegionBlock[] { return this._blocks; }
  getCurrentBlock(): RegionBlock { return this._blocks[this._currentIndex]; }

  dispose(): void {
    for (const b of this._blocks) {
      b.mesh?.geometry.dispose();
      (b.mesh?.material as THREE.Material)?.dispose();
      b.baseMesh?.geometry.dispose();
      (b.baseMesh?.material as THREE.Material)?.dispose();
      b.pulseRing?.geometry.dispose();
      (b.pulseRing?.material as THREE.Material)?.dispose();
    }
    this._pathLine?.geometry.dispose();
    (this._pathLine?.material as THREE.Material)?.dispose();
    this._geometries.forEach((g) => g.dispose());
    this._materials.forEach((m) => m.dispose());
    this._textures.forEach((t) => t.dispose());
    this._geometries = [];
    this._materials = [];
    this._textures = [];
  }
}

export default Scene0Map;