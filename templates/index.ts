import { install } from "../helpers/install";
import { makeDir } from "../helpers/make-dir";
import { copy } from "../helpers/copy";
import { async as glob } from "fast-glob";
import os from "os";
import fs from "fs/promises";
import path from "path";
import { cyan, bold } from "picocolors";
import { Sema } from "async-sema";
import { GetTemplateFileArgs, InstallTemplateArgs } from "./types";
import { names } from "../helpers/names";
import { generateFiles } from "../helpers/create-project-files";
import versions from "../helpers/versions";
import { sortByKeys } from "../helpers/sort";

/**
 * Get the file path for a given file in a template.
 */
export const getTemplateFile = ({
  template,
  mode,
  file,
}: GetTemplateFileArgs): string => {
  return path.join(__dirname, template, mode, file);
};

export const SRC_TS_FILE_NAMES = ["App.tsx"];
export const SRC_JS_FILE_NAMES = ["App.jsx"];

/**
 * Install a React Native internal template to a given `root` directory.
 */
export const installTemplate = async ({
  appName,
  root,
  packageManager,
  isOnline,
  template,
  mode,
  eslint,
  srcDir,
  importAlias,
}: InstallTemplateArgs) => {
  console.log(bold(`Using ${packageManager}.`));
  const { className, propertyName, constantName, fileName } = names(appName);

  /**
   * Copy the template files to the target directory.
   */
  console.log("\nInitializing project with template:", template, "\n");
  const templatePath = path.join(__dirname, template, mode);
  const filesPath = path.join(__dirname, "templates", "files");

  generateFiles(filesPath, root, {
    className,
    propertyName,
    constantName,
    fileName,
    displayName: className,
    lowerCaseName: className.toLowerCase(),
    entryApp: srcDir ? "./src/App" : "./App",
  });

  const copySource = ["**"];
  if (!eslint) copySource.push("!eslintrc.json");

  await copy(copySource, root, {
    parents: true,
    cwd: templatePath,
    rename(name) {
      switch (name) {
        case "gitignore":
        case "eslintrc.json":
        case "prettierrc.json": {
          return `.${name}`;
        }
        // README.md is ignored by webpack-asset-relocator-loader used by ncc:
        // https://github.com/vercel/webpack-asset-relocator-loader/blob/e9308683d47ff507253e37c9bcbb99474603192b/src/asset-relocator.js#L227
        case "README-template.md": {
          return "README.md";
        }
        default: {
          return name;
        }
      }
    },
  });

  const tsconfigFile = path.join(
    root,
    mode === "js" ? "jsconfig.json" : "tsconfig.json"
  );

  await fs.writeFile(
    tsconfigFile,
    (await fs.readFile(tsconfigFile, "utf8"))
      .replace(
        `"@/*": ["./*"]`,
        srcDir ? `"@/*": ["./src/*"]` : `"@/*": ["./*"]`
      )
      .replace(`"@/*":`, `"${importAlias}":`)
  );

  // update import alias in any files if not using the default
  if (importAlias !== "@/*") {
    const files = await glob("**/*", {
      cwd: root,
      dot: true,
      stats: false,
    });
    const writeSema = new Sema(8, { capacity: files.length });
    await Promise.all(
      files.map(async (file) => {
        // We don't want to modify compiler options in [ts/js]config.json
        if (file === "tsconfig.json" || file === "jsconfig.json") return;
        await writeSema.acquire();
        const filePath = path.join(root, file);
        if ((await fs.stat(filePath)).isFile()) {
          await fs.writeFile(
            filePath,
            (await fs.readFile(filePath, "utf8")).replace(
              `@/`,
              `${importAlias.replace(/\*/g, "")}`
            )
          );
        }
        await writeSema.release();
      })
    );
  }

  if (srcDir) {
    await makeDir(path.join(root, "src"));
    const SRC_DIR_NAMES = mode === "ts" ? SRC_TS_FILE_NAMES : SRC_JS_FILE_NAMES;
    await Promise.all(
      SRC_DIR_NAMES.map(async (file) => {
        await fs
          .rename(path.join(root, file), path.join(root, "src", file))
          .catch((err) => {
            if (err.code !== "ENOENT") {
              throw err;
            }
          });
      })
    );

    const testFile = path.join(
      root,
      "__tests__",
      mode === "js" ? "App.test.jsx" : "App.test.tsx"
    );

    await fs.writeFile(
      testFile,
      (await fs.readFile(testFile, "utf8")).replace("../App", "../src/App")
    );
  }

  /** Create a package.json for the new project and write it to disk. */
  const packageJson: any = {
    name: appName,
    version: "0.0.1",
    private: true,
    scripts: {
      android: "react-native run-android",
      ios: "react-native run-ios",
      lint: "eslint .",
      start: "react-native start",
      test: "jest",
    },
    /**
     * Default dependencies.
     */
    dependencies: {
      react: versions.react,
      "react-native": versions.reactNative,
    },
    devDependencies: {
      "@babel/core": versions.babelCore,
      "@babel/preset-env": versions.babelPresentEnv,
      "@babel/runtime": versions.babelRuntime,
      "@react-native/metro-config": versions.reactNativeMetroConfig,
      "babel-jest": versions.babelJest,
      jest: versions.jest,
      "metro-react-native-babel-preset": versions.metroReactNativeBabelPreset,
      prettier: versions.prettier,
      "react-test-renderer": versions.reactTestRenderer,
      ...(packageManager === "pnpm" && {
        "@react-native-community/cli-platform-ios":
          versions.reactNativeCommunityCliPlatformIOS,
        "@react-native-community/cli-platform-android":
          versions.reactNativeCommunityCliPlatformAndroid,
      }),
    },
    engines: {
      node: ">=16",
    },
  };

  /**
   * TypeScript projects will have type definitions and other devDependencies.
   */
  if (mode === "ts") {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      typescript: versions.typescript,
      "@types/react": versions.typesReact,
      "@types/react-test-renderer": versions.typesReactTestRenderer,
      "@tsconfig/react-native": versions.tsConfigReactNative,
    };
  }

  /* Default ESLint dependencies. */
  if (eslint) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      eslint: versions.eslint,
      "@react-native/eslint-config": versions.reactNativeESLintConfig,
    };
  }

  packageJson.devDependencies = sortByKeys(packageJson.devDependencies);

  const devDeps = Object.keys(packageJson.devDependencies).length;
  if (!devDeps) delete packageJson.devDependencies;

  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify(packageJson, null, 2) + os.EOL
  );

  console.log("\nInstalling dependencies:");
  for (const dependency in packageJson.dependencies)
    console.log(`- ${cyan(dependency)}`);

  if (devDeps) {
    console.log("\nInstalling devDependencies:");
    for (const dependency in packageJson.devDependencies)
      console.log(`- ${cyan(dependency)}`);
  }

  console.log();

  await install(packageManager, isOnline);
};

export * from "./types";
