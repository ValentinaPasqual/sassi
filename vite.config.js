// vite.config.js
import { defineConfig } from 'vite'
import { resolve } from 'path'

const BASE_PATH = '/sassi/';

export default defineConfig({
  base: BASE_PATH,
  
  define: {
    __APP_ID__: JSON.stringify(BASE_PATH.replace(/\//g, '') || 'root')
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        mappa: resolve(__dirname, 'pages/mappa.html'),
        indice: resolve(__dirname, 'pages/indice.html'),
        narrative: resolve(__dirname, 'pages/narrative.html'),
        pages: resolve(__dirname, 'pages/record.html')
      }
    }
  }
})


// import { defineConfig } from 'vite'
// import { resolve } from 'path'

// export default defineConfig({
//   base: '/leda/',
  
//   build: {
//     outDir: 'dist',
//     assetsDir: 'assets',
    
//     rollupOptions: {
//       input: {
//         main: resolve(__dirname, 'index.html'),
//         mappa: resolve(__dirname, 'pages/mappa.html'),
//         indice: resolve(__dirname, 'pages/indice.html'),
//         narrative: resolve(__dirname, 'pages/narrative.html'),
//         pages: resolve(__dirname, 'pages/record.html')
//       },
//       output: {
//         // The path prefixing is handled automatically by Vite
//         // when using the base option, so we only need to define
//         // the directory structure
//         entryFileNames: 'assets/js/[name].js',
//         chunkFileNames: 'assets/js/[name]-[hash].js',
//         assetFileNames: (info) => {
//           if (info.name.endsWith('.css')) {
//             return 'assets/css/[name][extname]';
//           }
//           return 'assets/[ext]/[name][extname]';
//         }
//       }
//     }
//   }
// })