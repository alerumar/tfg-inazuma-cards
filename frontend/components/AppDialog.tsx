/**
 * AppDialog — modal de diálogo cross-platform.
 * Funciona igual en iOS, Android y Web (no usa Alert.alert).
 *
 * Uso:
 *   const { dialogCfg, showAlert, showConfirm } = useDialog();
 *
 *   showAlert('Error', 'Algo ha fallado');
 *   showConfirm('Eliminar', '¿Seguro?', () => doDelete(), { destructive: true });
 *
 *   // En el JSX del componente:
 *   <AppDialog {...dialogCfg} />
 */

import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DialogConfig {
  visible:      boolean;
  title:        string;
  message?:     string;
  confirmLabel: string;
  cancelLabel?: string;   // undefined → sólo un botón (info / error)
  destructive:  boolean;
  onConfirm:    () => void;
  onCancel?:    () => void;
}

const HIDDEN: DialogConfig = {
  visible: false, title: '', confirmLabel: 'Aceptar',
  destructive: false, onConfirm: () => {},
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDialog() {
  const [cfg, setCfg] = useState<DialogConfig>(HIDDEN);

  /** Diálogo informativo con un solo botón "Aceptar" */
  const showAlert = useCallback((title: string, message?: string) => {
    setCfg({
      visible: true, title, message,
      confirmLabel: 'Aceptar', destructive: false,
      onConfirm: () => setCfg(c => ({ ...c, visible: false })),
    });
  }, []);

  /** Diálogo de confirmación con botones Cancelar + Confirmar */
  const showConfirm = useCallback((
    title:     string,
    message:   string,
    onConfirm: () => void,
    opts?: {
      confirmLabel?: string;
      cancelLabel?:  string;
      destructive?:  boolean;
    },
  ) => {
    setCfg({
      visible:      true,
      title,
      message,
      confirmLabel: opts?.confirmLabel ?? 'Confirmar',
      cancelLabel:  opts?.cancelLabel  ?? 'Cancelar',
      destructive:  opts?.destructive  ?? false,
      onConfirm: () => { setCfg(c => ({ ...c, visible: false })); onConfirm(); },
      onCancel:  () => setCfg(c => ({ ...c, visible: false })),
    });
  }, []);

  return { dialogCfg: cfg, showAlert, showConfirm };
}

// ── Componente ────────────────────────────────────────────────────────────────

export function AppDialog({
  visible, title, message,
  confirmLabel, cancelLabel, destructive,
  onConfirm, onCancel,
}: DialogConfig) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel ?? onConfirm}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <View style={s.box}>
          <Text style={s.title}>{title}</Text>
          {message ? <Text style={s.message}>{message}</Text> : null}

          <View style={[s.btnRow, !cancelLabel && s.singleBtn]}>
            {cancelLabel ? (
              <Pressable style={s.cancelBtn} onPress={onCancel}>
                <Text style={s.cancelBtnText}>{cancelLabel}</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[s.confirmBtn, destructive && s.destructiveBtn]}
              onPress={onConfirm}
            >
              <Text style={s.confirmBtnText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  box: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },
  title: {
    fontSize: 17, fontWeight: '700', color: Colors.textDark,
    textAlign: 'center', marginBottom: 8,
  },
  message: {
    fontSize: 14, color: Colors.textMid, textAlign: 'center',
    lineHeight: 20, marginBottom: 20,
  },
  btnRow:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  singleBtn: { justifyContent: 'center' },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textMid },
  confirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  destructiveBtn: { backgroundColor: Colors.error },
});
