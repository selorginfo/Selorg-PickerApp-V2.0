import React, { useRef } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/icons/Icon';
import { colors, weight } from '../../theme';
import { useSupport } from '../../hooks/useSupport';
import { useLayout } from '../../hooks/useLayout';

const logo = require('../../assets/images/selorg-logo.jpg');
const QUICK = ['My shift didn’t start', 'Payout not received', 'Device issue'];

export const ChatSupportScreen: React.FC = () => {
  const navigation = useNavigation();
  const support = useSupport();
  const scrollRef = useRef<any>(null);
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const bubbleMax = Math.min(layout.width * 0.75, layout.isTablet ? 420 : 320);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, layout.isTablet && styles.headerConstrained]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.back}>
          <Icon name="chevronLeft" size={22} color={colors.white} strokeWidth={2.2} />
        </Pressable>
        <Image source={logo} style={styles.logo} />
        <View style={styles.flex1}>
          <Text style={[styles.name, weight(800)]} numberOfLines={1}>
            Selorg Support
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.status} numberOfLines={1}>
              Online · replies in ~5 min
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            layout.isTablet && { maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%' },
          ]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          <Text style={styles.today}>Today</Text>
          {support.chatMsgs.map((m, i) => {
            const me = m.who === 'me';
            return (
              <View key={i} style={[styles.msgRow, { justifyContent: me ? 'flex-end' : 'flex-start' }]}>
                <View style={{ maxWidth: bubbleMax }}>
                  <View style={[styles.bubble, me ? styles.bubbleMe : styles.bubbleAgent]}>
                    <Text style={[styles.bubbleText, { color: me ? colors.white : colors.ink }]}>{m.text}</Text>
                  </View>
                  <Text
                    style={[
                      styles.time,
                      { color: colors.inkMuted2, textAlign: me ? 'right' : 'left' },
                    ]}>
                    {m.time}
                  </Text>
                </View>
              </View>
            );
          })}
          {support.chatTyping && (
            <View style={styles.msgRow}>
              <View style={[styles.bubble, styles.bubbleAgent, styles.typing, { maxWidth: bubbleMax }]}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.inputBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
            layout.isTablet && styles.inputBarConstrained,
          ]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            {QUICK.map(q => (
              <Pressable
                key={q}
                style={[styles.quickChip, support.sending && styles.sendBtnDisabled]}
                onPress={() => support.quickChat(q)}
                disabled={support.sending || support.chatTyping}>
                <Text style={[styles.quickText, weight(700)]}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={support.chatInput}
              onChangeText={support.setChatInput}
              placeholder="Type a message…"
              placeholderTextColor={colors.inkMuted}
              onSubmitEditing={support.sendChat}
              maxLength={2000}
              editable={!support.chatTyping}
            />
            <Pressable
              style={[styles.sendBtn, !support.canSend && styles.sendBtnDisabled]}
              onPress={support.sendChat}
              hitSlop={6}
              disabled={!support.canSend}>
              <Icon name="send" size={21} color={colors.white} strokeWidth={1.9} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.chatBg },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: colors.inkGreen,
    width: '100%',
  },
  headerConstrained: { alignSelf: 'center', maxWidth: 560, width: '100%' },
  back: { padding: 4 },
  logo: { width: 40, height: 40, borderRadius: 16, backgroundColor: colors.white },
  name: { fontSize: 15, color: colors.white },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint },
  status: { fontSize: 11.5, color: colors.mint, flexShrink: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, flexGrow: 1 },
  today: { textAlign: 'center', fontSize: 11, color: colors.inkMuted2, marginBottom: 16 },
  msgRow: { flexDirection: 'row', marginBottom: 12 },
  bubble: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  bubbleAgent: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 5,
  },
  bubbleText: { fontSize: 13.5, lineHeight: 20 },
  time: { fontSize: 10, marginTop: 5 },
  typing: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#B7C2B9' },
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: colors.chatBg,
    borderTopWidth: 1,
    borderTopColor: '#E0E7DF',
    width: '100%',
  },
  inputBarConstrained: { alignSelf: 'center', maxWidth: 560 },
  quickRow: { gap: 7, paddingBottom: 10 },
  quickChip: {
    borderWidth: 1,
    borderColor: '#CFDCD0',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    minHeight: 36,
  },
  quickText: { color: colors.primary, fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 24,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    fontSize: 14,
    color: colors.ink,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});
