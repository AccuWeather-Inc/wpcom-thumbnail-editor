/* eslint-disable camelcase, no-console */
/* global jQuery, React */

import {
	Modal,
	Button,
	Spinner,
	TabPanel,
	Guide,
	TextControl,
	TextareaControl,
} from '@wordpress/components';
import { focus } from '@wordpress/dom';
import { LEFT, RIGHT } from '@wordpress/keycodes';
import { store as coreStore } from '@wordpress/core-data';
import { Editor } from '@tinymce/tinymce-react';
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

	const { source_url, wpcom_thumbnail_edit: thumbnailEdits } = action.img;
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

const ImageCropEditor = ( { image, ratioMap } ) => {
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

		let isCropperReady = false;
		const setIsCropperReady = ( isReady ) => {
			isCropperReady = isReady;
		};

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

		const getData = ( crop = true ) => {
			const {
				selection: { y1: top, x1: left, x2: width, y2: height },
			} = thumbnail;

			const defaultData = {
				width: width - left,
				height: height - top,
			};

			if ( ! crop ) {
				return {
					...defaultData,
					y: top,
					x: left,
				};
			}

			return {
				...defaultData,
				left,
				top,
			};
		};

		const onReady = () => {
			setIsCropperReady( true );
			const data = getData();

			cropperRef.current.cropper.setCropBoxData( data );
			cropperRef.current.cropper.crop();
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
						autoCrop={ true }
						autoCropArea={ 1 }
						data={ getData( false ) }
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
			children={ renderTabCropEditView }
		/>
	);
};

const addRTE = ( id ) => {
	const { origin, tinyMCEPreInit } = window;
	const mce_options = {
		theme: 'modern',
		skin: 'lightgray',
		language: 'en',
		formats: {
			alignleft: [
				{
					selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li',
					styles: {
						textAlign: 'left',
					},
					deep: false,
					remove: 'none',
				},
				{
					selector: 'img,table,dl.wp-caption',
					classes: [ 'alignleft' ],
					deep: false,
					remove: 'none',
				},
			],
			aligncenter: [
				{
					selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li',
					styles: {
						textAlign: 'center',
					},
					deep: false,
					remove: 'none',
				},
				{
					selector: 'img,table,dl.wp-caption',
					classes: [ 'aligncenter' ],
					deep: false,
					remove: 'none',
				},
			],
			alignright: [
				{
					selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li',
					styles: {
						textAlign: 'right',
					},
					deep: false,
					remove: 'none',
				},
				{
					selector: 'img,table,dl.wp-caption',
					classes: [ 'alignright' ],
					deep: false,
					remove: 'none',
				},
			],
			strikethrough: {
				inline: 'del',
				deep: true,
				split: true,
			},
		},
		relative_urls: false,
		remove_script_host: false,
		convert_urls: false,
		browser_spellcheck: true,
		fix_list_elements: true,
		entities: '38,amp,60,lt,62,gt',
		entity_encoding: 'raw',
		keep_styles: false,
		cache_suffix: 'wp-mce-49110-20201110',
		resize: 'vertical',
		menubar: false,
		branding: false,
		preview_styles:
			'font-family font-size font-weight font-style text-decoration text-transform',
		end_container_on_empty_block: true,
		wpeditimage_html5_captions: true,
		wp_lang_attr: 'en-US',
		wp_keep_scroll_position: false,
		wp_shortcut_labels: {
			'Heading 1': 'access1',
			'Heading 2': 'access2',
			'Heading 3': 'access3',
			'Heading 4': 'access4',
			'Heading 5': 'access5',
			'Heading 6': 'access6',
			Paragraph: 'access7',
			Blockquote: 'accessQ',
			Underline: 'metaU',
			Strikethrough: 'accessD',
			Bold: 'metaB',
			Italic: 'metaI',
			Code: 'accessX',
			'Align center': 'accessC',
			'Align right': 'accessR',
			'Align left': 'accessL',
			Justify: 'accessJ',
			Cut: 'metaX',
			Copy: 'metaC',
			Paste: 'metaV',
			'Select all': 'metaA',
			Undo: 'metaZ',
			Redo: 'metaY',
			'Bullet list': 'accessU',
			'Numbered list': 'accessO',
			'Insert/edit image': 'accessM',
			'Insert/edit link': 'metaK',
			'Remove link': 'accessS',
			'Toolbar Toggle': 'accessZ',
			'Insert Read More tag': 'accessT',
			'Insert Page Break tag': 'accessP',
			'Distraction-free writing mode': 'accessW',
			'Add Media': 'accessM',
			'Keyboard Shortcuts': 'accessH',
		},
		content_css: `${ origin }/wp-includes/css/dashicons.min.css,${ origin }/wp-includes/js/tinymce/skins/wordpress/wp-content.css`,
		plugins:
			'charmap,colorpicker,hr,lists,media,paste,tabfocus,textcolor,fullscreen,wordpress,wpautoresize,wpeditimage,wpemoji,wpgallery,wplink,wpdialogs,wptextpattern,wpview,image',
		external_plugins: {},
		selector: '#' + id,
		wpautop: true,
		indent: false,
		toolbar1:
			'formatselect,bold,italic,bullist,numlist,blockquote,alignleft,aligncenter,alignright,link,wp_more,spellchecker,fullscreen,wp_adv',
		toolbar2:
			'strikethrough,hr,forecolor,pastetext,removeformat,charmap,outdent,indent,undo,redo,wp_help',
		toolbar3: '',
		toolbar4: '',
		tabfocus_elements: ':prev,:next',
		body_class:
			id +
			' post-type-attachment post-status-inherit page-template-default locale-en-us',
		wp_skip_init: false,
		extended_valid_elements: 'script[charset|defer|language|src|type]',
	};

	if (
		typeof tinymce !== 'undefined' &&
		typeof tinyMCEPreInit.mceInit[ id ] === 'undefined'
	) {
		tinyMCEPreInit.mceInit[ id ] = mce_options;
	}
	return mce_options;
};

