import React from 'react';
import { TabPanel, TextControl, TextareaControl } from '@wordpress/components';
import { Editor } from '@tinymce/tinymce-react';
import CropEditor from '../crop-editor';

const {
	i18n: { __ },
	element: { useRef, useState },
} = wp;

const addRTE = ( id ) => {
	const { origin, tinyMCEPreInit } = window;
	const getEditorConfig = require( './editor-config' );
	const mceOptions = getEditorConfig( origin, id );

	if (
		typeof tinymce !== 'undefined' &&
		typeof tinyMCEPreInit?.mceInit !== 'undefined' &&
		typeof tinyMCEPreInit.mceInit?.[ id ] === 'undefined'
	) {
		tinyMCEPreInit.mceInit[ id ] = mceOptions;
	}
	return mceOptions;
};

export default function ImageEditor( { image, ratioMap, onImageEdit } ) {
	const tinyRef = useRef();
	const [ alt, setAlt ] = useState( image.alt_text );
	const [ credit, setCredit ] = useState( image?.meta?.credits );

	const id = 'editor-' + image.id;

	const opts = addRTE( id );

	const tinyMCE = `${ window.origin }/wp-includes/js/tinymce/tinymce.min.js`;

	const onFieldChange = ( field, value, callback ) => {
		if ( 'alt_text' === field ) {
			image[ field ] = value;
		} else if ( 'credits' === field || 'caption' === field ) {
			let plainText = value;
			if ( 'caption' === field ) {
				plainText = value.replace( /(<([^>]+)>)/gi, '' );
				image.caption = {
					raw: value,
					rendered: plainText,
				};
			}
			image.meta[ field ] = plainText;
		}

		if ( 'undefined' !== typeof callback ) {
			callback( value );
		}

		if ( 'undefined' !== typeof onImageEdit ) {
			onImageEdit( image.id, field, value );
		}
	};

	return (
		<TabPanel
			className="wpcom-thumbnail-editor__image-edit-tab-panel"
			activeClass="active-tab"
			initialTabName="fields"
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
			children={ ( tab ) => (
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
								onChange={ ( _credits ) =>
									onFieldChange(
										'credits',
										_credits,
										setCredit
									)
								}
							/>
							<TextareaControl
								label={ __(
									'Alt Text',
									'wpcom-thumbnail-editor'
								) }
								help={ __(
									'Text to describe the image to screen readers.',
									'wpcom-thumbnail-editor'
								) }
								className="wpcom-thumbnail-editor__image-alt"
								value={ alt }
								onChange={ ( _alt ) =>
									onFieldChange( 'alt_text', _alt, setAlt )
								}
							/>
							<div className="components-base-control wpcom-thumbnail-editor__image-caption">
								<div className="components-base-control__field">
									<label
										className="components-base-control__label"
										htmlFor={ id }
									>
										{ __(
											'Caption',
											'wpcom-thumbnail-editor'
										) }
									</label>
									<Editor
										id={ id }
										tinymceScriptSrc={ tinyMCE }
										onInit={ ( evt, _editor ) =>
											( tinyRef.current = _editor )
										}
										initialValue={
											image?.caption?.raw ??
											image?.meta?.caption
										}
										init={ opts }
										onEditorChange={ ( txt ) =>
											onFieldChange( 'caption', txt )
										}
									/>
								</div>
							</div>
						</>
					) : (
						<CropEditor image={ image } ratioMap={ ratioMap } />
					) }
				</>
			) }
		/>
	);
}
