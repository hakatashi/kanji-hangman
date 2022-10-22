import scrapeIt from 'scrape-it';
import download from 'download';
import fs from 'fs-extra';
import {inspect} from 'util';

const idcArguments = new Map([
	['⿰', 2],
	['⿱', 2],
	['⿲', 3],
	['⿳', 3],
	['⿴', 2],
	['⿵', 2],
	['⿶', 2],
	['⿷', 2],
	['⿸', 2],
	['⿹', 2],
	['⿺', 2],
	['⿻', 2],
]);

const normalizeChar = (char: string) => {
	if (char === '辶') {
		return '辶\u{E0101}';
	}
	return char;
};

const splitIds = (ids: string) => {
	let remnant = Array.from(ids);
	const idcs = [];

	while (remnant.length > 0) {
		if (remnant[0] === '&') {
			const index = remnant.indexOf(';');
			idcs.push(remnant.slice(0, index + 1).join(''));
			remnant = remnant.slice(index + 1);
		} else {
			idcs.push(remnant[0]);
			remnant.shift();
		}
	}

	return idcs;
};

interface Component {
	type: string,
	char: string | null,
	children: Component[],
}

const parseIds = (ids: string) => {
	const idcs = splitIds(ids);

	const getSequence = () => {
		const idc = idcs.shift();
		if (!idc) {
			throw new Error(`ParseError: ${ids}`);
		}

		if (idcArguments.has(idc)) {
			const argumentCounts = idcArguments.get(idc);
			const children: Component[] = [];
			for (const i of Array(argumentCounts).keys()) {
				children.push(getSequence());
			}
			return {
				type: idc,
				char: null,
				children,
			} as Component;
		}

		return {
			type: '　',
			char: normalizeChar(idc),
			children: [],
		} as Component;
	}

	const sequence = getSequence();
	if (idcs.length > 0) {
		throw new Error(`ParseError: ${ids}`);
	}

	return sequence;
};

const traverseComponentChars = (component: Component) => {
	const chars: string[] = [];
	if (component.char !== null) {
		chars.push(component.char);
	}

	for (const child of component.children) {
		chars.push(...traverseComponentChars(child));
	}

	return chars;
}

(async () => {
	const joyoCharsData = await download('https://github.com/tsg-ut/slackbot/raw/master/wadokaichin/data/JoyoKanjis.txt');
	const joyoChars = joyoCharsData.toString().split('\n').filter((c) => c);

	const dirPath = `${__dirname}/files`;
	
	/*
	const {data} = await scrapeIt<{files: string[]}>('http://git.chise.org/gitweb/?p=chise/ids.git;a=tree', {
		files: {
			listItem: 'td.list .list',
		}
	});
	const idsFiles = data.files.filter((file) => file.startsWith('IDS-') && file.endsWith('.txt'));
	*/

	const idsFiles = await fs.readdir(dirPath);

	const characterIds = new Map<string, Component>();
	const aliases = new Map<string, string>();
	for (const file of idsFiles) {
		const filePath = `${__dirname}/files/${file}`;

		await fs.ensureDir(dirPath);
		if (!(await fs.pathExists(filePath))) {
			console.log(`Downwloading ${file}...`);
			await download(`http://git.chise.org/gitweb/?p=chise/ids.git;a=blob_plain;f=${file};hb=HEAD`, dirPath);
		}

		const data = await fs.readFile(filePath);
		for (const line of data.toString().split('\n')) {
			if (line.startsWith(';')) {
				continue;
			}

			const [codepoint, char, ids, additionalInfo] = line.split('\t');
			let sequenceString = ids;
			if (additionalInfo) {
				sequenceString = additionalInfo.split('=')[1];
			}

			if (!ids) {
				characterIds.set(char, {type: '　', char, children: []} as Component);
				continue;
			}

			try {
				const sequence = parseIds(sequenceString)
				if (sequence.type === '　' && sequence.char !== null && sequence.char !== char) {
					aliases.set(char, sequence.char);
				} else {
					sequence.char = char;
					characterIds.set(char, sequence);
				}
			} catch (error) {
			}
		}
	}

	const overloadData = await fs.readFile(`${__dirname}/overload.txt`);
	for (const overloadLine of overloadData.toString().split(/\r?\n/)) {
		if (!overloadLine) {
			continue;
		}

		const [char, ids] = overloadLine.split('\t');

		const sequence = parseIds(ids)
		if (sequence.type === '　' && sequence.char !== null && sequence.char !== char) {
			aliases.set(char, sequence.char);
		} else {
			sequence.char = normalizeChar(char);
			characterIds.set(char, sequence);
		}
	}

	const traverseFill = (component: Component) => {
		for (const [i, child] of component.children.entries()) {
			if (child.type === '　' && child.char !== null) {
				let childChar = child.char;
				while (aliases.has(childChar)) {
					childChar = aliases.get(childChar)!;
				}

				if (characterIds.has(childChar)) {
					component.children[i] = characterIds.get(childChar)!;
				}
			} else {
				traverseFill(child);
			}
		}
	};

	for (const component of characterIds.values()) {
		traverseFill(component);
	}

	for (const i of Array(1).keys()) {
		const char = joyoChars[Math.floor(Math.random() * joyoChars.length)];
		console.log(inspect(characterIds.get(char), {depth: null, colors: true}));
	}

	const counter = new Map<string, number>();
	const components = Object.create(null);
	for (const char of joyoChars) {
		if (characterIds.has(char)) {
			const componentChars = traverseComponentChars(characterIds.get(char)!);
			for (const char of new Set(componentChars)) {
				if (!counter.has(char)) {
					counter.set(char, 0);
				}
				counter.set(char, counter.get(char)! + 1);
			}

			components[char] = characterIds.get(char);
		} else {
			console.error(char);
		}
	}

	const partsList = Array.from(counter.entries()).sort(([, a], [, b]) => b - a);

	const wordsData = await fs.readFile(`${__dirname}/words.txt`, 'utf8');
	const words = wordsData.split(/\r?\n/).filter((c) => c);

	await fs.writeJson(`${__dirname}/data.json`, {components, words, partsList});
})()