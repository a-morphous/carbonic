import * as esbuild from "esbuild"
import minimist from "minimist"

const build = async () => {
	const argv = minimist(process.argv.slice(2))

	/**
	 * @type {esbuild.BuildOptions} 
	 */
	const esbuildOptions = {
		
		entryPoints: ["src/index.ts"],
		outdir: "dist",
		bundle: true,
		platform: "node",
		minify: true,
		format: "esm",
		banner: {
			js: "#!/usr/bin/env node"
		}
		
	}

	if (argv.w) {
		const context = await esbuild.context(esbuildOptions)
		await context.watch()
		console.log("Build and watching...")
	} else {
		await esbuild.build(esbuildOptions)
		console.log("Built successfully")
	}
}
build()
