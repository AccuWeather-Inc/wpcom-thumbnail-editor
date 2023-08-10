/* global thumbnailEditorObj */
import ImageEditModal from './components/modal';
import './main.scss';

if ( module.hot ) {
	module.hot.accept();
}

const {
	element: { render, createRoot, createElement },
} = wp;

const observerConfig = {
	attributeFilter: [ 'data-id' ],
	childList: true,
	subtree: true,
};

const mediaLibrarySelector = 'div.attachments-wrapper ul';
const appendImageIdFromNode = ( list, imageNode ) => {
	if ( imageNode && imageNode.nodeName === 'LI' && imageNode.dataset?.id ) {
		const id = Number( imageNode.dataset.id );
		if (
			! thumbnailEditorObj.imageIds.includes( id ) &&
			! list.includes( id )
		) {
			list.push( id );
		}
	}
};

const initImageIds = () => {
	const mediaLibraryNode = document.querySelector( mediaLibrarySelector );
	if (
		mediaLibraryNode &&
		thumbnailEditorObj?.imageIds &&
		! thumbnailEditorObj.imageIds.length
	) {
		mediaLibraryNode.childNodes.forEach( ( imageNode ) =>
			appendImageIdFromNode( thumbnailEditorObj.imageIds, imageNode )
		);
	}
};

const loadThumbnailEditorModal = (
	imageIds,
	element = null,
	startOpened = false
) => {
	const modalContainer =
		element ?? document.getElementById( 'wpcom-thumbnail-editor-modal' );
	if ( ! modalContainer ) {
		return;
	}

	const props = {
		imageIds,
		ratioMap: thumbnailEditorObj?.sizes ?? null,
		startOpened,
	};

	const uiElement = createElement( ImageEditModal, props );
	if ( createRoot ) {
		createRoot( modalContainer ).render( uiElement );
	} else {
		render( uiElement, modalContainer );
	}
};

// temp work for handling on popup on image upload.
function watchForUploadedImages() {
	// Watch this list for changes in order to handle collection of uploaded images.
	const mediaLibraryNode = document.querySelector( mediaLibrarySelector );
	if ( mediaLibraryNode && thumbnailEditorObj?.addedIds ) {
		const addedImagesCallback = ( mutations ) => {
			mutations.forEach( ( { addedNodes } ) => {
				addedNodes.forEach( ( addedNode ) =>
					appendImageIdFromNode(
						thumbnailEditorObj.addedIds,
						addedNode
					)
				);
			} );

			if ( thumbnailEditorObj.addedIds.length ) {
				thumbnailEditorObj.imageIds = [
					...thumbnailEditorObj.addedIds,
					...thumbnailEditorObj.imageIds,
				];
				loadThumbnailEditorModal(
					thumbnailEditorObj.addedIds,
					null,
					true
				);
			}
		};
		const observer = new MutationObserver( addedImagesCallback );
		observer.observe( mediaLibraryNode, observerConfig );

		$( document ).on( 'click', '.uploader-inline > button', () => {
			observer.disconnect();
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

export function setup() {
	if ( 'undefined' !== typeof wp.media?.frame ) {
		wp.media.frame.on( 'toggle:upload:attachment', () => {
			initImageIds();
			watchForUploadedImages();
		} );
	} else {
		waitForElm( '#wpcom-thumbnail-editor-modal-button' ).then( () => {
			const domElement = document.getElementById(
				'wpcom-thumbnail-editor-modal-button'
			);
			if ( domElement && domElement?.dataset?.id ) {
				loadThumbnailEditorModal(
					// @todo: delete this after testing is complete.
					[ Number( domElement.dataset.id ), 8 ],
					domElement
				);
			}
		} );
	}
}

$( window ).on( 'load', setup );
