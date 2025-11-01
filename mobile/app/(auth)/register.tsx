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
  Checkbox,
} from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { Colors, Spacing, Shadows } from '../../constants/theme';
import { authAPI } from '../../services/api';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    acceptTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      console.log('Google auth success:', authentication);
      // TODO: Send token to backend
    }
  }, [response]);

  const handleChange = (name: string, value: string | boolean) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateForm = (): boolean => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Veuillez entrer une adresse email valide');
      return false;
    }

    // Password strength validation
    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }

    // Password match validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }

    // Terms acceptance
    if (!formData.acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authAPI.register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        organization_name: formData.organizationName,
      });

      setSuccess(true);

      // Redirect after delay
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);

      if (err.response?.data) {
        const errors = err.response.data;
        if (errors.email) {
          setError(errors.email[0]);
        } else if (errors.password1) {
          setError(errors.password1[0]);
        } else if (errors.non_field_errors) {
          setError(errors.non_field_errors[0]);
        } else {
          setError("Une erreur est survenue lors de l'inscription");
        }
      } else {
        setError('Impossible de se connecter au serveur. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    promptAsync();
  };

  // Success screen
  if (success) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Surface style={styles.surface} elevation={3}>
            <Text variant="headlineLarge" style={styles.successTitle}>
              Inscription réussie !
            </Text>
            <Text variant="bodyMedium" style={styles.successText}>
              Un email de confirmation a été envoyé à {formData.email}
            </Text>
            <Text variant="bodySmall" style={styles.successSubtext}>
              Veuillez vérifier votre boîte de réception et cliquer sur le lien de
              confirmation.
            </Text>
            <Button
              mode="contained"
              onPress={() => router.replace('/(auth)/login')}
              style={styles.successButton}
            >
              Aller à la page de connexion
            </Button>
          </Surface>
        </ScrollView>
      </View>
    );
  }

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
            Créer un compte
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Rejoignez ProcureGenius aujourd'hui
          </Text>

          {/* Error Alert */}
          {error && (
            <Surface style={styles.errorSurface}>
              <Text style={styles.errorText}>{error}</Text>
            </Surface>
          )}

          {/* Google Sign Up Button */}
          <Button
            mode="outlined"
            onPress={handleGoogleSignup}
            disabled={!request}
            icon="google"
            style={styles.googleButton}
            labelStyle={styles.googleButtonLabel}
          >
            S'inscrire avec Google
          </Button>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <Divider style={styles.divider} />
            <Text variant="bodySmall" style={styles.dividerText}>
              OU
            </Text>
            <Divider style={styles.divider} />
          </View>

          {/* First Name and Last Name */}
          <View style={styles.row}>
            <TextInput
              label="Prénom"
              value={formData.firstName}
              onChangeText={(value) => handleChange('firstName', value)}
              mode="outlined"
              autoCapitalize="words"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              label="Nom"
              value={formData.lastName}
              onChangeText={(value) => handleChange('lastName', value)}
              mode="outlined"
              autoCapitalize="words"
              style={[styles.input, styles.halfInput]}
            />
          </View>

          {/* Organization Name */}
          <TextInput
            label="Nom de l'organisation"
            value={formData.organizationName}
            onChangeText={(value) => handleChange('organizationName', value)}
            mode="outlined"
            left={<TextInput.Icon icon="office-building" />}
            style={styles.input}
          />

          {/* Email */}
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

          {/* Password */}
          <TextInput
            label="Mot de passe"
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
          />

          {/* Confirm Password */}
          <TextInput
            label="Confirmer le mot de passe"
            value={formData.confirmPassword}
            onChangeText={(value) => handleChange('confirmPassword', value)}
            mode="outlined"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            left={<TextInput.Icon icon="lock-check" />}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
            style={styles.input}
          />

          {/* Terms and Conditions */}
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={formData.acceptTerms ? 'checked' : 'unchecked'}
              onPress={() => handleChange('acceptTerms', !formData.acceptTerms)}
            />
            <Text variant="bodySmall" style={styles.checkboxLabel}>
              J'accepte les{' '}
              <Text style={styles.link}>conditions d'utilisation</Text> et la{' '}
              <Text style={styles.link}>politique de confidentialité</Text>
            </Text>
          </View>

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            {loading ? 'Inscription...' : "S'inscrire"}
          </Button>

          {/* Sign In Link */}
          <View style={styles.signinContainer}>
            <Text variant="bodySmall" style={styles.signinText}>
              Vous avez déjà un compte ?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Text variant="bodySmall" style={styles.signinLink}>
                Se connecter
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
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  input: {
    marginBottom: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  checkboxLabel: {
    flex: 1,
    color: Colors.textSecondary,
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
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  signinText: {
    color: Colors.textSecondary,
  },
  signinLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  successTitle: {
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: Spacing.md,
    color: Colors.success,
  },
  successText: {
    textAlign: 'center',
    marginBottom: Spacing.md,
    color: Colors.text,
  },
  successSubtext: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  successButton: {
    marginTop: Spacing.lg,
  },
});
