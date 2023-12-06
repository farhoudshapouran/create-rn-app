#!/usr/bin/env node

import { cyan, green, red, yellow, bold, blue } from "picocolors";
import path from "path";
import prompts from "prompts";
import { Command } from "commander";
import Conf from "conf";
import checkForUpdate from "update-check";
import { createApp, DownloadError } from "./create-app";
import { getPkgManager, PackageManagers } from "./helpers/get-pkg-manager";
import { validateNpmName } from "./helpers/validate-pkg";
import packageJson from "./package.json";
import { isFolderEmpty } from "./helpers/is-folder-empty";
import fs from "fs";
import { checkPackageManagerAvailability } from "./helpers/check-pkg-manager";
import banner from "./banner";

let projectName: string = "";

const handleSigTerm = () => process.exit(0);

process.on("SIGINT", handleSigTerm);
process.on("SIGTERM", handleSigTerm);

const onPromptState = (state: any) => {
  if (state.aborted) {
    // If we don't re-enable the terminal cursor before exiting
    // the program, the cursor will remain hidden
    process.stdout.write("\x1B[?25h");
    process.stdout.write("\n");
    process.exit(1);
  }
};

const program = new Command(packageJson.name)
  .version(packageJson.version)
  .arguments("<project-directory>")
  .usage(`${green("<project-directory>")} [options]`)
  .action((name) => {
    projectName = name;
  })
  .option(
    "--ts, --typescript",
    `

  Initialize as a TypeScript project. (default)
`
  )
  .option(
    "--js, --javascript",
    `

  Initialize as a JavaScript project.
`
  )
  .option(
    "--eslint",
    `

  Initialize with eslint config.
`
  )
  .option(
    "--src-dir",
    `

  Initialize inside a \`src/\` directory.
`
  )
  .option(
    "--import-alias <alias-to-configure>",
    `

  Specify import alias to use (default "@/*").
`
  )
  .option(
    "--use-navigation",
    `

  Explicitly tell the CLI to bootstrap the application using npm
`
  )
  .option(
    "--use-expo-modules",
    `

  Explicitly tell the CLI to bootstrap the application using npm
`
  )
  .option(
    "--use-npm",
    `

  Explicitly tell the CLI to bootstrap the application using npm
`
  )
  //   .option(
  //     "--use-pnpm",
  //     `

  //   Explicitly tell the CLI to bootstrap the application using pnpm
  // `
  //   )
  .option(
    "--use-yarn",
    `

  Explicitly tell the CLI to bootstrap the application using Yarn
`
  )
  .option(
    "--use-bun",
    `

  Explicitly tell the CLI to bootstrap the application using Bun
`
  )
  .option(
    "-e, --example [name]|[github-url]",
    `

  An example to bootstrap the app with. You can use an example name
  from the Create-RN-App repo or a GitHub URL. The URL can use
  any branch and/or subdirectory
`
  )
  .option(
    "--example-path <path-to-example>",
    `

  In a rare case, your GitHub URL might contain a branch name with
  a slash (e.g. bug/fix-1) and the path to the example (e.g. foo/bar).
  In this case, you must specify the path to the example separately:
  --example-path foo/bar
`
  )
  .option(
    "--reset-preferences",
    `

  Explicitly tell the CLI to reset any stored preferences
`
  )
  .allowUnknownOption()
  .parse(process.argv);

const packageManager = !!program.useNpm
  ? "npm"
  : // : !!program.usePnpm
    //   ? "pnpm"
    !!program.useYarn
    ? "yarn"
    : !!program.useBun
      ? "bun"
      : getPkgManager();

