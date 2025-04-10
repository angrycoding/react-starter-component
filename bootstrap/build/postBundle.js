#!/usr/bin/env node

const FS = require('fs-extra');
const Path = require('path');
const RemoveEmptyDirs = require("delete-empty");
const RecursiveReadDir = require('recursive-readdir');
const { minify } = require("terser");

const DIST_DIR = Path.resolve(__dirname, '../dist');
const INDEX_FILE = Path.resolve(DIST_DIR, 'index.js');

(async () => {

	let files = await RecursiveReadDir(DIST_DIR);
	files = files.filter(f => (
		f.endsWith('.tsx') ||
		(f.endsWith('.ts') && !f.endsWith('.d.ts'))
	));

	for (const f of files) {
		console.info('remove', f);
		FS.removeSync(f);
	}


	files = await RecursiveReadDir(DIST_DIR);
	files = files.filter(f => f.endsWith('.js') && f !== INDEX_FILE);
	for (const f of files) FS.removeSync(f);


	// await removeInternals();

	RemoveEmptyDirs(DIST_DIR, (error, removedDirs) => {
		for (const removeDir of removedDirs) {
			console.info('remove empty dir', removeDir)
		}
	});



	let result = FS.readFileSync(INDEX_FILE).toString();

			const oldSize = result.length;
			

		
	const resultTerser = (await minify(result, {
		toplevel: true,
		compress: {
			// drop_console: true,
			passes: 4,
			toplevel: true,
		},
		mangle: {
			toplevel: true,
		},
	})).code;

	console.info('optimize js resultTerser', INDEX_FILE, oldSize, '->', resultTerser.length);

	FS.writeFileSync(INDEX_FILE, resultTerser);



	// files = await RecursiveReadDir(DIST_DIR);
	// files = files.filter(f => f.endsWith('.js'));
	// for (const file of files) {
	// 	const contents = await FS.readFile(file);
	// 	if (contents.toString().includes('console.')) {
	// 		console.info('CONSOLE FOUND IN', file, 'use debug(...) instead');
	// 		return process.exit(1);
	// 	}
	// }




	
})();