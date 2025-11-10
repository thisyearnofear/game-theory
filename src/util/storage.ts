// Storage utility functions
export const getStoredValue = (key: string) => {
  return localStorage.getItem(key);
};

export const setStoredValue = (key: string, value: string) => {
  localStorage.setItem(key, value);
};

const storage = {
  getStoredValue,
  setStoredValue,
};

export default storage;
