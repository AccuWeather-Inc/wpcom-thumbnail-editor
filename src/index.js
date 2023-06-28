/* global $, MutationObserver */
import ImageEditModal from './components/modal';
import './main.scss';

const {
	element: { render, createRoot, createElement },
	domReady,
} = wp;

const observerConfig = {
	childList: true,
	subtree: true,
};

// temp work for handling on popup on image upload.
function watchForUploadedImages() {
	const selector = 'div.attachments-wrapper ul';
	// Watch this list for changes in order to handle collection of uploaded images.
	const imgModels = wp?.media?.model?.Attachments?.all?.models;

	const mediaLibraryNode = document.querySelector( selector );
	if ( mediaLibraryNode ) {
		const addedImagesCallback = ( mutations, observer ) => {
			const addedImages = [];
			mutations.forEach( ( { addedNodes } ) => {
				const addedNode = addedNodes?.[ 0 ];
				if ( addedNode && addedNode.nodeName === 'LI' ) {
					addedImages.push( addedNode );
				}
			} );
			console.log( { addedImages } );
		};
		const observer = new MutationObserver( addedImagesCallback );
		observer.observe( mediaLibraryNode, observerConfig );
		$( document ).on( 'click', '.uploader-inline > button', () => {
			observer.disconnect();
			console.log('Removed observer.')
		} );
	}
}

function waitForElm( selector ) {
	return new Promise( ( resolve ) => {
		if ( document.querySelector( selector ) ) {
			resolve( document.querySelector( selector ) );
		}

		const observer = new MutationObserver( () => {
			if ( document.querySelector( selector ) ) {
				resolve( document.querySelector( selector ) );
				observer.disconnect();
			}
		} );

		observer.observe( document.body, observerConfig );
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

domReady( () => {
	waitForElm( '#wpcom-thumbnail-editor-modal' ).then( () => load() );
} );

$( window ).ready( () => {
	// wp.media.frame.on('all', function(e) {
	// 	// watchForUploadedImages();
	// 	console.log(e);
	// });
	wp.media.frame.browserView.attachments.controller.on(
		'all',
		function ( e ) {
			// watchForUploadedImages();
			// library:selection:add
			console.log( e );
		}
	);
	wp.media?.frame.on( 'toggle:upload:attachment', () => {
		watchForUploadedImages();
	} );
} );
