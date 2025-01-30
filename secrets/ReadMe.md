# Secrets Directory

Any `.txt` file in this directory is ignored via the `.gitignore` file. Make sure to
put your secrets into a text file and check that it does not get committed/pushed 
accidentally.

When editing secret files check that your editor did not add any whitespace like newlines
at the end, when automatic formatting is enabled. The file must only contain the secret
string, otherwise some services include the whitespace as part of the secret and get confused.
