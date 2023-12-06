import { chmodSync } from "fs";
import { join } from "path";

export function chmodAndroidGradlewFiles(androidFolder: string) {
  chmodSync(join(androidFolder, "gradlew"), 0o775);
  chmodSync(join(androidFolder, "gradlew.bat"), 0o775);
}

export function chmodAndroidGradlewFilesTask(androidFolder: string) {
  try {
    chmodAndroidGradlewFiles(androidFolder);
  } catch {
    throw new Error(`chmod failed gradlew file under ${androidFolder}`);
  }
}
