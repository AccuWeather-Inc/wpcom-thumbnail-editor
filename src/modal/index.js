/* global wp, React */

import {
	Modal,
	Button,
	Spinner,
	TabPanel,
	PageControl,
} from '@wordpress/components';
import { focus } from '@wordpress/dom';
import { LEFT, RIGHT } from '@wordpress/keycodes';
import { store as coreStore } from '@wordpress/core-data';
import Cropper from "react-cropper";
import PropTypes from 'prop-types';

const {
	i18n: {
		__,
	},
	element: { useEffect },
	data: { withSelect },
} = wp;

const Observer = ({ value, didUpdate }) => {
	useEffect(() => {
		didUpdate(value)
	}, [value])
	return null; // component does not render anything
};

class ThumbnailEditorModal extends React.PureComponent {
	// Define Prop for this component.
	static defaultProps = {
		image: null,
		images: [],
		ratioMap: [],
		thumbnailEdits: [],
	};

	// Define PropTypes for this component.
	static propTypes = {
		id: PropTypes.number.isRequired,
		image: PropTypes.instanceOf(Object),
		images: PropTypes.arrayOf(
			PropTypes.instanceOf(Object),
		),
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
		setThumbnail: (tab) => {
			const {
				image: {
					media_details: {
						source_url,
					},
				},
				ratioMap,
				thumbnailEdits,
			} = this.props;

			const dimensions = ratioMap[ tab ].dimensions;
			const coordinates = thumbnailEdits?.[ ratioMap[ tab ].name ];
			const thumbnail = {
				width: dimensions.width,
				height: dimensions.height,
				url: source_url,
				selection: this.getSelectionCoordinates(
					coordinates,
					{
						width: dimensions.width,
						height: dimensions.height,
					}
				)
			};

			this.setState({
				thumbnail,
			});
		},
		currentPage: 0,
		setCurrentPage: (currentPage) => {
			this.setState({
				currentPage,
			});
		},
		canGoBack: () => {
			const { currentPage } = this.state;
			return currentPage > 0;
		},
		canGoForward: () => {
			const { props: { images }, state: { currentPage } } = this;
			return currentPage < images.length - 1;
		},
		onKeyDown: ( event ) => {
			const { goBack, goForward } = this.state;
			if ( event.keyCode === LEFT ) {
				goBack();
			} else if ( event.keyCode === RIGHT ) {
				goForward();
			}
		},
	};

	/**
	 * Constructor. Binds function scope.
	 * @param {object} props - Props for this component.
	 */
	constructor(props) {
		super(props);

		const { ratioMap } = props;
		this.tabList = [];
		for (const [key, val] of Object.entries(ratioMap)) {
			this.tabList.push({
				name: key,
				title: key.replace('-by-', ':'),
				className: 'tab_' + key,
			});
		}

		this.modalRef = React.createRef();
		this.cropperRef = React.createRef();
		this.onCrop = this.onCrop.bind(this);
		this.onReady = this.onReady.bind(this);
	}

	componentDidMount() {}

	goBack() {
		const {
			canGoBack,
			currentPage,
			setCurrentPage,
		} = this.state;
		if ( canGoBack() ) {
			setCurrentPage( currentPage - 1 );
		}
	}

	goForward() {
		const {
			currentPage,
			canGoForward,
			setCurrentPage,
		} = this.state;
		if ( canGoForward ) {
			setCurrentPage( currentPage + 1 );
		}
	}

	setPageFocus() {
		const current = this?.modalRef?.current;
		// Each time we change the current page, start from the first element of the page.
		// This also solves any focus loss that can happen.
		current && focus.tabbable.find( current )?.[ 0 ]?.focus();
	}

	/**
	 * Get downsized dimentions for image, typically the 'full' crop.
	 */
	static getDownsized( sizes ) {
		return {
			width: sizes?.['full']?.width ?? 1,
			height: sizes?.['full']?.height ?? 1,
		};
	}

	onReady() {
		const {
			state: {
				thumbnail: {
					selection: {
						y1: top,
						x1: left,
						x2: width,
						y2: height,
					},
				},
			},
			cropperRef: { current },
		} = this;

		current?.cropper?.setCropBoxData({
			top: top,
			left: left,
			width: width - left,
			height: height - top,
		});
	}

