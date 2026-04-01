import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { VERBS } from '../../data/verbs';
import { TENSES } from '../../constants/tenses';
import { PRONOUN_ORDERS } from '../../constants/pronouns';
import { checkAnswer, formatAnswer } from '../../utils/checkAnswer';
import { loadStats, recordResult } from '../../data/stats';
import { F, FJ } from '../../constants/fonts';

const PRONOUNS = PRONOUN_ORDERS.standard;

function pickRandom() {
  return VERBS[Math.floor(Math.random() * VERBS.length)];
}

function getVerbTenseKeys(verb) {
  return Object.keys(verb.tenses);
}

export default function CrossScreen() {
  const [currentVerb, setCurrentVerb] = useState(pickRandom);
  const [selectedPronounIndex, setSelectedPronounIndex] = useState(0);
  const [accentOptional, setAccentOptional] = useState(false);

  const tenseKeys = getVerbTenseKeys(currentVerb);
  const [inputs, setInputs] = useState(tenseKeys.map(() => ''));
  const [showAnswers, setShowAnswers] = useState(false);
  const inputRefs = useRef(tenseKeys.map(() => React.createRef()));

  useEffect(() => {
    loadStats().then((data) => {
      setAccentOptional(data.settings.accentOptional);
    });
  }, []);

  const getCorrectAnswer = (tenseIndex) => {
    const tenseKey = tenseKeys[tenseIndex];
    return currentVerb.tenses[tenseKey].forms[selectedPronounIndex];
  };

  const isNullForm = (tenseIndex) => getCorrectAnswer(tenseIndex) === null;

  const handleChangeText = (text, index) => {
    const next = [...inputs];
    next[index] = text;
    setInputs(next);
  };

  const handleSubmitEditing = (index) => {
    for (let i = index + 1; i < tenseKeys.length; i++) {
      if (!isNullForm(i)) {
        inputRefs.current[i]?.current?.focus();
        return;
      }
    }
    inputRefs.current[index]?.current?.blur();
  };

  const handleShowAnswers = useCallback(() => {
    setShowAnswers(true);
    tenseKeys.forEach((tenseKey, i) => {
      const correct = getCorrectAnswer(i);
      if (correct === null) return;
      const isRight = checkAnswer(inputs[i], correct, accentOptional) ? 1 : 0;
      recordResult({
        language: currentVerb.language,
        verbId: currentVerb.id,
        tense: tenseKey,
        score: isRight,
        total: 1,
      });
    });
  }, [inputs, accentOptional, currentVerb, selectedPronounIndex, tenseKeys]);

  const handleRestart = useCallback(() => {
    const newVerb = pickRandom();
    setCurrentVerb(newVerb);
    const newKeys = getVerbTenseKeys(newVerb);
    setInputs(newKeys.map(() => ''));
    setShowAnswers(false);
    inputRefs.current = newKeys.map(() => React.createRef());
    setTimeout(() => {
      for (let i = 0; i < newKeys.length; i++) {
        if (newVerb.tenses[newKeys[i]].forms[selectedPronounIndex] !== null) {
          inputRefs.current[i]?.current?.focus();
          break;
        }
      }
    }, 100);
  }, [selectedPronounIndex]);

  const handleSelectPronoun = (index) => {
    setSelectedPronounIndex(index);
    setInputs(tenseKeys.map(() => ''));
    setShowAnswers(false);
    setTimeout(() => {
      for (let i = 0; i < tenseKeys.length; i++) {
        if (currentVerb.tenses[tenseKeys[i]].forms[index] !== null) {
          inputRefs.current[i]?.current?.focus();
          break;
        }
      }
    }, 100);
  };

  const isCorrect = (tenseIndex) => {
    const correct = getCorrectAnswer(tenseIndex);
    return correct !== null && checkAnswer(inputs[tenseIndex], correct, accentOptional);
  };

  const getInputColor = (index) => {
    if (!showAnswers) return '#333333';
    return isCorrect(index) ? '#4CAF50' : '#E53935';
  };

  const getUnderlineColor = (index) => {
    if (!showAnswers) return '#CCCCCC';
    return isCorrect(index) ? '#4CAF50' : '#E53935';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.verbTitle}>{currentVerb.name}</Text>
        <Text style={currentVerb.irregular ? styles.irregular : styles.regular}>
          {currentVerb.irregular ? '不規則変化' : '規則変化'}
        </Text>
      </View>

      {/* 人称選択チップ */}
      <View style={styles.chipRow}>
        {PRONOUNS.map((p, i) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.chip,
              i === selectedPronounIndex && styles.chipActive,
            ]}
            onPress={() => handleSelectPronoun(i)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                i === selectedPronounIndex && styles.chipTextActive,
              ]}
            >
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 時制ごとの入力フォーム */}
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        {tenseKeys.map((tenseKey, index) => {
          const nullForm = isNullForm(index);
          return (
            <View key={tenseKey} style={styles.row}>
              <Text style={[styles.tenseLabel, nullForm && styles.tenseLabelDisabled]}>
                {TENSES[tenseKey].label}
              </Text>
              <View style={styles.inputWrapper}>
                {nullForm ? (
                  <>
                    <Text style={styles.nullPlaceholder}>—</Text>
                    <View style={[styles.underline, { backgroundColor: '#EEEEEE' }]} />
                  </>
                ) : (
                  <>
                    <TextInput
                      ref={inputRefs.current[index]}
                      value={inputs[index]}
                      onChangeText={(text) => handleChangeText(text, index)}
                      onSubmitEditing={() => handleSubmitEditing(index)}
                      returnKeyType="next"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!showAnswers}
                      style={[styles.textInput, { color: getInputColor(index) }]}
                    />
                    <View
                      style={[
                        styles.underline,
                        { backgroundColor: getUnderlineColor(index) },
                      ]}
                    />
                    {showAnswers && (
                      <Text
                        style={[
                          styles.feedback,
                          { color: isCorrect(index) ? '#4CAF50' : '#E53935' },
                        ]}
                      >
                        {isCorrect(index)
                          ? '✓'
                          : formatAnswer(getCorrectAnswer(index))}
                      </Text>
                    )}
                  </>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ボタン */}
      <View style={styles.buttonArea}>
        {!showAnswers ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleShowAnswers}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>答え</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRestart}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>次の動詞</Text>
          </TouchableOpacity>
        )}
        {!showAnswers && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleRestart}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>スキップ</Text>
          </TouchableOpacity>
        )}
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
    paddingVertical: 20,
    alignItems: 'center',
  },
  verbTitle: {
    fontSize: 28,
    fontFamily: F.bold,
    color: '#333333',
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
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 32,
    paddingVertical: 8,
    gap: 12,
  },
  row: {
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
  inputWrapper: {
    position: 'relative',
  },
  textInput: {
    fontSize: 16,
    fontFamily: F.regular,
    paddingBottom: 6,
    paddingRight: 36,
    color: '#333333',
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
  feedback: {
    position: 'absolute',
    right: 0,
    bottom: 8,
    fontSize: 13,
    fontFamily: F.regular,
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
});
