import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  FlatList,
  KeyboardAvoidingView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendAIChat, isAIConfigured, type AIChatMessage } from '../lib/aiService';
import { getUnifiedConstituenciesForState } from '../lib/stateDataAdapter';
import { useActiveStateStore } from '../stores/activeState';
import { useTheme } from '../lib/theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const GENERAL_QUESTIONS = [
  'What were the key takeaways from Telangana 2023?',
  'Which party has been most consistent across elections?',
  'Explain the AIMIM stronghold in Hyderabad',
  'What caused BRS to lose in 2023?',
  'Compare turnout across 2014, 2018, and 2023',
  'Which constituencies saw the biggest defections?',
  'Analyze the BRS→INC mass defection of 2024',
];

export default function AIChatScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ acNo?: string }>();
  const initialAcNo = params.acNo ? parseInt(params.acNo, 10) : undefined;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [selectedAcNo, setSelectedAcNo] = useState<number | undefined>(initialAcNo);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const stateCode = useActiveStateStore((s) => s.stateCode);
  const constituencies = getUnifiedConstituenciesForState(stateCode);
  const constituency = selectedAcNo
    ? constituencies.find((c) => c.acNo === selectedAcNo)
    : undefined;

  const handleSend = useCallback(async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    const history: AIChatMessage[] = [
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: text },
    ];

    const response = await sendAIChat(
      history,
      constituency ? { constituencyName: constituency.name, acNo: constituency.acNo } : undefined,
    );

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response.response,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setLoading(false);
  }, [input, loading, messages, constituency]);

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.role === 'user' ? styles.userBubble : styles.aiBubble,
      ]}
    >
      {item.role === 'assistant' && (
        <View style={[styles.aiAvatar, { backgroundColor: colors.goldLight }]}>
          <Ionicons name="sparkles" size={14} color={colors.gold} />
        </View>
      )}
      <View
        style={[
          styles.messageContent,
          item.role === 'user'
            ? [styles.userContent, { backgroundColor: colors.primary }]
            : [styles.aiContent, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }],
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: item.role === 'user' ? '#FFFFFF' : colors.text },
            item.role === 'user' && styles.userText,
          ]}
        >
          {item.content}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('ai.chatTitle'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
        }}
      />

      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {messages.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyState}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.aiLogo, { backgroundColor: colors.goldLight }]}>
              <Ionicons name="sparkles" size={32} color={colors.gold} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('ai.title')}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {constituency
                ? t('ai.askAboutConstituency', { name: constituency.name })
                : t('ai.askAboutState', { state: stateCode })}
            </Text>

            {constituency && (
              <View style={[styles.contextBadge, { backgroundColor: colors.goldLight, borderColor: colors.gold }]}>
                <Ionicons name="location" size={14} color={colors.gold} />
                <Text style={[styles.contextBadgeText, { color: colors.gold }]}>
                  {constituency.name} (#{constituency.acNo})
                </Text>
                <Pressable onPress={() => setSelectedAcNo(undefined)} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.gold} />
                </Pressable>
              </View>
            )}

            <View style={styles.suggestions}>
              <Text style={[styles.suggestionsTitle, { color: colors.textMuted }]}>{t('ai.suggestedQuestions')}</Text>
              {(constituency
                ? [
                    t('ai.qWinner2023', { name: constituency.name, defaultValue: `Who won ${constituency.name} in 2023?` }),
                    t('ai.qMarginTrend', { name: constituency.name, defaultValue: `What is the margin trend in ${constituency.name}?` }),
                    t('ai.qTellAboutMLA', { name: constituency.name, defaultValue: `Tell me about the MLA of ${constituency.name}` }),
                    t('ai.qDefections', { name: constituency.name, defaultValue: `Has ${constituency.name} seen any defections?` }),
                  ]
                : [
                    t('ai.qKeyTakeaways', { defaultValue: 'What were the key takeaways from the last election?' }),
                    t('ai.qConsistentParty', { defaultValue: 'Which party has been most consistent across elections?' }),
                    t('ai.qStronghold', { defaultValue: 'Explain the AIMIM stronghold in Hyderabad' }),
                    t('ai.qTurnoutAcross', { defaultValue: 'Compare turnout across past elections' }),
                  ]
              ).map((q) => (
                <Pressable
                  key={q}
                  style={[styles.suggestionChip, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}
                  onPress={() => handleSend(q)}
                >
                  <Ionicons name="chatbubble-outline" size={14} color={colors.gold} />
                  <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={colors.gold} />
            <Text style={[styles.typingText, { color: colors.textMuted }]}>{t('ai.thinking')}</Text>
          </View>
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
            placeholder={t('ai.askPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />
          <Pressable
            style={[
              styles.sendButton,
              { backgroundColor: colors.primary },
              (!input.trim() || loading) && styles.sendDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  emptyState: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  aiLogo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4F8EF720',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  suggestions: {
    marginTop: 32,
    width: '100%',
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#6D5549',
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D8BC7E',
    gap: 10,
  },
  suggestionText: {
    fontSize: 13,
    color: '#241814',
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '88%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FBE8E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageContent: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: '92%',
  },
  userContent: {
    backgroundColor: '#A8201A',
    borderBottomRightRadius: 4,
  },
  aiContent: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#D8BC7E',
  },
  messageText: {
    fontSize: 14,
    color: '#241814',
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#8E7B6F',
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A8201A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#145C6820',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#145C6850',
  },
  contextBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#145C68',
  },
  contextPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8BC7E',
    borderRadius: 20,
  },
  contextPickerText: {
    fontSize: 12,
    color: '#6D5549',
  },
});
