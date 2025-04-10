const
	Path = require('path'),
	SASS = require('sass'),
	CSSO = require("csso"),
	SVGO = require('svgo'),
	FS = require('fs-extra'),
	CSSParser = require('css'),
	PostCSS = require('postcss'),
	AutoPrefixer = require('autoprefixer'),
	RecursiveReadDir = require('recursive-readdir');


const {
	getFileSize,
	compressPNG,
	svgToDataUri,
	generateRandomClassName
} = require('./utils')
	

const STATIC_RESOURCES = ['png', 'ttf', 'jpg', 'svg'];

const DIST_DIR = Path.resolve(__dirname, '../dist');
const GLOBAL_STYLES_PATH = Path.resolve(DIST_DIR, 'styles.module.scss');


const SHEET_MAP = {};

let globalCSS = '';


var svgo = new SVGO({
	plugins: [
		{
		  cleanupIDs: false
		}
	  ]
});

const CSS_VARS = {};

const getCSSVarForImagePath = (imagePath) => {

	if (!CSS_VARS[imagePath]) {
		CSS_VARS[imagePath] = `--${generateRandomClassName()}`
	}

	console.info(imagePath, '->', CSS_VARS[imagePath]);

	return CSS_VARS[imagePath];
}



const imageToJs = (imagePath) => {

	const imageBuffer = FS.readFileSync(imagePath);

	const dataURI = (
		imagePath.endsWith('.svg') ? svgToDataUri(imageBuffer) :
		imagePath.endsWith('.ttf') ?`data:font/ttf;base64,${imageBuffer.toString('base64')}` :
		imagePath.endsWith('.png') ?`data:image/png;base64,${imageBuffer.toString('base64')}` :
		imagePath.endsWith('.jpg') ?`data:image/jpg;base64,${imageBuffer.toString('base64')}` :
		''
	);



	const varName = getCSSVarForImagePath(imagePath);

	SHEET_MAP[varName] = `dataURL2ObjectURL(${JSON.stringify(dataURI)})`;


	const globalStylesPath = Path.relative(Path.dirname(imagePath), GLOBAL_STYLES_PATH);

	return `
		import sheet from ${JSON.stringify('./' + globalStylesPath)};
		export default sheet[${JSON.stringify(varName)}];
	`
	
};



const cssToJs = (moduleScssPath) => new Promise(async (resolve) => {

	let result = SASS.compile(moduleScssPath, { style: 'compressed' }).css;
	result = (await PostCSS([AutoPrefixer]).process(result, { from: moduleScssPath })).css;

	const ast = CSSParser.parse(result);

	const renamed  = {};

	JSON.stringify(ast.stylesheet, function(key, value) {
		if (typeof value !== 'string') return value;

		if (value.endsWith('.svg")') || value.endsWith('.png")') || value.endsWith('.jpg")' || value.endsWith('.ttf'))) {
			const val = value.slice(5, -2);
			const svgFilePath = Path.resolve(Path.dirname(moduleScssPath), val);

			const varName = getCSSVarForImagePath(svgFilePath);

			
			this[key] = `var(${varName})`;
		}

		return value;
	});


	const keyframes = {};

	JSON.stringify(ast.stylesheet, (key, value) => {
		if (value?.type === 'keyframes') {
			const originalName = value.name;
			keyframes[originalName] = generateRandomClassName();
			renamed[originalName] = keyframes[originalName];
			value.name = keyframes[originalName];
		}
		return value;
	});


	JSON.stringify(ast.stylesheet, (key, value) => {
		if (value?.type === 'declaration' && ['animation', 'animation-name'].includes(value?.property)) {
			let originalValue = value.value;
			const allKeyframes = Object.keys(keyframes);
			for (const keyFrameName of allKeyframes) {
				if (originalValue.indexOf(keyFrameName) !== -1) {
					originalValue = originalValue.replace(keyFrameName, keyframes[keyFrameName]);
				}
			}
			value.value = originalValue;
		}
		return value;
	});


	JSON.stringify(ast.stylesheet, (key, value) => {
		if (value?.selectors instanceof Array) {
			console.info(value.selectors);
			value.selectors = value.selectors.map(selector => {

				return selector.replace(/\.-?[_a-zA-Z]+[_a-zA-Z0-9-]*/gi, (match, y) => {
					if (match[0] !== '.') throw 1;
					match = match.slice(1);
					if (!renamed[match]) {
						renamed[match] = generateRandomClassName();
					}
					return `.${renamed[match]}`;
				});
	
			});
		}
		return value;
	})


	for (const rule of ast.stylesheet.rules) {


		// if (rule.type === 'keyframes') {
		// 	renamed[rule.name] = generateRandomClassName();
		// 	rule.name = renamed[rule.name];
		// }


		rule.selectors = (rule.selectors || []);


		if (rule.selectors.includes(':export')) {
			console.info('');
			console.info('----------------------------------------------------------')
			console.info('declarations')
			console.info('----------------------------------------------------------')
			console.info('');
			console.info(rule.declarations)
			for (const declaration of rule.declarations) {
				const { property, value } = declaration;
				renamed[property] = value;
			}
		}

	}



	const globalStylesPath = Path.relative(Path.dirname(moduleScssPath), GLOBAL_STYLES_PATH);
	globalCSS += CSSParser.stringify(ast, { compress: true });


	resolve(`
		import ${JSON.stringify('./' + globalStylesPath)};
		export default ${JSON.stringify(renamed)}
	`);


});




