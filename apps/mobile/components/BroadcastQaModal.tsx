import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Pressable, 
  TextInput, 
  FlatList, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BroadcastQaThread } from '@kshetra/shared';

interface Props {
  visible: boolean;
  onClose: () => void;
  questions: BroadcastQaThread[];
  onSubmitQuestion: (text: string) => Promise<void>;
  onUpvoteQuestion: (questionId: string) => Promise<void>;
}

export const BroadcastQaModal: React.FC<Props> = ({
  visible,
  onClose,
  questions,
  onSubmitQuestion,
  onUpvoteQuestion,
}) => {
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = inputText.trim();
    if (trimmed.length < 5) {
      Alert.alert('Validation Error', 'Question must be at least 5 characters');
      return;
    }
    // DPDP Act 2023 check
    if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i.test(trimmed)) {
      Alert.alert('Privacy Protection', 'Please do not include email addresses in questions.');
      return;
    }
    if (/(\+91|0)?[6-9][0-9]{9}/.test(trimmed)) {
      Alert.alert('Privacy Protection', 'Please do not include phone numbers in questions.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitQuestion(trimmed);
      setInputText('');
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="chatbubbles" size={20} color="#3B82F6" />
              <Text style={styles.title}>Audience Q&A</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </Pressable>
          </View>

          <FlatList
            data={questions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No audience questions yet. Be the first to ask!</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.questionCard, item.isPinned && styles.pinnedCard]}>
                {item.isPinned && (
                  <View style={styles.pinnedBadge}>
                    <Ionicons name="pin" size={12} color="#F59E0B" />
                    <Text style={styles.pinnedText}>PINNED BY HOST</Text>
                  </View>
                )}
                <Text style={styles.questionText}>{item.questionText}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.authorName}>{item.authorDisplayName}</Text>
                  <Pressable 
                    style={[styles.upvoteBtn, item.hasUpvoted && styles.upvotedBtn]}
                    onPress={() => onUpvoteQuestion(item.id)}
                  >
                    <Ionicons 
                      name={item.hasUpvoted ? "thumbs-up" : "thumbs-up-outline"} 
                      size={14} 
                      color={item.hasUpvoted ? "#3B82F6" : "#94A3B8"} 
                    />
                    <Text style={[styles.upvoteCount, item.hasUpvoted && styles.upvotedText]}>
                      {item.upvotes}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask a question for the broadcaster..."
              placeholderTextColor="#64748B"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={300}
            />
            <Pressable 
              style={[styles.submitBtn, (!inputText.trim() || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!inputText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={16} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pinnedCard: {
    borderColor: '#F59E0B',
    backgroundColor: '#1A2234',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  pinnedText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  questionText: {
    color: '#F1F5F9',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorName: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  upvotedBtn: {
    borderColor: '#3B82F6',
  },
  upvoteCount: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  upvotedText: {
    color: '#3B82F6',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    maxHeight: 80,
  },
  submitBtn: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#334155',
  },
});
