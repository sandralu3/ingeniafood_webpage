/** @type {import('next').NextConfig} */
const nextConfig = {
  // Eliminamos cualquier referencia manual a webpack o turbopack experimental
  // para que Next.js use los valores por defecto que no causen conflicto.

  allowedDevOrigins: ["192.168.1.13", "localhost", "127.0.0.1"],

  images: {
    unoptimized: true // Esto ayuda con las imágenes locales en desarrollo
  },

  // Si necesitas alguna configuración específica de Turbopack, usa la nueva sintaxis:
  experimental: {
    // Dejamos esto vacío para que no lance el error de "Unrecognized key"
  }
};

export default nextConfig;
