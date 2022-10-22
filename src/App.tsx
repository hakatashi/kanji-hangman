import { Component, createMemo, createSignal } from 'solid-js';

import styles from './App.module.css';
import data from '../bin/data.json';
import sample from 'lodash/sample';
import first from 'lodash/first';
import last from 'lodash/last';

interface KanjiComponent {
	type: string,
	char: string | null,
	children: KanjiComponent[],
}

interface ChartNode {
	x: number,
	y: number,
	char: string | null,
	children: ChartNode[],
}

const calculateChartNodes = (components: KanjiComponent[]) => {
	let offset = 0;
	const chartNodes: ChartNode[] = [];

	const getChartNodes = (component: KanjiComponent, depth: number) => {
		if (component.children.length === 0) {
			const chartNode = {
				x: offset,
				y: depth,
				char: component.char,
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
			char: component.char,
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

const getChartNodeSvg = (chartNode: ChartNode) => (
	<g>
		<circle
			cx={chartNode.x * 100 + 50}
			cy={chartNode.y * 100 + 50}
			r="30"
			fill="white"
			stroke="black"
			stroke-width="5"
		/>
		{chartNode.children.map((child) => (
			getChartNodeSvg(child)
		))}
	</g>
);

const App: Component = () => {
	const [getWord, setWord] = createSignal(sample(data.words));

	const leavesCount = createMemo(() => {
		const word = getWord();
		const leaves = [];

		for (const char of Array.from(word)) {
			leaves.push(...getLeaves(data.components[char]));
		}

		return leaves.length;
	});
	
	const chartNodes = createMemo(() => {
		const word = getWord();
		const components = Array.from(word).map((char) => data.components[char]);
		return calculateChartNodes(components);
	});

	console.log(chartNodes());

	return (
		<div class={styles.App}>
			<header class={styles.header}>
				<svg viewBox={`0 0 ${leavesCount() * 100} 500`}>
					{chartNodes().map(getChartNodeSvg)}
				</svg>
				<p>{getWord()}</p>
				<p>{leavesCount()}</p>
			</header>
		</div>
	);
};

export default App;
