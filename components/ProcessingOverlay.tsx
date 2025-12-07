import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { subscribeProcessing } from '../services/offline';

export default function ProcessingOverlay() {
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsub = subscribeProcessing((v: boolean) => setProcessing(v));
    return () => unsub();
  }, []);

  if (!processing) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.box}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.text}>Sincronizando pendências...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 36,
  },
  box: {
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    marginLeft: 12,
    fontWeight: '600',
  },
});
