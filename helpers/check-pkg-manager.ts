import { PackageManager } from "./get-pkg-manager";
import { execSync } from "child_process";
import semver from "semver";

export const checkPackageManagerAvailability = (
  packageManager: PackageManager
) => {
  switch (packageManager) {
    case "npm":
      return getNpmVersionIfAvailable();
    case "pnpm":
      return getPnpmVersionIfAvailable();
    case "yarn":
      return getYarnVersionIfAvailable();
    case "bun":
      getBunVersionIfAvailable();
    default:
      return false;
  }
};

export function getNpmVersionIfAvailable() {
  let npmVersion;
  try {
    // execSync returns a Buffer -> convert to string
    npmVersion = (
      execSync("npm --version", {
        stdio: [0, "pipe", "ignore"],
      }).toString() || ""
    ).trim();

    return npmVersion;
  } catch (error) {
    return false;
  }
}

export function getPnpmVersionIfAvailable() {
  let pnpmVersion;
  try {
    // execSync returns a Buffer -> convert to string
    pnpmVersion = (
      execSync("pnpm --version", {
        stdio: [0, "pipe", "ignore"],
      }).toString() || ""
    ).trim();

    return pnpmVersion;
  } catch (error) {
    return false;
  }
}

export function getYarnVersionIfAvailable() {
  let yarnVersion;
  try {
    // execSync returns a Buffer -> convert to string
    yarnVersion = (
      execSync("yarn --version", {
        stdio: [0, "pipe", "ignore"],
      }).toString() || ""
    ).trim();
  } catch (error) {
    return null;
  }
  // yarn < 0.16 has a 'missing manifest' bug
  try {
    if (semver.gte(yarnVersion, "0.16.0")) {
      return yarnVersion;
    }
    return false;
  } catch (error) {
    console.error(`Cannot parse yarn version: ${yarnVersion}`);
    return false;
  }
}

export function getBunVersionIfAvailable() {
  let bunVersion;

  try {
    bunVersion = (
      execSync("bun --version", {
        stdio: [0, "pipe", "ignore"],
      }).toString() || ""
    ).trim();
  } catch (error) {
    return false;
  }

  try {
    if (semver.gte(bunVersion, "1.0.0")) {
      return bunVersion;
    }
    return false;
  } catch (error) {
    console.error(`Cannot parse bun version: ${bunVersion}`);
    return false;
  }
}
