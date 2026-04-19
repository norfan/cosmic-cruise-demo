import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 将可选 peer 依赖指向空模块 stub
      'matter-js': path.resolve(__dirname, './src/utils/matter-stub.js'),
      'ogl': path.resolve(__dirname, './src/utils/ogl-stub.js'),
      'react-icons/fi': path.resolve(__dirname, './src/utils/react-icons-stub.js'),
      '@chakra-ui/react': path.resolve(__dirname, './src/utils/chakra-stub.js'),
    },
  },
  build: {
    target: 'es6',
    chunkSizeLimit: 4 * 1024 * 1024,
  },
  server: {
    port: 5173,
    host: true,
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'unicornstudio-react',
      '@appletosolutions/reactbits',
      'framer-motion',
      'gsap',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
    ],
    exclude: ['matter-js'],
  },
});
