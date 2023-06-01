/* eslint-disable camelcase, no-console */
/* global React */

import { Modal, Button, Spinner, TabPanel, Guide } from '@wordpress/components';
import { focus } from '@wordpress/dom';
import { LEFT, RIGHT } from '@wordpress/keycodes';
import { store as coreStore } from '@wordpress/core-data';
import Cropper from 'react-cropper';

const {
	apiFetch,
	i18n: { __ },
	element: { useRef, useState, useEffect, useMemo, useReducer },
	data: { useSelect },
} = wp;

const getDownsized = ( sizes ) => {
	return {
		width: sizes?.full?.width ?? 1,
		height: sizes?.full?.height ?? 1,
	};
};

const getSelectionCoordinates = ( image, coordinates, thumbnail ) => {
	console.log( { image, coordinates, thumbnail } );
	const downsizedImg = getDownsized( image.media_details.sizes );
	const setSelection = ( selected ) => {
		return {
			x1: selected?.[ 0 ] ?? 0,
			y1: selected?.[ 1 ] ?? 0,
			x2: selected?.[ 2 ] ?? 1,
			y2: selected?.[ 3 ] ?? 1,
		};
	};

	const originalAspectRatio = downsizedImg.width / downsizedImg.height;
	const thumbnailAspectRatio = thumbnail.width / thumbnail.height;

	let selection = [];
	if ( coordinates ) {
		const { width, height } = image.media_details;

		// If original is bigger than display, scale down the coordinates to match the scaled down original.
		if ( width > downsizedImg.width || height > downsizedImg.height ) {
			// At what percentage is the image being displayed at?
			const scale = downsizedImg.width / width;
			const scaledCoordinates = [];
			coordinates.forEach( ( coordinate ) => {
				scaledCoordinates.push( Math.round( coordinate * scale ) );
			} );
			selection = setSelection( scaledCoordinates );
		} else {
			// Or the image was not downscaled, so the coordinates are correct.
			selection = setSelection( coordinates );
		}
	} else if ( thumbnailAspectRatio === originalAspectRatio ) {
		// If original and thumb are the same aspect ratio, then select the whole image.
		selection = setSelection( [
			0,
			0,
			downsizedImg.width,
			downsizedImg.height,
		] );
	} else if ( thumbnailAspectRatio > originalAspectRatio ) {
		// If the thumbnail is wider than the original, we want the full width.

		// Take the width and divide by the thumbnail's aspect ratio.
		const selected_height = Math.round(
			downsizedImg.width / thumbnailAspectRatio
		);
		selection = setSelection( [
			0, // Far left edge (due to aspect ratio comparison).
			Math.round( downsizedImg.height / 2 - selected_height / 2 ), // Mid-point + half of height of selection.
			downsizedImg.width, // Far right edge (due to aspect ratio comparison).
			Math.round( downsizedImg.height / 2 + selected_height / 2 ), // Mid-point - half of height of selection.
		] );
	} else {
		// The thumbnail must be narrower than the original, so we want the full height.

		// Take the width and divide by the thumbnail's aspect ratio.
		const selected_width = Math.round(
			downsizedImg.width / ( downsizedImg.height / downsizedImg.width )
		);

		selection = setSelection( [
			Math.round( downsizedImg.width / 2 - selected_width / 2 ), // Mid-point + half of height of selection.
			0, // Top edge (due to aspect ratio comparison).
			Math.round( downsizedImg.width / 2 + selected_width / 2 ), // Mid-point - half of height of selection.
			downsizedImg.height, // Bottom edge (due to aspect ratio comparison).
		] );
	}

	return selection;
};

const thumbnailReducer = ( state, action ) => {
	if ( ! action.tab || ! action.img || ! action.ratioMap ) {
		return state;
	}

	const {
		media_details: { source_url },
		wpcom_thumbnail_edit: thumbnailEdits,
	} = action.img;

	const dimensions = action.ratioMap[ action.tab ].dimensions;
	const coordinates = thumbnailEdits?.[ action.ratioMap[ action.tab ].name ];
	return {
		width: dimensions.width,
		height: dimensions.height,
		url: source_url,
		selection: getSelectionCoordinates( action.img, coordinates, {
			width: dimensions.width,
			height: dimensions.height,
		} ),
	};
};

