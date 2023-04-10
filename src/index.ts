import JSON5 from "json5"
import * as path from "path"
import * as fs from "fs"
import { glob } from "glob"
import minimist from "minimist"
import { execSync } from "child_process"

type Configuration = {
	source?: string
	destination: string
	replace?: Record<string, string | null>
}

const expandReplaceMap = async (sourceRepoActualPath: string, config: Configuration) => {
	// for each entry in filemap, create an expanded filemap based on the glob that hosts an entry for every
	// file
	if (!config.replace) {
		return undefined
	}
	const expandedReplaceMap: Record<string, string | null> = {}
	for (let key of Object.keys(config.replace)) {
		const files = await glob(path.join(sourceRepoActualPath, key), {
			withFileTypes: false,
		})
		for (let file of files) {
			expandedReplaceMap[file] = config.replace[key]
		}
	}

	return expandedReplaceMap
}

/**
 * Copies the source file to the destination, with the replace map being used to determine 
 * if a file should be replaced with another one in the source repo
 * @param sourceFile The file in the source repository to copy. May end up being replaced!
 * @param destinationFile The file in the destination repository. Will always be created unless the replace map says the source maps to null
 * @param expandedReplaceMap A replace map where the globs have already been expanded to full file paths.
 * @returns 
 */
const copyFileBasedOnMapping = async (
	sourceFile: string,
	destinationFile: string,
	expandedReplaceMap?: Record<string, string | null>
) => {
	const destDir = path.dirname(destinationFile)

	const copyFile = (replacedBy?: string) => {
		if (!fs.existsSync(destDir)) {
			fs.mkdirSync(destDir, { recursive: true })
		}
		fs.copyFileSync(replacedBy ?? sourceFile, destinationFile)
	}
	if (!expandedReplaceMap) {
		copyFile()
		return
	}

	if (expandedReplaceMap[path.resolve(sourceFile)] === null) {
		// ignored!
		return
	}

	if (expandedReplaceMap[path.resolve(sourceFile)] === undefined) {
		// no mapping, so we can safely copy without further caveats
		copyFile()
		return
	}

	// we map a replacement file, so copy that to the destination instead
	copyFile(expandedReplaceMap[path.resolve(sourceFile)] as string)
}

const splitshift = async () => {
	// parse the configuration file using JSON5
	// either it has to be in the working directory, or be supplied as the --config cli variable
	// if we don't find one, it's an error.
	const argv = minimist(process.argv.slice[2] ?? [])
	let configPathActual: string = path.resolve(process.cwd(), ".shift.json5")
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

	const expandedReplaceMap = await expandReplaceMap(sourceRepoActual, config)
	for (let trackedFile of trackedFiles) {
		const sourceFile = path.resolve(sourceRepoActual, trackedFile)
		if (!fs.existsSync(sourceFile)) {
			continue;
		}

		const destRepoRelative = config.destination
		const destRepoActual = path.join(path.dirname(configPathActual), destRepoRelative)

		const destFile = path.resolve(destRepoActual, trackedFile)
		
		await copyFileBasedOnMapping(sourceFile, destFile, expandedReplaceMap)
	}
}

splitshift()
