A command line tool to copy the files in a git repository to another one, replacing any proprietary files and folders with open-source alternatives.

# Proposed implementation

* A config file that takes the old repository, the folder for the new files, and a list of overrides. Written as a JSON5 file.
* overrides are globs or single files - can point to null to omit the file entirely, or to another file in the `.shipit` directory to replace it in the destination repository