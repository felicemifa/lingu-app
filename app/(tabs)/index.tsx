import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Switch,
  Platform,
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

/** 法×時制の AND 条件で該当する時制キーを計算 */
function computeMatchingTenseKeys(moods, timeframes, includeCompound) {
  return new Set(
    IMPLEMENTED_TENSE_KEYS.filter((k) => {
      const t = TENSES[k];
      if (t.type === 'compound' && !includeCompound) return false;
      return moods.has(t.mood) && timeframes.has(t.timeframe);
    }),
  );
}

export default function HomeScreen() {
  const router = useRouter();

  // ── フィルタ選択 ──
  const [selectedMoods, setSelectedMoods] = useState(() => new Set(['indicative']));
  const [selectedTimeframes, setSelectedTimeframes] = useState(() => new Set(['present']));
  const [selectedPronounIndex, setSelectedPronounIndex] = useState(null);

  // ── 詳細設定 ──
  const [includeCompound, setIncludeCompound] = useState(false);
  const [includeProgressive, setIncludeProgressive] = useState(false);

  // ── 動詞選択 ──
  const [selectedVerbIds, setSelectedVerbIds] = useState(
    () => new Set(VERBS.map((v) => v.id)),
  );

  // ── 折り畳み ──
  const [verbsExpanded, setVerbsExpanded] = useState(false);
  const [tensesExpanded, setTensesExpanded] = useState(false);

  // ── 時制選択（法×時制から自動計算） ──
  const selectedTenseKeys = useMemo(
    () => computeMatchingTenseKeys(selectedMoods, selectedTimeframes, includeCompound),
    [selectedMoods, selectedTimeframes, includeCompound],
  );

  // ── 法トグル ──
  const toggleMood = (m) => {
    setSelectedMoods((prev) => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  };

  // ── 時制トグル ──
  const toggleTimeframe = (tf) => {
    setSelectedTimeframes((prev) => {
      const next = new Set(prev);
      next.has(tf) ? next.delete(tf) : next.add(tf);
      return next;
    });
  };

  // ── 人称トグル（再タップで解除） ──
  const togglePronoun = (i) => {
    setSelectedPronounIndex((prev) => (prev === i ? null : i));
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

  // ── 複合時制トグル ──
  const handleToggleCompound = (val) => {
    setIncludeCompound(val);
  };

  // ── 時制の手動トグル（折り畳みリスト内） ──
  const [manualTenseOverrides, setManualTenseOverrides] = useState(() => new Set());
  const toggleTenseManual = (key) => {
    const t = TENSES[key];
    if (t.type === 'compound' && !includeCompound) return;
    setManualTenseOverrides((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── 最終的な時制選択（自動計算 ± 手動オーバーライド） ──
  const effectiveTenseKeys = useMemo(() => {
    // 手動オーバーライドがなければ自動計算をそのまま使う
    // 手動オーバーライドは XOR 的に適用
    const result = new Set(selectedTenseKeys);
    manualTenseOverrides.forEach((k) => {
      if (result.has(k)) {
        result.delete(k);
      } else {
        const t = TENSES[k];
        if (t.type === 'compound' && !includeCompound) return;
        result.add(k);
      }
    });
    return result;
  }, [selectedTenseKeys, manualTenseOverrides, includeCompound]);

  // 法・時制チップ変更時に手動オーバーライドをリセット
  const toggleMoodWrapped = (m) => {
    setManualTenseOverrides(new Set());
    toggleMood(m);
  };
  const toggleTimeframeWrapped = (tf) => {
    setManualTenseOverrides(new Set());
    toggleTimeframe(tf);
  };

  // ── スタート可否 ──
  const canStart =
    selectedVerbIds.size > 0 &&
    effectiveTenseKeys.size > 0 &&
    selectedMoods.size > 0 &&
    selectedTimeframes.size > 0;

  // ── スタート ──
  const handleStart = () => {
    setPracticeConfig({
      selectedVerbIds: [...selectedVerbIds],
      selectedTenseKeys: [...effectiveTenseKeys],
      selectedPronounIndex: selectedPronounIndex,
    });
    router.navigate(selectedPronounIndex !== null ? '/cross' : '/practice');
  };

  // ── 確認スタート ──
  const handleReview = () => {
    setPracticeConfig({
      selectedVerbIds: [...selectedVerbIds],
      selectedTenseKeys: [...effectiveTenseKeys],
      selectedPronounIndex: selectedPronounIndex,
    });
    router.navigate('/review');
  };

  // ── 該当する時制数を表示用に計算 ──
  const matchCount = effectiveTenseKeys.size;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        Platform.OS === 'web' && { height: '100vh' },
      ]}
    >
      <ScrollView
        style={[styles.scroll, Platform.OS === 'web' && { overflowY: 'auto' }]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ──── ヘッダー ──── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>活用練習</Text>
        </View>

        {/* ──── 法で練習 ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>法で練習</Text>
          <View style={styles.chipRow}>
            {MOODS.map((m) => {
              const active = selectedMoods.has(m);
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.filterChip, styles.filterChipFlex, active && styles.filterChipActive]}
                  onPress={() => toggleMoodWrapped(m)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {MOOD_LABELS[m]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ──── 時制で練習 ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>時制で練習</Text>
          <View style={styles.chipRow}>
            {TIMEFRAMES.map((tf) => {
              const active = selectedTimeframes.has(tf);
              return (
                <TouchableOpacity
                  key={tf}
                  style={[styles.filterChip, styles.filterChipFlex, active && styles.filterChipActive]}
                  onPress={() => toggleTimeframeWrapped(tf)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {TIMEFRAME_LABELS[tf]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ──── 人称で練習 ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>人称で練習</Text>
          <View style={styles.chipRow}>
            {PRONOUNS.map((p, i) => {
              const active = selectedPronounIndex === i;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.filterChip, styles.filterChipFlex, active && styles.filterChipActive]}
                  onPress={() => togglePronoun(i)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, styles.filterChipTextLatin, active && styles.filterChipTextActiveLatin]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ──── 詳細設定 ──── */}
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

        {/* ──── 動詞（折り畳み） ──── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setVerbsExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleTitleRow}>
              <Text style={styles.collapsibleArrow}>{verbsExpanded ? '▼' : '▶'}</Text>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>動詞</Text>
            </View>
            <Text style={styles.collapsibleSummary}>
              {selectedVerbIds.size}/{VERBS.length}選択
            </Text>
          </TouchableOpacity>
          {verbsExpanded && (
            <View style={styles.collapsibleContent}>
              <View style={styles.globalToggleRow}>
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
          )}
        </View>

        {/* ──── 法・時制（折り畳み） ──── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setTensesExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleTitleRow}>
              <Text style={styles.collapsibleArrow}>{tensesExpanded ? '▼' : '▶'}</Text>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>法・時制</Text>
            </View>
            <Text style={styles.collapsibleSummary}>
              {effectiveTenseKeys.size}件選択
            </Text>
          </TouchableOpacity>
          {tensesExpanded && (
            <View style={styles.collapsibleContent}>
              <View style={styles.globalToggleRow}>
                <TouchableOpacity
                  onPress={() => {
                    const selectableKeys = IMPLEMENTED_TENSE_KEYS.filter((k) =>
                      includeCompound ? true : TENSES[k].type !== 'compound',
                    );
                    const allSelected = selectableKeys.every((k) => effectiveTenseKeys.has(k));
                    if (allSelected) {
                      // すべて解除 → 手動オーバーライドで自動計算分を全部消す
                      const overrides = new Set();
                      selectedTenseKeys.forEach((k) => overrides.add(k));
                      setManualTenseOverrides(overrides);
                    } else {
                      // 全選択 → 自動計算にない分を手動で追加
                      const overrides = new Set();
                      selectableKeys.forEach((k) => {
                        if (!selectedTenseKeys.has(k)) overrides.add(k);
                      });
                      setManualTenseOverrides(overrides);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.globalToggleText}>
                    {IMPLEMENTED_TENSE_KEYS.filter((k) =>
                      includeCompound ? true : TENSES[k].type !== 'compound',
                    ).every((k) => effectiveTenseKeys.has(k))
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
                      const isSelected = effectiveTenseKeys.has(key);
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[styles.tenseItem, isCompoundDisabled && styles.tenseItemDisabled]}
                          onPress={() => toggleTenseManual(key)}
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
          )}
        </View>

      </ScrollView>

      {/* ──── スタートボタン ──── */}
      <View style={styles.buttonArea}>
        <Text style={styles.matchInfoText}>
          該当する時制: {matchCount}件
        </Text>
        <TouchableOpacity
          style={[styles.startButton, !canStart && styles.startButtonDisabled]}
          onPress={handleStart}
          activeOpacity={canStart ? 0.85 : 1}
          disabled={!canStart}
        >
          <Text style={[styles.startButtonText, !canStart && styles.startButtonTextDisabled]}>
            {selectedPronounIndex !== null ? '人称練習スタート' : '練習スタート'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.reviewButton, !canStart && styles.reviewButtonDisabled]}
          onPress={handleReview}
          activeOpacity={canStart ? 0.85 : 1}
          disabled={!canStart}
        >
          <Text style={[styles.reviewButtonText, !canStart && styles.reviewButtonTextDisabled]}>
            確認スタート
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
    flexGrow: 1,
    paddingBottom: 32,
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
  filterChipTextActiveLatin: {
    color: '#FFFFFF',
    fontFamily: F.semiBold,
  },

  // ── Match info ──
  matchInfoText: {
    fontSize: 13,
    fontFamily: FJ.regular,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 8,
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

  // ── Collapsible ──
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  collapsibleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsibleArrow: {
    fontSize: 12,
    color: '#999999',
  },
  collapsibleSummary: {
    fontSize: 13,
    fontFamily: FJ.regular,
    color: '#888888',
  },
  collapsibleContent: {
    marginTop: 8,
  },
  globalToggleRow: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  globalToggleText: {
    fontSize: 13,
    fontFamily: FJ.regular,
    color: '#4CAF50',
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
  reviewButton: {
    height: 54,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  reviewButtonDisabled: {
    borderColor: '#E0E0E0',
  },
  reviewButtonText: {
    color: '#4CAF50',
    fontSize: 18,
    fontFamily: FJ.semiBold,
  },
  reviewButtonTextDisabled: {
    color: '#AAAAAA',
  },
});
