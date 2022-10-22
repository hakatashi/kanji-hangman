import { Component, createMemo, createSignal } from 'solid-js';

import logo from './logo.svg';
import styles from './App.module.css';
import data from '../bin/data.json';
import sample from 'lodash/sample';

interface KanjiComponent {
	type: string,
	char: string | null,
	children: KanjiComponent[],
}

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

	return (
		<div class={styles.App}>
			<header class={styles.header}>
				<img src={logo} class={styles.logo} alt="logo" />
				<p>{getWord()}</p>
				<p>{leavesCount}</p>
			</header>
		</div>
	);
};

export default App;
