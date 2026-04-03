import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { VERBS } from '../../data/verbs';
import { TENSES, MOOD_LABELS, TIMEFRAME_LABELS } from '../../constants/tenses';
import { PRONOUN_ORDERS } from '../../constants/pronouns';
import { setPracticeConfig } from '../../data/practiceConfig';
import { F, FJ } from '../../constants/fonts';

const PRONOUNS = PRONOUN_ORDERS.standard;

// ── 動詞グループ定義 ──
const VERB_GROUPS = [
  { label: '助動詞', filter: (v) => v.id === 'avere' || v.id === 'essere' },
  { label: '-are 動詞', filter: (v) => v.group?.startsWith('are') },
  { label: '-ere 動詞', filter: (v) => v.group?.startsWith('ere') },
  { label: '-ire 動詞', filter: (v) => v.group?.startsWith('ire') },
  { label: '不規則動詞', filter: (v) => v.group === 'irregular' },
];

// ── 法グループ（時制セクション用） ──
const MOOD_ORDER = ['indicative', 'subjunctive', 'conditional', 'imperative'];

// ── 実装済み時制キー ──
const IMPLEMENTED_TENSE_KEYS = Object.keys(TENSES).filter(
  (k) => TENSES[k].mood !== 'nonfinite',
);

// ── timeframe / mood セグメント ──
const TIMEFRAMES = ['present', 'past', 'future'];
const MOODS = ['indicative', 'subjunctive', 'conditional', 'imperative'];

