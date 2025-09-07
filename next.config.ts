import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Configuración específica para pdf-parse
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
        encoding: false,
      };
      
      // Excluir archivos de prueba de pdf-parse
      config.module.rules.push({
        test: /\.pdf$/,
        use: 'ignore-loader'
      });
    }
    
    return config;
  },
  
  // Configuración experimental mejorada
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
    turbo: {
      rules: {
        '*.pdf': {
          loaders: ['ignore-loader'],
          as: '*.js',
        },
      },
    },
  },
  
  // Excluir archivos de prueba durante el build
  excludeFile: (str:string) => {
    return /test\/data\/.*\.pdf$/.test(str);
  },
};

export default nextConfig;