import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Surface,
  Divider,
  HelperText,
} from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login, clearError } from '../../store/slices/authSlice';
import { Colors, Spacing, Shadows } from '../../constants/theme';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

// Configure Google OAuth
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Google OAuth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: 'YOUR_EXPO_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    webClientId: 'YOUR_WEB_CLIENT_ID',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      // Handle successful Google OAuth
      console.log('Google auth success:', authentication);
      // TODO: Send token to backend
    }
  }, [response]);

  const handleChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async () => {
    const result = await dispatch(
      login({
        email: formData.email,
        password: formData.password,
      })
    );
    if (login.fulfilled.match(result)) {
      router.replace('/(tabs)');
    }
  };

  const handleGoogleLogin = () => {
    promptAsync();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.surface} elevation={3}>
          {/* Header */}
          <Text variant="headlineLarge" style={styles.title}>
            Bienvenue !
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Connectez-vous à votre compte ProcureGenius
          </Text>

          {/* Error Alert */}
          {error && (
            <Surface style={styles.errorSurface}>
              <Text style={styles.errorText}>{error}</Text>
            </Surface>
          )}

          {/* Google Sign In Button */}
          <Button
            mode="outlined"
            onPress={handleGoogleLogin}
            disabled={!request}
            icon="google"
            style={styles.googleButton}
            labelStyle={styles.googleButtonLabel}
          >
            Se connecter avec Google
          </Button>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <Divider style={styles.divider} />
            <Text variant="bodySmall" style={styles.dividerText}>
              OU
            </Text>
            <Divider style={styles.divider} />
          </View>

          {/* Email Field */}
          <TextInput
            label="Adresse email"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            left={<TextInput.Icon icon="email" />}
            style={styles.input}
          />

          {/* Password Field */}
          <TextInput
            label="Mot de passe"
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
          />

          {/* Forgot Password Link */}
          <View style={styles.forgotPasswordContainer}>
            <Link href="/forgot-password" asChild>
              <Text variant="bodySmall" style={styles.link}>
                Mot de passe oublié ?
              </Text>
            </Link>
          </View>

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !formData.email || !formData.password}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text variant="bodySmall" style={styles.signupText}>
              Pas encore de compte ?{' '}
            </Text>
            <Link href="/(auth)/register" asChild>
              <Text variant="bodySmall" style={styles.signupLink}>
                Créer un compte
              </Text>
            </Link>
          </View>

          {/* Pricing Link */}
          <View style={styles.pricingContainer}>
            <Link href="/pricing" asChild>
              <Text variant="bodySmall" style={styles.link}>
                Voir les plans tarifaires
              </Text>
            </Link>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.md,
  },
  surface: {
    padding: Spacing.xl,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    ...Shadows.lg,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: Spacing.xs,
    color: Colors.text,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  errorSurface: {
    backgroundColor: '#fee2e2',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  googleButton: {
    marginBottom: Spacing.md,
    borderColor: '#4285F4',
  },
  googleButtonLabel: {
    color: '#4285F4',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  divider: {
    flex: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    color: Colors.textSecondary,
  },
  input: {
    marginBottom: Spacing.md,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  link: {
    color: Colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  submitButtonContent: {
    paddingVertical: Spacing.sm,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  signupText: {
    color: Colors.textSecondary,
  },
  signupLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  pricingContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
});
