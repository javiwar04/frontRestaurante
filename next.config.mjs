/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build estricto: los errores de tipos SÍ frenan el build (antes se ignoraban)
  typescript: {
    ignoreBuildErrors: false,
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
