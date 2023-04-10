import JSON5 from "json5"
import * as path from "path"
import * as fs from "fs"
import minimist from "minimist"
import { execSync } from "child_process"

type Configuration = {
	source?: string
	destination: string
	filemap?: Record<string, string | null>
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

	const config: Configuration = JSON5.parse(fs.readFileSync(configPathActual, 'utf-8'))

	// get the source repository from the configuration
	const sourceRepoRelative = config.source ?? "."
	const sourceRepoActual = path.join(path.dirname(configPathActual), sourceRepoRelative)
	console.log(sourceRepoRelative,sourceRepoActual)

	const result = execSync("git ls-tree --name-only -r HEAD", {
		cwd: sourceRepoActual,
	})
	console.log(result.toString());
}

splitshift()