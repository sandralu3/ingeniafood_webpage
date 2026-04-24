/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  allowedDevOrigins: ["192.168.1.13", "localhost", "127.0.0.1"],

  // Reduce RAM en dev manteniendo pocas rutas activas en memoria.
  onDemandEntries: {
    maxInactiveAge: 30_000,
    pagesBufferLength: 2
  },

  // Limita el contexto de Turbopack al root actual del proyecto.
  turbopack: {
    root: process.cwd()
  },

  images: {
    // En desarrollo evita procesamiento pesado de imágenes.
    unoptimized: isDev,
    minimumCacheTTL: isDev ? 60 : 14_400
  }
};

export default nextConfig;
