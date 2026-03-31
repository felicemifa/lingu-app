import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Modal,
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

export default function PracticeScreen() {
  const [currentVerb, setCurrentVerb] = useState(pickRandom);
  const [tense, setTense] = useState('presente');
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

  const tenseData = currentVerb.tenses[tense];
  const forms = tenseData.forms;
  const availableTenseKeys = getVerbTenseKeys(currentVerb);

  const handleChangeText = (text, index) => {
    const next = [...inputs];
    next[index] = text;
    setInputs(next);
  };

  const handleSubmitEditing = (index) => {
    // Find next editable index
    for (let i = index + 1; i < 6; i++) {
      if (forms[i] !== null) {
        inputRefs.current[i]?.current?.focus();
        return;
      }
    }
    inputRefs.current[index]?.current?.blur();
  };

  const handleShowAnswers = useCallback(() => {
    setShowAnswers(true);
    const scorable = forms.filter((f) => f !== null);
    const score = forms.reduce(
      (acc, form, i) => {
        if (form === null) return acc;
        return acc + (checkAnswer(inputs[i], form, accentOptional) ? 1 : 0);
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
  }, [forms, inputs, accentOptional, currentVerb, tense]);

  const handleRestart = useCallback(() => {
    const newVerb = pickRandom();
    setCurrentVerb(newVerb);
    // Reset tense to first available if current tense doesn't exist on new verb
    setTense((prev) => (newVerb.tenses[prev] ? prev : Object.keys(newVerb.tenses)[0]));
    setInputs(['', '', '', '', '', '']);
    setShowAnswers(false);
    setTimeout(() => {
      for (let i = 0; i < 6; i++) {
        if (newVerb.tenses[tense]?.forms[i] !== null) {
          inputRefs.current[i]?.current?.focus();
          break;
        }
      }
    }, 100);
  }, [tense]);

  const handleSelectTense = (key) => {
    setTense(key);
    setInputs(['', '', '', '', '', '']);
    setShowAnswers(false);
    setTenseModalVisible(false);
    setTimeout(() => {
      const newForms = currentVerb.tenses[key].forms;
      for (let i = 0; i < 6; i++) {
        if (newForms[i] !== null) {
          inputRefs.current[i]?.current?.focus();
          break;
        }
      }
    }, 100);
  };

  const isCorrect = (index) =>
    forms[index] !== null && checkAnswer(inputs[index], forms[index], accentOptional);

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
        <View style={styles.headerTitleRow}>
          <Text style={styles.verbTitle}>{currentVerb.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerSubRow}
          onPress={() => setTenseModalVisible(true)}
          activeOpacity={0.7}
        >
          {currentVerb.irregular && (
            <Text style={styles.irregular}>irregolare</Text>
          )}
          <Text style={styles.tense}>
            {currentVerb.irregular ? ' / ' : ''}
            {TENSES[tense].label}
          </Text>
          <Text style={styles.chevron}> ▾</Text>
        </TouchableOpacity>
      </View>

      {/* 時制選択モーダル */}
      <Modal
        visible={tenseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTenseModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTenseModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>時制を選択</Text>
            <ScrollView style={styles.modalScroll}>
              {availableTenseKeys.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.modalItem,
                    key === tense && styles.modalItemActive,
                  ]}
                  onPress={() => handleSelectTense(key)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      key === tense && styles.modalItemTextActive,
                    ]}
                  >
                    {TENSES[key].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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
  headerSubRow: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'center',
  },
  irregular: {
    fontSize: 15,
    color: '#E57373',
    fontFamily: F.regular,
  },
  tense: {
    fontSize: 15,
    color: '#666666',
    fontFamily: F.regular,
  },
  chevron: {
    fontSize: 14,
    color: '#4CAF50',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: 280,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FJ.semiBold,
    color: '#333333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalItemActive: {
    backgroundColor: '#F4FAE8',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    fontFamily: F.regular,
  },
  modalItemTextActive: {
    color: '#4CAF50',
    fontFamily: F.semiBold,
  },
});
