// Components/MapScreen.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Linking,
  Share,
  Platform,
  Alert,
  Modal,
  ImageBackground,
  KeyboardAvoidingView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import VIBE_DETAILS from '../Components/vibeDetails';

const { width, height } = Dimensions.get('window');

/* ------- ASSETS ------- */
const BG                     = require('../assets/bg.png'); // light background image
const ICON_BACK              = require('../assets/ic_back.png');
const ICON_WM                = require('../assets/ic_layers.png');
const ICON_SHARE             = require('../assets/ic_share.png');
const ICON_PINLINE           = require('../assets/ic_location_red.png');
const ICON_CHEVRON           = require('../assets/ic_chevron.png');
const ICON_BOOKMARK          = require('../assets/ic_bookmark_filled.png');           // outline
const ICON_BOOKMARK_FILLED   = require('../assets/ic_bookmark.png');    // filled
const ICON_PLUS              = require('../assets/ic_layers.png');             // replace with your plus icon if available
const ICON_TRASH             = require('../assets/trash.png');                 // delete icon
const LOGO_CROWN             = require('../assets/krown_logo.png');            // crown logo

const VIBES = [
  { key: 'party',   label: 'Party' },
  { key: 'outdoor', label: 'Outdoor' },
  { key: 'play',    label: 'Play' },
  { key: 'relax',   label: 'Relax' },
];

const ACCENT = '#e1c274';
const GLASS  = 'rgba(255,255,255,0.85)';

/* Optional storage (falls back to memory if not installed) */
let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}
const STORAGE_KEY = 'journal_entries_v2';