(async() => {

	let files = [];

	files = await RecursiveReadDir(DIST_DIR);

	console.info('');
	console.info('------------------------------------------------------------------------');
	console.info('optimize all image files')
	console.info('------------------------------------------------------------------------');
	console.info('');
	

	for (const path of files) {
		if (path.endsWith('.svg')) {
			const oldSize = await getFileSize(path);
			let result = FS.readFileSync(path).toString();
			result = (await svgo.optimize(result, {path: path})).data;
			FS.writeFileSync(path, result);
			console.info(`optimize ${path}`, oldSize, '->', await getFileSize(path));
		} else if (path.endsWith('.png')) {
			const oldSize = await getFileSize(path);
			await compressPNG(path);
			console.info(`optimize ${path}`, oldSize, '->', await getFileSize(path));
		}
	}

	
	console.info('');
	console.info('------------------------------------------------------------------------');
	console.info('convert images into .ts')
	console.info('------------------------------------------------------------------------');
	console.info('');

	files = await RecursiveReadDir(DIST_DIR);
	for (const filePath of files) {

		if (STATIC_RESOURCES.some(ext => filePath.endsWith(`.${ext}`))) {
			console.info('converting', filePath);
			FS.writeFileSync(filePath + '.js', imageToJs(filePath));
			FS.removeSync(filePath);
		}
	}



	console.info('');
	console.info('------------------------------------------------------------------------');
	console.info('convert .scss into .ts')
	console.info('------------------------------------------------------------------------');
	console.info('');

	files = await RecursiveReadDir(DIST_DIR);
	for (const filePath of files) {

		if (filePath.endsWith('.module.scss')) {
			console.info('converting', filePath);
			FS.writeFileSync(filePath + '.js', await cssToJs(filePath));
			FS.removeSync(filePath);
		}

	}

	let result = `

		const resultObj = {};
	
	`;


	for (const varName in SHEET_MAP) {
		result += `{
			
			resultObj[
				${JSON.stringify(varName)}
			] = ${SHEET_MAP[varName]};
		}`
	}



	const oldSize = globalCSS.length;
	globalCSS = CSSO.minify(globalCSS, { comments: false }).css;
	console.info('compressing css', GLOBAL_STYLES_PATH, oldSize, '->', globalCSS.length);


	result += `

		function dataURL2ObjectURL(dataUri) {

			dataUri = dataUri.slice(5);

			let data = dataUri.split(',');
			const [ mimeType, encoding ] = data.shift().split(';');
			data = data.join(',');

			if (encoding === 'base64') data = atob(data);
			else if (encoding === 'utf8') data = decodeURIComponent(data);


            return URL.createObjectURL(new Blob([new Uint8Array(


				data
				.split('')
				.map(x => x.charCodeAt(0))
			
			)], { type: mimeType }));
        };


		const link = document.createElement('link');
		link.href = URL.createObjectURL(new Blob([

			":root {" + 
				Object.entries(resultObj).map(kv => kv[0] + ':url("' + kv[1] + '");').join("\\n") +
			"}",
		
			${JSON.stringify(globalCSS)}

		]));
		link.rel = 'stylesheet';
		document.head.appendChild(link);
	`;



	result += '\n\nexport default resultObj;';

	FS.writeFileSync(`${GLOBAL_STYLES_PATH}.js`, result);


})();
