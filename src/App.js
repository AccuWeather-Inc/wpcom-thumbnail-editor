import { Button, Modal } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// const { __ } = wp.i18n;
// const { useSelect } = wp.data;
// const { Button, Spinner, Modal } = wp.components;
// const { useState, useRef, useEffect } = wp.element;

const App = ({ test }) => {
	console.log('qwdwqdqwd', test);
	const [open, setOpen] = useState(false);

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
};

export default App;
