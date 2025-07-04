import { useEffect, useState } from 'react';

export default function useLinkValid(url) {
  const [valid, setValid] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (!url) {
      setValid(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setValid(true); // Optimistically assume valid
    fetch(url, { method: 'HEAD' })
      .then(res => {
        if (!ignore) {
          setValid(res.ok);
          setLoading(false);
        }
      })
      .catch(() => {
        // Try GET as fallback (for CORS/HEAD issues)
        fetch(url, { method: 'GET' })
          .then(res => {
            if (!ignore) {
              setValid(res.ok);
              setLoading(false);
            }
          })
          .catch(() => {
            if (!ignore) {
              setValid(false);
              setLoading(false);
            }
          });
      });
    return () => { ignore = true; };
  }, [url]);

  return { valid, loading };
} 