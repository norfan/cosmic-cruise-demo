/**
 * Physics - 2D/3D 物理工具
 * 提供碰撞检测和向量计算
 */

import * as THREE from 'three';

export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Vector2D;
  max: Vector2D;
}

export interface BoundingSphere {
  center: Vector3D;
  radius: number;
}

export interface Ray {
  origin: Vector3D;
  direction: Vector3D;
}

export interface RayHit {
  hit: boolean;
  point?: Vector3D;
  distance?: number;
  normal?: Vector3D;
}

/**
 * 2D 向量工具
 */
export const Vector2 = {
  create(x = 0, y = 0): Vector2D {
    return { x, y };
  },

  add(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x + b.x, y: a.y + b.y };
  },

  sub(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x - b.x, y: a.y - b.y };
  },

  scale(v: Vector2D, s: number): Vector2D {
    return { x: v.x * s, y: v.y * s };
  },

  length(v: Vector2D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  normalize(v: Vector2D): Vector2D {
    const len = Vector2.length(v);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },

  dot(a: Vector2D, b: Vector2D): number {
    return a.x * b.x + a.y * b.y;
  },

  distance(a: Vector2D, b: Vector2D): number {
    return Vector2.length(Vector2.sub(b, a));
  },

  lerp(a: Vector2D, b: Vector2D, t: number): Vector2D {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  },

  rotate(v: Vector2D, angle: number): Vector2D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos,
    };
  },
};

/**
 * 3D 向量工具
 */
export const Vector3 = {
  create(x = 0, y = 0, z = 0): Vector3D {
    return { x, y, z };
  },

  add(a: Vector3D, b: Vector3D): Vector3D {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },

  sub(a: Vector3D, b: Vector3D): Vector3D {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },

  scale(v: Vector3D, s: number): Vector3D {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  },

  length(v: Vector3D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },

  lengthSquared(v: Vector3D): number {
    return v.x * v.x + v.y * v.y + v.z * v.z;
  },

  normalize(v: Vector3D): Vector3D {
    const len = Vector3.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },

  dot(a: Vector3D, b: Vector3D): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },

  cross(a: Vector3D, b: Vector3D): Vector3D {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  },

  distance(a: Vector3D, b: Vector3D): number {
    return Vector3.length(Vector3.sub(b, a));
  },

  distanceSquared(a: Vector3D, b: Vector3D): number {
    return Vector3.lengthSquared(Vector3.sub(b, a));
  },

  lerp(a: Vector3D, b: Vector3D, t: number): Vector3D {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  },

  clone(v: Vector3D): Vector3D {
    return { x: v.x, y: v.y, z: v.z };
  },

  fromThree(v: THREE.Vector3): Vector3D {
    return { x: v.x, y: v.y, z: v.z };
  },

  toThree(v: Vector3D): THREE.Vector3 {
    return new THREE.Vector3(v.x, v.y, v.z);
  },
};

/**
 * 碰撞检测
 */
