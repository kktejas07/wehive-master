import { KeyRound, Send } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/core/theme/tokens';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { Text } from '@/core/ui/text';
import { TextField } from '@/core/ui/text-field';
import { useOtpSignIn } from '@/features/auth/viewmodel/use-otp-sign-in';

/** View only: every decision lives in useOtpSignIn. */
export function SignInForm() {
  const vm = useOtpSignIn();
  return (
    <Card style={styles.card}>
      <Text variant="heading">Sign in or create an account</Text>
      {vm.step === 'identifier' ? (
        <>
          <TextField
            label="Email or mobile"
            placeholder="you@example.com or 98xxxxxxxx"
            value={vm.identifier}
            onChangeText={vm.setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            onSubmitEditing={vm.sendCode}
            testID="signin-identifier"
            hint="We send a one-time code by email, or by WhatsApp for mobile numbers."
          />
          <Button label="Send code" icon={Send} onPress={vm.sendCode} busy={vm.busy} disabled={!vm.canSend} full />
        </>
      ) : (
        <>
          <Text tone="muted">Enter the code sent to {vm.masked}.</Text>
          {vm.devCode ? <Text variant="small" tone="muted">Test code: {vm.devCode}</Text> : null}
          <TextField
            label="Code"
            placeholder="6-digit code"
            value={vm.code}
            onChangeText={vm.setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={8}
            onSubmitEditing={vm.verify}
            testID="signin-code"
          />
          <View style={styles.row}>
            <Button label="Change" variant="ghost" onPress={vm.changeIdentifier} />
            <Button label="Verify and sign in" icon={KeyRound} onPress={vm.verify} busy={vm.busy} disabled={!vm.canVerify} />
          </View>
        </>
      )}
      {vm.error ? <Text tone="danger" accessibilityLiveRegion="assertive">{vm.error}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
});
