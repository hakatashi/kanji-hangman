import { Component, createMemo, createSignal, JSX } from 'solid-js';

import styles from './App.module.css';
import data from '../bin/data.json';
import sample from 'lodash/sample';
import first from 'lodash/first';
import last from 'lodash/last';
import { max } from 'lodash';
import classNames from 'classnames';

interface KanjiComponent {
	type: string,
	char: string | null,
	children: KanjiComponent[],
}

interface ChartNode {
	x: number,
	y: number,
	type: 'root' | 'char' | 'empty',
	char: string | null,
	children: ChartNode[],
}

const getRandomWord = () => {
	const params = new URLSearchParams(location.search);
	const mode = params.get('mode');
	let wordList: string[] = [];

	if (mode === 'extreme') {
		wordList = data.extremeWords;
	} else if (mode === 'hard') {
		wordList = data.extremeWords;
	} else {
		wordList = data.words;
	}

	let leaves: KanjiComponent[] = [];
	let word = '';
	while (leaves.length < 10) {
		word = sample(wordList)!;
		leaves = [];
		for (const char of Array.from(word)) {
			if (!{}.hasOwnProperty.call(data.components, char)) {
				leaves = [];
				break;
			}
			leaves.push(...getLeaves(data.components[char]));
		}
	}
	return word;
};

const getChartNodeType = (char: string | null) => {
	if (char === null) {
		return 'empty';
	}

	const charComponents = Array.from(char);
	if (charComponents.length < 3) {
		return 'char';
	}
	return 'empty';
};

const getChartNodeChar = (char: string | null) => {
	if (char === null) {
		return null;
	}

	const charComponents = Array.from(char);
	if (charComponents.length < 3) {
		return char;
	}
	return null;
};

const calculateChartNodes = (components: KanjiComponent[]) => {
	let offset = 0;
	const chartNodes: ChartNode[] = [];

	const getChartNodes = (component: KanjiComponent, depth: number) => {
		if (component.children.length === 0) {
			const chartNode = {
				x: offset,
				y: depth,
				type: getChartNodeType(component.char),
				char: getChartNodeChar(component.char),
				children: [],
			} as ChartNode;

			offset++;
			return chartNode;
		}

		const childChartNodes: ChartNode[] = [];
		for (const child of component.children) {
			childChartNodes.push(getChartNodes(child, depth + 1));
		}

		const firstX = first(childChartNodes)!.x;
		const lastX = last(childChartNodes)!.x;

		return {
			x: (firstX + lastX) / 2,
			y: depth,
			type: getChartNodeType(component.char),
			char: getChartNodeChar(component.char),
			children: childChartNodes,
		} as ChartNode;
	};

	for (const component of components) {
		chartNodes.push(getChartNodes(component, 0));
	}

	return chartNodes;
};

const getComponentChars = (component: KanjiComponent) => {
	const chars: string[] = [];
	if (component.char !== null) {
		chars.push(component.char);
	}
	for (const child of component.children) {
		chars.push(...getComponentChars(child));
	}
	return chars;
};

const getLeaves = (component: KanjiComponent) => {
	if (component.children.length === 0) {
		return [component];
	}

	const leaves: KanjiComponent[] = [];
	for (const child of component.children) {
		leaves.push(...getLeaves(child));
	}
	return leaves;
};

const getMaxDepth = (component: KanjiComponent, depth = 0) => {
	let maxDepth = depth;
	for (const child of component.children) {
		const childDepth = getMaxDepth(child, depth + 1);
		if (childDepth > maxDepth) {
			maxDepth = childDepth;
		}
	}
	return maxDepth;
};

const getChartNodeSvg = (chartNode: ChartNode, isGiveUp: boolean, hitChars: string[], parentHit = false) => {
	let nodeColor = 'white';

	if (chartNode.type !== 'char') {
		nodeColor = 'dimgrey';
	} else if (chartNode.char !== null && hitChars.includes(chartNode.char)) {
		nodeColor = 'salmon';
	} else if (parentHit) {
		nodeColor = 'wheat';
	}

	if (chartNode.char !== null && hitChars.includes(chartNode.char)) {
		parentHit = true;
	}

	return (
		<g>
			<circle
				cx={chartNode.x * 100 + 50}
				cy={chartNode.y * 100 + 50}
				r="30"
				fill={nodeColor}
				stroke="black"
				stroke-width="5"
			/>
			{chartNode.char && (isGiveUp || nodeColor !== 'white') && (
				<text
					x={chartNode.x * 100 + 50}
					y={chartNode.y * 100 + 65}
					text-anchor="middle"
					font-weight="bold"
					font-size="40"
				>
					{chartNode.char}
				</text>
			)}

			{chartNode.children.map((child) => (
				<>
					<line
						x1={chartNode.x * 100 + 50}
						y1={chartNode.y * 100 + 80}
						x2={child.x * 100 + 50}
						y2={child.y * 100 + 20}
						stroke="black"
						stroke-width="5"
					/>
					{getChartNodeSvg(child, isGiveUp, hitChars, parentHit)}
				</>
			))}
		</g>
	);
};

