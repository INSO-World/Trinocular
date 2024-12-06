import fs from 'node:fs';

export function readSecretEnv() {
  for (const varName in process.env) {
    const varValue = process.env[varName];
    if (varName.toLowerCase().endsWith('secret_file')) {
      // Only actually load files with docker compose secrets
      const secretName = varName.substring(0, varName.length - 5); // Takeoff the '_FILE' postfix from the name
      if (!varValue.startsWith('/run/secrets')) {
        console.log(`Ignoring secret variable '${secretName}' with unexpected path`);
        continue;
      }

      const fileContents = fs.readFileSync(varValue, 'utf-8').trim();
      process.env[secretName] = fileContents;

      console.log(`Loaded secret '${secretName}' into environment`);
    }
  }
}
