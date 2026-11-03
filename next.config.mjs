/**
 * Static export so the app can be hosted on GitHub Pages (or opened from any
 * static host). NEXT_PUBLIC_BASE_PATH is set by the deploy workflow to
 * "/<repo-name>" for project sites.
 * @type {import('next').NextConfig}
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
