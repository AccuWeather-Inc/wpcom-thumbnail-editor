/* global wp, React */

import {
	Modal,
	Button,
	Spinner,
	TabPanel,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import PropTypes from 'prop-types';

const {
	i18n: {
		__,
	},
	apiFetch,
	url: {
		addQueryArgs,
	},
	data: { withSelect },
} = wp;

class ThumbnailEditorModal extends React.PureComponent {
	// Define Prop for this component.
	static defaultProps = {
		image: null,
		ratioMap: [],
		thumbnailEdits: [],
	};

	// Define PropTypes for this component.
	static propTypes = {
		id: PropTypes.number.isRequired,
		image: PropTypes.string,
		ratioMap: PropTypes.arrayOf(
			PropTypes.objectOf(
				PropTypes.shape({
					ratio: PropTypes.string,
					crops: PropTypes.arrayOf(
						PropTypes.string,
					),
				}),
			),
		),
		thumbnailEdits: PropTypes.arrayOf(
			PropTypes.objectOf(
				PropTypes.shape({
					ratio: PropTypes.string,
					dimens: PropTypes.arrayOf(
						PropTypes.string,
					),
				}),
			),
		),
	};

	/**
	 * Set the starting state.
	 * @type {object}
	 */
	state = {
		open: false,
		loading: false,
		setOpen: (isOpen) => {
			this.setState({
				open: isOpen,
			});
		},
		tabList: null,
		setTabList: () => {
			const { ratioMap } = this.props;
			let tabList = [];
			for (const [key, val] of Object.entries(ratioMap)) {
				tabList.push({
					name: key,
					title: key,
					className: 'tab-' + key,
				});
			}
			this.setState({
				tabList,
			});
			return tabList;
		},
		thumbnail: {
			selection: [],
			dimensions: [],
		},
	};

	/**
	 * Constructor. Binds function scope.
	 * @param {object} props - Props for this component.
	 */
	constructor(props) {
		super(props);

		/**
		 * @todo need to fetch image details for state use.
		 */
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
			thumbnail: {
				dimensions
			}
		} = this.state;

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

	oldRenderModal() {
		const {
			id,
			image: {
				link,
			}
		} = this.props;
		const {
			setOpen,
		} = this.state;

		console.log({
			props: this.props,
		});

		return (
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
						src={link}
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
					<img id="wpcom-thumbnail-edit-preview" class="hidden" src={link} />
				</div>

				<input type="hidden" name="action" value="wpcom_thumbnail_edit" />
				<input type="hidden" name="id" value={id} />
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
		);
	}

	renderTabView(tab) {
		const {
			id,
			image: {
				link,
				media_details: {
					width,
					height,
					sizes,
				},
			},
			ratioMap,
			thumbnailEdits,
		} = this.props;

		const cropSizeName = ratioMap[ tab.name ];
		const full = {
			width: sizes['full'].width,
			height: sizes['full'].height,
		};
		const thumbnail = {
			width: sizes[ cropSizeName ].width,
			height: sizes[ cropSizeName ].height,
			url: sizes[ cropSizeName ].source_url,
			selection: {
				x1: thumbnailEdits?.[ cropSizeName ]?.[0],
				y1: thumbnailEdits?.[ cropSizeName ]?.[1],
				x2: thumbnailEdits?.[ cropSizeName ]?.[2],
				y2: thumbnailEdits?.[ cropSizeName ]?.[3],
			},
		};

		return (
			<div className={tab.className}>
				<h2>
					{__( 'Edit Thumbnail: ', 'wpcom-thumbnail-editor') + tab.title }
				</h2>
				<p>
					{__(
						'The original image is shown in full below, although it may have been shrunk to fit on your screen. Please select the portion that you would like to use as the thumbnail image.',
						'wpcom-thumbnail-editor'
					)}
				</p>
				<p>
					<img
						src={link}
						width={full.width}
						height={full.height}
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
				<div style={{overflow:'hidden', width: thumbnail.width + 'px', height: thumbnail.height + 'px'}}>
					<img id="wpcom-thumbnail-edit-preview" class="hidden" src={link} />
				</div>

				<input type="hidden" name="action" value="wpcom_thumbnail_edit" />
				<input type="hidden" name="id" value={id} />
				<input type="hidden" name="size" value={cropSizeName} />

				{/*
				* Since the fullsize image is possibly scaled down, we need to record at what size it was
				* displayed at so the we can scale up the new selection dimensions to the fullsize image.
				*/}
				<input type="hidden" name="wpcom_thumbnail_edit_display_width"  value={thumbnail.width} />
				<input type="hidden" name="wpcom_thumbnail_edit_display_height" value={thumbnail.height} />

				{/* <!-- These are manipulated via Javascript to submit the selected values --> */}
				<input type="hidden" name="wpcom_thumbnail_edit_x1" value={thumbnail.selection.x1} />
				<input type="hidden" name="wpcom_thumbnail_edit_y1" value={thumbnail.selection.y1} />
				<input type="hidden" name="wpcom_thumbnail_edit_x2" value={thumbnail.selection.x2} />
				<input type="hidden" name="wpcom_thumbnail_edit_y2" value={thumbnail.selection.y2} />
			</div>
		)
	}

	renderModal() {
		const {
			setOpen,
			tabList,
			setTabList
		} = this.state;

		console.log({
			props: this.props,
		});

		return (
			<Modal
				title={__('Edit Image Crops', 'wpcom-thumbnail-editor')}
				onRequestClose={() => setOpen(false)}
				isFullScreen
				shouldCloseOnClickOutside={false}
				shouldCloseOnEsc={false}
				overlayClassName='wpcom-thumbnail-editor__overlay'
			>
				<TabPanel
					className="my-tab-panel"
					tabs={ tabList ?? setTabList() }
				>
					{ ( tab ) => this.renderTabView( tab ) }
				</TabPanel>
			</Modal>
		);
	}

	/**
	 * Renders component markup.
	 * @returns {object} - JSX for this component.
	 */
	render() {
		const {
			image,
		} = this.props;

		const {
			open,
			setOpen,
		} = this.state;

		return (
			<>
				{ ! open ? (
					<Button variant="secondary" onClick={() => setOpen(true)}>
						{__('Edit image cropping', 'wpcom-thumbnail-editor')}
					</Button>
				) : (
					<>
						{ ! image ? (
							<>
								<Spinner />
								{__('Loading Image Details...', 'wpcom-thumbnail-editor')}
							</>
						) : (
							this.renderModal()
						)}
					</>
				)}
			</>
		);
	}
}

export default withSelect( (select, props) => {
	const image = select( coreStore )
		.getMedia( props?.id ) ?? null;

	return {
		image,
		thumbnailEdits: image?.wpcom_thumbnail_edit,
	};
})(ThumbnailEditorModal);
