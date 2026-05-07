import { useState, useRef, useCallback } from 'react';
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
import { sendAIChat, isAIConfigured, type AIChatMessage } from '@/lib/aiService';
import { getUnifiedConstituenciesForState } from '@/lib/stateDataAdapter';
import { useActiveStateStore } from '../stores/activeState';

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
  const stateConstituencies = getUnifiedConstituenciesForState(stateCode);
  const selectedConstituency = selectedAcNo
    ? stateConstituencies.find((c) => c.acNo === selectedAcNo)
    : undefined;

  const suggestedQuestions = selectedConstituency
    ? [
        `Analyze ${selectedConstituency.name} constituency`,
        `What's the political history of ${selectedConstituency.name}?`,
        `Tell me about the MLA of ${selectedConstituency.name}`,
        `How did demographics affect ${selectedConstituency.name}'s result?`,
        `Were there any defections in ${selectedConstituency.name}?`,
      ]
    : GENERAL_QUESTIONS;

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
        const chatMessages: AIChatMessage[] = [
          ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: text.trim() },
        ];

        const data = await sendAIChat(chatMessages, {
          stateCode,
          constituencyName: selectedConstituency?.name,
          acNo: selectedAcNo,
        });

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (data.error === 'NO_API_KEY') {
          setAiConfigured(false);
        }
      } catch {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Unable to connect to KSHETRA AI. Please check your network connection.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading],
  );

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.role === 'user' ? styles.userBubble : styles.aiBubble,
      ]}
    >
      {item.role === 'assistant' && (
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={14} color="#4F8EF7" />
        </View>
      )}
      <View
        style={[
          styles.messageContent,
          item.role === 'user' ? styles.userContent : styles.aiContent,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.role === 'user' && styles.userText,
          ]}
        >
          {item.content}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'KSHETRA AI',
          headerStyle: { backgroundColor: '#0A0A1A' },
          headerTintColor: '#FFFFFF',
        }}
      />

      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {messages.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyState} showsVerticalScrollIndicator={false}>
            <View style={styles.aiLogo}>
              <Ionicons name="sparkles" size={40} color="#4F8EF7" />
            </View>
            <Text style={styles.emptyTitle}>KSHETRA AI</Text>
            <Text style={styles.emptySubtitle}>
              Ask me anything about Telangana elections, constituencies, or political trends
            </Text>

            {/* Constituency context picker */}
            {selectedConstituency ? (
              <Pressable
                style={styles.contextBadge}
                onPress={() => setSelectedAcNo(undefined)}
              >
                <Ionicons name="location" size={12} color="#10B981" />
                <Text style={styles.contextBadgeText}>
                  Context: #{selectedConstituency.acNo} {selectedConstituency.name}
                </Text>
                <Ionicons name="close-circle" size={14} color="#6B7280" />
              </Pressable>
            ) : (
              <Pressable
                style={styles.contextPicker}
                onPress={() => setSelectedAcNo(1)}
              >
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.contextPickerText}>
                  Tap to set constituency context
                </Text>
              </Pressable>
            )}

            <View style={styles.suggestions}>
              <Text style={styles.suggestionsTitle}>Try asking:</Text>
              {suggestedQuestions.map((q, i) => (
                <Pressable
                  key={i}
                  style={styles.suggestionChip}
                  onPress={() => sendMessage(q)}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={14}
                    color="#4F8EF7"
                  />
                  <Text style={styles.suggestionText}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#4F8EF7" />
            <Text style={styles.typingText}>KSHETRA AI is thinking...</Text>
          </View>
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about elections, constituencies..."
            placeholderTextColor="#4B5563"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!input.trim() || loading) && styles.sendDisabled,
            ]}
            onPress={() => sendMessage(input)}
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
    backgroundColor: '#0A0A1A',
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
    color: '#4B5563',
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    gap: 10,
  },
  suggestionText: {
    fontSize: 13,
    color: '#D1D5DB',
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
    backgroundColor: '#4F8EF720',
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
    backgroundColor: '#4F8EF7',
    borderBottomRightRadius: 4,
  },
  aiContent: {
    backgroundColor: '#111827',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#D1D5DB',
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
    color: '#6B7280',
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    backgroundColor: '#0A0A1A',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F8EF7',
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
    backgroundColor: '#10B98120',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  contextBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  contextPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderRadius: 20,
  },
  contextPickerText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
