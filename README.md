# Carbonic Shift

A command line tool to copy the files in a git repository to another one, replacing any proprietary files and folders with open-source alternatives.

## Usage

```
carbonic --config path/to/config.json5
```

If a `config` parameter isn't provided, the configuration file is assumed to live at `.shift.json5` in the current directory.

## Building from source

Carbonic Shift uses `pnpm` as its package manager:

```
$ pnpm install
$ node build
```

## What does it do?

Copies all the git-tracked files from a source repository to a destination folder (ideally another repository). This can be used to selectively release parts of a repository publicly and squash history. 

As part of the copying process, the tool can also `replace` files that should be kept private. 

> In the future, it should also be able to `rename` files for similar reasons.

## Writing the configuration file

The config file is a `JSON5` file, with the following shape:
```
type Configuration = {
	source?: string
	destination: string
	replace?: Record<string, string | null>
}
```

The `source` is a path **relative** to the configuration file for the directory. It defaults to `.`, which is the working directory of the configuration file.

The `destination` is a mandatory path for the destination repository, which can be relative or absolute. 

`replace` is run first, and any files in the `replace` map is replaced by the file listed as the value. If the value is `null`, the source file is omitted from the destination folder.

Keys in the `replace` map can be a relative path to the file from the source directory, or a glob of filepaths relative to the source directory.