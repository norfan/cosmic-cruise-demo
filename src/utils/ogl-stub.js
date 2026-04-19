// ogl stub - provide exports needed by reactbits
// Note: reactbits has many peer dependencies, we provide stubs

export const Vec3 = class { constructor(x=0,y=0,z=0){ this.x=x;this.y=y;this.z=z; } };
export const Polyline = class {};
export const Triangle = class {};
export const Renderer = class {};
export const Transform = class {};
export const Program = class {};
export const Mesh = class {};
export const Texture = class {};
export const Plane = class {};
export const Sphere = class {};
export const Box = class {};
export const Cylinder = class {};
export const Cone = class {};
export const Torus = class {};
export const Camera = class {};
export const Geometry = class {};
export const GL = {};
export const Color = class {};
export const Mat4 = class {};
export const Quat = class {};
export const Euler = class {};
export const CameraPerspective = class {};
export const CameraOrtho = class {};
export const TransformHierarchy = class {};
export const UV = class {};
export const MathUtils = {};

export const Icon = () => null;
export const Button = () => null;
export const Flex = () => null;
export const Text = () => null;
export const HStack = () => null;
export const VStack = () => null;
export const Box$1 = () => null;
export const ChakraProvider = ({children}) => children;
export const extendTheme = () => ({});
export const useSafeArea = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
export const Observer = class {};

export const FiFileText = () => null;
export const FiCircle = () => null;
export const FiLayers = () => null;
export const FiLayout = () => null;
export const FiCode = () => null;

export default {};