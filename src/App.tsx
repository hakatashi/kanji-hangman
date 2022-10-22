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
	let leaves: KanjiComponent[] = [];
	let word = '';
	while (leaves.length < 10) {
		word = sample(data.words);
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
		if (textInput !== '辶󠄁' && Array.from(textInput).length !== 1) {
			setMessage('1文字を入力してください。');
			return;
		}

		if (getLife() < 0) {
			setMessage('もう入力できません(@_@)');
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
				setMessage('クリアです! すごい(@_@)');
			}
		} else {
			if (getLife() === 1) {
				setMessage('残念(ToT)');
				setIsGiveUp(true);
			}
			setLife(getLife() - 1);
		}
	};

	const buttons = (data.partsList as [string, number][]).slice(0, 100).map(([char]) => char).sort();

	return (
		<div class={styles.App}>
			<header class={styles.header}>
				<h1>漢字hangman</h1>
			</header>
			<svg
				viewBox={`0 0 ${getChartWidth() * 100} ${getChartHeight() * 100}`}
				class={styles.chart}
			>
				{chartNodes().map((chartNode) => (
					getChartNodeSvg(chartNode, getIsGiveUp(), getHitChars())
				))}
			</svg>

			<div>残りライフ: {getLife()} / 入力履歴: {getHistory().join(', ')}</div>

			<form onSubmit={handleSubmitGuessForm}>
				<input type="text" onInput={handleTextInput} value={getTextInput()} />
				<button type="submit">Guess!</button>
			</form>
			<div>{getMessage()}</div>

			<div class={styles.heading}>頻出パーツ100</div>
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
				<li>上のツリーは四字熟語を構成する4文字の漢字の構造を表しています。</li>
				<li>テキスト入力エリアに漢字のパーツを入力してguessしてください。最初は「一」や「口」などがおすすめです。</li>
				<li>入力した漢字のパーツがツリーのどこかに含まれる場合、その場所が与えられ、含まれない場合はライフが減少します。</li>
				<li>灰色の丸はUnicodeで表現できない字体が該当することを表しています。この文字をguessすることはできません。</li>
			</ul>
		</div>
	);
};

export default App;
