/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        { "@aws-sdk/client-s3": "commonjs @aws-sdk/client-s3" },
        { "@napi-rs/canvas": "commonjs @napi-rs/canvas" },
        { "pdfjs-dist": "commonjs pdfjs-dist" }
      );
    }
    return config;
  },
};

export default nextConfig;
