let _config = {
  selectedVerbIds: [],
  selectedTenseKeys: [],
};

export function setPracticeConfig(config) {
  _config = { ...config };
}

export function getPracticeConfig() {
  return _config;
}
