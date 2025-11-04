import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Card, TextInput, IconButton, Avatar, Chip } from 'react-native-paper';
import { Colors, Spacing, Shadows } from '../../../constants/theme';
import { Mascot } from '../../../components';
import { useTranslation } from 'react-i18next';

const aiAPI = {
  sendMessage: async (message: string, t: any) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      data: {
        response: t('aiAssistant.response'),
        suggestions: [t('aiAssistant.suggestion2'), t('aiAssistant.suggestion4')]
      }
    };
  }
};

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  suggestions?: string[];
}

export default function AIAssistantScreen() {
  const { t } = useTranslation();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: t('aiAssistant.welcomeMessage'),
      isUser: false,
      timestamp: new Date(),
      suggestions: [
        t('aiAssistant.suggestion1'),
        t('aiAssistant.suggestion2'),
        t('aiAssistant.suggestion3'),
        t('aiAssistant.suggestion4')
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await aiAPI.sendMessage(inputText, t);
      const aiMessage: Message = {
        id: messages.length + 2,
        text: response.data.response,
        isUser: false,
        timestamp: new Date(),
        suggestions: response.data.suggestions
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
  };

  const renderMessage = (message: Message) => (
    <View key={message.id} style={[styles.messageContainer, message.isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
      {!message.isUser && (
        <View style={{ width: 32, height: 32, marginRight: 8 }}>
          <Mascot pose="thinking" animation="pulse" size={32} />
        </View>
      )}
      <View style={[styles.messageBubble, message.isUser ? styles.userMessage : styles.aiMessage]}>
        <Text style={message.isUser ? styles.userText : styles.aiText}>{message.text}</Text>
        <Text style={styles.timestamp}>{message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>

        {message.suggestions && message.suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text variant="bodySmall" style={styles.suggestionsTitle}>{t('aiAssistant.suggestions')}</Text>
            <View style={styles.suggestions}>
              {message.suggestions.map((sug, idx) => (
                <Chip key={idx} mode="outlined" onPress={() => handleSuggestionPress(sug)} style={styles.suggestionChip}>
                  {sug}
                </Chip>
              ))}
            </View>
          </View>
        )}
      </View>
      {message.isUser && (
        <Avatar.Icon size={32} icon="account" style={styles.avatar} />
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <ScrollView ref={scrollViewRef} style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
              <Mascot pose="reading" animation="float" size={100} />
            </View>
            <Text variant="titleMedium" style={styles.welcomeTitle}>{t('aiAssistant.title')}</Text>
            <Text variant="bodySmall" style={styles.welcomeText}>
              {t('aiAssistant.description')}
            </Text>
          </Card.Content>
        </Card>

        {messages.map(renderMessage)}

        {loading && (
          <View style={[styles.messageContainer, styles.aiMessageContainer]}>
            <View style={{ width: 32, height: 32, marginRight: 8 }}>
              <Mascot pose="thinking" animation="pulse" size={32} />
            </View>
            <View style={[styles.messageBubble, styles.aiMessage]}>
              <Text style={styles.aiText}>{t('aiAssistant.analyzing')}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('aiAssistant.placeholder')}
          mode="outlined"
          style={styles.input}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
        />
        <IconButton
          icon="send"
          mode="contained"
          iconColor={Colors.surface}
          containerColor={Colors.primary}
          size={24}
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: Spacing.md },
  welcomeCard: { marginBottom: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  welcomeTitle: { fontWeight: '700', color: Colors.primary },
  welcomeText: { color: Colors.textSecondary, marginTop: Spacing.xs },
  messageContainer: { flexDirection: 'row', marginBottom: Spacing.md, alignItems: 'flex-end' },
  userMessageContainer: { justifyContent: 'flex-end' },
  aiMessageContainer: { justifyContent: 'flex-start' },
  avatar: { backgroundColor: Colors.primary },
  messageBubble: { maxWidth: '75%', borderRadius: 16, padding: Spacing.md, marginHorizontal: Spacing.sm },
  userMessage: { backgroundColor: Colors.primary },
  aiMessage: { backgroundColor: Colors.surface, ...Shadows.sm },
  userText: { color: '#fff' },
  aiText: { color: Colors.text },
  timestamp: { fontSize: 10, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'right' },
  suggestionsContainer: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  suggestionsTitle: { color: Colors.textSecondary, marginBottom: Spacing.xs },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  suggestionChip: { marginBottom: Spacing.xs },
  inputContainer: { flexDirection: 'row', padding: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, alignItems: 'flex-end' },
  input: { flex: 1, marginRight: Spacing.sm, backgroundColor: Colors.background },
});
