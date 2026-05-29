import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ColorValue, View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  color,
  size,
  focused,
  hasDot,
}: {
  name: IoniconsName;
  color: ColorValue;
  size: number;
  focused: boolean;
  hasDot?: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} color={focused ? Colors.primary : color as string} size={size} />
      {hasDot && <View style={styles.navDot} />}
    </View>
  );
}

export default function TabsLayout() {
  const { showFriendRequestBadge, pendingTrades } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          height: 64,
          paddingBottom: 8,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size, focused }) =>
            <TabIcon name="home-outline" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          tabBarIcon: ({ color, size, focused }) =>
            <TabIcon name="albums-outline" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          tabBarIcon: ({ color, size, focused }) =>
            <TabIcon name="people-outline" color={color} size={size} focused={focused} hasDot={showFriendRequestBadge} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarIcon: ({ color, size, focused }) =>
            <TabIcon name="swap-horizontal-outline" color={color} size={size} focused={focused} hasDot={pendingTrades > 0} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.primaryLight,
  },
  navDot: {
    position: 'absolute',
    top: 8, right: 8,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },
});
