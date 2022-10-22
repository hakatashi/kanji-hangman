import { Component, createMemo, createSignal } from 'solid-js';

import styles from './App.module.css';
import data from '../bin/data.json';
import sample from 'lodash/sample';
import first from 'lodash/first';
import last from 'lodash/last';
import { max } from 'lodash';

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

const getChartNodeSvg = (chartNode: ChartNode) => (
	<g>
		<circle
			cx={chartNode.x * 100 + 50}
			cy={chartNode.y * 100 + 50}
			r="30"
			fill={chartNode.type === 'char' ? 'white' : 'dimgrey'}
			stroke="black"
			stroke-width="5"
		/>
		{chartNode.char && (
			<text
				x={chartNode.x * 100 + 50}
				y={chartNode.y * 100 + 65}
				text-anchor="middle"
				font-weight="bold"
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
				{getChartNodeSvg(child)}
			</>
		))}
	</g>
);

const App: Component = () => {
	const [getWord, setWord] = createSignal(getRandomWord());

	const getComponents = createMemo(() => {
		const word = getWord();
		const components = [];
		for (const char of Array.from(word)) {
			components.push(data.components[char] as KanjiComponent);
		}
		return components;
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

	return (
		<div class={styles.App}>
			<header class={styles.header}>
				<svg viewBox={`0 0 ${getChartWidth() * 100} ${getChartHeight() * 100}`}>
					{chartNodes().map(getChartNodeSvg)}
				</svg>
			</header>
		</div>
	);
};

export default App;
