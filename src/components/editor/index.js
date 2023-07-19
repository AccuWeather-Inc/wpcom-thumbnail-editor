/* global React */

import { TabPanel, TextControl, TextareaControl } from '@wordpress/components';
import { Editor } from '@tinymce/tinymce-react';
import CropEditor from '../crop-editor';

const {
	i18n: { __ },
	element: { useRef, useState },
} = wp;

const addRTE = ( id ) => {
	const { origin, tinyMCEPreInit } = window;
	const mceOptions = {
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
			image.meta[ field ] = value;
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
										onEditorChange={ ( txt ) => {
											onFieldChange( 'caption', txt );
										} }
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