async function run(): Promise<void> {
  const conf = new Conf({ projectName: "create-rn-app" });

  if (program.resetPreferences) {
    conf.clear();
    console.log(`Preferences reset successfully`);
    return;
  }

  if (typeof projectName === "string") {
    projectName = projectName.trim();
  }

  if (!projectName) {
    const res = await prompts({
      onState: onPromptState,
      type: "text",
      name: "projectName",
      message: "What is your project named?",
      initial: "my-app",
    });

    if (typeof res.projectName === "string") {
      projectName = res.projectName.trim();
    }
  }

  if (!projectName) {
    console.log(
      "\nPlease specify the project directory:\n" +
        `  ${cyan(program.name())} ${green("<project-directory>")}\n` +
        "For example:\n" +
        `  ${cyan(program.name())} ${green("my-awesome-app")}\n\n` +
        `Run ${cyan(`${program.name()} --help`)} to see all options.`
    );
    process.exit(1);
  }

  //////

  const { valid, problems } = validateNpmName(projectName);
  if (!valid) {
    console.error(
      `Could not create a project called ${red(
        `"${projectName}"`
      )} because of naming restrictions:`
    );

    problems!.forEach((p) => console.error(`    ${red(bold("*"))} ${p}`));
    process.exit(1);
  }

  if (program.example === true) {
    console.error(
      "Please provide an example name or url, otherwise remove the example option."
    );
    process.exit(1);
  }

  /**
   * Verify the project dir is empty or doesn't exist
   */
  const resolvedProjectPath = path.resolve(projectName);
  const root = path.resolve(resolvedProjectPath);
  const appName = path.basename(root);
  const folderExists = fs.existsSync(root);

  if (folderExists && !isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  const example = typeof program.example === "string" && program.example.trim();

  const preferences = (conf.get("preferences") || {}) as Record<
    string,
    boolean | string
  >;

  /**
   * If the user does not provide the necessary flags, prompt them for whether
   * to use TS or JS.
   */
  if (!example) {
    const defaults: typeof preferences = {
      typescript: true,
      eslint: true,
      srcDir: false,
      importAlias: "@/*",
      customizeImportAlias: false,
      useNavigation: false,
      useExpoModules: false,
      packageManager: packageManager,
    };

    const getPrefOrDefault = (field: string) =>
      preferences[field] ?? defaults[field];

    if (!program.typescript && !program.javascript) {
      const styledTypeScript = blue("TypeScript");
      const { typescript } = await prompts(
        {
          type: "toggle",
          name: "typescript",
          message: `Would you like to use ${styledTypeScript}?`,
          initial: getPrefOrDefault("typescript"),
          active: "Yes",
          inactive: "No",
        },
        {
          /**
           * User inputs Ctrl+C or Ctrl+D to exit the prompt. We should close the
           * process and not write to the file system.
           */
          onCancel: () => {
            console.error("Exiting.");
            process.exit(1);
          },
        }
      );
      /**
       * Depending on the prompt response, set the appropriate program flags.
       */
      program.typescript = Boolean(typescript);
      program.javascript = !Boolean(typescript);
      preferences.typescript = Boolean(typescript);
    }

    if (
      !process.argv.includes("--eslint") &&
      !process.argv.includes("--no-eslint")
    ) {
      const styledEslint = blue("ESLint");
      const { eslint } = await prompts({
        onState: onPromptState,
        type: "toggle",
        name: "eslint",
        message: `Would you like to use ${styledEslint}?`,
        initial: getPrefOrDefault("eslint"),
        active: "Yes",
        inactive: "No",
      });
      program.eslint = Boolean(eslint);
      preferences.eslint = Boolean(eslint);
    }

    if (
      !process.argv.includes("--src-dir") &&
      !process.argv.includes("--no-src-dir")
    ) {
      const styledSrcDir = blue("`src/` directory");
      const { srcDir } = await prompts({
        onState: onPromptState,
        type: "toggle",
        name: "srcDir",
        message: `Would you like to use ${styledSrcDir}?`,
        initial: getPrefOrDefault("srcDir"),
        active: "Yes",
        inactive: "No",
      });
      program.srcDir = Boolean(srcDir);
      preferences.srcDir = Boolean(srcDir);
    }

    if (
      typeof program.importAlias !== "string" ||
      !program.importAlias.length
    ) {
      const styledImportAlias = blue("import alias");

      const { customizeImportAlias } = await prompts({
        onState: onPromptState,
        type: "toggle",
        name: "customizeImportAlias",
        message: `Would you like to customize the default ${styledImportAlias} (${defaults.importAlias})?`,
        initial: getPrefOrDefault("customizeImportAlias"),
        active: "Yes",
        inactive: "No",
      });

      if (!customizeImportAlias) {
        // We don't use preferences here because the default value is @/* regardless of existing preferences
        program.importAlias = defaults.importAlias;
      } else {
        const { importAlias } = await prompts({
          onState: onPromptState,
          type: "text",
          name: "importAlias",
          message: `What ${styledImportAlias} would you like configured?`,
          initial: getPrefOrDefault("importAlias"),
          validate: (value) =>
            /.+\/\*/.test(value)
              ? true
              : "Import alias must follow the pattern <prefix>/*",
        });
        program.importAlias = importAlias;
        preferences.importAlias = importAlias;
      }
    }

    if (!process.argv.includes("--use-navigation")) {
      const styledUseNavigation = cyan("React Navigation");
      const { useNavigation } = await prompts({
        onState: onPromptState,
        type: "toggle",
        name: "useNavigation",
        message: `Would you like to use ${styledUseNavigation}?`,
        initial: getPrefOrDefault("useNavigation"),
        active: "Yes",
        inactive: "No",
      });
      program.useNavigation = Boolean(useNavigation);
      preferences.useNavigation = Boolean(useNavigation);
    }

    if (!process.argv.includes("--use-expo-modules")) {
      const styledUseExpoModules = yellow("Expo Modules");
      const { useExpoModules } = await prompts({
        onState: onPromptState,
        type: "toggle",
        name: "useExpoModules",
        message: `Would you like to use ${styledUseExpoModules}?`,
        initial: getPrefOrDefault("useExpoModules"),
        active: "Yes",
        inactive: "No",
      });
      program.useExpoModules = Boolean(useExpoModules);
      preferences.useExpoModules = Boolean(useExpoModules);
    }

    // --------------------

    if (
      !process.argv.includes("--use-npm") &&
      // !process.argv.includes("--use-pnpm") &&
      !process.argv.includes("--use-yarn") &&
      !process.argv.includes("--use-bun")
    ) {
      const { packageManagerName } = await prompts({
        onState: onPromptState,
        type: "select",
        name: "packageManagerName",
        message: `Please select package manager:`,
        instructions: false,
        choices: PackageManagers,
        initial: PackageManagers.findIndex(
          (item) => item.value === packageManager
        ),
      });
      program.packageManager = packageManagerName;
      preferences.packageManager = packageManagerName;
    } else {
      program.packageManager = packageManager;
    }
  }

  if (!checkPackageManagerAvailability(program.packageManager)) {
    console.log();
    console.error(
      `Seems like the ${red(
        program.packageManager
      )} package manager is not installed. Please install it or choose another package manager.`
    );
    console.log();
    process.exit(1);
  }

  console.log();
  console.log(banner);
  console.log();

  try {
    await createApp({
      appPath: resolvedProjectPath,
      packageManager: program.packageManager,
      example: example && example !== "default" ? example : undefined,
      examplePath: program.examplePath,
      typescript: program.typescript,
      eslint: program.eslint,
      srcDir: program.srcDir,
      importAlias: program.importAlias,
      useNavigation: program.useNavigation,
      useExpoModules: program.useExpoModules,
    });
  } catch (reason) {
    if (!(reason instanceof DownloadError)) {
      throw reason;
    }
  }
}

run()
  .then(() => {})
  .catch(async (reason) => {
    console.log();
    console.log("Aborting installation.");
    if (reason.command) {
      console.log(`  ${cyan(reason.command)} has failed.`);
    } else {
      console.log(
        red("Unexpected error. Please report it as a bug:") + "\n",
        reason
      );
    }
    console.log();

    //await notifyUpdate()

    process.exit(1);
  });
