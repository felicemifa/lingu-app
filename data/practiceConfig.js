let _config = {
  selectedVerbIds: [],
  selectedTenseKeys: [],
  selectedPronounIndex: 0,
};

export function setPracticeConfig(config) {
  _config = { ...config };
}

export function getPracticeConfig() {
  return _config;
}
