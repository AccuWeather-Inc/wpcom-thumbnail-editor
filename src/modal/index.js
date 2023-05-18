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
	};

	// Define PropTypes for this component.
	static propTypes = {
		test: PropTypes.string.isRequired,
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
	};

	/**
	 * Constructor. Binds function scope.
	 * @param {object} props - Props for this component.
	 */
	constructor(props) {
		super(props);
	}

	onModalClose(isCanceled) {
	  const {
		postId,
		onDismiss,
	  } = this.props;

	  const galleryItems = JSON.parse(
		sessionStorage.getItem(`galleryItems-${postId}`)
	  );
	  sessionStorage.removeItem(`galleryItems-${postId}`);

	  if (galleryItems && ! isCanceled) {
		onDismiss(galleryItems);
	  }

	  this.setState({
		isOpen: false,
	  });
	}

	handleDelete(isCanceled) {
	  const {
		galleryItems,
		itemIndex,
		onDismiss,
	  } = this.props;
	  if (! isCanceled) {
		const filteredItems = galleryItems.filter((_item, key) => key !== itemIndex);
		onDismiss(filteredItems);
	  } else {
		onDismiss(galleryItems);
	  }
	  this.setState({
		isOpen: false,
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
						title={__('Image crops', 'wpcom-thumbnail-editor')}
						onRequestClose={() => setOpen(false)}
						isFullScreen
						shouldCloseOnClickOutside={false}
						shouldCloseOnEsc={false}
						overlayClassName="wpcom-thumbnail-editor__overlay"
					>
						<p>
							{__(
								'Modify how an image displays within this block',
								'wpcom-thumbnail-editor',
							)}
						</p>
					</Modal>
				)}
			</>
		);
	}
}
