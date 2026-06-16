import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const router              = useRouter();
  const { login, register } = useAuth();

  const [mode, setMode]         = useState<Mode>('login');
  const [name, setName]         = useState('');
  const [surname, setSurname]   = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setName(''); setSurname(''); setNickname('');
    setEmail(''); setPassword(''); setConfirm('');
  };

  const handleSubmit = async () => {
    setError('');

    if (mode === 'login') {
      if (!nickname.trim()) return setError('El nombre de usuario es obligatorio');
      if (!password.trim()) return setError('La contraseña es obligatoria');
    } else {
      if (!name.trim())                              return setError('El nombre es obligatorio');
      if (!nickname.trim())                          return setError('El nombre de usuario es obligatorio');
      if (!email.trim())                             return setError('El correo es obligatorio');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('El correo no tiene un formato válido');
      if (password.length < 8)                       return setError('La contraseña debe tener al menos 8 caracteres');
      if (password !== confirm)                      return setError('Las contraseñas no coinciden');
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login({ nickname, password });
      } else {
        await register({
          name,
          surname: surname.trim() || undefined,
          nickname,
          email,
          password,
        });
      }
      router.replace('/(tabs)/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        
        <Text style={styles.title}>INAZUMA ELEVEN</Text>
        <Text style={styles.subtitle}>CARDS</Text>

<Text style={styles.formTitle}>
          {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
        </Text>

<View style={styles.form}>
          {!isLogin && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nombre *"
                placeholderTextColor={Colors.textLight}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Apellido (opcional)"
                placeholderTextColor={Colors.textLight}
                value={surname}
                onChangeText={setSurname}
                autoCapitalize="words"
              />
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario *"
            placeholderTextColor={Colors.textLight}
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico *"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Contraseña *"
            placeholderTextColor={Colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña *"
              placeholderTextColor={Colors.textLight}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />
          )}

{error !== '' && <Text style={styles.error}>{error}</Text>}

<Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.btnText}>
                  {isLogin ? 'Entrar' : 'Registrarse'}
                </Text>
            }
          </Pressable>

<View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            </Text>
            <Pressable onPress={() => switchMode(isLogin ? 'register' : 'login')}>
              <Text style={styles.switchLink}>
                {isLogin ? 'Regístrate aquí' : 'Inicia sesión aquí'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textDark,
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 36,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 20,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.textDark,
  },
  error: {
    color: Colors.error,
    fontSize: 13,
    textAlign: 'center',
    marginTop: -4,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  switchText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  switchLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
});
