import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, saveSession, type Session } from "../api";
import { theme } from "../theme";

export default function SignInScreen({ onSignedIn }: { onSignedIn: (s: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.login(email.trim(), password);
      const session: Session = {
        accessToken: res.token,
        refreshToken: res.refreshToken,
        workspaceId: null,
        userId: res.user.id,
      };
      await saveSession(session);
      onSignedIn(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.inner}>
        <Text variant="displaySmall" style={styles.title}>
          Slow Spider
        </Text>
        <Text variant="bodyMedium" style={styles.sub}>
          Everything in one place.
        </Text>

        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          left={<TextInput.Icon icon="email-outline" />}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="current-password"
          left={<TextInput.Icon icon="lock-outline" />}
          right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword((v) => !v)} />}
          onSubmitEditing={submit}
          style={styles.input}
        />

        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button mode="contained" onPress={submit} loading={busy} disabled={busy} style={styles.button} contentStyle={styles.buttonContent}>
          Sign in
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.bg, justifyContent: "center" },
  inner: { padding: 24, gap: 12 },
  title: { fontWeight: "700" },
  sub: { color: theme.muted, marginBottom: 12 },
  input: { backgroundColor: theme.panel },
  button: { marginTop: 8, borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
});
