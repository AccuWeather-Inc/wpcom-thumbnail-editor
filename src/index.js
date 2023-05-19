import ThumbnailEditorModal from './modal';
import { store as coreStore } from '@wordpress/core-data';
import './main.scss';

const {
	element: {
		render,
		createRoot,
		createElement,
	},
	data: { select },
} = wp;

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
	if (domElement && domElement?.dataset?.id ) {
		const ratioMap = domElement?.dataset?.sizes
			? JSON.parse(domElement.dataset.sizes)
			: [];
		const props = {
			id: domElement.dataset.id,
			url: domElement.dataset?.url,
			ratioMap,
		};
		console.log({
			data: domElement?.dataset,
			props,
		});
		const uiElement = createElement(ThumbnailEditorModal, props);

		if (createRoot) {
			createRoot(domElement).render(uiElement);
		} else {
			render(uiElement, domElement);
		}
	}
};

waitForElm('#thumbnail').then(() => load());
