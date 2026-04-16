import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { VERBS } from '../../data/verbs';
import { TENSES } from '../../constants/tenses';
import { PRONOUN_ORDERS } from '../../constants/pronouns';
import { checkAnswer, formatAnswer } from '../../utils/checkAnswer';
import { getStem } from '../../utils/getStem';
import { loadStats, recordResult } from '../../data/stats';
import { getPracticeConfig } from '../../data/practiceConfig';
import { F, FJ } from '../../constants/fonts';

const PRONOUNS = PRONOUN_ORDERS.standard;
const QUIZ_COUNT = 3;

function getFilteredVerbs() {
  const config = getPracticeConfig();
  if (config.selectedVerbIds.length === 0) return VERBS;
  return VERBS.filter((v) => config.selectedVerbIds.includes(v.id));
}

function getFilteredTenseKeys(verb) {
  const config = getPracticeConfig();
  const verbTenseKeys = Object.keys(verb.tenses);
  if (config.selectedTenseKeys.length === 0) return verbTenseKeys;
  return verbTenseKeys.filter((k) => config.selectedTenseKeys.includes(k));
}

/** Build all valid verb×tense pairs from config */
function buildQuizPairs() {
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

/** Pick n unique random pairs (or fewer if not enough) */
function pickQuizQuestions(n) {
  const pairs = buildQuizPairs();
  const shuffled = [...pairs].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default function PracticeScreen() {
  const router = useRouter();

  // Quiz state
  const [questions, setQuestions] = useState(() => pickQuizQuestions(QUIZ_COUNT));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [scores, setScores] = useState([]); // { score, total, verbName, tenseLabel }[]
  const [showResult, setShowResult] = useState(false);

  // Current question
  const currentQuestion = questions[questionIndex] || questions[0];
  const currentVerb = currentQuestion?.verb;
  const tense = currentQuestion?.tenseKey;

  const [inputs, setInputs] = useState(['', '', '', '', '', '']);
  const [showAnswers, setShowAnswers] = useState(false);
  const [tenseModalVisible, setTenseModalVisible] = useState(false);
  const [accentOptional, setAccentOptional] = useState(false);
  const inputRefs = useRef([...Array(6)].map(() => React.createRef()));

  useEffect(() => {
    loadStats().then((data) => {
      setAccentOptional(data.settings.accentOptional);
    });
  }, []);

  const tenseData = currentVerb?.tenses[tense];
  const forms = tenseData?.forms || [null, null, null, null, null, null];
  const availableTenseKeys = currentVerb ? Object.keys(currentVerb.tenses) : [];
  const stem = getStem(currentVerb);

  const handleChangeText = (text, index) => {
    const next = [...inputs];
    next[index] = text;
    setInputs(next);
  };

  const handleMoveNext = (index) => {
    for (let i = index + 1; i < 6; i++) {
      if (forms[i] !== null) {
        inputRefs.current[i]?.current?.focus();
        return;
      }
    }
    inputRefs.current[index]?.current?.blur();
    if (!showAnswers) {
      handleShowAnswers();
    }
  };

  const handleMovePrev = (index) => {
    for (let i = index - 1; i >= 0; i--) {
      if (forms[i] !== null) {
        inputRefs.current[i]?.current?.focus();
        return;
      }
    }
  };

  const handleSubmitEditing = (index) => {
    handleMoveNext(index);
  };

  const handleKeyPress = (e, index) => {
    if (Platform.OS !== 'web') return;
    const key = e.nativeEvent?.key;
    if (key === 'ArrowDown' || key === 'Enter') {
      e.preventDefault?.();
      handleMoveNext(index);
    } else if (key === 'ArrowUp') {
      e.preventDefault?.();
      handleMovePrev(index);
    }
  };

  const handleShowAnswers = useCallback(() => {
    setShowAnswers(true);
    const scorable = forms.filter((f) => f !== null);
    const score = forms.reduce(
      (acc, form, i) => {
        if (form === null) return acc;
        return acc + (checkAnswer(stem + inputs[i], form, accentOptional) ? 1 : 0);
      },
      0,
    );
    recordResult({
      language: currentVerb.language,
      verbId: currentVerb.id,
      tense,
      score,
      total: scorable.length,
    });
    // Save score for results screen
    setScores((prev) => [
      ...prev,
      {
        score,
        total: scorable.length,
        verbName: currentVerb.name,
        tenseLabel: TENSES[tense]?.label || tense,
      },
    ]);
  }, [forms, inputs, accentOptional, currentVerb, tense, stem]);

  const handleNext = useCallback(() => {
    if (questionIndex + 1 >= questions.length) {
      // Show results
      setShowResult(true);
    } else {
      setQuestionIndex((prev) => prev + 1);
      setInputs(['', '', '', '', '', '']);
      setShowAnswers(false);
      setTimeout(() => {
        const nextQ = questions[questionIndex + 1];
        if (nextQ) {
          const nextForms = nextQ.verb.tenses[nextQ.tenseKey]?.forms;
          if (nextForms) {
            for (let i = 0; i < 6; i++) {
              if (nextForms[i] !== null) {
                inputRefs.current[i]?.current?.focus();
                break;
              }
            }
          }
        }
      }, 100);
    }
  }, [questionIndex, questions]);

  const handleRetry = useCallback(() => {
    const newQuestions = pickQuizQuestions(QUIZ_COUNT);
    setQuestions(newQuestions);
    setQuestionIndex(0);
    setScores([]);
    setShowResult(false);
    setInputs(['', '', '', '', '', '']);
    setShowAnswers(false);
    setTimeout(() => {
      const firstQ = newQuestions[0];
      if (firstQ) {
        const firstForms = firstQ.verb.tenses[firstQ.tenseKey]?.forms;
        if (firstForms) {
          for (let i = 0; i < 6; i++) {
            if (firstForms[i] !== null) {
              inputRefs.current[i]?.current?.focus();
              break;
            }
          }
        }
      }
    }, 100);
  }, []);

  const handleGoHome = useCallback(() => {
    router.navigate('/');
  }, [router]);

  const handleSelectTense = (key) => {
    // In quiz mode, tense selection changes the current question's tense
    setTenseModalVisible(false);
  };

  const isCorrect = (index) =>
    forms[index] !== null && checkAnswer(stem + inputs[index], forms[index], accentOptional);

  const getInputColor = (index) => {
    if (!showAnswers) return '#333333';
    return isCorrect(index) ? '#4CAF50' : '#E53935';
  };

  const getUnderlineColor = (index) => {
    if (!showAnswers) return '#CCCCCC';
    return isCorrect(index) ? '#4CAF50' : '#E53935';
  };

  // Total score for results
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const totalPossible = scores.reduce((sum, s) => sum + s.total, 0);

  // ── Results Screen ──
  if (showResult) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>結果</Text>
          <Text style={styles.resultScore}>
            {totalScore} / {totalPossible}
          </Text>
          <View style={styles.resultDetails}>
            {scores.map((s, i) => (
              <View key={i} style={styles.resultRow}>
                <Text style={styles.resultIndex}>{i + 1}.</Text>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultVerb}>{s.verbName}</Text>
                  <Text style={styles.resultTense}>{s.tenseLabel}</Text>
                </View>
                <Text
                  style={[
                    styles.resultItemScore,
                    s.score === s.total ? styles.resultPerfect : styles.resultImperfect,
                  ]}
                >
                  {s.score}/{s.total}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.resultButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRetry}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>もう一度</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleGoHome}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>トップに戻る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentVerb) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>問題がありません</Text>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.questionCounter}>
          {questionIndex + 1} / {questions.length}
        </Text>
        <View style={styles.headerTitleRow}>
          <Text style={styles.verbTitle}>{currentVerb.name}</Text>
        </View>
        <Text style={styles.verbMeaning}>{currentVerb.meaning}</Text>
        <View style={styles.headerSubRow}>
          <Text style={currentVerb.irregular ? styles.irregular : styles.regular}>
            {currentVerb.irregular ? '不規則変化' : '規則変化'}
          </Text>
          <Text style={styles.tenseText}>
            {' / '}
            {TENSES[tense]?.label || tense}
          </Text>
        </View>
      </View>

      {/* 入力フォーム */}
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
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
              <View style={styles.inputWrapper}>
                {isNull ? (
                  <>
                    <Text style={styles.nullPlaceholder}>—</Text>
                    <View style={[styles.underline, { backgroundColor: '#EEEEEE' }]} />
                  </>
                ) : (
                  <>
                    <View style={styles.inputRow}>
                      {stem !== '' && (
                        <Text style={styles.stemText}>{stem}</Text>
                      )}
                      <TextInput
                        ref={inputRefs.current[index]}
                        value={inputs[index]}
                        onChangeText={(text) => handleChangeText(text, index)}
                        onSubmitEditing={() => handleSubmitEditing(index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        returnKeyType="next"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!showAnswers}
                        style={[styles.textInput, { color: getInputColor(index) }]}
                      />
                    </View>
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
                        {isCorrect(index) ? '✓' : formatAnswer(forms[index])}
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
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              {questionIndex + 1 >= questions.length ? '結果を見る' : '次の問題'}
            </Text>
          </TouchableOpacity>
        )}
        {!showAnswers && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              // Skip: record 0 score and move to next
              const scorable = forms.filter((f) => f !== null);
              setScores((prev) => [
                ...prev,
                {
                  score: 0,
                  total: scorable.length,
                  verbName: currentVerb.name,
                  tenseLabel: TENSES[tense]?.label || tense,
                },
              ]);
              if (questionIndex + 1 >= questions.length) {
                setShowResult(true);
              } else {
                setQuestionIndex((prev) => prev + 1);
                setInputs(['', '', '', '', '', '']);
                setShowAnswers(false);
              }
            }}
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
    paddingVertical: 24,
    alignItems: 'center',
  },
  questionCounter: {
    fontSize: 13,
    fontFamily: FJ.semiBold,
    color: '#4CAF50',
    marginBottom: 8,
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
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
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
    flex: 1,
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

  // ── Results Screen ──
  resultContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 24,
    fontFamily: FJ.bold,
    color: '#333333',
    marginBottom: 16,
  },
  resultScore: {
    fontSize: 48,
    fontFamily: F.bold,
    color: '#4CAF50',
    marginBottom: 32,
  },
  resultDetails: {
    width: '100%',
    gap: 12,
    marginBottom: 40,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  resultIndex: {
    fontSize: 15,
    fontFamily: FJ.semiBold,
    color: '#AAAAAA',
    width: 24,
  },
  resultInfo: {
    flex: 1,
  },
  resultVerb: {
    fontSize: 17,
    fontFamily: F.semiBold,
    color: '#333333',
  },
  resultTense: {
    fontSize: 13,
    fontFamily: FJ.regular,
    color: '#888888',
    marginTop: 2,
  },
  resultItemScore: {
    fontSize: 17,
    fontFamily: F.bold,
  },
  resultPerfect: {
    color: '#4CAF50',
  },
  resultImperfect: {
    color: '#E53935',
  },
  resultButtons: {
    width: '100%',
    gap: 12,
  },
});
