import ImageEditModal from './components/modal';
import './main.scss';

const {
	element: { render, createRoot, createElement },
} = wp;

function waitForElm( selector ) {
	return new Promise( ( resolve ) => {
		if ( document.querySelector( selector ) ) {
			resolve( document.querySelector( selector ) );
		}

		// eslint-disable-next-line no-undef
		const observer = new MutationObserver( () => {
			if ( document.querySelector( selector ) ) {
				resolve( document.querySelector( selector ) );
				observer.disconnect();
			}
		} );

		observer.observe( document.body, {
			childList: true,
			subtree: true,
		} );
	} );
}

const load = () => {
	const domElement = document.getElementById(
		'wpcom-thumbnail-editor-modal'
	);
	if ( domElement && domElement?.dataset?.id ) {
		const ratioMap = domElement?.dataset?.sizes
			? JSON.parse( domElement.dataset.sizes )
			: [];
		const props = {
			imageIds: [ Number( domElement.dataset.id ) ],
			ratioMap,
		};

		const uiElement = createElement( ImageEditModal, props );
		if ( createRoot ) {
			createRoot( domElement ).render( uiElement );
		} else {
			render( uiElement, domElement );
		}
	}
};

waitForElm( '#wpcom-thumbnail-editor-modal' ).then( () => load() );
