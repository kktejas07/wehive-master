import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';
import { useSignupViewModel } from '@/features/auth/viewmodel/use-auth-viewmodel';

export default function SignupScreen() {
  const { c } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signup, loading, error } = useSignupViewModel();

  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="title">Create account</Text>
        <Text tone="muted">Start your study abroad journey</Text>

        <View style={styles.fields}>
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.text, backgroundColor: c.surface }]}
            placeholder="Full name"
            placeholderTextColor={c.textMuted}
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.text, backgroundColor: c.surface }]}
            placeholder="Email"
            placeholderTextColor={c.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.text, backgroundColor: c.surface }]}
            placeholder="Password"
            placeholderTextColor={c.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error ? <Text tone="error">{error}</Text> : null}

        <Button
          label="Create account"
          loading={loading}
          onPress={() => signup(name, email, password)}
        />

        <View style={styles.footer}>
          <Text tone="muted">Already have an account? </Text>
          <Link href="/(auth)/login">
            <Text style={{ color: c.primary }}>Sign in</Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  fields: { gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
});