const nowISO = () => new Date().toISOString();
const titleFromText = (t) => (t || '').trim().split('\n')[0].slice(0, 60) || 'Untitled';
const toGoogleSearch = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export default function MapScreen() {
  const nav = useNavigation();

  // journal data
  const [entries, setEntries] = useState([]); // {id, text, vibe, createdAt, spot?, favorite?, visited?}
  const [onlySaved, setOnlySaved] = useState(false);
  const [search, setSearch] = useState('');

  // modal (add entry)
  const [modalVisible, setModalVisible] = useState(false);
  const [mText, setMText] = useState('');
  const [mVibe, setMVibe] = useState('party');
  const [mAttached, setMAttached] = useState(null); // {title, coords, image}
  const [mAttachOpen, setMAttachOpen] = useState(false);

  // load/save
  useEffect(() => {
    (async () => {
      try {
        if (!AsyncStorage) return;
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setEntries(JSON.parse(raw));
      } catch {}
    })();
  }, []);
  const persist = useCallback(async (next) => {
    setEntries(next);
    try {
      if (AsyncStorage) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  // spots to attach
  const allSpots = useMemo(() => {
    return Object.entries(VIBE_DETAILS).flatMap(([k, v]) =>
      (v.items || []).map((it, idx) => ({
        id: `${k}-${idx}`,
        title: it.title,
        desc: it.desc,
        coords: { lat: it.lat, lng: it.lng },
        image: it.image,
        vibe: k,
      }))
    );
  }, []);
  const modalSpots = useMemo(() => allSpots.filter(s => s.vibe === mVibe), [allSpots, mVibe]);

  // actions
  const addEntry = () => {
    if (!mText.trim() && !mAttached) {
      Alert.alert('Empty note', 'Add text or attach a place.');
      return;
    }
    const entry = {
      id: `e-${Date.now()}`,
      text: mText.trim(),
      vibe: mVibe,
      createdAt: nowISO(),
      spot: mAttached ? {
        title: mAttached.title,
        coords: mAttached.coords,
        image: mAttached.image,
      } : null,
      favorite: false,
      visited: false,
    };
    const next = [entry, ...entries];
    persist(next);
    // reset modal
    setMText('');
    setMAttached(null);
    setMAttachOpen(false);
    setModalVisible(false);
  };

  const toggleFavorite = (id) => {
    const next = entries.map(e => e.id === id ? { ...e, favorite: !e.favorite } : e);
    persist(next);
  };
  const toggleVisited = (id) => {
    const next = entries.map(e => e.id === id ? { ...e, visited: !e.visited } : e);
    persist(next);
  };
  const removeEntry = (id) => {
    Alert.alert('Delete', 'Delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => persist(entries.filter(e => e.id !== id)) },
    ]);
  };
  const shareEntry = async (e) => {
    const lines = [];
    lines.push(`Vibe: ${e.vibe}`);
    lines.push(`Date: ${new Date(e.createdAt).toLocaleString()}`);
    if (e.spot?.coords) lines.push(`Coords: ${e.spot.coords.lat.toFixed(5)}, ${e.spot.coords.lng.toFixed(5)}`);
    if (e.spot?.title) lines.push(`Place: ${e.spot.title}`);
    if (e.text) lines.push('', e.text);
    try { await Share.share({ message: lines.join('\n') }); } catch {}
  };

  // filter view
  const filtered = useMemo(() => {
    let arr = entries;
    if (onlySaved) arr = arr.filter(e => e.favorite);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(e =>
        e.text?.toLowerCase().includes(q) ||
        e.spot?.title?.toLowerCase().includes(q) ||
        e.vibe?.toLowerCase().includes(q)
      );
    }
    return [...arr].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [entries, onlySaved, search]);

  const openSpotInMaps = (spot) => {
    if (!spot?.coords) return;
    const url = toGoogleSearch(spot.coords.lat, spot.coords.lng);
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.root}>
      {/* light background via bg.png */}
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        {/* header (NO crown here) */}
        <View style={styles.headerWrap}>
          <LinearGradient
            colors={['#0D4121', '#2A683D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <TouchableOpacity onPress={nav.goBack} style={styles.backBtn} hitSlop={12}>
              <Image source={ICON_BACK} style={styles.backIcon} resizeMode="contain" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Journal</Text>
            <Image source={ICON_WM} style={styles.headerWM} resizeMode="contain" />
          </LinearGradient>
        </View>

        {/* page watermark crown (not in header) */}
        <Image
          source={LOGO_CROWN}
          style={styles.pageWatermark}
          resizeMode="contain"
          pointerEvents="none"
        />

        {/* controls */}
        <View style={styles.controls}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search notes / places / vibes"
            placeholderTextColor="rgba(0,0,0,0.45)"
            style={styles.search}
          />
          <TouchableOpacity onPress={() => setOnlySaved(v => !v)} style={[styles.ctrlPill, onlySaved && styles.ctrlPillActive]}>
            <Text style={[styles.ctrlPillText, onlySaved && styles.ctrlPillTextActive]}>Only saved</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (!entries.length) return;
              const msg = entries.map(e => {
                const d = new Date(e.createdAt).toLocaleString();
                const head = `• [${e.vibe}] ${titleFromText(e.text)} — ${d}`;
                const loc  = e.spot?.coords ? ` (${e.spot.coords.lat.toFixed(4)}, ${e.spot.coords.lng.toFixed(4)})` : '';
                return `${head}${loc}\n${e.text || ''}`;
              }).join('\n\n');
              Share.share({ message: msg }).catch(()=>{});
            }}
            style={styles.ctrlPill}
          >
            <Text style={styles.ctrlPillText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* entries */}
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16, paddingTop: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.spot?.image && <Image source={item.spot.image} style={styles.cardImg} resizeMode="cover" />}
              <View style={styles.cardBody}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>{titleFromText(item.text) || item.spot?.title || 'Note'}</Text>
                  <View style={styles.badges}>
                    <Text style={styles.vibeBadge}>{item.vibe}</Text>
                    {item.visited && <Text style={styles.visitedBadge}>Visited</Text>}
                  </View>
                </View>

                <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                {!!item.text && <Text style={styles.cardText}>{item.text}</Text>}

                {item.spot?.coords && (
                  <TouchableOpacity onPress={() => openSpotInMaps(item.spot)} style={styles.coordRow}>
                    <Image source={ICON_PINLINE} style={styles.coordPin} resizeMode="contain" />
                    <Text style={styles.coordText}>
                      {item.spot.coords.lat.toFixed(4)}, {item.spot.coords.lng.toFixed(4)} — open in maps
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
                    <Image source={item.favorite ? ICON_BOOKMARK_FILLED : ICON_BOOKMARK} style={styles.actionIcon} resizeMode="contain" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleVisited(item.id)}>
                    <Text style={styles.linkBtn}>{item.visited ? 'Mark unvisited' : 'Mark visited'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => shareEntry(item)}>
                    <Image source={ICON_SHARE} style={styles.actionIcon} resizeMode="contain" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeEntry(item.id)}>
                    <Image source={ICON_TRASH} style={styles.actionTrash} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No entries yet. Tap map to add one.</Text>}
        />

        {/* FAB → open modal */}
        <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => setModalVisible(true)}>
          <LinearGradient colors={['#0D4121', '#2A683D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGrad} />
          <Image source={ICON_PLUS} style={styles.fabIcon} resizeMode="contain" />
        </TouchableOpacity>

        {/* modal: add entry */}
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                {/* Crown watermark inside modal — ignoring touches */}
                <Image
                  source={LOGO_CROWN}
                  style={styles.modalWatermark}
                  resizeMode="contain"
                  pointerEvents="none"
                />

                <Text style={styles.modalTitle}>New entry</Text>

                {/* vibe selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vibeRow}>
                  {VIBES.map(v => (
                    <TouchableOpacity
                      key={v.key}
                      onPress={() => setMVibe(v.key)}
                      style={[styles.vibePillLight, mVibe === v.key && styles.vibePillLightActive]}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.vibePillLightText, mVibe === v.key && styles.vibePillLightTextActive]}>{v.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* text */}
                <TextInput
                  value={mText}
                  onChangeText={setMText}
                  placeholder="Write your note..."
                  placeholderTextColor="rgba(0,0,0,0.45)"
                  style={styles.inputLight}
                  multiline
                />

                {/* attach place */}
                <TouchableOpacity onPress={() => setMAttachOpen(v => !v)} style={styles.attachBtnLight} activeOpacity={0.9}>
                  <Text style={styles.attachTextDark}>{mAttached ? `Place: ${mAttached.title}` : 'Attach place'}</Text>
                  <Image source={ICON_CHEVRON} style={styles.attachIconDark} resizeMode="contain" />
                </TouchableOpacity>

                {mAttachOpen && (
                  <View style={styles.attachPanelLight}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {modalSpots.slice(0, 12).map(s => (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => { setMAttached(s); setMAttachOpen(false); }}
                          style={styles.spotChipLight}
                          activeOpacity={0.9}
                        >
                          <Image source={s.image} style={styles.spotChipImg} resizeMode="cover" />
                          <Text numberOfLines={1} style={styles.spotChipTextDark}>{s.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* modal actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, styles.modalBtnGhost]} activeOpacity={0.9}>
                    <Text style={[styles.modalBtnText, styles.modalBtnGhostText]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={addEntry}
                    style={styles.modalBtn}
                    activeOpacity={0.95}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.modalBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ImageBackground>
    </View>
  );
}

/* ---------- styles ---------- */
const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  bg:   { flex: 1 },

  // header
  headerWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    paddingTop: Platform.OS === 'android' ? 24 : 0, alignItems: 'center',
  },
  header: {
    width: width * 0.9, height: 64, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: Platform.OS === 'ios' ? 28 : 0,
  },
  backBtn: { position: 'absolute', left: 12, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon: { width: 24, height: 24, tintColor: '#fff' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerWM: { position: 'absolute', right: 12, width: 40, height: 40, tintColor:'#e1c274' },

  // page watermark crown (not interactive)
  pageWatermark: {
    position: 'absolute',
    right: 8,
    bottom: 96,
    width: 84,
    height: 84,
    opacity: 0.15,
    tintColor: ACCENT,
  },

  // controls
  controls: {
    marginTop: 100, paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  search: {
    flex: 1, height: 40, borderRadius: 12,
    backgroundColor: GLASS, paddingHorizontal: 12, color: '#000', fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)',
  },
  ctrlPill: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: GLASS, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)',
  },
  ctrlPillText: { color: '#111', fontWeight: '700' },
  ctrlPillActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  ctrlPillTextActive: { color: '#000' },

  // list
  card: {
    marginBottom: 16, borderRadius: CARD_RADIUS, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  cardImg: { width: '100%', height: 160 },
  cardBody: { padding: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { color: '#111', fontSize: 16, fontWeight: '800', flex: 1, paddingRight: 10 },
  badges: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  vibeBadge: { color: '#000', backgroundColor: ACCENT, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, fontWeight: '800' },
  visitedBadge: { color: '#333', backgroundColor: 'rgba(0,0,0,0.08)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },

  cardDate: { color: '#444', fontSize: 12, marginTop: 4 },
  cardText: { color: '#222', fontSize: 14, marginTop: 6 },

  coordRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  coordPin: { width: 16, height: 16, marginRight: 6, tintColor: '#0D4121' },
  coordText: { color: '#0D4121', fontSize: 12, textDecorationLine: 'underline' },

  actions: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 },
  actionIcon: { width: 22, height: 22, tintColor: '#0D4121' },
  actionTrash: { width: 22, height: 22, tintColor: 'red' },
  linkBtn: { color: '#0D4121', fontWeight: '700' },

  empty: { color: '#333', textAlign: 'center', marginTop: 30 },

  // FAB
  fab: {
    position: 'absolute', right: 16, bottom: 20,
    width: 56, height: 56, borderRadius: 28, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  fabGrad: { ...StyleSheet.absoluteFillObject, borderRadius: 28 },
  fabIcon: { width: 24, height: 24, tintColor: '#fff' },

  // modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'flex-end',
  },
  modalCard: {
    width: width - 20, maxHeight: height * 0.8,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  // watermark inside modal
  modalWatermark: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 56,
    height: 56,
    opacity: 0.12,
    tintColor: ACCENT,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 8 },

  vibeRow: { paddingRight: 6, paddingVertical: 6 },
  vibePillLight: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)', marginRight: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  vibePillLightActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  vibePillLightText: { color: '#333', fontSize: 12, fontWeight: '700' },
  vibePillLightTextActive: { color: '#000' },

  inputLight: {
    minHeight: 90, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)',
    color: '#111', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', marginTop: 8,
  },

  attachBtnLight: {
    height: 40, borderRadius: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(0,0,0,0.04)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10,
  },
  attachTextDark: { color: '#111', fontWeight: '700' },
  attachIconDark: { width: 14, height: 14, tintColor: '#0D4121', transform: [{ rotate: '180deg' }] },

  attachPanelLight: {
    marginTop: 8, padding: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  spotChipLight: {
    width: Math.min(180, width * 0.6), marginRight: 10,
    borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  spotChipImg: { width: '100%', height: 90 },
  spotChipTextDark: { color: '#111', padding: 8, fontWeight: '700' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 },
  modalBtn: {
    paddingHorizontal: 16, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  modalBtnText: { color: '#000', fontSize: 14, fontWeight: '800' },
  modalBtnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: ACCENT },
  modalBtnGhostText: { color: '#0D4121' },
});
