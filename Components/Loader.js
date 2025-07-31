// Components/Loader.js

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const BG        = require('../assets/bg.png');
const LOGO      = require('../assets/krown_logo.png');
const NAV_DELAY = 2600;

export default function Loader() {
  const nav = useNavigation();
  const { width } = Dimensions.get('window');

  // динамические размеры
  const LOGO_SIZE = width * 0.5;    // 40% ширины экрана
  const STAR_SIZE = 52;             // размер «искр»
  const ROW_HEIGHT = STAR_SIZE * 1.5;

  // анимационные значения
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const starAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    // пульсация логотипа
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // «бегущие» искры
    starAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay((starAnims.length - i - 1) * 200),
        ]),
      ).start();
    });

    // автопереход
    const timer = setTimeout(() => nav.replace('Onboarding'), NAV_DELAY);
    return () => clearTimeout(timer);
  }, [nav, pulseAnim, starAnims]);

  // стиль пульсации логотипа
  const logoStyle = {
    transform: [{
      scale: pulseAnim.interpolate({ inputRange: [0,1], outputRange: [0.9,1.1] })
    }],
    opacity: pulseAnim.interpolate({ inputRange: [0,1], outputRange: [0.8,1] }),
  };

  // стиль для одной искры
  const starStyle = (anim) => ({
    opacity: anim,
    transform: [{
      translateY: anim.interpolate({
        inputRange: [0,1],
        outputRange: [0, - (STAR_SIZE * 0.5)],
      })
    }]
  });

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <View style={styles.container}>
        {/* Логотип */}
        <Animated.Image
          source={LOGO}
          style={[
            styles.logo,
            { width: LOGO_SIZE, height: LOGO_SIZE },
            logoStyle,
          ]}
          resizeMode="contain"
        />

        {/* Ряд «искр» */}
        <View style={[styles.row, { height: ROW_HEIGHT }]}>
          {starAnims.map((anim, idx) => (
            <Animated.Text
              key={idx}
              style={[
                styles.star,
                {
                  fontSize: STAR_SIZE,
                  marginHorizontal: STAR_SIZE / 4,
                },
                starStyle(anim),
              ]}
            >
              ✦
            </Animated.Text>
          ))}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    marginBottom: 32,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  star: {
    color: '#e1c577', // цвет искр
    textAlign: 'center',
  },
});
