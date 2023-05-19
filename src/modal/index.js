/* global wp, React */

import { Button, Modal } from '@wordpress/components';
import PropTypes from 'prop-types';

const {
	i18n: {
		__,
	},
	element: {
		useState,
	},
} = wp;

export default class ThumbnailEditorModal extends React.PureComponent {
	// Define Prop for this component.
	static defaultProps = {
		test: '',
		image: null,
		thumbnails: [],
	};

	// Define PropTypes for this component.
	static propTypes = {
		test: PropTypes.string,
		image: PropTypes.shape({
			id: PropTypes.number,
			width: PropTypes.number,
			height: PropTypes.number,
		}),
		thumbnails: PropTypes.arrayOf(
			PropTypes.shape({
				crop: PropTypes.bool,
				width: PropTypes.number,
				height: PropTypes.number,
				url: PropTypes.string,
			}),
		),
	};

	/**
	 * Set the starting state.
	 * @type {object}
	 */
	state = {
		open: false,
		setOpen: (isOpen) => {
			this.setState({
				open: isOpen,
			});
		},
		thumbnail: {
			selection: [],
			dimensions: [],
		}
	};

	/**
	 * Constructor. Binds function scope.
	 * @param {object} props - Props for this component.
	 */
	constructor(props) {
		super(props);
	}

	/**
	 * Get coordinates for thumbnail if they're already set.
	 *
	 * @todo: $coordinates       = $this->get_coordinates( $attachment->ID, $size );
	 */
	getCoordinates() {

	}

	updatePreview( img, selection ) {
		const {
			image: {
				width,
				height,
			},
		} = this.props;

		const { thumbnail: { dimensions } } = this.state;

		const scaleX = dimensions.width / ( selection.width || 1 );
		const scaleY = dimensions.height / ( selection.height || 1 );

		// Update the preview image.
		$('#wpcom-thumbnail-edit-preview').css({
			width: Math.round( scaleX * width ) + 'px',
			height: Math.round( scaleY * height ) + 'px',
			marginLeft: '-' + Math.round( scaleX * selection.x1 ) + 'px',
			marginTop: '-' + Math.round( scaleY * selection.y1 ) + 'px'
		});
	}

	initImgAreaSelect() {
		const {
			thumbnail: {
				selection,
				dimensions: {
					width,
					height,
				},
			},
		} = this.state;

		$('#wpcom-thumbnail-edit').imgAreaSelect({
			aspectRatio: width + ':' + height,
			handles: true,

			// Initial selection.
			x1: selection[0],
			y1: selection[1],
			x2: selection[2],
			y2: selection[3],

			// Update the preview.
			onInit: function ( img, selection ) {
				update_preview( img, selection );
				$('#wpcom-thumbnail-edit-preview').show();
				$('#wpcom-thumbnail-edit').trigger('wpcom_thumbnail_edit_init');
			},
			onSelectChange: function ( img, selection ) {
				update_preview( img, selection );
				$('#wpcom-thumbnail-edit').trigger('wpcom_thumbnail_edit_change');
			},

			// Fill the hidden fields with the selected coordinates for the form.
			onSelectEnd: function ( img, selection ) {
				$('input[name="wpcom_thumbnail_edit_x1"]').val(selection.x1);
				$('input[name="wpcom_thumbnail_edit_y1"]').val(selection.y1);
				$('input[name="wpcom_thumbnail_edit_x2"]').val(selection.x2);
				$('input[name="wpcom_thumbnail_edit_y2"]').val(selection.y2);
				$('#wpcom-thumbnail-edit').trigger('wpcom_thumbnail_edit_selectend');
			}
		});
	}

	/**
	 * Renders component markup.
	 * @returns {object} - JSX for this component.
	 */
	render() {
		const {
			test
		} = this.props;
		const {
			open,
			setOpen,
		} = this.state;
		console.log('qwdwqdqwd', test);

		return (
			<>
				{ ! open ? (
					<Button variant="secondary" onClick={() => setOpen(true)}>
						{__('Edit image cropping', 'wpcom-thumbnail-editor')}
					</Button>
				) : (
					<Modal
						title={__('Edit Image Crops', 'wpcom-thumbnail-editor')}
						onRequestClose={() => setOpen(false)}
						isFullScreen
						shouldCloseOnClickOutside={false}
						shouldCloseOnEsc={false}
						overlayClassName='wpcom-thumbnail-editor__overlay'
					>
						<h2>
							{__(
								'Edit Thumbnail: 1:1',
								'wpcom-thumbnail-editor',
							)}
						</h2>
						<p>
							{__(
								'The original image is shown in full below, although it may have been shrunk to fit on your screen. Please select the portion that you would like to use as the thumbnail image.',
								'wpcom-thumbnail-editor'
							)}
						</p>
						<p>
							<img
								src={test}
								// width='1024'
								// height='576'
								id="wpcom-thumbnail-edit"
								alt=""
							/>
						</p>
						<p>
							<Button
								variant="primary"
								onClick={() => null}
							>
								{__('Reset Thumbnail', 'wpcom-thumbnail-editor')}
							</Button>
							<Button
								variant="primary"
								onClick={() => null}
							>
								{__('Save Changes', 'wpcom-thumbnail-editor')}
							</Button>
						</p>
						<h3>
							{__('Fullsize Thumbnail Preview', 'wpcom-thumbnail-editor')}
						</h3>
						<div style={{overflow:'hidden', width:'150px', height:'150px'}}>
							<img id="wpcom-thumbnail-edit-preview" class="hidden" src={test} />
						</div>

						<input type="hidden" name="action" value="wpcom_thumbnail_edit" />
						<input type="hidden" name="id" value="<?php echo (int) $attachment->ID; ?>" />
						<input type="hidden" name="size" value="<?php echo esc_attr( $size ); ?>" />

						{/*
						  * Since the fullsize image is possibly scaled down, we need to record at what size it was
						  * displayed at so the we can scale up the new selection dimensions to the fullsize image.
						*/}
						<input type="hidden" name="wpcom_thumbnail_edit_display_width"  value="<?php echo (int) $image[1]; ?>" />
						<input type="hidden" name="wpcom_thumbnail_edit_display_height" value="<?php echo (int) $image[2]; ?>" />

						{/* <!-- These are manipulated via Javascript to submit the selected values --> */}
						<input type="hidden" name="wpcom_thumbnail_edit_x1" value="<?php echo (int) $initial_selection[0]; ?>" />
						<input type="hidden" name="wpcom_thumbnail_edit_y1" value="<?php echo (int) $initial_selection[1]; ?>" />
						<input type="hidden" name="wpcom_thumbnail_edit_x2" value="<?php echo (int) $initial_selection[2]; ?>" />
						<input type="hidden" name="wpcom_thumbnail_edit_y2" value="<?php echo (int) $initial_selection[3]; ?>" />
					</Modal>
				)}
			</>
		);
	}
}
