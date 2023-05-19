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


const updatePreview = ( selection, { image, thumbnail } ) => {
	const {
		width,
		height,
	} = image;

	const scaleX = thumbnail.width / ( selection.width || 1 );
	const scaleY = thumbnail.height / ( selection.height || 1 );

	// Update the preview image.
	$('#wpcom-thumbnail-edit-preview').css({
		width: Math.round( scaleX * width ) + 'px',
		height: Math.round( scaleY * height ) + 'px',
		marginLeft: '-' + Math.round( scaleX * selection.x1 ) + 'px',
		marginTop: '-' + Math.round( scaleY * selection.y1 ) + 'px'
	});
}
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
		thumbnail: {
			width: 1,
			height: 1,
			selection: {
				x1: 0, y1: 0, x2: 0, y2: 0
			},
		},
		setThumbnail: (tabName) => {
			const {
				image: {
					media_details: {
						sizes,
					},
				},
				ratioMap,
				thumbnailEdits,
			} = this.props;

			const cropSizeName = ratioMap[ tabName ];
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

			this.setState({
				thumbnail,
			});
		},
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

	initImgAreaSelect() {
		const { image } = this.props;
		const {
			thumbnail: {
				width,
				height,
				selection,
			},
		} = this.state;

		const imgAreaSelectArgs = {
			aspectRatio: width + ':' + height,
			handles: true,

			// Initial selection.
			x1: selection.x1,
			y1: selection.y1,
			x2: selection.x2,
			y2: selection.y2,

			// Update the preview.
			onInit: function ( img, selection ) {
				updatePreview( selection, { image, thumbnail: { width, height } } );
				$('#wpcom-thumbnail-edit-preview').show();
				$('#wpcom-thumbnail-edit').trigger('wpcom_thumbnail_edit_init');
			},
			onSelectChange: function ( img, selection ) {
				updatePreview( selection, { image, thumbnail: { width, height } } );
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
		};
		console.log({
			text: 'Running area select..',
			imgAreaSelectArgs,
		});

		jQuery(document).ready(function($){
			$('#wpcom-thumbnail-edit').imgAreaSelect(imgAreaSelectArgs);
		});
	}

	renderTabView(tab) {
		const {
			id,
			image: {
				link,
				media_details: {
					sizes,
				},
			},
			ratioMap,
		} = this.props;

		const {
			thumbnail,
			setThumbnail,
		} = this.state;

		const cropSizeName = ratioMap[ tab.name ];
		const full = {
			width: sizes['full'].width,
			height: sizes['full'].height,
		};

		if ( ! thumbnail ) {
			setThumbnail( tab.name );
		}

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
				{/**
				  * @todo Ensure that changing tabs does not result
				  * in additional untracked events being added..
				*/}
				{this.initImgAreaSelect()}
			</div>
		)
	}

	renderModal() {
		const {
			setOpen,
			setThumbnail,
		} = this.state;

		const getTabList = () => {
			const { ratioMap } = this.props;
			let tabList = [];
			for (const [key, val] of Object.entries(ratioMap)) {
				tabList.push({
					name: key,
					title: key,
					className: 'tab-' + key,
				});
			}
			return tabList;
		};

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
					tabs={ getTabList() }
					onSelect={ ( tabName ) => setThumbnail( tabName ) }
				>
					{ ( tab ) => this.renderTabView( tab )}
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
