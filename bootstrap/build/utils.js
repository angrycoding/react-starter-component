const
	FS = require('fs'),
	Path = require('path'),
	spawnFile = require('child_process').spawn;

const PNGCompressorJar = Path.resolve(__dirname, 'pngtastic-1.5.jar');

const spawn = (command, args, ret, cwd) => {
	const options = {};
	if (cwd) options.cwd = cwd;
	const proc = spawnFile(command, args, options);
	let stdout = '', stderr = '';
	proc.on('error', () => void(0));
	proc.stdout.on('data', data => stdout += data );
	proc.stderr.on('data', data => stderr += data );
	proc.on('close', exit => {
		if (exit) exit = {code: exit, msg: stderr};
		ret(exit, stdout);
	});
}

const compressPNG = (sourcePath) => new Promise(resolve => {
	spawn('java', [
		'-cp', PNGCompressorJar,
		'com.googlecode.pngtastic.PngtasticOptimizer',
		'--removeGamma',
		'--toDir', '/',
		'--compressionLevel', '9',
		sourcePath
	], (error, data) => resolve());
});

const getFileSize = (path) => new Promise(resolve => {
	FS.lstat(path, (_error, stats) => {
		const size = (stats?.isFile() ? stats?.size : 0);
		resolve(Number.isInteger(size) ? size : 0);
	});
});

const svgToDataUri = (svgString) => {
	svgString = encodeURIComponent(svgString);
	return `data:image/svg+xml;utf8,${svgString}`;
}

const getRandomInt = (min, max) => {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getRandomBoolean = () => {
	return Boolean(Math.round(Math.random()));
}

const getRandomLetter = () => {
	let letter = String.fromCharCode(getRandomInt(97, 122));
	if (getRandomBoolean()) letter = letter.toUpperCase();
	return letter;
}

const getRandomLetterOrDigit = () => {
	if (getRandomBoolean()) return String(getRandomInt(0, 9));
	return getRandomLetter();
}

const randomPrefix = [
	getRandomLetter(),
	new Array(7).fill(0).map(getRandomLetterOrDigit),
].flat(Infinity).join('');

const generateRandomClassName = (() => {

	const alreadyGenerated = {'': true};


	return () => {
		let resultId = '';
		while (alreadyGenerated[resultId]) {
			resultId = `${randomPrefix}${getRandomLetter()}` + new Array(3).fill(0).map(getRandomLetterOrDigit).join('');
		}
		alreadyGenerated[resultId] = true;
		return resultId;

	};


})();

module.exports = {
	compressPNG,
	getFileSize,
	svgToDataUri,
	generateRandomClassName
};