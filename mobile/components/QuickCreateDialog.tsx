import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Portal,
  Dialog,
  Text,
  TextInput,
  Button,
  Divider,
  HelperText,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { Colors, Spacing } from '../constants/theme';
import { useTranslation } from 'react-i18next';

interface Field {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'phone' | 'number' | 'select';
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  options?: Array<{ value: string; label: string }>;
}

interface QuickCreateDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: (result: any) => void;
  entityType: 'client' | 'supplier' | 'product';
  fields: Field[];
  createFunction: (data: any) => Promise<any>;
  title: string;
  contextData?: Record<string, any>;
}

const QuickCreateDialog: React.FC<QuickCreateDialogProps> = ({
  visible,
  onDismiss,
  onSuccess,
  entityType,
  fields,
  createFunction,
  title,
  contextData = {},
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similarEntities, setSimilarEntities] = useState<any[]>([]);

  const handleChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    setError(null);
    setSimilarEntities([]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSimilarEntities([]);

    try {
      const dataToSend = { ...formData, ...contextData };
      const result = await createFunction(dataToSend);

      if (result.error === 'similar_entities_found') {
        setSimilarEntities(result.similar_entities);
        setError(result.message);
        setLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess(result);
      }
      handleClose();
    } catch (err: any) {
      setError(err.message || t('errors.creationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    setError(null);
    setSimilarEntities([]);
    setLoading(false);
    onDismiss();
  };

  const handleForceCreate = async () => {
    setLoading(true);
    try {
      const dataToSend = { ...formData, ...contextData, force_create: true };
      const result = await createFunction(dataToSend);

      if (onSuccess) {
        onSuccess(result);
      }
      handleClose();
    } catch (err: any) {
      setError(err.message || t('errors.creationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: Field) => {
    const value = formData[field.name] || '';

    if (field.type === 'select') {
      // For select fields in mobile, we'd typically use a picker
      // For now, using TextInput with buttons for options
      return (
        <View key={field.name} style={styles.fieldContainer}>
          <Text variant="labelMedium" style={styles.fieldLabel}>
            {field.label} {field.required && '*'}
          </Text>
          <View style={styles.selectOptions}>
            {field.options?.map((option) => (
              <Chip
                key={option.value}
                selected={value === option.value}
                onPress={() => handleChange(field.name, option.value)}
                style={styles.optionChip}
              >
                {option.label}
              </Chip>
            ))}
          </View>
        </View>
      );
    }

    return (
      <TextInput
        key={field.name}
        label={field.label}
        value={String(value)}
        onChangeText={(text) => handleChange(field.name, text)}
        mode="outlined"
        keyboardType={
          field.type === 'email'
            ? 'email-address'
            : field.type === 'phone'
            ? 'phone-pad'
            : field.type === 'number'
            ? 'numeric'
            : 'default'
        }
        multiline={field.multiline}
        numberOfLines={field.rows || 1}
        disabled={field.disabled || loading}
        error={!!error && field.required && !value}
        style={styles.input}
      />
    );
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleClose} style={styles.dialog}>
        <Dialog.Title>{title}</Dialog.Title>
        <Divider />
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.content}>
            {error && (
              <View
                style={[
                  styles.alert,
                  similarEntities.length > 0
                    ? styles.alertWarning
                    : styles.alertError,
                ]}
              >
                <Text variant="bodyMedium" style={styles.alertText}>
                  {error}
                </Text>
              </View>
            )}

            {similarEntities.length > 0 && (
              <View style={styles.similarSection}>
                <Text variant="bodyMedium" style={styles.similarTitle}>
                  {t('common.similarEntitiesFound')}
                </Text>
                {similarEntities.map((entity, index) => (
                  <View key={index} style={styles.similarItem}>
                    <Text variant="bodySmall" style={styles.similarText}>
                      <Text style={styles.similarName}>
                        {entity.name || entity.company || entity.product_name}
                      </Text>
                      {entity.email && ` - ${entity.email}`}
                      {entity.phone && ` - ${entity.phone}`}
                      {entity.similarity &&
                        ` (${Math.round(entity.similarity * 100)}% ${t(
                          'common.similar'
                        )})`}
                    </Text>
                  </View>
                ))}
                <Text variant="caption" style={styles.similarCaption}>
                  {t('common.createAnyway')}
                </Text>
              </View>
            )}

            {fields.map((field) => renderField(field))}
          </ScrollView>
        </Dialog.ScrollArea>
        <Divider />
        <Dialog.Actions>
          <Button onPress={handleClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          {similarEntities.length > 0 ? (
            <Button
              onPress={handleForceCreate}
              mode="contained"
              buttonColor={Colors.warning}
              disabled={loading}
              loading={loading}
            >
              {t('common.createAnyway')}
            </Button>
          ) : (
            <Button
              onPress={handleSubmit}
              mode="contained"
              disabled={loading}
              loading={loading}
            >
              {loading ? t('common.creating') : t('common.create')}
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '90%',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  input: {
    marginBottom: Spacing.md,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    marginBottom: Spacing.xs,
    color: Colors.textSecondary,
  },
  selectOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  optionChip: {
    marginBottom: Spacing.xs,
  },
  alert: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  alertError: {
    backgroundColor: '#fee2e2',
  },
  alertWarning: {
    backgroundColor: '#fef3c7',
  },
  alertText: {
    color: Colors.text,
  },
  similarSection: {
    marginBottom: Spacing.md,
  },
  similarTitle: {
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  similarItem: {
    backgroundColor: Colors.info + '20',
    padding: Spacing.sm,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  similarText: {
    color: Colors.text,
  },
  similarName: {
    fontWeight: '600',
  },
  similarCaption: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});

export default QuickCreateDialog;
