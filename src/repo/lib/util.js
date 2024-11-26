import fs from 'node:fs/promises';

export async function isDirectoryNotEmpty(directoryPath) {
  try {
    // Check if path points to directory
    const stat = await fs.stat(directoryPath);
    if (!stat.isDirectory()) {
      return false;
    }

    // Check if not empty
    const files = await fs.readdir(directoryPath);
    return files.length > 0;
  } catch (err) {
    return false;
  }
}
