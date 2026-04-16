import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { VERBS } from '../../data/verbs';
import { TENSES } from '../../constants/tenses';
import { PRONOUN_ORDERS } from '../../constants/pronouns';
import { getStem } from '../../utils/getStem';
import { getPracticeConfig, setPracticeConfig } from '../../data/practiceConfig';
import { F, FJ } from '../../constants/fonts';

const PRONOUNS = PRONOUN_ORDERS.standard;

function getFilteredVerbs() {
  const config = getPracticeConfig();
  if (!config.selectedVerbIds || config.selectedVerbIds.length === 0) return VERBS;
  return VERBS.filter((v) => config.selectedVerbIds.includes(v.id));
}

function getFilteredTenseKeysForVerb(verb) {
  const config = getPracticeConfig();
  const verbTenseKeys = Object.keys(verb.tenses);
  if (!config.selectedTenseKeys || config.selectedTenseKeys.length === 0) {
    return verbTenseKeys;
  }
  return verbTenseKeys.filter((k) => config.selectedTenseKeys.includes(k));
}

/** practice-style: pick random (verb, tense) pair */
function pickRandomPair() {
  const verbs = getFilteredVerbs();
  const pairs = [];
  for (const verb of verbs) {
    const tenseKeys = getFilteredTenseKeysForVerb(verb);
    for (const tenseKey of tenseKeys) {
      pairs.push({ verb, tenseKey });
    }
  }
  if (pairs.length === 0) return null;
  return pairs[Math.floor(Math.random() * pairs.length)];
}

/** cross-style: pick random verb */
function pickRandomVerb() {
  const verbs = getFilteredVerbs();
  if (verbs.length === 0) return null;
  return verbs[Math.floor(Math.random() * verbs.length)];
}

/**
 * Render one form as inline Text pieces matching practice.tsx/cross.tsx's inputRow structure.
 * Returns elements to place inside a flex-row View.
 */
function FormInline({ form, stem, canSplit }) {
  if (canSplit && typeof form === 'string' && form.toLowerCase().startsWith(stem)) {
    const rest = form.slice(stem.length);
    return (
      <>
        {stem !== '' && <Text style={styles.stemText}>{stem}</Text>}
        <Text style={styles.textInput}>{rest}</Text>
      </>
    );
  }
  return <Text style={styles.textInput}>{form}</Text>;
}

