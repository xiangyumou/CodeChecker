'use client';

import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

interface ZoomableImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    zoomClassName?: string;
}

export const ZoomableImage = ({ src, alt, className, zoomClassName, ...props }: ZoomableImageProps) => {
    return (
        <Zoom classDialog={zoomClassName}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={alt}
                className={className}
                {...props}
            />
        </Zoom>
    );
};
