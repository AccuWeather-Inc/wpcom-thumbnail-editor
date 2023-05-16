import { createRoot, render, createElement } from '@wordpress/element';
import App from './App';
import './style/main.scss';

function waitForElm(selector) {
	return new Promise((resolve) => {
		if (document.querySelector(selector)) {
			resolve(document.querySelector(selector));
		}

		const observer = new MutationObserver(() => {
			if (document.querySelector(selector)) {
				resolve(document.querySelector(selector));
				observer.disconnect();
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	});
}

const load = () => {
	const domElement = document.getElementById('thumbnail');
	const uiElement = createElement(App, { test: 'test' });

	if (createRoot) {
		createRoot(domElement).render(uiElement);
	} else {
		render(uiElement, domElement);
	}
};

waitForElm('#thumbnail').then(() => load());
