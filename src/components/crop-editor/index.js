import React from 'react';
import { TabPanel } from '@wordpress/components';
import Cropper from 'react-cropper';

const {
	i18n: { __ },
	element: { useRef, useState, useMemo, useReducer },
} = wp;

const getDownsized = ( sizes ) => {
	return {
		width: sizes?.full?.width ?? 1,
		height: sizes?.full?.height ?? 1,
	};
};

const getSelectionCoordinates = ( image, coordinates, thumbnail ) => {
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
		const selectedHeight = Math.round(
			downsizedImg.width / thumbnailAspectRatio
		);
		selection = setSelection( [
			0, // Far left edge (due to aspect ratio comparison).
			Math.round( downsizedImg.height / 2 - selectedHeight / 2 ), // Mid-point + half of height of selection.
			downsizedImg.width, // Far right edge (due to aspect ratio comparison).
			Math.round( downsizedImg.height / 2 + selectedHeight / 2 ), // Mid-point - half of height of selection.
		] );
	} else {
		// The thumbnail must be narrower than the original, so we want the full height.

		// Take the width and divide by the thumbnail's aspect ratio.
		const selectedWidth = Math.round(
			downsizedImg.height / ( thumbnail.height / thumbnail.width )
		);

		selection = setSelection( [
			Math.round( downsizedImg.width / 2 - selectedWidth / 2 ), // Mid-point + half of height of selection.
			0, // Top edge (due to aspect ratio comparison).
			Math.round( downsizedImg.width / 2 + selectedWidth / 2 ), // Mid-point - half of height of selection.
			downsizedImg.height, // Bottom edge (due to aspect ratio comparison).
		] );
	}

	return selection;
};

const preSaveSelectionCoordinates = ( img, displayImg, coordinates ) => {
	const { width, height } = img.media_details;
	const { width: dWidth, height: dHeight } = displayImg;
	const preSavedCoordinates = [];

	// If the image was scaled down on the selection screen,
	// then we need to scale up the selection to fit the fullsize image.
	if ( width > dWidth || height > dHeight ) {
		const scaleRatio = width / dWidth;
		for ( const coordinate in coordinates ) {
			preSavedCoordinates.push(
				Math.round( coordinates[ coordinate ] * scaleRatio )
			);
		}
	} else {
		for ( const coordinate in coordinates ) {
			preSavedCoordinates.push( coordinates[ coordinate ] );
		}
	}

	return preSavedCoordinates;
};

const thumbnailReducer = ( state, action ) => {
	if ( ! action.tab || ! action.img || ! action.ratioMap ) {
		return state;
	}

	const { source_url: sourceURL, wpcom_thumbnail_edit: thumbnailEdits } =
		action.img;
	const dimensions = action.ratioMap[ action.tab ].dimensions;
	const coordinates = thumbnailEdits?.[ action.ratioMap[ action.tab ].name ];
	return {
		width: dimensions.width,
		height: dimensions.height,
		url: sourceURL,
		selection: getSelectionCoordinates( action.img, coordinates, {
			width: dimensions.width,
			height: dimensions.height,
		} ),
	};
};

export const CropEditor = ( { image, ratioMap } ) => {
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

	const RenderTabCropEditView = ( { tab } ) => {
		const [ isCropperReady, setIsCropperReady ] = useState( false );
		const {
			link,
			media_details: { sizes },
		} = image;

		const full = getDownsized( sizes );
		const aspectRatio =
			ratioMap[ tab.name ].ratio[ 0 ] / ratioMap[ tab.name ].ratio[ 1 ];

		const getSelection = ( img, { top, left, width, height } ) => {
			return preSaveSelectionCoordinates( img, full, [
				left,
				top,
				width + left,
				height + top,
			] );
		};

		const onCrop = () => {
			const cropBoxData = cropperRef.current.cropper.getCropBoxData();
			if ( cropBoxData && isCropperReady ) {
				const { wpcom_thumbnail_edit: thumbnailEdits } = image;
				thumbnailEdits[ ratioMap[ tab.name ].name ] = getSelection(
					image,
					cropBoxData
				);
			}
		};

		const onReady = () => {
			const {
				selection: { y1: top, x1: left, x2: width, y2: height },
			} = thumbnail;

			cropperRef.current.cropper.setCropBoxData( {
				width: width - left,
				height: height - top,
				left,
				top,
			} );
			cropperRef.current.cropper.crop();
			setIsCropperReady( true );
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
				<div
					className="wpcom-edit-thumbnail-editor__wrapper"
					style={ { width: full.width, height: full.height } }
				>
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
				</div>
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
			onSelect={ ( tabKey ) => {
				setThumbnail( { tab: tabKey, img: image, ratioMap } );
			} }
			children={ ( tab ) => <RenderTabCropEditView tab={ tab } /> }
		/>
	);
};

export default CropEditor;
