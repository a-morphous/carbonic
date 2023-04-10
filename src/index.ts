import JSON5 from "json5"
import * as path from "path"
import * as fs from "fs"
import { glob } from "glob"
import minimist from "minimist"
import { execSync } from "child_process"

type Configuration = {
	source?: string
	destination: string
	filemap?: Record<string, string | null>
}

const expandFilemap = async (sourceRepoActualPath: string, config: Configuration) => {
	// for each entry in filemap, create an expanded filemap based on the glob that hosts an entry for every
	// file
	if (!config.filemap) {
		return undefined
	}
	const expandedFilemap: Record<string, string | null> = {}
	for (let key of Object.keys(config.filemap)) {
		const files = await glob(path.join(sourceRepoActualPath, key), {
			withFileTypes: false,
		})
		for (let file of files) {
			expandedFilemap[file] = config.filemap[key]
		}
	}

	return expandedFilemap
}

const copyFileBasedOnMapping = async (
	sourceFile: string,
	destinationFile: string,
	expandedFilemap?: Record<string, string | null>
) => {
	const destDir = path.dirname(destinationFile)
	const copyFile = (newDestFile?: string) => {
		const actualDestDir = newDestFile ? path.dirname(newDestFile) : destDir
		if (!fs.existsSync(actualDestDir)) {
			fs.mkdirSync(actualDestDir, { recursive: true })
		}
		fs.copyFileSync(sourceFile, newDestFile ?? destinationFile)
	}
	if (!expandedFilemap) {
		copyFile()
		return
	}

	if (expandedFilemap[path.resolve(sourceFile)] === null) {
		// ignored!
		return
	}

	if (expandedFilemap[path.resolve(sourceFile)] === undefined) {
		// no mapping, so we can safely copy without further caveats
		copyFile()
		return
	}

	// we map a replacement file, so copy that to the destination instead
	copyFile(expandedFilemap[path.resolve(sourceFile)] as string)
}

const splitshift = async () => {
	// parse the configuration file using JSON5
	// either it has to be in the working directory, or be supplied as the --config cli variable
	// if we don't find one, it's an error.
	const argv = minimist(process.argv.slice[2] ?? [])
	let configPathActual: string = path.resolve(process.cwd(), "config.json5")
	if (argv.c || argv.config) {
		const configPathRelative = argv.c ?? argv.config
		configPathActual = path.resolve(path.resolve(process.cwd(), configPathRelative))
	}
	if (!fs.existsSync(configPathActual)) {
		process.exit()
	}

	const config: Configuration = JSON5.parse(fs.readFileSync(configPathActual, "utf-8"))

	// get the source repository from the configuration
	const sourceRepoRelative = config.source ?? "."
	const sourceRepoActual = path.join(path.dirname(configPathActual), sourceRepoRelative)

	const trackedFiles: string[] = []
	try {
		const result = execSync("git ls-tree --name-only -r HEAD", {
			cwd: sourceRepoActual,
		})
		for (let file of result.toString().split("\n")) {
			if (file.trim().length > 0) {
				trackedFiles.push(file.trim())
			}
		}
	} catch (e) {
		console.log("Error trying to fetch git repository: ", e)
		process.exit()
	}

	const expandedFilemap = await expandFilemap(sourceRepoActual, config)
	for (let trackedFile of trackedFiles) {
		const sourceFile = path.resolve(sourceRepoActual, trackedFile)

		const destRepoRelative = config.destination
		const destRepoActual = path.join(path.dirname(configPathActual), destRepoRelative)

		const destFile = path.resolve(destRepoActual, trackedFile)
		await copyFileBasedOnMapping(sourceFile, destFile, expandedFilemap)
	}
}

splitshift()
