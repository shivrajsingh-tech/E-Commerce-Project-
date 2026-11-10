/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/seller/dashboard",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/customer/dashboard",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/seller",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/customer",
        destination: "/dashboard",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
