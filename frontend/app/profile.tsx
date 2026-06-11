import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppDialog, useDialog } from '../components/AppDialog';
import { BASE_URL } from '../constants/api';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import {
  apiChangePassword,
  apiDeletePerson,
  apiGetPerson,
  apiUpdatePerson,
  apiUploadPhoto,
} from '../services/authService';

export default function ProfileScreen() {
  const router                        = useRouter();
  const { user, updateUser, logout }  = useAuth();

  useFocusEffect(useCallback(() => {
    if (user?.id) {
      apiGetPerson(user.id).then(updateUser).catch(() => {});
    }
  }, []));

  const { dialogCfg, showAlert, showConfirm } = useDialog();
  const [uploading,    setUploading]    = useState(false);
  const [showEdit,     setShowEdit]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  if (!user) return null;

  const xpToNext = 200 + ((user.level ?? 1) - 1) * 100;
  const xpPct    = Math.min(((user.experience ?? 0) / xpToNext) * 100, 100);

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const updated = await apiUploadPhoto(user.id, result.assets[0].uri);
      await updateUser(updated);
    } catch (e: unknown) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    showConfirm(
      'Cerrar sesión',
      '¿Seguro que quieres cerrar la sesión?',
      async () => { await logout(); router.replace('/'); },
      { confirmLabel: 'Cerrar sesión', destructive: true },
    );
  };

  const handleDelete = () => {
    showConfirm(
      '⚠️ Eliminar cuenta',
      'Esta acción es irreversible. Se borrarán todos tus datos, cartas y progreso. ¿Continuar?',
      async () => {
        setDeleting(true);
        try {
          await apiDeletePerson(user.id);
          await logout();
          router.replace('/');
        } catch (e: unknown) {
          showAlert('Error', e instanceof Error ? e.message : 'Error al eliminar la cuenta');
          setDeleting(false);
        }
      },
      { confirmLabel: 'Eliminar para siempre', destructive: true },
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={Colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {user.profilePhoto ? (
              <Image
                source={{ uri: `${BASE_URL}${user.profilePhoto}` }}
                style={styles.avatar}
                onError={() => {}}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={46} color={Colors.primary} />
              </View>
            )}
            <Pressable style={styles.editPhotoBtn} onPress={pickAndUpload} disabled={uploading}>
              {uploading
                ? <ActivityIndicator size={14} color={Colors.white} />
                : <Ionicons name="camera" size={16} color={Colors.white} />}
            </Pressable>
          </View>
          <Text style={styles.nickname}>@{user.nickname}</Text>
          <Text style={styles.fullName}>
            {user.name}{user.surname ? ` ${user.surname}` : ''}
          </Text>
          <View style={styles.playerIdBadge}>
            <Text style={styles.playerIdText}>ID: {user.playerId}</Text>
          </View>
        </View>

<View style={styles.card}>
          <View style={styles.levelRow}>
            <Text style={styles.cardLabel}>Nivel</Text>
            <Text style={styles.levelNum}>{user.level}</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${xpPct}%` }]} />
          </View>
          <Text style={styles.xpText}>{user.experience ?? 0} / {xpToNext} XP</Text>
        </View>

<View style={styles.statsGrid}>
          <StatBox icon="trophy-outline"    label="XP total" value={(user.totalExperience ?? 0).toString()} />
          <StatBox icon="hourglass-outline" label="Sobres"   value={(user.packPoints ?? 0).toString()} />
        </View>
        <View style={styles.statsGrid}>
          <StatBox icon="albums-outline"  label="Cartas"  value={`${user.cardCount ?? 0}/${user.totalCardCount ?? 0}`} />
          <StatBox icon="people-outline"  label="Amigos"  value={(user.friendCount ?? 0).toString()} />
        </View>

<View style={styles.card}>
          <InfoRow icon="mail-outline"   label="Correo"  value={user.email} />
          <View style={styles.divider} />
          <InfoRow icon="person-outline" label="Usuario" value={user.nickname} />
        </View>

<Pressable style={styles.editBtn} onPress={() => setShowEdit(true)}>
          <Ionicons name="create-outline" size={18} color={Colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.editBtnText}>Editar datos</Text>
        </Pressable>

<View style={styles.dangerZone}>
          
          <View style={styles.dangerHeader}>
            <Ionicons name="warning-outline" size={16} color={DANGER} />
            <Text style={styles.dangerTitle}>ZONA PELIGROSA</Text>
          </View>

<Pressable style={styles.dangerRow} onPress={() => setShowPassword(true)}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textDark} />
            <Text style={styles.dangerRowText}>Cambiar contraseña</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </Pressable>

          <View style={styles.dangerDivider} />

<Pressable style={styles.dangerRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.textDark} />
            <Text style={styles.dangerRowText}>Cerrar sesión</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </Pressable>

<View style={styles.dangerSeparator} />

<Pressable style={styles.deleteRow} onPress={handleDelete} disabled={deleting}>
            {deleting
              ? <ActivityIndicator size={20} color={DANGER} />
              : <Ionicons name="trash-outline" size={20} color={DANGER} />}
            <Text style={styles.deleteRowText}>Eliminar cuenta</Text>
            <Ionicons name="chevron-forward" size={18} color={DANGER} />
          </Pressable>
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>

<EditModal
        visible={showEdit}
        user={user}
        onClose={() => setShowEdit(false)}
        onSaved={updateUser}
      />
      <PasswordModal
        visible={showPassword}
        userId={user.id}
        onClose={() => setShowPassword(false)}
      />

      <AppDialog {...dialogCfg} />
    </SafeAreaView>
  );
}

interface EditModalProps {
  visible: boolean;
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  onClose: () => void;
  onSaved: (updated: any) => Promise<void>;
}

function EditModal({ visible, user, onClose, onSaved }: EditModalProps) {
  const { dialogCfg, showAlert } = useDialog();
  const [name,     setName]     = useState(user.name);
  const [surname,  setSurname]  = useState(user.surname ?? '');
  const [nickname, setNickname] = useState(user.nickname);
  const [email,    setEmail]    = useState(user.email);
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    if (!name.trim())     { showAlert('Error', 'El nombre no puede estar vacío.');  return; }
    if (!nickname.trim()) { showAlert('Error', 'El usuario no puede estar vacío.'); return; }
    if (!email.trim())    { showAlert('Error', 'El correo no puede estar vacío.');  return; }
    setSaving(true);
    try {
      const updated = await apiUpdatePerson(user.id, {
        name:     name.trim(),
        surname:  surname.trim() || undefined,
        nickname: nickname.trim(),
        email:    email.trim(),
      });
      await onSaved(updated);
      onClose();
    } catch (e: unknown) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Editar perfil</Text>
          <Field label="Nombre *"   value={name}     onChange={setName} />
          <Field label="Apellidos"  value={surname}  onChange={setSurname} />
          <Field label="Usuario *"  value={nickname} onChange={setNickname} autoCapitalize="none" />
          <Field label="Correo *"   value={email}    onChange={setEmail}    autoCapitalize="none" keyboardType="email-address" />
          <View style={styles.modalButtons}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onClose} disabled={saving}>
              <Text style={styles.btnTextSecondary}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.white} size={18} />
                      : <Text style={styles.btnText}>Guardar</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      <AppDialog {...dialogCfg} />
    </Modal>
  );
}

function PasswordModal({ visible, userId, onClose }: { visible: boolean; userId: number; onClose: () => void }) {
  const { dialogCfg, showAlert } = useDialog();
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [saving,   setSaving]   = useState(false);

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); };

  const handleSave = async () => {
    if (!current)         { showAlert('Error', 'Introduce tu contraseña actual.');                       return; }
    if (next.length < 6)  { showAlert('Error', 'La nueva contraseña debe tener al menos 6 caracteres.'); return; }
    if (next !== confirm)  { showAlert('Error', 'Las contraseñas nuevas no coinciden.');                  return; }
    setSaving(true);
    try {
      await apiChangePassword(userId, current, next);
      showAlert('¡Listo!', 'Contraseña cambiada correctamente.');
      reset();
      onClose();
    } catch (e: unknown) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Cambiar contraseña</Text>
          <Field label="Contraseña actual"    value={current} onChange={setCurrent} secure />
          <Field label="Nueva contraseña"     value={next}    onChange={setNext}    secure />
          <Field label="Confirmar contraseña" value={confirm} onChange={setConfirm} secure />
          <View style={styles.modalButtons}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => { reset(); onClose(); }} disabled={saving}>
              <Text style={styles.btnTextSecondary}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.white} size={18} />
                      : <Text style={styles.btnText}>Guardar</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      <AppDialog {...dialogCfg} />
    </Modal>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric';
  secure?: boolean;
}
function Field({ label, value, onChange, autoCapitalize = 'sentences', keyboardType = 'default', secure = false }: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        placeholderTextColor={Colors.textLight}
      />
    </View>
  );
}

function StatBox({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={24} color={Colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={Colors.primary} style={{ marginRight: 10 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const DANGER = '#C0392B';

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.background },
  header:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  backBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  scroll:      { padding: 20, gap: 16 },

  avatarSection: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  avatarWrapper: { position: 'relative', width: 100, height: 100, marginBottom: 4 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: Colors.primary, backgroundColor: Colors.primaryLight,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPhotoBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  nickname:      { fontSize: 20, fontWeight: '800', color: Colors.textDark },
  fullName:      { fontSize: 15, color: Colors.textMid },
  playerIdBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4, marginTop: 4,
  },
  playerIdText: { fontSize: 13, color: Colors.primary, fontWeight: '600', letterSpacing: 1 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  levelRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMid },
  levelNum:  { fontSize: 22, fontWeight: '900', color: Colors.primary },
  xpBarBg:   { height: 10, backgroundColor: Colors.primaryLight, borderRadius: 8, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 8 },
  xpText:    { fontSize: 12, color: Colors.textLight, textAlign: 'right' },

  statsGrid: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontSize: 22, fontWeight: '900', color: Colors.textDark },
  statLabel: { fontSize: 12, color: Colors.textLight },

  infoRow:   { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMid, width: 70 },
  infoValue: { flex: 1, fontSize: 14, color: Colors.textDark, textAlign: 'right' },
  divider:   { height: 1, backgroundColor: Colors.primaryLight },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 14,
  },
  editBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  dangerZone: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    overflow: 'hidden',
    marginTop: 8,
  },
  dangerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFEBEE',
    borderBottomWidth: 1, borderBottomColor: '#FFCDD2',
  },
  dangerTitle: {
    fontSize: 11, fontWeight: '800', color: DANGER,
    letterSpacing: 1.2,
  },
  dangerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 15,
    backgroundColor: Colors.background,
  },
  dangerRowText: { flex: 1, fontSize: 15, color: Colors.textDark },
  dangerDivider: { height: 1, backgroundColor: '#FFCDD2', marginHorizontal: 16 },
  dangerSeparator: { height: 2, backgroundColor: '#FFCDD2' },
  deleteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: '#FFF5F5',
  },
  deleteRowText: { flex: 1, fontSize: 15, fontWeight: '700', color: DANGER },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: Colors.background, borderRadius: 20,
    padding: 24, gap: 14,
  },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: Colors.textDark, marginBottom: 2 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn:              { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  btnPrimary:       { backgroundColor: Colors.primary },
  btnSecondary:     { borderWidth: 1.5, borderColor: Colors.border },
  btnText:          { fontSize: 15, fontWeight: '700', color: Colors.white },
  btnTextSecondary: { fontSize: 15, fontWeight: '600', color: Colors.textDark },

  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMid },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: Colors.textDark, backgroundColor: Colors.surface,
  },
});
