import React, {SyntheticEvent, useCallback, useState} from 'react';

const useActionButton = <ELEMENT, EVENT>(
  onSubmit: (event: SyntheticEvent<ELEMENT, EVENT>) => Promise<void>,
) => {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = React.useState<null | Error>(null);

  const handleSubmit = useCallback(
    async (e: SyntheticEvent<ELEMENT, EVENT>) => {
      setLoading(true);
      setError(null);
      try {
        await onSubmit(e);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [onSubmit],
  );

  return {isLoading, error, handleSubmit};
};

export default useActionButton;
