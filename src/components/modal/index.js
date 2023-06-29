/* global React, thumbnailEditorObj */

import {
	Modal,
	Button,
	Spinner,
	Guide as PageControl,
} from '@wordpress/components';
import { focus } from '@wordpress/dom';
import { LEFT, RIGHT } from '@wordpress/keycodes';
import { store as coreStore } from '@wordpress/core-data';
import ImageEditor from '../editor';

const {
	i18n: { __ },
	element: { useRef, useState, useEffect, useReducer },
	data: { useSelect },
} = wp;

const ImageEditModal = ( { imageIds, ratioMap } ) => {
	const modalRef = useRef();
	const [ isOpen, setOpen ] = useState( true );
	const [ currentPage, setCurrentPage ] = useState( 0 );

	useEffect( () => {
		// Each time we change the current page, start from the first element of the page.
		// This also solves any focus loss that can happen.
		if ( modalRef.current ) {
			focus.focusable.find( modalRef.current )?.[ 2 ]?.click();
		}
	}, [ currentPage ] );

	const [ updateImages ] = useReducer( ( state, update ) => {
		if ( update ) {
			const index = state.findIndex( ( img ) => img.id === update.id );
			if ( -1 === index ) {
				state.push( update );
			} else {
				state[ index ] = update;
			}
		}
		return state;
	}, [] );

	const images = useSelect(
		( select ) => {
			if ( ! imageIds?.length ) {
				return null;
			}

			const sel = select( coreStore ).getMediaItems( {
				include: imageIds.join( ',' ),
				per_page: imageIds.length,
				orderby: 'include',
			} );
			return sel;
		},
		[ imageIds ]
	);

	const editImage = () => {
		if ( ! images?.length ) {
			return null;
		}

		const currentImg = images[ currentPage ];
		const index = updateImages?.findIndex(
			( img ) => img.id === currentImg.id
		);
		return -1 === index ? currentImg : updateImages[ index ];
	};

	const canGoBack = currentPage > 0;
	const canGoForward = currentPage < images?.length - 1;

	const goBack = () => {
		if ( canGoBack ) {
			setCurrentPage( currentPage - 1 );
		}
	};

	const goForward = () => {
		if ( canGoForward ) {
			setCurrentPage( currentPage + 1 );
		}
	};

	const onKeyDown = ( event ) => {
		if ( event.keyCode === LEFT ) {
			goBack();
		} else if ( event.keyCode === RIGHT ) {
			goForward();
		}
	};

	const onSave = () => {
		// Handle save of all updateImages.
		setOpen( false );
		thumbnailEditorObj.addedIds = [];
	};

	return (
		<>
			{ /* <Button variant="secondary" onClick={ () => setOpen( true ) }>
				{ __( 'Edit image', 'wpcom-thumbnail-editor' ) }
			</Button> */ }
			{ isOpen && (
				<>
					{ ! images || 0 === images.length ? (
						<>
							{ ! images ? (
								<>
									<Spinner />
									{ __(
										'Loading Image Details…',
										'wpcom-thumbnail-editor'
									) }
								</>
							) : (
								<>
									{ __(
										'Loading Image Edit Modal Failed…',
										'wpcom-thumbnail-editor'
									) }
								</>
							) }
						</>
					) : (
						<Modal
							title={ __(
								'Edit Image',
								'wpcom-thumbnail-editor'
							) }
							onRequestClose={ () => {
								setOpen( false );
								thumbnailEditorObj.addedIds = [];
							} }
							isFullScreen
							shouldCloseOnClickOutside={ false }
							shouldCloseOnEsc={ false }
							onKeyDown={ onKeyDown }
							overlayClassName="wpcom-thumbnail-editor__overlay"
							ref={ modalRef }
						>
							<div className="components-guide__container">
								<div className="components-guide__page">
									{ images.length > 1 && (
										<PageControl
											currentPage={ currentPage }
											numberOfPages={ images.length }
											setCurrentPage={ setCurrentPage }
										/>
									) }
									<ImageEditor
										image={ editImage() }
										ratioMap={ ratioMap }
									/>
								</div>
							</div>
							<div className="components-modal__footer">
								<div className="components-modal__footer-flooring-container">
									{ canGoBack && (
										<Button
											className="components-guide__back-button"
											onClick={ goBack }
										>
											{ __( 'Previous' ) }
										</Button>
									) }
									{ canGoForward && (
										<Button
											className="components-guide__forward-button"
											onClick={ goForward }
										>
											{ __( 'Next' ) }
										</Button>
									) }
								</div>
								<Button
									variant="primary"
									onClick={ () => onSave() }
									className="components-modal__save-button"
									label="Save"
								>
									{ __( 'Save', 'wpcom-thumbnail-editor' ) }
								</Button>
							</div>
						</Modal>
					) }
				</>
			) }
		</>
	);
};

export default ImageEditModal;