export default function HomeScreen() {
  const router = useRouter();

  // ① 練習パターン
  const [practiceMode, setPracticeMode] = useState('mood');
  const [selectedTimeframes, setSelectedTimeframes] = useState(() => new Set(['present']));
  const [selectedMoods, setSelectedMoods] = useState(() => new Set(['indicative']));
  const [selectedPronounIndex, setSelectedPronounIndex] = useState(0);

  // ③ 詳細設定
  const [includeCompound, setIncludeCompound] = useState(false);
  const [includeProgressive, setIncludeProgressive] = useState(false);

  // ④ 動詞選択
  const [selectedVerbIds, setSelectedVerbIds] = useState(
    () => new Set(VERBS.map((v) => v.id)),
  );

  // ⑤ 時制選択
  const [selectedTenseKeys, setSelectedTenseKeys] = useState(
    () => new Set(IMPLEMENTED_TENSE_KEYS.filter((k) => TENSES[k].type === 'simple')),
  );

  // ── timeframe / mood トグル（時制選択を自動連動） ──
  const toggleTimeframe = (tf) => {
    setSelectedTimeframes((prev) => {
      const next = new Set(prev);
      next.has(tf) ? next.delete(tf) : next.add(tf);
      // 連動：該当する時制のみ選択
      const matching = new Set(
        IMPLEMENTED_TENSE_KEYS.filter((k) => {
          const t = TENSES[k];
          if (t.type === 'compound' && !includeCompound) return false;
          return next.has(t.timeframe);
        }),
      );
      setSelectedTenseKeys(matching);
      return next;
    });
  };

  const toggleMood = (m) => {
    setSelectedMoods((prev) => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      // 連動：該当する時制のみ選択
      const matching = new Set(
        IMPLEMENTED_TENSE_KEYS.filter((k) => {
          const t = TENSES[k];
          if (t.type === 'compound' && !includeCompound) return false;
          return next.has(t.mood);
        }),
      );
      setSelectedTenseKeys(matching);
      return next;
    });
  };

  // ── 動詞トグル ──
  const toggleVerb = (id) => {
    setSelectedVerbIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleVerbGroup = (groupFilter) => {
    const groupVerbs = VERBS.filter(groupFilter);
    const allSelected = groupVerbs.every((v) => selectedVerbIds.has(v.id));
    setSelectedVerbIds((prev) => {
      const next = new Set(prev);
      groupVerbs.forEach((v) => (allSelected ? next.delete(v.id) : next.add(v.id)));
      return next;
    });
  };

  // ── 時制トグル ──
  const toggleTense = (key) => {
    const t = TENSES[key];
    if (t.type === 'compound' && !includeCompound) return;
    setSelectedTenseKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── 複合時制トグル連動 ──
  const handleToggleCompound = (val) => {
    setIncludeCompound(val);
    if (!val) {
      setSelectedTenseKeys((prev) => {
        const next = new Set(prev);
        IMPLEMENTED_TENSE_KEYS.forEach((k) => {
          if (TENSES[k].type === 'compound') next.delete(k);
        });
        return next;
      });
    }
  };

  // ── スタート可否 ──
  const hasFilter =
    practiceMode === 'tense'
      ? selectedTimeframes.size > 0
      : practiceMode === 'mood'
        ? selectedMoods.size > 0
        : true;
  const canStart = selectedVerbIds.size > 0 && selectedTenseKeys.size > 0 && hasFilter;

  // ── スタート ──
  const handleStart = () => {
    setPracticeConfig({
      selectedVerbIds: [...selectedVerbIds],
      selectedTenseKeys: [...selectedTenseKeys],
      selectedPronounIndex,
    });
    router.navigate(practiceMode === 'person' ? '/cross' : '/practice');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ──── ヘッダー ──── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>活用練習</Text>
        </View>

        {/* ──── ① 練習パターン ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>練習パターン</Text>
          <View style={styles.radioRow}>
            {[
              { key: 'mood', label: '法で練習' },
              { key: 'tense', label: '時制で練習' },
              { key: 'person', label: '人称ごとに練習' },
            ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={styles.radioItem}
                onPress={() => setPracticeMode(key)}
                activeOpacity={0.7}
              >
                <View style={[styles.radioOuter, practiceMode === key && styles.radioOuterActive]}>
                  {practiceMode === key && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.radioLabel, practiceMode === key && styles.radioLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ──── ② フィルタチップ ──── */}
        <View style={styles.section}>
          {practiceMode === 'tense' ? (
            <View style={styles.chipRow}>
              {TIMEFRAMES.map((tf) => {
                const active = selectedTimeframes.has(tf);
                return (
                  <TouchableOpacity
                    key={tf}
                    style={[styles.filterChip, styles.filterChipFlex, active && styles.filterChipActive]}
                    onPress={() => toggleTimeframe(tf)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {TIMEFRAME_LABELS[tf]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : practiceMode === 'mood' ? (
            <View style={styles.chipRow}>
              {MOODS.map((m) => {
                const active = selectedMoods.has(m);
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.filterChip, styles.filterChipFlex, active && styles.filterChipActive]}
                    onPress={() => toggleMood(m)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {MOOD_LABELS[m]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.chipRow}>
              {PRONOUNS.map((p, i) => {
                const active = selectedPronounIndex === i;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.filterChip, styles.filterChipFlex, active && styles.filterChipActive]}
                    onPress={() => setSelectedPronounIndex(i)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, styles.filterChipTextLatin, active && styles.filterChipTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ──── ③ 詳細設定 ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>詳細設定</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>複合時制を含める</Text>
            <Switch
              value={includeCompound}
              onValueChange={handleToggleCompound}
              trackColor={{ false: '#DDDDDD', true: '#A5D6A7' }}
              thumbColor={includeCompound ? '#4CAF50' : '#F4F4F4'}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>進行相を含める</Text>
            <Switch
              value={includeProgressive}
              onValueChange={setIncludeProgressive}
              trackColor={{ false: '#DDDDDD', true: '#A5D6A7' }}
              thumbColor={includeProgressive ? '#4CAF50' : '#F4F4F4'}
            />
          </View>
          <View style={[styles.toggleRow, styles.toggleRowDisabled]}>
            <Text style={[styles.toggleLabel, styles.toggleLabelDisabled]}>受動態を含める</Text>
            <Switch value={false} disabled trackColor={{ false: '#EEEEEE' }} thumbColor="#CCCCCC" />
          </View>
        </View>

        {/* ──── ④ 動詞リスト ──── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>動詞</Text>
            <TouchableOpacity
              onPress={() => {
                const allSelected = VERBS.every((v) => selectedVerbIds.has(v.id));
                setSelectedVerbIds(allSelected ? new Set() : new Set(VERBS.map((v) => v.id)));
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.globalToggleText}>
                {VERBS.every((v) => selectedVerbIds.has(v.id)) ? '全て解除' : '全て選択'}
              </Text>
            </TouchableOpacity>
          </View>
          {VERB_GROUPS.map((group) => {
            const groupVerbs = VERBS.filter(group.filter);
            if (groupVerbs.length === 0) return null;
            const allSelected = groupVerbs.every((v) => selectedVerbIds.has(v.id));
            return (
              <View key={group.label} style={styles.verbGroup}>
                <TouchableOpacity
                  style={styles.verbGroupHeader}
                  onPress={() => toggleVerbGroup(group.filter)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.verbGroupLabel}>{group.label}</Text>
                  <Text style={styles.verbGroupAction}>
                    {allSelected ? '全解除' : '全選択'}
                  </Text>
                </TouchableOpacity>
                {groupVerbs.map((verb) => (
                  <TouchableOpacity
                    key={verb.id}
                    style={styles.verbItem}
                    onPress={() => toggleVerb(verb.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, selectedVerbIds.has(verb.id) && styles.checkboxActive]}>
                      {selectedVerbIds.has(verb.id) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.verbName}>{verb.name}</Text>
                    <Text style={styles.verbMeaning}>{verb.meaning}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </View>

        {/* ──── ⑤ 時制選択 ──── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>時制</Text>
            <TouchableOpacity
              onPress={() => {
                const selectableKeys = IMPLEMENTED_TENSE_KEYS.filter((k) =>
                  includeCompound ? true : TENSES[k].type !== 'compound',
                );
                const allSelected = selectableKeys.every((k) => selectedTenseKeys.has(k));
                setSelectedTenseKeys(allSelected ? new Set() : new Set(selectableKeys));
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.globalToggleText}>
                {IMPLEMENTED_TENSE_KEYS.filter((k) =>
                  includeCompound ? true : TENSES[k].type !== 'compound',
                ).every((k) => selectedTenseKeys.has(k))
                  ? '全て解除'
                  : '全て選択'}
              </Text>
            </TouchableOpacity>
          </View>
          {MOOD_ORDER.map((mood) => {
            const tenseKeys = IMPLEMENTED_TENSE_KEYS.filter((k) => TENSES[k].mood === mood);
            if (tenseKeys.length === 0) return null;
            return (
              <View key={mood} style={styles.tenseMoodGroup}>
                <Text style={styles.tenseMoodLabel}>{MOOD_LABELS[mood]}</Text>
                {tenseKeys.map((key) => {
                  const t = TENSES[key];
                  const isCompoundDisabled = t.type === 'compound' && !includeCompound;
                  const isSelected = selectedTenseKeys.has(key);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.tenseItem, isCompoundDisabled && styles.tenseItemDisabled]}
                      onPress={() => toggleTense(key)}
                      activeOpacity={isCompoundDisabled ? 1 : 0.7}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && !isCompoundDisabled && styles.checkboxActive,
                          isCompoundDisabled && styles.checkboxDisabled,
                        ]}
                      >
                        {isSelected && !isCompoundDisabled && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text
                        style={[
                          styles.tenseLabel,
                          isCompoundDisabled && styles.tenseLabelDisabled,
                        ]}
                      >
                        {t.label}
                      </Text>
                      {t.type === 'compound' && (
                        <Text style={styles.tenseTypeBadge}>複合</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>

        {/* 下部余白 */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ──── ⑥ スタートボタン ──── */}
      <View style={styles.buttonArea}>
        <TouchableOpacity
          style={[styles.startButton, !canStart && styles.startButtonDisabled]}
          onPress={handleStart}
          activeOpacity={canStart ? 0.85 : 1}
          disabled={!canStart}
        >
          <Text style={[styles.startButtonText, !canStart && styles.startButtonTextDisabled]}>
            練習スタート
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    backgroundColor: '#F4FAE8',
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FJ.bold,
    color: '#333333',
  },

  // ── Section ──
  section: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FJ.semiBold,
    color: '#333333',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  globalToggleText: {
    fontSize: 13,
    fontFamily: FJ.regular,
    color: '#4CAF50',
  },

  // ── Radio ──
  radioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    rowGap: 12,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#4CAF50',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  radioLabel: {
    fontSize: 15,
    fontFamily: FJ.regular,
    color: '#666666',
  },
  radioLabelActive: {
    color: '#333333',
    fontFamily: FJ.semiBold,
  },

  // ── Filter chips ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  filterChipFlex: {
    flex: 1,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: FJ.regular,
    color: '#888888',
  },
  filterChipTextLatin: {
    fontFamily: F.regular,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: FJ.semiBold,
  },

  // ── Toggle ──
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  toggleRowDisabled: {
    opacity: 0.4,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: FJ.regular,
    color: '#333333',
  },
  toggleLabelDisabled: {
    color: '#AAAAAA',
  },

  // ── Verb list ──
  verbGroup: {
    marginBottom: 12,
  },
  verbGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  verbGroupLabel: {
    fontSize: 14,
    fontFamily: FJ.semiBold,
    color: '#666666',
  },
  verbGroupAction: {
    fontSize: 13,
    fontFamily: FJ.regular,
    color: '#4CAF50',
  },
  verbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
  },
  verbName: {
    fontSize: 16,
    fontFamily: F.semiBold,
    color: '#333333',
    width: 80,
  },
  verbMeaning: {
    fontSize: 14,
    fontFamily: FJ.regular,
    color: '#888888',
    flex: 1,
  },

  // ── Checkbox ──
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkboxDisabled: {
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: -1,
  },

  // ── Tense list ──
  tenseMoodGroup: {
    marginBottom: 16,
  },
  tenseMoodLabel: {
    fontSize: 14,
    fontFamily: FJ.semiBold,
    color: '#666666',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
  },
  tenseItemDisabled: {
    opacity: 0.35,
  },
  tenseLabel: {
    fontSize: 15,
    fontFamily: FJ.regular,
    color: '#333333',
    flex: 1,
  },
  tenseLabelDisabled: {
    color: '#AAAAAA',
  },
  tenseTypeBadge: {
    fontSize: 11,
    fontFamily: FJ.regular,
    color: '#FFFFFF',
    backgroundColor: '#BBBBBB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // ── Start button ──
  buttonArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    height: 54,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: FJ.semiBold,
  },
  startButtonTextDisabled: {
    color: '#AAAAAA',
  },
});
