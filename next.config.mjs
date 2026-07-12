/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build estricto: los errores de tipos SÍ frenan el build (antes se ignoraban)
  typescript: {
    ignoreBuildErrors: false,
  },
  // ESLint no está configurado en este proyecto (plantilla v0); que su ausencia
  // no frene el build. El chequeo real de calidad es TypeScript (arriba).
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/",
        permanent: true,
      },
      {
        source: "/dashboard/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