const App: Component = () => {
	const [getWord, setWord] = createSignal(getRandomWord());
	const [getHitChars, setHitChars] = createSignal<string[]>([]);
	const [getTextInput, setTextInput] = createSignal('');
	const [getMessage, setMessage] = createSignal('');
	const [getLife, setLife] = createSignal(10);
	const [getIsGiveUp, setIsGiveUp] = createSignal(false);
	const [getHistory, setHistory] = createSignal<string[]>([]);

	const getComponents = createMemo(() => {
		const word = getWord();
		const components = [];
		for (const char of Array.from(word)) {
			components.push(data.components[char] as KanjiComponent);
		}
		return components;
	});

	const getChars = createMemo(() => {
		const chars = new Set();
		for (const component of getComponents()) {
			for (const char of getComponentChars(component)) {
				chars.add(char);
			}
		}
		return chars;
	});

	const getChartWidth = createMemo(() => {
		const leaves = [];
		for (const component of getComponents()) {
			leaves.push(...getLeaves(component));
		}
		return leaves.length;
	});

	const getChartHeight = createMemo(() => {
		const depths = getComponents().map((component) => getMaxDepth(component));
		return max(depths)! + 1;
	});
	
	const chartNodes = createMemo(() => {
		const word = getWord();
		const components = Array.from(word).map((char) => data.components[char]);
		return calculateChartNodes(components);
	});

	const handleTextInput: JSX.EventHandlerUnion<HTMLInputElement, Event> = (event) => {
		setTextInput((event.target as HTMLInputElement).value);
	};

	const handleSubmitGuessForm: JSX.EventHandlerUnion<HTMLFormElement, Event> = (event) => {
		event.preventDefault();

		const textInput = getTextInput();

		if (textInput === getWord()) {
			setHitChars([...getHitChars(), ...Array.from(getWord())]);
			setMessage('???????????????! ?????????(@_@)');
			return;
		}

		if (textInput !== '???????' && Array.from(textInput).length !== 1) {
			setMessage('1????????????????????????????????????');
			return;
		}

		if (getLife() < 0) {
			setMessage('???????????????????????????(@_@)');
			return;
		}

		setTextInput('');
		setMessage('')

		doGuess(textInput);
	};

	const handleClickButton = (button: string) => {
		doGuess(button);
	};

	const doGuess = (guess: string) => {
		setHistory([...getHistory(), guess]);

		const chars = getChars();
		if (chars.has(guess)) {
			setHitChars([...getHitChars(), guess]);
			const isClear = Array.from(getWord()).every((char) => ( 
				getHitChars().includes(char)
			));
			
			if (isClear) {
				setMessage('???????????????! ?????????(@_@)');
			}
		} else {
			if (getLife() === 1) {
				setMessage('??????(ToT)');
				setIsGiveUp(true);
			}
			setLife(getLife() - 1);
		}
	};

	const params = new URLSearchParams(location.search);
	const mode = params.get('mode');

	const buttons: string[] = [];
	if (mode === 'extreme') {
		buttons.push(...(data.extremePartsList as [string, number][]).slice(0, 100).map(([char]) => char).sort());
	} else if (mode === 'hard') {
		buttons.push(...(data.hardPartsList as [string, number][]).slice(0, 100).map(([char]) => char).sort());
	} else {
		buttons.push(...(data.partsList as [string, number][]).slice(0, 100).map(([char]) => char).sort());
	}

	return (
		<div class={styles.App}>
			<header class={styles.header}>
				<h1>??????hangman</h1>
				<div>
					<a href="./?mode=normal">normal</a>
					{' / '}
					<a href="./?mode=hard">hard</a>
					{' / '}
					<a href="./?mode=extreme">extreme</a>
				</div>
			</header>
			<svg
				viewBox={`0 0 ${getChartWidth() * 100} ${getChartHeight() * 100}`}
				class={styles.chart}
			>
				{chartNodes().map((chartNode) => (
					getChartNodeSvg(chartNode, getIsGiveUp(), getHitChars())
				))}
			</svg>

			<div>???????????????: {getLife()} / ????????????: {getHistory().join(', ')}</div>

			<form onSubmit={handleSubmitGuessForm}>
				<input type="text" onInput={handleTextInput} value={getTextInput()} />
				<button type="submit">Guess!</button>
			</form>
			<div>{getMessage()}</div>

			<div class={styles.heading}>???????????????100</div>
			<div class={styles.buttons}>
				{buttons.map((button) => (
					<div
						class={classNames(
							styles.button,
							{[styles.disabled]: getHistory().includes(button)},
						)}
						onClick={handleClickButton.bind(null, button)}
					>
						{button}
					</div>
				))}
			</div>
			<ul class={styles.rules}>
				<li>?????????????????????????????????????????????4????????????????????????????????????????????????</li>
				<li>???????????????????????????????????????????????????????????????guess?????????????????????????????????????????????????????????????????????????????????</li>
				<li>??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????</li>
				<li>???????????????Unicode???????????????????????????????????????????????????????????????????????????????????????guess?????????????????????????????????</li>
			</ul>
		</div>
	);
};

export default App;
