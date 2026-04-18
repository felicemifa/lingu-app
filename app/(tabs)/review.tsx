import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { VERBS } from '../../data/verbs';
import { TENSES } from '../../constants/tenses';
import { PRONOUN_ORDERS } from '../../constants/pronouns';
import { getStem } from '../../utils/getStem';
import { parseAccentForm } from '../../utils/parseAccent';
import { speak, cancel as cancelSpeech, isSupported as ttsSupported } from '../../utils/tts';
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
 * Render one form char-by-char with stem/ending colour and accent underline.
 * Stem chars → green (#4CAF50), ending chars → black (#333333).
 * Chars in accentedIndices get textDecorationLine: 'underline'.
 */
function FormInline({ form, stem, canSplit, accentForm }) {
  const source = accentForm != null ? accentForm : (typeof form === 'string' ? form : '');
  const { clean, accentedIndices } = parseAccentForm(source);
  const stemLen =
    canSplit && stem && clean.toLowerCase().startsWith(stem) ? stem.length : 0;

  return (
    <Text style={styles.charContainer}>
      {[...clean].map((ch, idx) => {
        const isAccented = accentedIndices.has(idx);
        const isStem = stemLen > 0 && idx < stemLen;
        return (
          <Text
            key={idx}
            style={[
              { color: isStem ? '#4CAF50' : '#333333' },
              isAccented ? { textDecorationLine: 'underline' } : null,
            ]}
          >
            {ch}
          </Text>
        );
      })}
    </Text>
  );
}

/** Render a single form (string) or an array (gender variants), with accent data */
function FormDisplay({ form, accentForm, stem, canSplit }) {
  if (Array.isArray(form)) {
    return (
      <View style={styles.inputRow}>
        {form.map((f, i) => {
          const af = Array.isArray(accentForm) ? accentForm[i] : accentForm;
          return (
            <React.Fragment key={i}>
              {i > 0 && <Text style={styles.separator}> / </Text>}
              <FormInline form={f} stem={stem} canSplit={canSplit} accentForm={af} />
            </React.Fragment>
          );
        })}
      </View>
    );
  }
  return (
    <View style={styles.inputRow}>
      <FormInline form={form} stem={stem} canSplit={canSplit} accentForm={accentForm} />
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

  // ── TTS state ──
  const ttsAvailable = ttsSupported();
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const playTokenRef = useRef(0);

  // 画面離脱時に再生停止
  useEffect(() => {
    return () => {
      playTokenRef.current++;
      cancelSpeech();
    };
  }, []);

  // 画面フォーカス時に最新の config を読み直して state を再同期
  // （タブ切替などで画面がアンマウントされないため state が古くなる問題を防ぐ）
  useFocusEffect(
    useCallback(() => {
      const c = getPracticeConfig();
      const hp =
        c.selectedPronounIndex !== null && c.selectedPronounIndex !== undefined;
      if (hp) {
        setCrossPronounIndex(c.selectedPronounIndex);
        setCrossVerb(pickRandomVerb());
        setPair(null);
      } else {
        setPair(pickRandomPair());
        setCrossVerb(null);
      }
    }, []),
  );

  const playQueue = useCallback((items, myToken, onDone) => {
    const next = (i) => {
      if (playTokenRef.current !== myToken) return;
      if (i >= items.length) {
        onDone?.();
        return;
      }
      speak(items[i], { onEnd: () => next(i + 1) });
    };
    next(0);
  }, []);

  const stopAll = useCallback(() => {
    playTokenRef.current++;
    cancelSpeech();
    setIsPlayingAll(false);
  }, []);

  const handlePlayForm = useCallback(
    (form) => {
      stopAll();
      const items = Array.isArray(form) ? form.filter(Boolean) : [form];
      const myToken = ++playTokenRef.current;
      playQueue(items, myToken, undefined);
    },
    [playQueue, stopAll],
  );

  const handleGoHome = useCallback(() => {
    router.navigate('/');
  }, [router]);

  const handleNextCross = useCallback(() => {
    stopAll();
    const v = pickRandomVerb();
    if (v) setCrossVerb(v);
  }, [stopAll]);

  const handleNextPractice = useCallback(() => {
    stopAll();
    const p = pickRandomPair();
    if (p) setPair(p);
  }, [stopAll]);

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
    const getAccentForm = (tenseKey) =>
      verb.tenses[tenseKey].accentForms?.[crossPronounIndex];

    const handlePlayAllCross = () => {
      if (isPlayingAll) {
        stopAll();
        return;
      }
      const pronoun = PRONOUNS[crossPronounIndex];
      const items = [];
      tenseKeys.forEach((tenseKey) => {
        const f = getForm(tenseKey);
        if (f === null) return;
        items.push(pronoun);
        if (Array.isArray(f)) f.forEach((x) => items.push(x));
        else items.push(f);
      });
      if (items.length === 0) return;
      const myToken = ++playTokenRef.current;
      setIsPlayingAll(true);
      playQueue(items, myToken, () => {
        if (playTokenRef.current === myToken) setIsPlayingAll(false);
      });
    };

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
              onPress={() => {
                stopAll();
                setCrossPronounIndex(i);
              }}
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

        {/* 全て再生ボタン */}
        {ttsAvailable && (
          <View style={styles.playAllRow}>
            <TouchableOpacity
              style={[styles.playAllButton, isPlayingAll && styles.playAllButtonActive]}
              onPress={handlePlayAllCross}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.playAllButtonText,
                  isPlayingAll && styles.playAllButtonTextActive,
                ]}
              >
                {isPlayingAll ? '■ 停止' : '▶ 全て再生'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 時制ごとの表示 */}
        <ScrollView
          style={styles.formScrollCross}
          contentContainerStyle={styles.formContentCross}
        >
          {tenseKeys.map((tenseKey) => {
            const form = getForm(tenseKey);
            const accentForm = getAccentForm(tenseKey);
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
                <View style={styles.rowCrossInner}>
                  <View style={[styles.inputWrapperCross, { flex: 1 }]}>
                    {isNull ? (
                      <>
                        <Text style={styles.nullPlaceholder}>—</Text>
                        <View
                          style={[styles.underline, { backgroundColor: '#EEEEEE' }]}
                        />
                      </>
                    ) : (
                      <>
                        <FormDisplay
                          form={form}
                          accentForm={accentForm}
                          stem={stem}
                          canSplit={rowCanSplit}
                        />
                        <View
                          style={[styles.underline, { backgroundColor: '#CCCCCC' }]}
                        />
                      </>
                    )}
                  </View>
                  {!isNull && ttsAvailable && (
                    <TouchableOpacity
                      style={styles.rowPlayButton}
                      onPress={() => handlePlayForm(form)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rowPlayButtonText}>▶</Text>
                    </TouchableOpacity>
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
  const accentForms = tenseData?.accentForms || [];
  const isCompound = TENSES[tenseKey]?.type === 'compound';
  const stem = getStem(verb);
  const canSplit = !verb.irregular && !isCompound && stem !== '';

  const handlePlayAllPractice = () => {
    if (isPlayingAll) {
      stopAll();
      return;
    }
    const items = [];
    PRONOUNS.forEach((pronoun, i) => {
      const f = forms[i];
      if (f === null) return;
      items.push(pronoun);
      if (Array.isArray(f)) f.forEach((x) => items.push(x));
      else items.push(f);
    });
    if (items.length === 0) return;
    const myToken = ++playTokenRef.current;
    setIsPlayingAll(true);
    playQueue(items, myToken, () => {
      if (playTokenRef.current === myToken) setIsPlayingAll(false);
    });
  };

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

      {/* 全て再生ボタン */}
      {ttsAvailable && (
        <View style={styles.playAllRow}>
          <TouchableOpacity
            style={[styles.playAllButton, isPlayingAll && styles.playAllButtonActive]}
            onPress={handlePlayAllPractice}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.playAllButtonText,
                isPlayingAll && styles.playAllButtonTextActive,
              ]}
            >
              {isPlayingAll ? '■ 停止' : '▶ 全て再生'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 人称ごとの表示 */}
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
      >
        {PRONOUNS.map((pronoun, index) => {
          const form = forms[index];
          const accentForm = accentForms[index];
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
                    <FormDisplay
                      form={form}
                      accentForm={accentForm}
                      stem={stem}
                      canSplit={canSplit}
                    />
                    <View
                      style={[styles.underline, { backgroundColor: '#CCCCCC' }]}
                    />
                  </>
                )}
              </View>
              {!isNull && ttsAvailable && (
                <TouchableOpacity
                  style={styles.rowPlayButton}
                  onPress={() => handlePlayForm(form)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowPlayButtonText}>▶</Text>
                </TouchableOpacity>
              )}
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
  rowCrossInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
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
  charContainer: {
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

  // ── TTS buttons ──
  playAllRow: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 12,
    paddingBottom: 4,
  },
  playAllButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    backgroundColor: '#FFFFFF',
  },
  playAllButtonActive: {
    backgroundColor: '#4CAF50',
  },
  playAllButtonText: {
    fontSize: 14,
    fontFamily: FJ.semiBold,
    color: '#4CAF50',
  },
  playAllButtonTextActive: {
    color: '#FFFFFF',
  },
  rowPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4FAE8',
    marginBottom: 2,
  },
  rowPlayButtonText: {
    fontSize: 12,
    color: '#4CAF50',
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
