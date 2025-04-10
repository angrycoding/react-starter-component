#!/usr/bin/env node

const
	Path = require('path'),
	FS = require('fs-extra'),
	ReadLine = require('readline'),
	RemoveEmptyDirs = require("delete-empty"),
	RecursiveReadDir = require('recursive-readdir'),
	installName = process.argv[2];

const targetDir = Path.resolve(process.cwd(), installName);

const askQuestion = (question) => new Promise(resolve => {

	const rl = ReadLine.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	
	
	rl.question(question, (answer) => {
		rl.close();
		resolve(answer);
	});

});

(async() => {

	if (FS.pathExists(targetDir)) {
		const answer = await askQuestion(`Directory ${targetDir} already exists, proceed? (y) `);
		if (answer.trim().toLowerCase() !== 'y') return;
		await FS.emptyDir(targetDir);
	}

	await FS.copy(Path.resolve(__dirname, '..'), targetDir, {
		filter: src => !src.endsWith('postInstall.js')
	});


	for (const path of await RecursiveReadDir(targetDir)) {
		let data = await FS.readFile(path, 'utf8');
		const newData = data.replaceAll('$$$componentName$$$', installName);
		if (data !== newData) {
			console.info('replace in', path);
			await FS.writeFile(path, newData);
		}
	}


	outerLoop: do {
		for (const path of await RecursiveReadDir(targetDir)) {
			const newPath = path.replace('$$$componentName$$$', installName);
			if (newPath !== path) {
				console.info('move', path, newPath);
				await FS.ensureDir(Path.dirname(newPath));
				await FS.move(path, newPath, { overwrite: true });
				continue outerLoop;
			}
		}
		break;
	} while (1);

	RemoveEmptyDirs(targetDir, (error, removedDirs) => {
		for (const removeDir of removedDirs) {
			console.info('remove empty dir', removeDir)
		}
	});


})();