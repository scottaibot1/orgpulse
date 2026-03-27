/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // unzipper has an optional peer dep on @aws-sdk/client-s3 that we don't use
      config.externals = config.externals || [];
      config.externals.push({ "@aws-sdk/client-s3": "commonjs @aws-sdk/client-s3" });
    }
    return config;
  },
};

export default nextConfig;
