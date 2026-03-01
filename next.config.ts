import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', 
  
  // هذا القسم يخبر Next.js بتجاهل الميزات التي تتطلب خادم (Server)
  experimental: {
    // إيقاف ميزات السيرفر مؤقتاً لنجاح البناء الثابت
    serverActions: {
       bodySizeLimit: '2mb' 
    }
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@react-three/fiber', '@react-three/drei', 'three'],
  images: {
    unoptimized: true, 
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'yt3.ggpht.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'yt3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'tvquran.com', pathname: '/**' },
      { protocol: 'https', hostname: 'svs.gsfc.nasa.gov', pathname: '/**' },
      { protocol: 'https', hostname: 'dmusera.netlify.app', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.weatherapi.com', pathname: '/**' },
    ],
  },
};

export default nextConfig;
