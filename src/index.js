import ThumbnailEditorModal from './modal';
import './main.scss';

const {
	element: {
		render,
		createRoot,
		createElement,
	},
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
			ratioMap,
		};

		const uiElement = createElement(ThumbnailEditorModal, props);
		if (createRoot) {
			createRoot(domElement).render(uiElement);
		} else {
			render(uiElement, domElement);
		}
	}
};

waitForElm('#thumbnail').then(() => load());
