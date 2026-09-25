import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';

const SLIDER_WIDTH = Dimensions.get('window').width - 64;
const THUMB_SIZE = 50;

export default function SwipeButton({ onSwipeSuccess, title, color = '#10ac84' }) {
  const pan = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0 && gestureState.dx <= SLIDER_WIDTH - THUMB_SIZE) {
          pan.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx >= SLIDER_WIDTH - THUMB_SIZE - 20) {
          Animated.timing(pan, {
            toValue: SLIDER_WIDTH - THUMB_SIZE,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            setSwiped(true);
            onSwipeSuccess();
            setTimeout(() => {
              pan.setValue(0);
              setSwiped(false);
            }, 800);
          });
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={[styles.container, { borderColor: color }]}>
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: color,
            width: pan.interpolate({
              inputRange: [0, SLIDER_WIDTH - THUMB_SIZE],
              outputRange: [THUMB_SIZE, SLIDER_WIDTH],
            }),
          },
        ]}
      />
      <Text style={styles.text}>{swiped ? 'BERHASIL!' : title}</Text>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          {
            transform: [{ translateX: pan }],
            backgroundColor: color,
          },
        ]}
      >
        <Text style={styles.thumbArrow}>➔</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    width: SLIDER_WIDTH,
    borderRadius: 27,
    backgroundColor: '#f1f2f6',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 14,
    alignSelf: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 27,
    opacity: 0.25,
  },
  text: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2f3542',
    zIndex: 1,
  },
  thumb: {
    position: 'absolute',
    left: 2,
    width: THUMB_SIZE - 4,
    height: THUMB_SIZE - 4,
    borderRadius: (THUMB_SIZE - 4) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  thumbArrow: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
