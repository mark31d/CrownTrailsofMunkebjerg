// Components/RecommendedScreen.js
import React, { useMemo, useRef, useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  Share,
  ScrollView,
  Platform,
  Easing,
  Linking, // ← добавили
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { SavedContext } from './SavedContext';
import { useSettings } from './SettingsContext';
import VIBE_DETAILS from '../Components/vibeDetails';

const { width, height } = Dimensions.get('window');

/* ---------- ASSETS ---------- */
const BG             = require('../assets/bg.png');
const ICON_WM        = require('../assets/ic_pin.png');
const LOGO           = require('../assets/krown_logo.png');

const ICON_MAP       = require('../assets/ic_layers.png');
const ICON_SHARE     = require('../assets/ic_share.png');
const ICON_BOOKMARK  = require('../assets/ic_bookmark_filled.png');          // outline
const ICON_BOOKMARK_FILLED = require('../assets/ic_bookmark.png'); // filled

const ICON_BACK      = require('../assets/ic_back.png');
const ICON_PINLINE   = require('../assets/ic_location_red.png');
const ICON_CHEVRON   = require('../assets/ic_chevron.png');

/* ---------- Вайбы ---------- */
const VIBES = [
  { key: 'party',   label: 'Party & Chill',     image: require('../assets/vibe_party.png') },
  { key: 'outdoor', label: 'Outdoor Adventure', image: require('../assets/vibe_outdoor.png') },
  { key: 'play',    label: 'Play & Compete',    image: require('../assets/vibe_sport.png') },
  { key: 'relax',   label: 'Relax & Spa',       image: require('../assets/vibe_relax.png') },
];

/* ---------- Хелперы ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const CARD  = Math.min(320, width * 0.68);
const GAP   = 22;

// открыть в браузере Google Maps
const openInBrowserMaps = (lat, lng, title) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return;
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}${
    title ? `&query_place_id=${encodeURIComponent(title)}` : ''
  }`;
  Linking.openURL(url).catch(() => {});
};

export default function RecommendedScreen() {
  const nav = useNavigation();
  const { saved, toggle } = useContext(SavedContext);

  // настройки
  const settings     = useSettings();
  const categoriesOn = settings?.categoriesOn ?? true;
  const showLimit    = settings?.showLimit ?? 'all';

  // этапы: 'vibe' → 'loading' → 'list'
  const [stage, setStage] = useState(categoriesOn ? 'vibe' : 'list');
  const [selected, setSelected] = useState(0);

  // волновой лоудер (используется только в режиме категорий)
  const pulses    = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const loopsRef  = useRef([]);
  const timeoutRef= useRef(null);

  useEffect(() => {
    if (categoriesOn) {
      setStage('vibe');
    } else {
      loopsRef.current.forEach((l) => l?.stop?.());
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStage('list');
    }
  }, [categoriesOn]);

  const listRef = useRef(null);
  const onSelect = (i) => {
    setSelected(i);
    listRef.current?.scrollToIndex({ index: i, animated: true, viewPosition: 0.5 });
  };

  const onNext = () => {
    if (stage !== 'vibe') return;
    setStage('loading');

    loopsRef.current = pulses.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration: 650,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
            delay: i * 140,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 650,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );
    loopsRef.current.forEach((l) => l.start());

    timeoutRef.current = setTimeout(() => {
      loopsRef.current.forEach((l) => l.stop());
      setStage('list');
    }, 3200);
  };

  useEffect(() => {
    return () => {
      loopsRef.current.forEach((l) => l?.stop?.());
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const vibeItems = useMemo(() => {
    const vibeKey = VIBES[selected]?.key;
    const block = VIBE_DETAILS?.[vibeKey];
    return (block?.items || []).map((it, idx) => ({
      id: `${vibeKey}-${idx}`,
      title: it.title,
      desc:  it.desc,
      lat:   it.lat,
      lng:   it.lng,
      image: it.image,
    }));
  }, [selected]);

  const flatAllItems = useMemo(() => {
    if (categoriesOn) return [];
    const out = [];
    VIBES.forEach((v) => {
      const arr = VIBE_DETAILS?.[v.key]?.items || [];
      arr.forEach((it, idx) => {
        out.push({
          id: `${v.key}-${idx}`,
          title: it.title,
          desc:  it.desc,
          lat:   it.lat,
          lng:   it.lng,
          image: it.image,
        });
      });
    });
    return out;
  }, [categoriesOn]);

  const displayItems = useMemo(() => {
    if (categoriesOn) return vibeItems;
    const n = showLimit === 'all' ? flatAllItems.length : Number(showLimit || 0);
    return flatAllItems.slice(0, Math.max(0, n));
  }, [categoriesOn, showLimit, vibeItems, flatAllItems]);

  /* ======================= RENDER ======================= */
  return (
    <View style={styles.root}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <Header title="Recommended places" onBack={() => nav.goBack()} />

        {/* ВЫБОР ВАЙБА — показываем только если Categories = On */}
        {categoriesOn && stage === 'vibe' && (
          <View style={styles.vibeContainer}>
            <Text style={styles.heading}>Choose your vibe:</Text>

            <FlatList
              ref={listRef}
              data={VIBES}
              keyExtractor={(it) => it.key}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: (width - CARD) / 2 }}
              snapToInterval={CARD + GAP}
              decelerationRate="fast"
              renderItem={({ item, index }) => (
                <VibeCard item={item} active={index === selected} onPress={() => onSelect(index)} />
              )}
              getItemLayout={(_, i) => ({ length: CARD + GAP, offset: (CARD + GAP) * i, index: i })}
              onScrollToIndexFailed={({ index }) =>
                listRef.current?.scrollToOffset({ offset: (CARD + GAP) * index, animated: true })
              }
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const i = Math.round(x / (CARD + GAP));
                setSelected(clamp(i, 0, VIBES.length - 1));
              }}
              scrollEventThrottle={16}
            />

            <View style={styles.nextWrap}>
              <GradientButton text="Next" onPress={onNext} />
            </View>
          </View>
        )}

        {/* ЛОУДЕР — только при Categories = On */}
        {categoriesOn && stage === 'loading' && (
          <View style={styles.loadingWrap}>
            <Text style={styles.wait}>Preparing your picks...</Text>

            <View style={{ alignItems: 'center', marginTop: 18 }}>
              <Image source={VIBES[selected].image} style={styles.bigThumb} />
              <Text style={styles.bigLabel}>{VIBES[selected].label}</Text>
            </View>

            <View style={styles.loaderRow}>
              {[0, 1, 2].map((i) => {
                const base = i === 1 ? -14 : 0;
                const amp  = i === 1 ? -32 : -18;

                const translateY = pulses[i].interpolate({ inputRange: [0, 1], outputRange: [base, amp] });
                const scale      = pulses[i].interpolate({ inputRange: [0, 1], outputRange: i === 1 ? [0.98, 1.12] : [0.96, 1.08] });
                const opacity    = pulses[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

                return (
                  <Animated.Image
                    key={i}
                    source={LOGO}
                    resizeMode="contain"
                    style={[styles.loaderLogo, { transform: [{ translateY }, { scale }], opacity }]}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* СПИСОК МЕСТ */}
        {stage === 'list' && (
          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {displayItems.map((s, idx) => (
              <SpotCard
                key={s.id || idx}
                spot={s}
                onMap={() => openInBrowserMaps(s.lat, s.lng, s.title)}  // ← теперь открывает браузер
                onShare={async () => {
                  const msg = `${s.title}\n${formatCoords(s)}\n`;
                  try { await Share.share({ message: msg }); } catch {}
                }}
                saved={!!saved[s.id]}
                onToggleSave={() => toggle(s)}
              />
            ))}
          </ScrollView>
        )}
      </ImageBackground>
    </View>
  );
}

/* ======================= UI PIECES ======================= */
function Header({ title, onBack }) {
  return (
    <View style={styles.headerWrap}>
      <LinearGradient colors={['#0D4121', '#2A683D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Image source={ICON_BACK} style={{ resizeMode: 'contain', width: 28, height: 28 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <Image source={ICON_WM} style={styles.headerWM} resizeMode="contain" />
      </LinearGradient>
    </View>
  );
}

function VibeCard({ item, active, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ width: CARD, marginRight: GAP, alignItems: 'center', paddingTop: 18 }}>
      <View
        style={[
          styles.vibeCard,
          { transform: [{ scale: active ? 1.08 : 0.9 }] },
          active ? { borderWidth: 3, borderColor: '#fff' } : null,
          !active && Platform.OS === 'ios' ? { overflow: 'hidden' } : null,
        ]}
      >
        <Image source={item.image} style={styles.vibeImg} />
        {!active && <View style={styles.blurFake} />}
        <Text style={styles.vibeLabel}>{item.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function SpotCard({ spot, onMap, onShare, saved, onToggleSave }) {
  const [open, setOpen] = useState(false);

  const rotateVal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rotateVal, { toValue: open ? 1 : 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [open, rotateVal]);
  const rotate = rotateVal.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={styles.spotCard}>
      <Image source={spot.image} style={styles.spotImg} />

      {/* FAB со шевроном */}
      <TouchableOpacity onPress={() => setOpen((v) => !v)} activeOpacity={0.9} style={styles.fab}>
        <LinearGradient colors={['#0D4121', '#2A683D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGrad} />
        <Animated.Image source={ICON_CHEVRON} resizeMode="contain" style={[styles.chevron, { transform: [{ rotate }] }]} />
      </TouchableOpacity>

      <View style={styles.spotBody}>
        <Text style={styles.spotTitle}>{spot.title}</Text>

        <View style={styles.coordRow}>
          <Image source={ICON_PINLINE} style={styles.coordPin} resizeMode="contain" />
          <Text style={styles.coordText}>{formatCoords(spot)}</Text>
        </View>

        <View style={styles.redLine} />

        {open && (
          <>
            <Text style={styles.desc}>{spot.desc || ''}</Text>
            <View style={styles.actions}>
              <RoundIcon onPress={onMap} icon={ICON_MAP} tint="#fff" />
              <RoundIcon onPress={onShare} icon={ICON_SHARE} tint="#fff" />
              <RoundIcon onPress={onToggleSave} icon={saved ? ICON_BOOKMARK_FILLED : ICON_BOOKMARK} tint="#fff" />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function RoundIcon({ onPress, icon, tint = '#000' }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.round}>
      <LinearGradient colors={['#0D4121', '#2A683D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.roundGrad} />
      <Image source={icon} style={[styles.roundIcon, { tintColor: tint }]} resizeMode="contain" />
    </TouchableOpacity>
  );
}

function GradientButton({ text, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress}>
      <LinearGradient colors={['#0D4121', '#2A683D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradBtn}>
        <Text style={styles.gradBtnText}>{text}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

/* ======================= UTILS ======================= */
function formatCoords(s) {
  const lat = s?.lat ?? s?.coords?.lat;
  const lng = s?.lng ?? s?.coords?.lng;
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;
  }
  return s?.coordsText || '';
}

/* ======================= STYLES ======================= */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bg: { flex: 1 },

  headerWrap: { paddingTop: 28, alignItems: 'center' },
  header: {
    width: width * 0.84,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop:30,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', zIndex: 3 },
  backBtn: { position: 'absolute', left: 12, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  headerWM: { position: 'absolute', right: 12, width: 64, height: 64, zIndex: 0, tintColor:'#e1c274' },

  // Выбор вайба
  vibeContainer: { flex: 1, justifyContent: 'center' },
  heading: { textAlign: 'center', color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 40, marginBottom: 8 },

  vibeCard: { width: CARD, height: CARD * 0.94, borderRadius: 16, backgroundColor: '#111', justifyContent: 'flex-end' },
  vibeImg: { ...StyleSheet.absoluteFillObject, borderRadius: 16, width: undefined, height: undefined },
  blurFake: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', opacity: 0.35, borderRadius: 16 },
  vibeLabel: {
    color: '#fff', fontSize: 18, fontWeight: '800', padding: 12,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },

  nextWrap: { position: 'absolute', left: 24, right: 24, bottom: height * 0.1, alignItems: 'center' },

  // Кнопка
  gradBtn: { width: width * 0.66, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  gradBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // LOADING
  loadingWrap: { flex: 1, paddingTop: 14 },
  wait: { textAlign: 'center', color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 20 },
  bigThumb: { width: CARD, height: CARD * 0.94, borderRadius: 16, marginBottom: 10 },
  bigLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },

  loaderRow: {
    position: 'absolute', left: 0, right: 0, bottom: height * 0.08, height: 88,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
  },
  loaderLogo: { width: 94, height: 94, marginHorizontal: 16 },

  // Список карточек
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  spotCard: {
    backgroundColor: 'rgba(0,0,0,0.68)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 18,
    overflow: 'hidden',
  },
  spotImg: { width: '100%', height: 210 },

  fab: {
    position: 'absolute',
    right: 14,
    top: 180,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fabGrad: { ...StyleSheet.absoluteFillObject, borderRadius: 22 },
  chevron: { width: 20, height: 20, tintColor: '#fff' },

  spotBody: { padding: 14, paddingBottom: 12 },
  spotTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  coordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  coordPin: { width: 18, height: 18, marginRight: 8, tintColor:'#e1c274' },
  coordText: { color: '#fff', fontSize: 15, opacity: 0.95 },
  redLine: { height: 3, width: 140, backgroundColor: '#e1c274', borderRadius: 2, marginTop: 4, marginBottom: 10 },
  desc: { color: '#ddd', fontSize: 14, lineHeight: 20, marginBottom: 12 },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, paddingTop: 2, paddingRight: 2 },

  round: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  roundGrad: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  roundIcon: { width: 22, height: 22 },
});
