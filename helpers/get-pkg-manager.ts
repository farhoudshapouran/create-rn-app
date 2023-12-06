export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export const PackageManagers = [
  { title: "npm", value: "npm" },
  // { title: "pnpm", value: "pnpm" },
  { title: "yarn", value: "yarn" },
  { title: "bun", value: "bun" },
];

export function getPkgManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent || "";

  if (userAgent.startsWith("yarn")) {
    return "yarn";
  }

  // if (userAgent.startsWith("pnpm")) {
  //   return "pnpm";
  // }

  if (userAgent.startsWith("bun")) {
    return "bun";
  }

  return "npm";
}
