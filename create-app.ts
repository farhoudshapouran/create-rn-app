import retry from "async-retry";
import { red, green, cyan } from "picocolors";
import fs from "fs";
import path from "path";
import type { RepoInfo } from "./helpers/examples";
import {
  downloadAndExtractExample,
  downloadAndExtractRepo,
  getRepoInfo,
  existsInRepo,
  hasRepo,
} from "./helpers/examples";
import { makeDir } from "./helpers/make-dir";
import { tryGitInit } from "./helpers/git";
import { install } from "./helpers/install";
import { isFolderEmpty } from "./helpers/is-folder-empty";
import { getOnline } from "./helpers/is-online";
import { isWriteable } from "./helpers/is-writeable";
import type { PackageManager } from "./helpers/get-pkg-manager";

import type { TemplateMode, TemplateType } from "./templates";
import { getTemplateFile, installTemplate } from "./templates";

export class DownloadError extends Error {}

type AppProps = {
  appPath: string;
  packageManager: PackageManager;
  example?: string;
  examplePath?: string;
  typescript: boolean;
  eslint: boolean;
  srcDir: boolean;
  importAlias: string;
  useNavigation: boolean;
  useExpoModules: boolean;
};

export async function createApp({
  appPath,
  packageManager,
  example,
  examplePath,
  typescript,
  eslint,
  srcDir,
  importAlias,
  useNavigation,
  useExpoModules,
}: AppProps): Promise<void> {
  let repoInfo: RepoInfo | undefined;
  const mode: TemplateMode = typescript ? "ts" : "js";
  const template: TemplateType = "default";

  if (example) {
  }

  const root = path.resolve(appPath);

  if (!(await isWriteable(path.dirname(root)))) {
    console.error(
      "The application path is not writable, please check folder permissions and try again."
    );
    console.error(
      "It is likely you do not have write permissions for this folder."
    );
    process.exit(1);
  }

  const appName = path.basename(root);

  await makeDir(root);
  if (!isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  const useYarn = packageManager === "yarn";
  const isOnline = !useYarn || (await getOnline());
  const originalDirectory = process.cwd();

  console.log();
  console.log(`Creating a new React Native app in ${green(root)}.`);
  console.log();

  process.chdir(root);

  const packageJsonPath = path.join(root, "package.json");
  let hasPackageJson = false;

  if (example) {
  } else {
    /**
     * If an example repository is not provided for cloning, proceed
     * by installing from a template.
     */
    await installTemplate({
      appName,
      root,
      template,
      mode,
      packageManager,
      isOnline,
      eslint,
      srcDir,
      importAlias,
    });
  }

  if (tryGitInit(root)) {
    console.log("Initialized a git repository.");
    console.log();
  }

  let cdpath: string;
  if (path.join(originalDirectory, appName) === appPath) {
    cdpath = appName;
  } else {
    cdpath = appPath;
  }

  console.log(`${green("Success!")} Created ${appName} at ${appPath}`);

  if (hasPackageJson) {
    console.log("Inside that directory, you can run several commands:");
    console.log();
    console.log(cyan(`  ${packageManager} ${useYarn ? "" : "run "}dev`));
    console.log("    Starts the development server.");
    console.log();
    console.log(cyan(`  ${packageManager} ${useYarn ? "" : "run "}build`));
    console.log("    Builds the app for production.");
    console.log();
    console.log(cyan(`  ${packageManager} start`));
    console.log("    Runs the built app in production mode.");
    console.log();
    console.log("We suggest that you begin by typing:");
    console.log();
    console.log(cyan("  cd"), cdpath);
    console.log(`  ${cyan(`${packageManager} ${useYarn ? "" : "run "}dev`)}`);
  }
  console.log();
}
