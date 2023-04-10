import * as esbuild from 'esbuild'

const build = async() => {
	const context = await esbuild.context({
		entryPoints: ['src/index.ts'],
		outdir: 'dist',
		bundle: true,
		platform: 'node',
		format: 'esm'
	})
	await context.watch()
	console.log("Build and watching...")
}
build()