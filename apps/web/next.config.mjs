import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["@shared"] = path.resolve(
      __dirname,
      "../../packages/shared/src"
    );
    return config;
  }
};

export default nextConfig;
