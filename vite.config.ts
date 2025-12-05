import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isVercel = process.env.VERCEL === '1';
  
  // Dynamically get the repository name from the current directory name
  // process.cwd() returns the absolute path, so we take the last part (folder name)
  const repoName = path.basename(process.cwd());
  
  return {
    base: isVercel ? '/' : `/${repoName}/`,
    plugins: [
    react({
      // 启用快速刷新
      fastRefresh: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'Luxury Christmas Tree',
        short_name: 'Xmas Tree',
        description: 'A high-fidelity 3D Christmas Tree experience',
        theme_color: '#001a0f',
        background_color: '#001a0f',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  // 构建优化配置 - 简化输出路径以避免Windows长路径问题
  build: {
    // 启用代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 将大型依赖分开打包
          'three': ['three'],
          'react-three': ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          'react': ['react', 'react-dom'],
          'framer': ['framer-motion'],
        },
        // 简化资源文件名，避免长路径问题
        assetFileNames: 'a/[hash:6].[ext]',
        chunkFileNames: 'c/[hash:6].js',
        entryFileNames: 'e/[hash:6].js',
        // 减少初始加载体积
        compact: true,
      },
    },
    // 启用压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // 生成源映射，方便调试
    sourcemap: false,
    // 优化大文件处理
    chunkSizeWarningLimit: 1000,
  },
  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
    // 启用热模块替换
    hmr: true,
    // 增加服务器超时时间
    timeout: 60000,
  },
  // 预览服务器配置
  preview: {
    port: 8080,
    open: true,
    // 配置缓存策略
    headers: {
      'Cache-Control': 'public, max-age=600',
    },
  },
  // 优化依赖预构建
  optimizeDeps: {
    // 预构建大型依赖
    include: ['three', '@react-three/fiber', '@react-three/drei', 'framer-motion'],
    // 禁用自动预构建，提高开发速度
    force: false,
  },
  }
})
