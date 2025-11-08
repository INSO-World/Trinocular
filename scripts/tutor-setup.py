import re
from pathlib import Path

# Make a secret file with a dummy secret value
# Existing secret files are replaced
def make_secret_file( path: Path ):
  if path.is_dir():
    path.rmdir()

  if path.is_file():
    path.unlink()
  
  print(f'Create dummy secret file {path}')
  
  path.write_text('dummy-secret-data')



# Basic function to update a key-value-pair in an .env file
def replace_env_line(path: Path, key: str, new_value: str):
  if not path.exists():
    raise FileNotFoundError(f".env file not found at: {path}")

  lines = path.read_text().splitlines()
  updated_lines = []
  key_found = False

  for line in lines:
    if re.match(f"^\\s*{key}\\s*=", line):
      print(f'Updating {key} to {new_value}')
      updated_lines.append(f"{key}={new_value}")
      key_found = True
    else:
      updated_lines.append(line)

  if not key_found:
    print(f'Key {key} not found, it will be appended')
    updated_lines.append(f"{key}={new_value}")

  path.write_text("\n".join(updated_lines) + "\n")



# Make the script independent from where it is run
base_dir = Path( __file__ ).parent.parent.absolute()
print(f'Project base directory: {base_dir}')

make_secret_file( base_dir / 'secrets/auth_client.txt' )
make_secret_file( base_dir / 'secrets/fluentbit_db.txt' )
make_secret_file( base_dir / 'secrets/internal_api.txt' )
make_secret_file( base_dir / 'secrets/keycloak_admin.txt' )
make_secret_file( base_dir / 'secrets/postgres.txt' )
make_secret_file( base_dir / 'secrets/session.txt' )

replace_env_line( base_dir / 'src/auth/.env', 'ADMIN_USER_ROLE', '""')
replace_env_line( base_dir / 'src/auth/.env', 'ACCEPTED_USER_EMAILS_FILE', '"" # "/run/auth/accepted-emails.txt"')
replace_env_line( base_dir / 'src/auth/.env', 'PASS_THROUGH_MODE', 'true')
replace_env_line( base_dir / 'src/scheduler/.env', 'ENABLE_SCHEDULED_TASKS', 'false')
