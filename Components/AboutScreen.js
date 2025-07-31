// Components/AboutScreen.js
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Platform,
  Share,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

/* ---- ASSETS ---- */
const BG         = require('../assets/bg.png');            // light background
const ICON_BACK  = require('../assets/ic_back.png');
const ICON_WM    = require('../assets/ic_info.png');       // header watermark
const ICON_SHARE = require('../assets/ic_share.png');
const ICON_CHEVR = require('../assets/ic_chevron.png');
const LOGO       = require('../assets/krown_logo.png');    // crown logo

/* ---- COPY BUFFER (optional) ---- */
let Clipboard;
try {
  Clipboard = require('@react-native-clipboard/clipboard').default;
} catch (e) {
  Clipboard = null;
}

/* ---- CONTENT ---- */
const SUMMARY = `Munkebjerg is a scenic hill above the Vejle Fjord, wrapped in deep forest. The name means “Monk’s Hill”—a nod to its older, quieter past. Today it’s known for its viewpoints, spa escapes, and wooded trails.`;

const HIGHLIGHTS = [
  'Nature holidays',
  'Hiking & viewpoints',
  'Spa & relaxation',
  'Quiet getaways',
];

const FACTS = [
  { title: 'Steep hill climb', body: 'The serpentine road hosts an annual hill climb with classic cars tackling one of Denmark’s sharpest inclines.' },
  { title: 'Fjord views that feel Nordic', body: 'The vistas across Vejle Fjord often get compared to Norway—unexpected for central Denmark.' },
  { title: 'Munkebjergskoven forest', body: 'Mixed deciduous and conifer woodland with wildlife, mushrooms, and owls at night.' },
  { title: 'Historic hilltop hotel', body: 'A landmark from the 1880s still popular with public figures and artists.' },
  { title: '“Krolf”, a Danish classic', body: 'A laid-back mix of golf and croquet played on the grounds—very Danish, rarely seen elsewhere.' },
];

