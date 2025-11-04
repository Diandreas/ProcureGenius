import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, FlatList } from 'react-native';
import {
  Portal,
  Dialog,
  Text,
  Searchbar,
  Chip,
  Button,
  Card,
  Divider,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Shadows } from '../constants/theme';
import { useTranslation } from 'react-i18next';

interface Widget {
  code: string;
  name: string;
  description: string;
  icon: string;
  size: 'small' | 'medium' | 'large';
  module: string;
}

interface WidgetLibraryProps {
  visible: boolean;
  onDismiss: () => void;
  availableWidgets: Record<string, Widget[]>;
  currentWidgets: string[];
  onAddWidget: (widgetCode: string) => void;
}

const WidgetLibrary: React.FC<WidgetLibraryProps> = ({
  visible,
  onDismiss,
  availableWidgets,
  currentWidgets,
  onAddWidget,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');

  const modules = Object.keys(availableWidgets);

  const moduleLabels: Record<string, string> = {
    global: t('widgets.global'),
    products: t('products.products'),
    clients: t('clients.clients'),
    invoices: t('invoices.invoices'),
    purchase_orders: t('purchaseOrders.purchaseOrders'),
    ai: t('widgets.aiAssistant'),
  };

  const filterWidgets = () => {
    let filtered = availableWidgets;

    if (selectedModule !== 'all') {
      filtered = { [selectedModule]: availableWidgets[selectedModule] };
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = Object.keys(filtered).reduce((acc, module) => {
        const matchingWidgets = filtered[module].filter(
          (widget) =>
            widget.name.toLowerCase().includes(query) ||
            widget.description.toLowerCase().includes(query)
        );
        if (matchingWidgets.length > 0) {
          acc[module] = matchingWidgets;
        }
        return acc;
      }, {} as Record<string, Widget[]>);
    }

    return filtered;
  };

  const filteredWidgets = filterWidgets();

  const isWidgetAdded = (widgetCode: string) => currentWidgets.includes(widgetCode);

  const handleAddWidget = (widgetCode: string) => {
    onAddWidget(widgetCode);
  };

  const renderWidget = ({ item }: { item: Widget }) => {
    const added = isWidgetAdded(item.code);

    return (
      <Card style={styles.widgetCard}>
        <Card.Content>
          <View style={styles.widgetHeader}>
            <MaterialCommunityIcons
              name={item.icon as any}
              size={32}
              color={Colors.primary}
            />
            <View style={styles.widgetInfo}>
              <Text variant="titleMedium" style={styles.widgetName}>
                {item.name}
              </Text>
              <Text variant="bodySmall" style={styles.widgetDescription}>
                {item.description}
              </Text>
            </View>
            {added ? (
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color={Colors.success}
              />
            ) : (
              <IconButton
                icon="plus-circle"
                iconColor={Colors.primary}
                size={24}
                onPress={() => handleAddWidget(item.code)}
              />
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderModuleSection = (module: string, widgets: Widget[]) => {
    return (
      <View key={module} style={styles.moduleSection}>
        <Text variant="titleMedium" style={styles.moduleTitle}>
          {moduleLabels[module] || module}
        </Text>
        {widgets.map((widget) => renderWidget({ item: widget }))}
      </View>
    );
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons
              name="widgets"
              size={24}
              color={Colors.primary}
            />
            <Text variant="titleLarge" style={styles.title}>
              {t('widgets.library')}
            </Text>
          </View>
        </Dialog.Title>

        <Divider />

        <Dialog.ScrollArea style={styles.scrollArea}>
          <View style={styles.content}>
            {/* Search */}
            <Searchbar
              placeholder={t('widgets.searchPlaceholder')}
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />

            {/* Module Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtersContainer}
            >
              <Chip
                selected={selectedModule === 'all'}
                onPress={() => setSelectedModule('all')}
                style={styles.filterChip}
              >
                {t('common.all')}
              </Chip>
              {modules.map((module) => (
                <Chip
                  key={module}
                  selected={selectedModule === module}
                  onPress={() => setSelectedModule(module)}
                  style={styles.filterChip}
                >
                  {moduleLabels[module] || module}
                </Chip>
              ))}
            </ScrollView>

            {/* Widgets List */}
            <ScrollView style={styles.widgetsList}>
              {Object.keys(filteredWidgets).length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="widgets"
                    size={64}
                    color={Colors.disabled}
                  />
                  <Text variant="bodyMedium" style={styles.emptyText}>
                    {t('widgets.noWidgetsFound')}
                  </Text>
                </View>
              ) : (
                Object.keys(filteredWidgets).map((module) =>
                  renderModuleSection(module, filteredWidgets[module])
                )
              )}
            </ScrollView>
          </View>
        </Dialog.ScrollArea>

        <Divider />

        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('common.close')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '90%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
  },
  scrollArea: {
    maxHeight: 600,
  },
  content: {
    padding: Spacing.lg,
  },
  searchBar: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  filtersContainer: {
    marginBottom: Spacing.md,
  },
  filterChip: {
    marginRight: Spacing.xs,
  },
  widgetsList: {
    maxHeight: 450,
  },
  moduleSection: {
    marginBottom: Spacing.lg,
  },
  moduleTitle: {
    fontWeight: '700',
    marginBottom: Spacing.md,
    color: Colors.text,
  },
  widgetCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  widgetInfo: {
    flex: 1,
  },
  widgetName: {
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  widgetDescription: {
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
  },
});

export default WidgetLibrary;
