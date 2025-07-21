import React, { useEffect, useState } from 'react';

const InlineImage = ({ src, alt, ...props }) => {
  console.log('InlineImage rendered with src:', src);
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setBlobUrl(null);
    setError(false);
    if (!src) return;
    const fetchImage = async () => {
      try {
        console.log('InlineImage fetching:', src);
        const token = localStorage.getItem('token');
        const response = await fetch(src, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error('Failed to fetch image');
        const blob = await response.blob();
        if (isMounted) setBlobUrl(URL.createObjectURL(blob));
      } catch (err) {
        if (isMounted) setError(true);
      }
    };
    fetchImage();
    return () => {
      isMounted = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line
  }, [src]);

  if (error) return <span style={{ color: 'red' }}>[Image failed to load]</span>;
  if (!blobUrl) return <span style={{ color: 'gray' }}>[Loading image...]</span>;
  return <img src={blobUrl} alt={alt || ''} {...props} />;
};

export default InlineImage; 