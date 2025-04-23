import { readdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory of this script file
const __dirname = dirname(fileURLToPath(import.meta.url));

// Define the paths
const baseDir = resolve(__dirname, '..');
const srcDir = join(baseDir, 'src');

async function safeRename(oldPath, newPath) {
  if (existsSync(oldPath)) {
    try {
      await rename(oldPath, newPath);
      // console.log(`Renamed ${oldPath} to ${newPath}`);
    } catch (err) {
      console.error(`Failed to rename ${oldPath} to ${newPath}:`, err);
    }
  }
}

try {
  // Read the contents of the '/src' directory
  const directories = await readdir(srcDir, { withFileTypes: true });
  const tasks = [];

  // Go through all directories in '/src'
  for (const dirent of directories) {
    if (dirent.isDirectory()) {
      const dirPath = join(srcDir, dirent.name);
      const packageJsonPath = join(dirPath, 'package.json');
      const nodeModulesPath = join(dirPath, 'node_modules');
      const tempNodeModulesPath = join(dirPath, '_node_modules');

      // Check if a package.json exist
      if (!existsSync(packageJsonPath)) {
        continue;
      }

      console.log(`Updating package-lock.json in ${dirPath}`);

      // Temporarily rename node_modules to _node_modules if it exists
      await safeRename(nodeModulesPath, tempNodeModulesPath);

      // Run the npm command in the directory
      tasks.push(
        new Promise((res, rej) =>
          exec('npm i --package-lock-only', { cwd: dirPath }, async (error, stdout, stderr) => {
            if (error) {
              console.error(`Error running npm in ${dirPath}:`, error.message);
              rej();
            }

            // Rename _node_modules back to node_modules
            await safeRename(tempNodeModulesPath, nodeModulesPath);

            res({ dirPath, stdout, stderr });
          })
        )
      );
    }
  }

  // Wait for all tasks to finish
  const outputs = await Promise.allSettled(tasks);

  // Print the results
  for (const { status, value, reason } of outputs) {
    if (status === 'rejected') {
      continue;
    }

    const { dirPath, stdout, stderr } = value;

    console.log('\n----------------------------------');
    console.log(`npm output in ${dirPath}:\n${stdout}`);

    if (stderr) {
      console.error(`npm errors in ${dirPath}:\n${stderr}`);
    }
  }
} catch (err) {
  console.error('Error processing directories:', err);
}
