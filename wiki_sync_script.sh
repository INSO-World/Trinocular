#!/bin/bash
# Script to handle and process README.md files from a Git repository
#
# This script scans for changes to README.md files between two Git commits (initial commit and HEAD),
# processes their paths, and copies them to a corresponding destination directory
# with a specific structure. It ensures that files are categorized into appropriate
# folders based on their originating path, converting paths to lowercase for uniformity.
#
# Usage:
#   Before running the script, ensure that the destination repository (Trinocular wiki repository) is cloned and up-to-date.
#   Run the script in the Trinocular repository directory. The root path for the destination is Trinocular's wiki reposiotry.
#   After the script was executed, commit and push the changes to the wiki repository.
#
# Key Features:
#   1. Handles different path scenarios (`src/`, `test/`, `secrets/`, and root-level).
#   2. Converts file paths to lowercase for consistency.
#   3. Creates necessary directories in the destination path if they don't exist.
#   4. Copies README.md files to the appropriate destination with renamed paths.
#
# Dependencies:
#   - `git` command-line tool
#   - Bash shell (version 4.0 or higher)
#
# Exit Codes:
#   - 0: Successful execution
#   - Non-zero: File(s) not found or other errors
#
# Note:
#   Customize the `root_path` variable to set the base directory for the destination files.

shopt -s nocasematch
not_found=0
for file in $(git diff --name-only 22d2d0d764f4c5dc7a4369c781fb84e4494971eb HEAD | grep -i 'README.md'); do
  echo $file
  root_path="../24ws-ase-pr-qse-07.wiki/Project-Documentation"
  # Convert the path to lowercase
  dest_path=$(echo "$file" | tr '[:upper:]' '[:lower:]')

  # Case 1: Handle src/
  if [[ $file == src/*/ReadMe.md ]]; then
    # Get parent directory of the file
    dest_path=${dest_path#src/}  # Remove "src/"
    dest_path=${dest_path%/readme.md}  # Remove "/ReadMe.md"
    dest_path="${root_path}/Service-Description/${dest_path}-Service.md"

  # Case 2: Handle test/
  elif [[ $file == test/*/ReadMe.md ]]; then
    dest_path=${dest_path#test/}  # Remove "test/"
    dest_path=${dest_path%/readme.md}  # Remove "/ReadMe.md"
    dest_path="${root_path}/Test-Instances/${dest_path}.md"

  # Case 3: Handle secret/
  elif [[ $file == secrets/ReadMe.md ]]; then
    dest_path=${dest_path#secret/}  # Remove "secret/"
    dest_path=${dest_path%/readme.md}  # Remove "/ReadMe.md"
    dest_path="${root_path}/Secrets.md"

  # Case 4: Handle root-level ReadMe.md
  elif [[ $file == ReadMe.md ]]; then
    dest_path="${root_path}/Trinocular.md"

  # Case 5: Default
  else
    dest_path="${root_path}/Unknown/$file"
  fi
  mkdir -p $(dirname $dest_path);
  cp $file $dest_path
done
exit $not_found