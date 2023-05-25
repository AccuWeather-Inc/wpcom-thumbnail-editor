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
	element: { useRef },
	compose: {
		useInstanceId,
		useFocusReturn,
		useFocusOnMount,
		__experimentalUseFocusOutside: useFocusOutside,
		useConstrainedTabbing,
		useMergeRefs,
	},
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
		image: PropTypes.instanceOf(Object),
		tabs: PropTypes.objectOf(
			PropTypes.shape({
				tabList: PropTypes.arrayOf(
					PropTypes.objectOf(
						PropTypes.shape({
							name: PropTypes.string,
							title: PropTypes.string,
							className: PropTypes.string,
						}),
					),
				),
				tabRefs: PropTypes.oneOfType([
					PropTypes.func,
					PropTypes.shape({ current: PropTypes.instanceOf(Element) })
				]),
			}),
		),
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
		downsizedImage: {
			width: 1,
			height: 1,
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
			const coordinates = thumbnailEdits?.[ cropSizeName ];
			const thumbnail = {
				width: sizes[ cropSizeName ].width,
				height: sizes[ cropSizeName ].height,
				url: sizes[ cropSizeName ].source_url,
				selection: this.getSelectionCoordinates(
					coordinates,
					{
						width: sizes[ cropSizeName ].width,
						height: sizes[ cropSizeName ].height,
					}
				)
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

		const { ratioMap } = props;
		this.tabRefs = {};
		this.tabList = [];
		for (const [key, val] of Object.entries(ratioMap)) {
			this.tabRefs[ key ] = React.createRef();
			this.tabList.push({
				name: key,
				title: key,
				className: 'tab-' + key.replace(':', '-by-'),
			});
		}
		this.currentTabRef = React.createRef();
	}

	componentDidMount() {}

	/**
	 * Get downsized dimentions for image, typically the 'full' crop.
	 */
	static getDownsized( sizes ) {
		return {
			width: sizes?.['full']?.width ?? 1,
			height: sizes?.['full']?.height ?? 1,
		};
	}

	getSelectionCoordinates( coordinates, thumbnail ) {
		const { getDownsized } = this.constructor;
		const {
			image: {
				media_details,
			},
		} = this.props;
		const downsizedImg = getDownsized( media_details.sizes );
		const setSelection = ( selected ) => {
			return {
				x1: selected?.[0] ?? 0,
				y1: selected?.[1] ?? 0,
				x2: selected?.[2] ?? 1,
				y2: selected?.[3] ?? 1,
			};
		};

		const originalAspectRatio = downsizedImg.width / downsizedImg.height;
		const thumbnailAspectRatio = thumbnail.width / thumbnail.height;

		let selection = [];
		if ( coordinates ) {
			const { width, height } = media_details;

			// If original is bigger than display, scale down the coordinates to match the scaled down original.
			if (
				width > downsizedImg.width
				|| height > downsizedImg.height
			) {
				// At what percentage is the image being displayed at?
				const scale = downsizedImg.width / width;
				const scaledCoordinates = [];
				coordinates.forEach(coordinate => {
					scaledCoordinates.push(
						Math.round( coordinate * scale )
					);
				});
				selection = setSelection( scaledCoordinates );
			} else {
				// Or the image was not downscaled, so the coordinates are correct.
				selection = setSelection( coordinates );
			}
		} else if ( thumbnailAspectRatio === originalAspectRatio ) {
			// If original and thumb are the same aspect ratio, then select the whole image.
			selection = setSelection( [ 0, 0, downsizedImg.width, downsizedImg.height ] );
		} else if ( thumbnailAspectRatio > originalAspectRatio ) {
			// If the thumbnail is wider than the original, we want the full width.

			// Take the width and divide by the thumbnail's aspect ratio.
			const selected_height = Math.round(
				downsizedImg.width / thumbnailAspectRatio
			);
			selection = setSelection([
				0,                                                                   // Far left edge (due to aspect ratio comparison).
				Math.round( ( downsizedImg.height / 2 ) - ( selected_height / 2 ) ), // Mid-point + half of height of selection.
				downsizedImg.width,                                                  // Far right edge (due to aspect ratio comparison).
				Math.round( ( downsizedImg.height / 2 ) + ( selected_height / 2 ) ), // Mid-point - half of height of selection.
			]);
		} else {
			// The thumbnail must be narrower than the original, so we want the full height.

			// Take the width and divide by the thumbnail's aspect ratio.
			const selected_width = Math.round(
				downsizedImg.width / thumbnailAspectRatio
			);

			selection = setSelection([
				round( ( downsizedImg.width / 2 ) - ( selected_width / 2 ) ), // Mid-point + half of height of selection.
				0,                                                            // Top edge (due to aspect ratio comparison).
				round( ( downsizedImg.width / 2 ) + ( selected_width / 2 ) ), // Mid-point - half of height of selection.
				downsizedImg.height,                                          // Bottom edge (due to aspect ratio comparison).
			]);
		}

		return selection;
	}

	static updatePreview = ( selection, { image, thumbnail } ) => {
		const {
			width,
			height,
		} = image;

		const scaleX = thumbnail.width / ( selection.width || 1 );
		const scaleY = thumbnail.height / ( selection.height || 1 );

		console.log("Running preview update...");

		// Update the preview image.
		$('#wpcom-thumbnail-edit-modal-preview').css({
			width: Math.round( scaleX * width ) + 'px',
			height: Math.round( scaleY * height ) + 'px',
			marginLeft: '-' + Math.round( scaleX * selection.x1 ) + 'px',
			marginTop: '-' + Math.round( scaleY * selection.y1 ) + 'px'
		});
	}

	initImgAreaSelect() {
		const {
			currentTabRef,
			currentTabRef: {
				current: imgSel,
			},
			// previewRef: {
			// 	current: previewImgSel,
			// },
			constructor: {
				getDownsized,
				updatePreview,
			},
			props: {
				image: {
					media_details: {
						sizes,
					},
				},
			},
			state: {
				thumbnail: {
					width,
					height,
					selection,
				},
			},
		} = this;
		const image = getDownsized( sizes );
		const modalTab = $(imgSel);

		console.log({ currentTabRef, modalTab, thumbnail: this.state.thumbnail });

		const imgAreaSelectArgs = {
			aspectRatio: width + ':' + height,
			// parent: '.my-tab-panel',
			handles: true,

			// Initial selection.
			x1: selection.x1,
			y1: selection.y1,
			x2: selection.x2,
			y2: selection.y2,

			// Update the preview.
			onInit: function ( img, selection ) {
				updatePreview( selection, { image, thumbnail: { width, height } } );
				$('#wpcom-thumbnail-edit-modal-preview').show();
				$('#wpcom-thumbnail-edit-modal').trigger('wpcom_thumbnail_edit_modal_init');
			},
			onSelectChange: function ( img, selection ) {
				updatePreview( selection, { image, thumbnail: { width, height } } );
				$('#wpcom-thumbnail-edit-modal').trigger('wpcom_thumbnail_edit_modal_change');
			},

			// Fill the hidden fields with the selected coordinates for the form.
			onSelectEnd: function ( img, selection ) {
				$('input[name="wpcom_thumbnail_edit_x1"]').val(selection.x1);
				$('input[name="wpcom_thumbnail_edit_y1"]').val(selection.y1);
				$('input[name="wpcom_thumbnail_edit_x2"]').val(selection.x2);
				$('input[name="wpcom_thumbnail_edit_y2"]').val(selection.y2);
				$('#wpcom-thumbnail-edit-modal').trigger('wpcom_thumbnail_edit_modal_selectend');
			}
		};

		console.log({
			text: 'Running area select..',
			imgAreaSelectArgs,
		});

		jQuery(modalTab).ready(($) => {
			$('#wpcom-thumbnail-edit-modal').imgAreaSelect(imgAreaSelectArgs);
		});
	}

	renderTabView(tab) {
		const {
			props,
			tabRefs: refs,
			constructor: { getDownsized },
			props: {
				id,
				image: {
					link,
					media_details: {
						sizes,
					},
				},
				ratioMap,
			},
			state: {
				thumbnail,
				setThumbnail,
			},
			currentTabRef,
		} = this;

		const ref = refs[ tab.name ];
		const cropSizeName = ratioMap[ tab.name ];
		const full = getDownsized( sizes );

		if ( ! thumbnail ) {
			setThumbnail( tab.name );
		}

		console.log({
			obj: this,
			props: props,
		});

		return (
			<div className={tab.className} ref={currentTabRef}>
				<h2>
					{__( 'Edit Thumbnail: ', 'wpcom-thumbnail-editor') + tab.title }
				</h2>
				<p>
					{__(
						'The original image is shown in full below, although it may have been shrunk to fit on your screen. Please select the portion that you would like to use as the thumbnail image.',
						'wpcom-thumbnail-editor'
					)}
				</p>
				<p className='wpcom-edit-thumbnail-editor'>
					<img
						src={link}
						width={full.width}
						height={full.height}
						id="wpcom-thumbnail-edit-modal"
						// ref={(ref) => this.currentTabRef = ref }
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
					<img
						id="wpcom-thumbnail-edit-modal-preview"
						className="hidden"
						src={link}
						// ref={(ref) => this.currentTabRef = ref }
					/>
				</div>

				<input type="hidden" name="action" value="wpcom_thumbnail_edit_modal" />
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
			state: {
				setOpen,
				setThumbnail,
			},
			tabList,
		} = this;

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
					tabs={ tabList }
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
			props: { image },
			state: {
				open,
				setOpen,
			},
		} = this;

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
