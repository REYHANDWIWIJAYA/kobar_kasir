import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ShiftToggleSwitch({ isOn, onToggle }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.container, isOn ? styles.bgOn : styles.bgOff]}
      onPress={onToggle}
    >
      {isOn ? (
        <>
          <Text style={styles.textOn}>ON</Text>
          <View style={styles.knob} />
        </>
      ) : (
        <>
          <View style={styles.knob} />
          <Text style={styles.textOff}>OFF</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 68,
    height: 32,
    borderRadius: 16,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  bgOn: {
    backgroundColor: '#2ed573',
  },
  bgOff: {
    backgroundColor: '#ff4757',
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  textOn: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  textOff: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
    marginRight: 6,
  },
});