const ImageCropEditor = ( { image, ratioMap, onUpdate } ) => {
	const cropperRef = useRef();
	const initialThumbnail = () => {
		const key = Object.keys( ratioMap )?.[ 0 ];
		const rsp = thumbnailReducer( {}, { tab: key, img: image, ratioMap } );
		return rsp;
	};
	const [ thumbnail, setThumbnail ] = useReducer(
		thumbnailReducer,
		initialThumbnail()
	);

	const tabList = useMemo( () => {
		const tabs = [];
		for ( const key in ratioMap ) {
			tabs.push( {
				name: key,
				title: key.replace( '-by-', ':' ),
				className: 'tab_' + key,
			} );
		}
		return tabs;
	}, [ ratioMap ] );

	const renderTabCropEditView = ( tab ) => {
		const {
			link,
			media_details: { sizes },
		} = image;

		const full = getDownsized( sizes );
		const aspectRatio =
			ratioMap[ tab.name ].ratio[ 0 ] / ratioMap[ tab.name ].ratio[ 1 ];

		const onCrop = () => {
			const getSelection = ( { top, left, width, height } ) => {
				return [ top, left, width + left, height + top ];
			};
			const cropBoxData = cropperRef?.current?.cropper?.getCropBoxData();
			// if ( cropBoxData ) {
			// 	const { wpcom_thumbnail_edit: thumbnailEdits } = image;
			// 	thumbnailEdits[ ratioMap[ tab.name ].name ] =
			// 		getSelection( cropBoxData );

			// 	onUpdate( updateImage );
			// }
		};

		const onReady = () => {
			const {
				selection: { y1: top, x1: left, x2: width, y2: height },
			} = thumbnail;

			cropperRef?.current?.cropper?.setCropBoxData( {
				top,
				left,
				width: width - left,
				height: height - top,
			} );
		};

		return (
			<div className={ tab.className }>
				<h2>
					{ __( 'Edit Thumbnail: ', 'wpcom-thumbnail-editor' ) +
						tab.title }
				</h2>
				<p>
					{ __(
						'The original image is shown in full below, although it may have been shrunk to fit on your screen. Please select the portion that you would like to use as the thumbnail image.',
						'wpcom-thumbnail-editor'
					) }
				</p>
				<Cropper
					className="wpcom-edit-thumbnail-editor"
					src={ link }
					style={ { width: full.width, height: full.height } }
					// Cropper.js options
					initialAspectRatio={ aspectRatio }
					aspectRatio={ aspectRatio }
					crop={ onCrop }
					ready={ onReady }
					zoomable={ false }
					scalable={ false }
					rotatable={ false }
					ref={ cropperRef }
					preview=".img-preview"
				/>
				<h3>
					{ __(
						'Fullsize Thumbnail Preview',
						'wpcom-thumbnail-editor'
					) }
				</h3>
				<div
					className="img-preview"
					style={ {
						overflow: 'hidden',
						width: thumbnail.width + 'px',
						height: thumbnail.height + 'px',
						paddingRight: '2em',
					} }
				>
					<img
						id="wpcom-thumbnail-edit-modal-preview"
						src={ link }
						alt="preview"
					/>
				</div>
			</div>
		);
	};

	return (
		<TabPanel
			className="wpcom-thumbnail-editor__crops-tab-panel"
			tabs={ tabList }
			orientation="vertical"
			onSelect={ ( tabKey ) =>
				setThumbnail( { tab: tabKey, img: image, ratioMap } )
			}
			children={ renderTabCropEditView }
		/>
	);
};

export function ImageEditor( { image, ratioMap, onChange } ) {
	const onSelect = ( tabName ) => {
		console.log( 'Selecting tab', tabName );
		// onChange();
	};

	const children = ( tab ) => (
		<>
			{ 'crops' === tab.name ? (
				<ImageCropEditor
					image={ image }
					ratioMap={ ratioMap }
					onUpdate={ onSelect }
				/>
			) : (
				<div>Nothing to see here yet.</div>
			) }
		</>
	);

	return (
		<TabPanel
			className="wpcom-thumbnail-editor__image-edit-tab-panel"
			activeClass="active-tab"
			onSelect={ onSelect }
			tabs={ [
				{
					name: 'fields',
					title: 'Fields',
					className: 'tab-fields',
				},
				{
					name: 'crops',
					title: 'Crops',
					className: 'tab-crops',
				},
			] }
			children={ children }
		/>
	);
}

export function ImageEditModal( { imageIds, ratioMap } ) {
	const modalRef = useRef();
	const [ isOpen, setOpen ] = useState( null );
	const [ currentPage, setCurrentPage ] = useState( 0 );

	useEffect( () => {
		// Each time we change the current page, start from the first element of the page.
		// This also solves any focus loss that can happen.
		if ( modalRef.current ) {
			focus.tabbable.find( modalRef.current )?.[ 0 ]?.focus();
		}
	}, [ currentPage ] );

	const [ updateImages, setUpdateImages ] = useReducer( ( state, update ) => {
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
	};

	return (
		<>
			<Button variant="secondary" onClick={ () => setOpen( true ) }>
				{ __( 'Edit image', 'wpcom-thumbnail-editor' ) }
			</Button>
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
							onRequestClose={ () => setOpen( false ) }
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
										<Guide.PageControl
											currentPage={ currentPage }
											numberOfPages={ images.length }
											setCurrentPage={ setCurrentPage }
										/>
									) }
									<ImageEditor
										image={ editImage() }
										ratioMap={ ratioMap }
										onChange={ setUpdateImages }
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
}
