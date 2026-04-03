import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@lingu_stats';

export const INITIAL_STATS = {
  userId: 'local',
  settings: {
    accentOptional: false,
    pronounOrder: 'standard',
    genderFilter: 'female',
    pronounGender: 'lui',
    showIrregular: true,
    practiceMode: 'mood',
    selectedTimeframe: ['present'],
    selectedMood: ['indicative'],
    includeCompound: false,
    includeProgressive: false,
    includePassive: false,
    showCompound: false,
    selectedPerson: 'io',
  },
  stats: {},
  history: [],
};

export async function loadStats() {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (json) return JSON.parse(json);
  return { ...INITIAL_STATS };
}

export async function saveStats(data) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function recordResult({ language, verbId, tense, score, total }) {
  const data = await loadStats();
  const key = `${language}:${verbId}:${tense}`;

  if (!data.stats[key]) {
    data.stats[key] = { correct: 0, total: 0 };
  }
  data.stats[key].correct += score;
  data.stats[key].total += total;

  data.history.push({
    language,
    verbId,
    tense,
    score,
    total,
    date: new Date().toISOString(),
  });

  await saveStats(data);
  return data;
}
