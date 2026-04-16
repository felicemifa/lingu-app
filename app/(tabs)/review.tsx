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

function getFilteredTenseKeys(verb) {
  const config = getPracticeConfig();
  const verbTenseKeys = Object.keys(verb.tenses);
  if (!config.selectedTenseKeys || config.selectedTenseKeys.length === 0) {
    return verbTenseKeys;
  }
  return verbTenseKeys.filter((k) => config.selectedTenseKeys.includes(k));
}

function buildPairs() {
  const verbs = getFilteredVerbs();
  const pairs = [];
  for (const verb of verbs) {
    const tenseKeys = getFilteredTenseKeys(verb);
    for (const tenseKey of tenseKeys) {
      pairs.push({ verb, tenseKey });
    }
  }
  return pairs;
}

function pickRandomPair() {
  const pairs = buildPairs();
  if (pairs.length === 0) return null;
  return pairs[Math.floor(Math.random() * pairs.length)];
}

export default function ReviewScreen() {
  const router = useRouter();

  const [current, setCurrent] = useState(() => pickRandomPair());

  const handleNext = useCallback(() => {
    const next = pickRandomPair();
    if (next) setCurrent(next);
  }, []);

  const handlePractice = useCallback(() => {
    if (!current) return;
    setPracticeConfig({
      selectedVerbIds: [current.verb.id],
      selectedTenseKeys: [current.tenseKey],
      selectedPronounIndex: null,
    });
    router.navigate('/practice');
  }, [current, router]);

  const handleGoHome = useCallback(() => {
    router.navigate('/');
  }, [router]);

  if (!current) {
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

  const { verb, tenseKey } = current;
  const tenseData = verb.tenses[tenseKey];
  const forms = tenseData?.forms || [null, null, null, null, null, null];
  const tenseInfo = TENSES[tenseKey];
  const isCompound = tenseInfo?.type === 'compound';
  const stem = getStem(verb);
  const canSplitStem = !isCompound && !verb.irregular && stem !== '';

  /** Render a single form (string). If stem-splittable, color stem gray + ending black. */
  const renderForm = (form, keyPrefix) => {
    if (canSplitStem && typeof form === 'string' && form.toLowerCase().startsWith(stem)) {
      const rest = form.slice(stem.length);
      return (
        <Text key={keyPrefix} style={styles.formText}>
          <Text style={styles.stemText}>{stem}</Text>
          <Text style={styles.endingText}>{rest}</Text>
        </Text>
      );
    }
    return (
      <Text key={keyPrefix} style={[styles.formText, styles.endingText]}>
        {form}
      </Text>
    );
  };

  /** Render a form cell (handles null and array). */
  const renderFormCell = (form, index) => {
    if (form === null) {
      return <Text style={styles.nullPlaceholder}>—</Text>;
    }
    if (Array.isArray(form)) {
      return (
        <View style={styles.arrayRow}>
          {form.map((f, i) => (
            <React.Fragment key={`${index}-${i}`}>
              {i > 0 && <Text style={styles.separator}> / </Text>}
              {renderForm(f, `${index}-${i}`)}
            </React.Fragment>
          ))}
        </View>
      );
    }
    return renderForm(form, String(index));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.verbTitle}>{verb.name}</Text>
        <Text style={styles.verbMeaning}>{verb.meaning}</Text>
        <View style={styles.headerSubRow}>
          <Text style={verb.irregular ? styles.irregular : styles.regular}>
            {verb.irregular ? '不規則変化' : '規則変化'}
          </Text>
          <Text style={styles.tenseText}>
            {' / '}
            {tenseInfo?.label || tenseKey}
          </Text>
        </View>
      </View>

      {/* 活用一覧 */}
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
      >
        {PRONOUNS.map((pronoun, index) => {
          const isNull = forms[index] === null;
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
              <View style={styles.formCell}>
                {renderFormCell(forms[index], index)}
                <View
                  style={[
                    styles.underline,
                    { backgroundColor: isNull ? '#EEEEEE' : '#CCCCCC' },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ボタン */}
      <View style={styles.buttonArea}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>次の動詞</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handlePractice}
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
  header: {
    backgroundColor: '#F4FAE8',
    paddingVertical: 24,
    alignItems: 'center',
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
  },
  regular: {
    fontSize: 15,
    color: '#81C784',
    fontFamily: FJ.regular,
  },
  tenseText: {
    fontSize: 15,
    color: '#666666',
    fontFamily: F.regular,
  },
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
  formCell: {
    flex: 1,
  },
  formText: {
    fontSize: 16,
    fontFamily: F.regular,
    paddingBottom: 6,
  },
  stemText: {
    color: '#BBBBBB',
  },
  endingText: {
    color: '#333333',
  },
  nullPlaceholder: {
    fontSize: 16,
    fontFamily: F.regular,
    color: '#CCCCCC',
    paddingBottom: 6,
  },
  arrayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  separator: {
    fontSize: 16,
    fontFamily: F.regular,
    color: '#888888',
    paddingBottom: 6,
  },
  underline: {
    height: 1,
    backgroundColor: '#CCCCCC',
  },
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
