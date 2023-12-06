import fs from "fs";
import * as path from "path";
import ejs from "ejs";
import { isBinaryPath } from "./binary-extensions";
import { chmodAndroidGradlewFilesTask } from "./chmod-android-gradle-files";

/**
 * Generates a folder of files based on provided templates.
 *
 * While doing so it performs two substitutions:
 * - Substitutes segments of file names surrounded by __
 * - Uses ejs to substitute values in templates
 *
 * Examples:
 * ```typescript
 * generateFiles(tree, path.join(__dirname , 'files'), './tools/scripts', {tmpl: '', name: 'myscript'})
 * ```
 * This command will take all the files from the `files` directory next to the place where the command is invoked from.
 * It will replace all `__tmpl__` with '' and all `__name__` with 'myscript' in the file names, and will replace all
 * `<%= name %>` with `myscript` in the files themselves.
 * `tmpl: ''` is a common pattern. With it you can name files like this: `index.ts__tmpl__`, so your editor
 * doesn't get confused about incorrect TypeScript files.
 *
 * @param source - the source folder of files (absolute path)
 * @param target - the target folder (relative to the tree root)
 * @param substitutions - an object of key-value pairs
 */
export function generateFiles(
  source: string,
  target: string,
  substitutions: { [k: string]: any }
) {
  const files = allFilesInDir(source);
  const copySource: string[] = [];

  if (files.length === 0) {
    throw new Error(
      `generateFiles: No files found in "${source}". Are you sure you specified the correct path?`
    );
  } else {
    files.forEach((filePath) => {
      let newContent: Buffer | string;
      const computedPath = computePath(source, target, filePath, substitutions);

      copySource.push(computedPath);

      if (isBinaryPath(filePath)) {
        newContent = fs.readFileSync(filePath);
      } else {
        const template = fs.readFileSync(filePath, "utf-8");
        try {
          newContent = ejs.render(template, substitutions, {
            filename: filePath,
          });
        } catch (e) {
          throw e;
        }
      }

      write(computedPath, newContent);
    });

    chmodAndroidGradlewFilesTask(path.join(target, "android"));
  }
}

function write(filePath: string, content: Buffer | string) {
  ensureDirSync(filePath);
  fs.writeFile(filePath, content, (error) => {
    if (error) {
      console.error(error.message);
    }
  });
}

function ensureDirSync(filePath: string) {
  let dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirSync(dirname);
  fs.mkdirSync(dirname);
}

function computePath(
  srcFolder: string,
  target: string,
  filePath: string,
  substitutions: { [k: string]: any }
): string {
  const relativeFromSrcFolder = path.relative(srcFolder, filePath);
  let computedPath = path.join(target, relativeFromSrcFolder);
  if (computedPath.endsWith(".template")) {
    computedPath = computedPath.substring(0, computedPath.length - 9);
  }

  if (computedPath.endsWith("xcode.env")) {
    computedPath = computedPath.split("xcode.env").join(".xcode.env");
  }

  Object.entries(substitutions).forEach(([propertyName, value]) => {
    computedPath = computedPath.split(`__${propertyName}__`).join(value);
  });
  return computedPath;
}

function allFilesInDir(parent: string): string[] {
  let files: string[] = [];
  try {
    fs.readdirSync(parent).forEach((c) => {
      const child = path.join(parent, c);
      try {
        const stats = fs.statSync(child);
        if (!stats.isDirectory()) {
          files.push(child);
        } else if (stats.isDirectory()) {
          files = [...files, ...allFilesInDir(child)];
        }
      } catch {}
    });
  } catch {}
  return files;
}
