import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const splashImage = require('../assets/images/Portada_1.jpg');

export default function SplashScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  return (
    <Pressable
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      onPress={() => router.replace('/auth')}
    >
      <View style={styles.header}>
        <Text style={styles.title}>INAZUMA ELEVEN CARDS</Text>
      </View>

      <View style={styles.imageWrap}>
        <Image source={splashImage} style={styles.image} resizeMode="contain" />
      </View>

      <View style={styles.footer}>
        <Text style={styles.hint}>Toca para empezar</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 72,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1565C0',
    letterSpacing: 1,
    textAlign: 'center',
  },
  imageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    height: 72,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 1,
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 14,
    color: '#999',
    letterSpacing: 0.5,
  },
});