	onCrop() {
		const cropper = this.cropperRef.current?.cropper;
		console.log(cropper?.getCropBoxData());
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
		} else if ( thumbnailAspectRatio == originalAspectRatio ) {
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
				downsizedImg.width / ( downsizedImg.height / downsizedImg.width )
			);

			selection = setSelection([
				Math.round( ( downsizedImg.width / 2 ) - ( selected_width / 2 ) ), // Mid-point + half of height of selection.
				0,                                                                 // Top edge (due to aspect ratio comparison).
				Math.round( ( downsizedImg.width / 2 ) + ( selected_width / 2 ) ), // Mid-point - half of height of selection.
				downsizedImg.height,                                               // Bottom edge (due to aspect ratio comparison).
			]);
		}

		return selection;
	}

	imgCropper(tab) {
		const {
			constructor: { getDownsized },
			props: {
				image: {
					link,
					media_details: {
						sizes,
					},
				},
				ratioMap,
			},
			onCrop,
			onReady,
			cropperRef,
		} = this;
		const full = getDownsized( sizes );
		const aspectRatio = (
			ratioMap[ tab.name ].ratio[0] / ratioMap[ tab.name ].ratio[1]
		);

		return (
			<Cropper
				className='wpcom-edit-thumbnail-editor'
				src={link}
				style={{ width: full.width, height: full.height }}
				// Cropper.js options
				initialAspectRatio={aspectRatio}
				aspectRatio={aspectRatio}
				crop={onCrop}
				ready={onReady}
				zoomable={false}
				scalable={false}
				rotatable={false}
				ref={cropperRef}
				preview='.img-preview'
			/>
		);
	}

	renderTabView(tab) {
		const {
			props: {
				image: {
					link,
				},
			},
			state: {
				thumbnail,
				setThumbnail,
			},
		} = this;

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
				{this.imgCropper(tab)}
				<h3>
					{__('Fullsize Thumbnail Preview', 'wpcom-thumbnail-editor')}
				</h3>
				<div className="img-preview" style={{overflow:'hidden', width: thumbnail.width + 'px', height: thumbnail.height + 'px', paddingRight: '2em'}}>
					<img
						id="wpcom-thumbnail-edit-modal-preview"
						src={link}
					/>
				</div>
			</div>
		)
	}

	renderModal() {
		const {
			state: {
				goBack,
				setOpen,
				onKeyDown,
				canGoBack,
				goForward,
				currentPage,
				setThumbnail,
				canGoForward,
				setCurrentPage,
			},
			tabList,
			modalRef,
			setPageFocus,
		} = this;

		if (! this.props?.image) {
			return null;
		}

		return (
			<Modal
				title={__('Edit Image Crops', 'wpcom-thumbnail-editor')}
				onRequestClose={() => setOpen(false)}
				isFullScreen
				shouldCloseOnClickOutside={false}
				shouldCloseOnEsc={false}
				onKeyDown={onKeyDown}
				overlayClassName='wpcom-thumbnail-editor__overlay'
				ref={ modalRef }
			>
				<div className="components-guide__container">
					<div className="components-guide__page">
						{ this.props.images.length > 1 && (
							<PageControl
								currentPage={ currentPage }
								numberOfPages={ this.props.images.length }
								setCurrentPage={ setCurrentPage }
							/>
						) }

						<Observer value={currentPage} didUpdate={setPageFocus} />
						<TabPanel
							className="wpcom-thumbnail-editor__tab-panel"
							tabs={ tabList }
							onSelect={ ( tabName ) => setThumbnail( tabName ) }
						>
							{ ( tab ) => this.renderTabView( tab )}
						</TabPanel>
					</div>
				</div>
				<div className="components-modal__footer">
					<div className="components-modal__footer-flooring-container">
						{ canGoBack() && (
							<Button
								className="components-guide__back-button"
								onClick={ goBack }
							>
								{ __( 'Previous' ) }
							</Button>
						) }
						{ canGoForward() && (
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
						onClick={() => setOpen(false)}
						className="components-modal__save-button"
						label="Save"
					>
						{__('Save', 'wpcom-thumbnail-editor')}
					</Button>
				</div>
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