export function ImageEditor( { image, ratioMap } ) {
	const tinyRef = useRef();
	const [ alt, setAlt ] = useState( image.alt_text );
	const [ credit, setCredit ] = useState( image?.meta?.credits );

	const id = 'editor-' + image.id;

	// Need to fix this so that it isn't dependent on fieldmanager field.
	const opts = addRTE( id );

	const tinyMCE = `${ window.origin }/wp-includes/js/tinymce/tinymce.min.js`;

	const log = () => {
		if ( tinyRef.current ) {
			console.log( tinyRef.current.getContent() );
		}
	};

	console.log( { image } );

	const children = ( tab ) => (
		<>
			{ 'fields' === tab.name ? (
				<>
					<TextControl
						label="Credits"
						help={ __(
							'This is a required Field.',
							'wpcom-thumbnail-editor'
						) }
						value={ credit }
						onChange={ setCredit }
					/>
					<TextareaControl
						label={ __( 'Alt Text', 'wpcom-thumbnail-editor' ) }
						help={ __(
							'Text to describe the image to screen readers.',
							'wpcom-thumbnail-editor'
						) }
						className="wpcom-thumbnail-editor__image-alt"
						value={ alt }
						onChange={ setAlt }
					/>
					<div className="components-base-control wpcom-thumbnail-editor__image-caption">
						<div className="components-base-control__field">
							<label
								className="components-base-control__label"
								htmlFor={ id }
							>
								{ __( 'Caption', 'wpcom-thumbnail-editor' ) }
							</label>
							<Editor
								id={ id }
								tinymceScriptSrc={ tinyMCE }
								onInit={ ( evt, _editor ) =>
									( tinyRef.current = _editor )
								}
								initialValue={ image.caption.raw }
								init={ opts }
							/>
						</div>
						<button onClick={ log }>Log editor content</button>
					</div>
				</>
			) : (
				<ImageCropEditor image={ image } ratioMap={ ratioMap } />
			) }
		</>
	);

	return (
		<TabPanel
			className="wpcom-thumbnail-editor__image-edit-tab-panel"
			activeClass="active-tab"
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
