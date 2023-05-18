import ThumbnailEditorModal from './modal';
import './main.scss';

const { createRoot, render, createElement } = wp.element;

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
	const uiElement = createElement(ThumbnailEditorModal, { test: 'test' });

	if (createRoot) {
		createRoot(domElement).render(uiElement);
	} else {
		render(uiElement, domElement);
	}
};

waitForElm('#thumbnail').then(() => load());