/** Render a single form (string) or an array (gender variants) */
function FormDisplay({ form, stem, canSplit }) {
  if (Array.isArray(form)) {
    return (
      <View style={styles.inputRow}>
        {form.map((f, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Text style={styles.separator}> / </Text>}
            <FormInline form={f} stem={stem} canSplit={canSplit} />
          </React.Fragment>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.inputRow}>
      <FormInline form={form} stem={stem} canSplit={canSplit} />
    </View>
  );
}

export default function ReviewScreen() {
  const router = useRouter();
  const config = getPracticeConfig();
  const hasPronoun =
    config.selectedPronounIndex !== null && config.selectedPronounIndex !== undefined;

  // ── cross-style state ──
  const [crossVerb, setCrossVerb] = useState(() => (hasPronoun ? pickRandomVerb() : null));
  const [crossPronounIndex, setCrossPronounIndex] = useState(
    hasPronoun ? config.selectedPronounIndex : 0,
  );

  // ── practice-style state ──
  const [pair, setPair] = useState(() => (hasPronoun ? null : pickRandomPair()));

  const handleGoHome = useCallback(() => {
    router.navigate('/');
  }, [router]);

  const handleNextCross = useCallback(() => {
    const v = pickRandomVerb();
    if (v) setCrossVerb(v);
  }, []);

  const handleNextPractice = useCallback(() => {
    const p = pickRandomPair();
    if (p) setPair(p);
  }, []);

  const handlePracticeCross = useCallback(() => {
    if (!crossVerb) return;
    const tenseKeys = getFilteredTenseKeysForVerb(crossVerb).filter(
      (k) => TENSES[k]?.type === 'simple',
    );
    setPracticeConfig({
      selectedVerbIds: [crossVerb.id],
      selectedTenseKeys: tenseKeys,
      selectedPronounIndex: crossPronounIndex,
    });
    router.navigate('/cross');
  }, [crossVerb, crossPronounIndex, router]);

  const handlePracticePractice = useCallback(() => {
    if (!pair) return;
    setPracticeConfig({
      selectedVerbIds: [pair.verb.id],
      selectedTenseKeys: [pair.tenseKey],
      selectedPronounIndex: null,
    });
    router.navigate('/practice');
  }, [pair, router]);

  // ── Empty state ──
  if ((hasPronoun && !crossVerb) || (!hasPronoun && !pair)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>表示できる動詞がありません</Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleGoHome}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>トップに戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────
  // CROSS-STYLE LAYOUT (pronoun selected)
  // ─────────────────────────────────────
  if (hasPronoun) {
    const verb = crossVerb;
    const tenseKeys = getFilteredTenseKeysForVerb(verb).filter(
      (k) => TENSES[k]?.type === 'simple',
    );
    const stem = getStem(verb);
    const canSplit = !verb.irregular && stem !== '';

    const getForm = (tenseKey) => verb.tenses[tenseKey].forms[crossPronounIndex];

    return (
      <SafeAreaView style={styles.safeArea}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.verbTitle}>{verb.name}</Text>
          <Text style={styles.verbMeaning}>{verb.meaning}</Text>
          <Text style={verb.irregular ? styles.irregular : styles.regular}>
            {verb.irregular ? '不規則変化' : '規則変化'}
          </Text>
        </View>

        {/* 人称選択チップ */}
        <View style={styles.chipRow}>
          {PRONOUNS.map((p, i) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, i === crossPronounIndex && styles.chipActive]}
              onPress={() => setCrossPronounIndex(i)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  i === crossPronounIndex && styles.chipTextActive,
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 時制ごとの表示 */}
        <ScrollView
          style={styles.formScrollCross}
          contentContainerStyle={styles.formContentCross}
        >
          {tenseKeys.map((tenseKey) => {
            const form = getForm(tenseKey);
            const isNull = form === null;
            const isCompound = TENSES[tenseKey]?.type === 'compound';
            const rowCanSplit = canSplit && !isCompound;
            return (
              <View key={tenseKey} style={styles.rowCross}>
                <Text
                  style={[
                    styles.tenseLabel,
                    isNull && styles.tenseLabelDisabled,
                  ]}
                >
                  {TENSES[tenseKey].label}
                </Text>
                <View style={styles.inputWrapperCross}>
                  {isNull ? (
                    <>
                      <Text style={styles.nullPlaceholder}>—</Text>
                      <View
                        style={[styles.underline, { backgroundColor: '#EEEEEE' }]}
                      />
                    </>
                  ) : (
                    <>
                      <FormDisplay form={form} stem={stem} canSplit={rowCanSplit} />
                      <View
                        style={[styles.underline, { backgroundColor: '#CCCCCC' }]}
                      />
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* ボタン */}
        <View style={styles.buttonArea}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleNextCross}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>次の動詞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handlePracticeCross}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>練習する</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoHome}
            activeOpacity={0.85}
          >
            <Text style={styles.backButtonText}>トップに戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────
  // PRACTICE-STYLE LAYOUT (no pronoun)
  // ─────────────────────────────────────
  const { verb, tenseKey } = pair;
  const tenseData = verb.tenses[tenseKey];
  const forms = tenseData?.forms || [null, null, null, null, null, null];
  const isCompound = TENSES[tenseKey]?.type === 'compound';
  const stem = getStem(verb);
  const canSplit = !verb.irregular && !isCompound && stem !== '';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.verbTitle}>{verb.name}</Text>
        </View>
        <Text style={styles.verbMeaning}>{verb.meaning}</Text>
        <View style={styles.headerSubRow}>
          <Text style={verb.irregular ? styles.irregular : styles.regular}>
            {verb.irregular ? '不規則変化' : '規則変化'}
          </Text>
          <Text style={styles.tenseText}>
            {' / '}
            {TENSES[tenseKey]?.label || tenseKey}
          </Text>
        </View>
      </View>

      {/* 人称ごとの表示 */}
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
      >
        {PRONOUNS.map((pronoun, index) => {
          const form = forms[index];
          const isNull = form === null;
          return (
            <View key={pronoun} style={styles.row}>
              <Text
                style={[
                  styles.pronoun,
                  isNull && styles.pronounDisabled,
                ]}
              >
                {pronoun}
              </Text>
              <View style={styles.inputWrapper}>
                {isNull ? (
                  <>
                    <Text style={styles.nullPlaceholder}>—</Text>
                    <View
                      style={[styles.underline, { backgroundColor: '#EEEEEE' }]}
                    />
                  </>
                ) : (
                  <>
                    <FormDisplay form={form} stem={stem} canSplit={canSplit} />
                    <View
                      style={[styles.underline, { backgroundColor: '#CCCCCC' }]}
                    />
                  </>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ボタン */}
      <View style={styles.buttonArea}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleNextPractice}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>次の動詞</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handlePracticePractice}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>練習する</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoHome}
          activeOpacity={0.85}
        >
          <Text style={styles.backButtonText}>トップに戻る</Text>
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

  // ── Header ──
  header: {
    backgroundColor: '#F4FAE8',
    paddingVertical: 24,
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verbTitle: {
    fontSize: 28,
    fontFamily: F.bold,
    color: '#333333',
  },
  verbMeaning: {
    fontSize: 13,
    fontFamily: FJ.regular,
    color: '#888888',
    marginTop: 2,
  },
  headerSubRow: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'center',
  },
  irregular: {
    fontSize: 15,
    color: '#E57373',
    fontFamily: FJ.regular,
    marginTop: 4,
  },
  regular: {
    fontSize: 15,
    color: '#81C784',
    fontFamily: FJ.regular,
    marginTop: 4,
  },
  tenseText: {
    fontSize: 15,
    color: '#666666',
    fontFamily: F.regular,
  },

  // ── Chip row (cross-style) ──
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  chipActive: {
    backgroundColor: '#4CAF50',
  },
  chipText: {
    fontSize: 15,
    color: '#666666',
    fontFamily: F.regular,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontFamily: F.semiBold,
  },

  // ── Form list (practice-style) ──
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  pronoun: {
    width: 64,
    fontSize: 15,
    color: '#888888',
    paddingBottom: 6,
    fontFamily: F.regular,
  },
  pronounDisabled: {
    color: '#CCCCCC',
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },

  // ── Form list (cross-style) ──
  formScrollCross: {
    flex: 1,
  },
  formContentCross: {
    paddingHorizontal: 32,
    paddingVertical: 8,
    gap: 12,
  },
  rowCross: {
    marginBottom: 12,
  },
  tenseLabel: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 4,
    fontFamily: F.regular,
  },
  tenseLabelDisabled: {
    color: '#CCCCCC',
  },
  inputWrapperCross: {
    position: 'relative',
  },

  // ── Form text (shared) ──
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  stemText: {
    fontSize: 16,
    fontFamily: F.regular,
    color: '#BBBBBB',
    paddingBottom: 6,
  },
  textInput: {
    fontSize: 16,
    fontFamily: F.regular,
    paddingBottom: 6,
    color: '#333333',
  },
  separator: {
    fontSize: 16,
    fontFamily: F.regular,
    color: '#888888',
    paddingBottom: 6,
  },
  nullPlaceholder: {
    fontSize: 16,
    fontFamily: F.regular,
    color: '#CCCCCC',
    paddingBottom: 6,
  },
  underline: {
    height: 1,
    backgroundColor: '#CCCCCC',
  },

  // ── Buttons ──
  buttonArea: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    paddingTop: 8,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    height: 54,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: FJ.semiBold,
  },
  secondaryButton: {
    height: 54,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 18,
    fontFamily: FJ.semiBold,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#888888',
    fontSize: 14,
    fontFamily: FJ.regular,
  },

  // ── Empty state ──
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    alignItems: 'center',
    gap: 24,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: FJ.regular,
    color: '#888888',
  },
});
