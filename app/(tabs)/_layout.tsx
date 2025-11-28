// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import { HouseSimpleIcon, MapTrifoldIcon, SirenIcon, UserIcon } from "phosphor-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#DC2626",
        tabBarStyle: { height: 60, paddingBottom: 8 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <HouseSimpleIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ocorrencias"
        options={{
          title: "Ocorrências",
          tabBarIcon: ({ color }) => <SirenIcon size={24} color={color} weight="fill" />,
        }}
      />

      <Tabs.Screen
        name="cadastrar"
        options={{
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => <FabButton {...props} />,
        }}
      />

      <Tabs.Screen
        name="mapa"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color }) => <MapTrifoldIcon size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <UserIcon size={24} color={color} weight="fill" />,
        }}
      />
    </Tabs>
  );
}

function FabButton(props: any) {
  const router = useRouter();

  return (
    <TouchableOpacity
      {...props}
      activeOpacity={0.85}
      onPress={() => router.push("/cadastrar")}
      style={[styles.fabContainer, props.style]}
    >
      <View style={styles.fab}>
        <Text style={styles.plus}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    top: -30,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  plus: {
    color: "#fff",
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "700",
  },
});