export const Collision = {
  /**
   * 球体与球体碰撞检测
   */
  sphereSphere(a: BoundingSphere, b: BoundingSphere): boolean {
    const distSq = Vector3.lengthSquared(Vector3.sub(a.center, b.center));
    const radiusSum = a.radius + b.radius;
    return distSq <= radiusSum * radiusSum;
  },

  /**
   * 点是否在球体内
   */
  pointInSphere(point: Vector3D, sphere: BoundingSphere): boolean {
    return Vector3.distanceSquared(point, sphere.center) <= sphere.radius * sphere.radius;
  },

  /**
   * 球体与射线检测
   */
  raySphere(ray: Ray, sphere: BoundingSphere): RayHit {
    const oc = Vector3.sub(ray.origin, sphere.center);
    const a = Vector3.dot(ray.direction, ray.direction);
    const b = 2 * Vector3.dot(oc, ray.direction);
    const c = Vector3.dot(oc, oc) - sphere.radius * sphere.radius;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return { hit: false };
    }

    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t < 0) {
      return { hit: false };
    }

    const point = Vector3.add(ray.origin, Vector3.scale(ray.direction, t));
    const normal = Vector3.normalize(Vector3.sub(point, sphere.center));

    return {
      hit: true,
      point,
      distance: t,
      normal,
    };
  },

  /**
   * AABB 碰撞检测
   */
  aabb(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.min.x <= b.max.x &&
      a.max.x >= b.min.x &&
      a.min.y <= b.max.y &&
      a.max.y >= b.min.y
    );
  },

  /**
   * 点是否在 AABB 内
   */
  pointInAABB(point: Vector2D, box: BoundingBox): boolean {
    return (
      point.x >= box.min.x &&
      point.x <= box.max.x &&
      point.y >= box.min.y &&
      point.y <= box.max.y
    );
  },

  /**
   * 两个 AABB 的重叠区域
   */
  aabbOverlap(a: BoundingBox, b: BoundingBox): BoundingBox | null {
    if (!Collision.aabb(a, b)) return null;

    return {
      min: {
        x: Math.max(a.min.x, b.min.x),
        y: Math.max(a.min.y, b.min.y),
      },
      max: {
        x: Math.min(a.max.x, b.max.x),
        y: Math.min(a.max.y, b.max.y),
      },
    };
  },

  /**
   * 圆形重叠区域面积（2D）
   */
  circleOverlapArea(center1: Vector2D, r1: number, center2: Vector2D, r2: number): number {
    const dist = Vector2.distance(center1, center2);
    const sumRadius = r1 + r2;

    if (dist >= sumRadius) return 0;

    if (dist <= Math.abs(r1 - r2)) {
      const smaller = Math.min(r1, r2);
      return Math.PI * smaller * smaller;
    }

    // 圆形重叠面积计算（透镜形状）
    const d1 = r1 * r1 - r2 * r2 + dist * dist;
    const cos1 = d1 / (2 * r1 * dist);
    const cos2 = d1 / (2 * r2 * dist);

    const sector1 = r1 * r1 * Math.acos(cos1);
    const sector2 = r2 * r2 * Math.acos(cos2);
    const triangle = 0.5 * Math.sqrt(
      (sumRadius - dist) *
      (dist + r1 - r2) *
      (dist - r1 + r2) *
      (-dist + r1 + r2)
    );

    return sector1 + sector2 - triangle;
  },
};

/**
 * 物理模拟
 */
export const Physics = {
  /**
   * 计算椭圆轨道上的点
   */
  ellipsePoint(
    center: Vector2D,
    radiusX: number,
    radiusY: number,
    angle: number
  ): Vector2D {
    return {
      x: center.x + radiusX * Math.cos(angle),
      y: center.y + radiusY * Math.sin(angle),
    };
  },

  /**
   * 计算匀速圆周运动的位置
   */
  circularMotion(
    center: Vector2D,
    radius: number,
    angularVelocity: number,
    time: number
  ): Vector2D {
    const angle = angularVelocity * time;
    return Physics.ellipsePoint(center, radius, radius, angle);
  },

  /**
   * 计算开普勒轨道（简化版）
   */
  keplerOrbit(
    center: Vector2D,
    semiMajorAxis: number,
    eccentricity: number,
    meanAnomaly: number
  ): Vector2D {
    // 简化的开普勒方程求解
    const E = meanAnomaly;
    const a = semiMajorAxis;
    const e = eccentricity;

    return {
      x: center.x + a * (Math.cos(E) - e),
      y: center.y + a * Math.sqrt(1 - e * e) * Math.sin(E),
    };
  },

  /**
   * 简化的引力计算
   */
  gravityForce(
    mass1: number,
    mass2: number,
    distance: number,
    G = 6.674e-11
  ): number {
    if (distance === 0) return 0;
    return (G * mass1 * mass2) / (distance * distance);
  },
};

export default Physics;
