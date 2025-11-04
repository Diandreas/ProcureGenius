import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, TextInput, Button, Avatar } from 'react-native-paper';
import { useAppSelector } from '../../../store/hooks';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

export default function ProfileScreen() {
  const { user } = useAppSelector(state => state.auth);
  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    organization: user?.organization || '',
  });

  const handleSave = () => {
    Alert.alert('Succès', 'Profil mis à jour');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.avatarContainer}>
        <Avatar.Text size={80} label={`${formData.firstName[0]}${formData.lastName[0]}`} style={styles.avatar} />
        <Button mode="text" onPress={() => {}} style={styles.changePhoto}>Changer la photo</Button>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <TextInput label="Prénom" value={formData.firstName} onChangeText={v => setFormData({ ...formData, firstName: v })} mode="outlined" style={styles.input} />
          <TextInput label="Nom" value={formData.lastName} onChangeText={v => setFormData({ ...formData, lastName: v })} mode="outlined" style={styles.input} />
          <TextInput label="Email" value={formData.email} onChangeText={v => setFormData({ ...formData, email: v })} mode="outlined" keyboardType="email-address" style={styles.input} />
          <TextInput label="Téléphone" value={formData.phone} onChangeText={v => setFormData({ ...formData, phone: v })} mode="outlined" keyboardType="phone-pad" style={styles.input} />
          <TextInput label="Organisation" value={formData.organization} onChangeText={v => setFormData({ ...formData, organization: v })} mode="outlined" style={styles.input} />
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button mode="contained" onPress={handleSave} icon="content-save">Sauvegarder</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  avatarContainer: { alignItems: 'center', padding: Spacing.xl },
  avatar: { backgroundColor: Colors.primary },
  changePhoto: { marginTop: Spacing.sm },
  card: { margin: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  input: { marginTop: Spacing.sm },
  actions: { padding: Spacing.md },
});