export default function AboutScreen() {
  const nav = useNavigation();
  const [expanded, setExpanded] = useState({}); // {index: boolean}
  const [showFull, setShowFull] = useState(false);

  const onShare = async () => {
    try {
      const all = [
        SUMMARY,
        '',
        'It is ideal for:',
        ...HIGHLIGHTS.map(h => `• ${h}`),
        '',
        'Interesting facts:',
        ...FACTS.map((f, i) => `${i + 1}. ${f.title} — ${f.body}`),
      ].join('\n');
      await Share.share({ message: all });
    } catch {}
  };

  const onCopy = async () => {
    const payload = `${SUMMARY}\n\nHighlights:\n${HIGHLIGHTS.map(h => `• ${h}`).join('\n')}`;
    if (Clipboard?.setString) {
      Clipboard.setString(payload);
      Alert.alert('Copied', 'About text copied to clipboard.');
    } else {
      Alert.alert('Clipboard unavailable', 'Install @react-native-clipboard/clipboard to enable copy.');
    }
  };

  const summaryText = useMemo(() => {
    if (showFull) return SUMMARY;
    const cut = 160;
    return SUMMARY.length > cut ? SUMMARY.slice(0, cut) + '…' : SUMMARY;
  }, [showFull]);

  return (
    <View style={styles.root}>
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        {/* HEADER */}
        <View style={styles.headerWrap}>
          <LinearGradient
            colors={['#0D4121', '#2A683D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn} hitSlop={12}>
              <Image source={ICON_BACK} style={styles.backIcon} resizeMode="contain" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>About Munkebjerg</Text>
            <Image source={ICON_WM} style={styles.headerWM} resizeMode="contain" />
          </LinearGradient>
        </View>

        {/* CONTENT */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* SUMMARY CARD */}
          <View style={styles.card}>
            <View style={styles.headingRow}>
              <Image source={LOGO} style={styles.headingIcon} resizeMode="contain" />
              <Text style={styles.heading}>Overview</Text>
            </View>

            <Text style={styles.text}>{summaryText}</Text>
            <TouchableOpacity onPress={() => setShowFull(v => !v)} style={styles.readMore}>
              <Text style={styles.readMoreText}>{showFull ? 'Show less' : 'Read more'}</Text>
              <Image source={ICON_CHEVR} style={styles.readMoreIcon} resizeMode="contain" />
            </TouchableOpacity>

            {/* STATS / HIGHLIGHTS */}
            <View style={styles.chipsRow}>
              {HIGHLIGHTS.map((h, idx) => (
                <View key={idx} style={styles.chip}>
                  <Text style={styles.chipText}>{h}</Text>
                </View>
              ))}
            </View>

            {/* ACTIONS */}
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={onShare} style={styles.actionPill}>
                <Image source={ICON_SHARE} style={styles.actionIcon} resizeMode="contain" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onCopy} style={[styles.actionPill, styles.actionPillGhost]}>
                <Text style={[styles.actionText, styles.actionTextGhost]}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FACTS ACCORDION */}
          <View style={styles.card}>
            <Text style={styles.heading}>Interesting facts</Text>
            {FACTS.map((f, i) => {
              const open = !!expanded[i];
              return (
                <View key={i} style={styles.accItem}>
                  <TouchableOpacity
                    onPress={() => setExpanded(prev => ({ ...prev, [i]: !open }))}
                    style={styles.accHead}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.accTitle}>{`${i + 1}. ${f.title}`}</Text>
                    <Image
                      source={ICON_CHEVR}
                      style={[styles.accIcon, open && { transform: [{ rotate: '0deg' }] }]}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  {open && <Text style={styles.accBody}>{f.body}</Text>}
                  {i < FACTS.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>

          {/* QUOTE / NOTE */}
          <View style={styles.noteCard}>
            <Text style={styles.noteMark}>“</Text>
            <Text style={styles.note}>
              Forest scent, fjord breeze, and a quiet climb above the water — that’s Munkebjerg in one breath.
            </Text>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

/* ---- STYLES ---- */
const ACCENT = '#e1c274';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  bg: { flex: 1 },

  // header
  headerWrap: { paddingTop: 28, alignItems: 'center' },
  header: {
    width: width * 0.84,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  backBtn: { position: 'absolute', left: 12, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  backIcon: { width: 28, height: 28, tintColor: '#fff' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', zIndex: 3 },
  headerWM: { position: 'absolute', right: 12, width: 64, height: 64, zIndex: 0, tintColor: ACCENT },

  // content
  scroll: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },

  // generic cards
  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    padding: 14,
    marginBottom: 16,
  },

  // heading with crown
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headingIcon: { width: 52, height: 52, marginRight: 8 },
  heading: { color: '#0D4121', fontSize: 18, fontWeight: '800' },

  text: { color: '#111', fontSize: 15, lineHeight: 22 },

  readMore: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  readMoreText: { color: '#0D4121', fontWeight: '800' },
  readMoreIcon: { width: 12, height: 12, marginLeft: 6, tintColor: '#0D4121', transform: [{ rotate: '180deg' }] },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderColor: 'rgba(0,0,0,0.08)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: '#333', fontWeight: '700', fontSize: 12 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    backgroundColor: ACCENT,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  actionPillGhost: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(0,0,0,0.12)',
  },
  actionIcon: { width: 18, height: 18, tintColor: '#000' },
  actionText: { color: '#000', fontWeight: '800' },
  actionTextGhost: { color: '#0D4121' },

  // accordion
  accItem: { paddingVertical: 6 },
  accHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accTitle: { color: '#111', fontWeight: '800', fontSize: 15, paddingRight: 8 },
  accIcon: { width: 12, height: 12, tintColor: '#0D4121', transform: [{ rotate: '0deg' }] },
  accBody: { color: '#222', marginTop: 6, lineHeight: 20, fontSize: 14 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginTop: 10 },

  // quote / note
  noteCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    padding: 18,
    marginBottom: 24,
    position: 'relative',
  },
  noteMark: {
    position: 'absolute',
    top: 6,
    left: 10,
    fontSize: 36,
    color: 'rgba(0,0,0,0.15)',
    fontWeight: '900',
  },
  note: { color: '#111', fontSize: 15, lineHeight: 22, paddingLeft: 16 },
});
