import { useState } from 'react';

export const useContracts = () => {
  const [contracts] = useState([]);
  return { contracts };
};
