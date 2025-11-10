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
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
};

export default storage;
