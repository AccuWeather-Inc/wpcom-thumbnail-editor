/* global thumbnailEditorObj */

import React from 'react';
import {
	Modal,
	Button,
	Spinner,
	Guide as PageControl,
} from '@wordpress/components';
import { focus } from '@wordpress/dom';
import { LEFT, RIGHT } from '@wordpress/keycodes';
import { store as coreStore } from '@wordpress/core-data';
import { store as noticesStore } from '@wordpress/notices';
import ImageEditor from '../editor';

const {
	i18n: { __ },
	element: { useRef, useState, useEffect, useReducer },
	data: { useSelect, useDispatch },
} = wp;

export const ImageEditModal = ( {
	imageIds,
	ratioMap,
	startOpened = false,
} ) => {
	const modalRef = useRef();
	const [ isOpen, setOpen ] = useState( startOpened );
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
		console.log( { back: images } );
		if ( canGoBack ) {
			setCurrentPage( currentPage - 1 );
		}
	};

	const goForward = () => {
		console.log( { forward: images } );
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

	const { saveMedia, editEntityRecord } = useDispatch( coreStore );
	const editMediaItem = ( recordId, edits ) =>
		editEntityRecord( 'root', 'media', 'edit', recordId, edits );

	const onSave = () => {
		// Handle save of all updateImages.
		setOpen( false );
		thumbnailEditorObj.addedIds = [];
	};

	const { createErrorNotice } = useDispatch( noticesStore );
	function onSaveError( message = '' ) {
		const defaultMsg = __(
			"Please select 'Save' button to save and close the modal.",
			'wpcom-thumbnail-editor'
		);
		createErrorNotice( message ? message : defaultMsg, {
			type: 'snackbar',
		} );
	}

	const handleCloseRequest = () => {
		onSaveError();
	};

	return (
		<>
			{ ! startOpened && (
				<Button variant="secondary" onClick={ () => setOpen( true ) }>
					{ __( 'Edit Image Thumbnails', 'wpcom-thumbnail-editor' ) }
				</Button>
			) }
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
							onRequestClose={ handleCloseRequest }
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
