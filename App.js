import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Platform,
  BackHandler,
  Animated,
  LayoutAnimation,
  UIManager,
  Vibration,
} from 'react-native';
import 'react-native-get-random-values';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API = 'https://solscope-production.up.railway.app/api';

const C = {
  bg: '#08070c',
  surface: '#111016',
  surfaceLight: '#18171e',
  border: '#1f1e26',
  text: '#e4e0db',
  muted: '#7a7780',
  dim: '#3d3b44',
  gold: '#d4a843',
  goldSoft: '#1e1812',
  goldBorder: '#2a2010',
  green: '#4ade80',
  greenSoft: '#0d1a12',
  greenBorder: '#1a3325',
  red: '#f87171',
  redSoft: '#1a0d0d',
  redBorder: '#33191a',
  blue: '#60a5fa',
};

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 40) : 50;
const BOTTOM_NAV_HEIGHT = Platform.OS === 'android' ? 112 : 82;
const BOTTOM_CONTENT_PADDING = Platform.OS === 'android' ? 146 : 108;

const REMOTE_TOKEN_ICONS = {
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  JUP: 'https://static.jup.ag/jup/icon.png',
  BONK: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
  RENDER: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png',
  RAY: 'https://assets.coingecko.com/coins/images/13928/small/PSigc4ie_400x400.jpg',
  JTO: 'https://assets.coingecko.com/coins/images/33228/small/jto.png',
  ORCA: 'https://assets.coingecko.com/coins/images/17547/small/Orca_Logo.png',
};

const ICON_CACHE = new Map();
const TOKEN_DETAIL_CACHE = new Map(); // mint → { data, timestamp }
const TOKEN_CACHE_TTL = 60 * 1000; // 1 minute

const LOCAL_TOKEN_ICONS = {
  DRIFT: require('./assets/tokens/drift.png'),
  PYTH: require('./assets/tokens/pyth.png'),
  WIF: require('./assets/tokens/wif.png'),
};

const TOP_TOKENS = [
  { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112' },
  { symbol: 'JUP', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
  { symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { symbol: 'WIF', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
  { symbol: 'PYTH', mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3' },
  { symbol: 'RAY', mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
  { symbol: 'JTO', mint: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL' },
  { symbol: 'DRIFT', mint: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7' },
  { symbol: 'ORCA', mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE' },
  { symbol: 'RENDER', mint: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof' },
];

const BRAND_LOGOS = {
  nansen: require('./assets/brands/nansen.png'),
  helius: require('./assets/brands/helius.png'),
  jupiter: require('./assets/brands/jupiter.png'),
};

// ════════════════════════════════════════
// HAPTIC HELPER
// ════════════════════════════════════════
const haptic = (style = 'light') => {
  try {
    if (style === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (style === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    Vibration.vibrate(10);
  }
};

// ════════════════════════════════════════
// SIGNAL STRENGTH HELPER
// ════════════════════════════════════════
const getSignalStrength = (signal) => {
  let strength = 1;
  const d = signal.details || {};
  if (d.confidence === 'HIGH') strength = 3;
  else if (d.confidence === 'MEDIUM') strength = 2;
  if (Math.abs(d.netflowUsd || 0) > 10000) strength = Math.max(strength, 3);
  else if (Math.abs(d.netflowUsd || 0) > 5000) strength = Math.max(strength, 2);
  return strength;
};

// ════════════════════════════════════════
// SMALL COMPONENTS
// ════════════════════════════════════════

function PoweredByBadge() {
  return (
    <View style={styles.poweredByContainer}>
      <Text style={styles.poweredByText}>POWERED BY</Text>
      <View style={styles.poweredByLogos}>
        <View style={styles.brandLogoWrap}><Image source={BRAND_LOGOS.nansen} style={[styles.brandLogo, { width: 28, height: 28 }]} resizeMode="contain" /></View>
        <View style={styles.brandLogoWrap}><Image source={BRAND_LOGOS.helius} style={[styles.brandLogo, { width: 24, height: 24 }]} resizeMode="contain" /></View>
        <View style={styles.brandLogoWrap}><Image source={BRAND_LOGOS.jupiter} style={[styles.brandLogo, { width: 24, height: 24 }]} resizeMode="contain" /></View>
      </View>
    </View>
  );
}

function PulseDot({ color = C.green, size = 6 }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity: pulse, marginRight: 6,
    }} />
  );
}

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  return (
    <Animated.View style={[styles.signalCard, { borderColor: C.border, opacity: shimmer }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: C.surfaceLight }} />
        <View style={{ marginLeft: 12 }}>
          <View style={{ width: 70, height: 10, borderRadius: 4, backgroundColor: C.surfaceLight, marginBottom: 6 }} />
          <View style={{ width: 40, height: 16, borderRadius: 4, backgroundColor: C.surfaceLight }} />
        </View>
      </View>
      <View style={{ width: '85%', height: 12, borderRadius: 4, backgroundColor: C.surfaceLight, marginBottom: 8 }} />
      <View style={{ width: '60%', height: 12, borderRadius: 4, backgroundColor: C.surfaceLight }} />
    </Animated.View>
  );
}

function TokenIcon({ symbol, mint, size = 32 }) {
  const upper = (symbol || '').toUpperCase();
  const localSource = LOCAL_TOKEN_ICONS[upper];
  const remoteUri = REMOTE_TOKEN_ICONS[upper];
  const [remoteFailed, setRemoteFailed] = useState(false);
  const [dynamicUri, setDynamicUri] = useState(ICON_CACHE.get(mint) || null);
  const [dynamicFailed, setDynamicFailed] = useState(false);

  useEffect(() => {
    if (!mint || localSource || remoteUri) return;
    if (ICON_CACHE.has(mint)) { setDynamicUri(ICON_CACHE.get(mint)); return; }
    fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`)
      .then(r => r.json())
      .then(data => {
        const url = data.pairs?.[0]?.info?.imageUrl;
        if (url) { ICON_CACHE.set(mint, url); setDynamicUri(url); }
      })
      .catch(() => {});
  }, [mint, localSource, remoteUri]);

  const imgStyle = {
    width: size,
    height: size,
    borderRadius: size * 0.28,
    backgroundColor: '#1a1920',
  };

  if (localSource) return <Image source={localSource} style={imgStyle} resizeMode="cover" />;
  if (remoteUri && !remoteFailed) return <Image source={{ uri: remoteUri }} style={imgStyle} resizeMode="cover" onError={() => setRemoteFailed(true)} />;
  if (dynamicUri && !dynamicFailed) return <Image source={{ uri: dynamicUri }} style={imgStyle} resizeMode="cover" onError={() => setDynamicFailed(true)} />;

  const hue = upper
    ? upper.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
    : 0;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: `hsl(${hue}, 35%, 22%)`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#aaa', fontSize: size * 0.38, fontWeight: '700' }}>
        {upper.slice(0, 2) || '?'}
      </Text>
    </View>
  );
}

const fmt = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Number(n || 0).toFixed(0);
};

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};

// ════════════════════════════════════════
// TOP TOKENS ROW
// ════════════════════════════════════════

function TopTokensRow({ onTokenPress }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mints = TOP_TOKENS.map(t => t.mint).join(',');
    fetch(`https://api.dexscreener.com/latest/dex/tokens/${mints}`)
      .then(r => r.json())
      .then(async (data) => {
        const pairs = data.pairs || [];
        const seen = new Set();
        const results = [];
        for (const t of TOP_TOKENS) {
          if (seen.has(t.symbol)) continue;
          const pair = pairs.find(p =>
            p.chainId === 'solana' &&
            (p.baseToken?.address === t.mint || p.baseToken?.symbol === t.symbol)
          );
          if (pair) {
            seen.add(t.symbol);
            results.push({
              symbol: t.symbol,
              mint: t.mint,
              price: parseFloat(pair.priceUsd) || 0,
              change24h: pair.priceChange?.h24 || 0,
              imageUrl: pair.info?.imageUrl,
            });
          }
        }

        // Fetch missing tokens (like SOL) via CoinGecko
        const missing = TOP_TOKENS.filter(t => !seen.has(t.symbol));
        if (missing.length > 0) {
          try {
            const cgIds = missing.map(t => {
              if (t.symbol === 'SOL') return 'solana';
              return t.symbol.toLowerCase();
            }).join(',');
            const cgRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true`);
            const cgData = await cgRes.json();
            for (const t of missing) {
              const cgKey = t.symbol === 'SOL' ? 'solana' : t.symbol.toLowerCase();
              const cg = cgData[cgKey];
              if (cg) {
                results.push({
                  symbol: t.symbol,
                  mint: t.mint,
                  price: cg.usd || 0,
                  change24h: cg.usd_24h_change || 0,
                });
              }
            }
          } catch {}
        }

        // Sort to match TOP_TOKENS order
        const order = TOP_TOKENS.map(t => t.symbol);
        results.sort((a, b) => order.indexOf(a.symbol) - order.indexOf(b.symbol));
        setTokens(results);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View>
      <Text style={styles.sectionLabel}>TOP SOLANA</Text>
      {loading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }} style={{ marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={[styles.topTokenCard, { opacity: 0.4 }]}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.surfaceLight }} />
              <View style={{ width: 30, height: 10, borderRadius: 4, backgroundColor: C.surfaceLight, marginTop: 4 }} />
              <View style={{ width: 40, height: 10, borderRadius: 4, backgroundColor: C.surfaceLight, marginTop: 4 }} />
            </View>
          ))}
        </ScrollView>
      ) : tokens.length === 0 ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: C.dim }}>Could not load token prices</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
          style={{ marginBottom: 8 }}
        >
          {tokens.map(t => (
            <TouchableOpacity
              key={t.symbol}
              onPress={() => { haptic(); onTokenPress(t.symbol, t.mint); }}
              activeOpacity={0.7}
              style={styles.topTokenCard}
            >
              <TokenIcon symbol={t.symbol} mint={t.mint} size={28} />
              <Text style={styles.topTokenSymbol}>{t.symbol}</Text>
              <Text style={styles.topTokenPrice}>
                ${t.price < 0.01 ? t.price.toFixed(6) : t.price < 1 ? t.price.toFixed(4) : t.price.toFixed(2)}
              </Text>
              <Text style={[styles.topTokenChange, { color: t.change24h >= 0 ? C.green : C.red }]}>
                {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(1)}%
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ════════════════════════════════════════
// SIGNAL CARD
// ════════════════════════════════════════

function SignalCard({ signal, onPress }) {
  const positive =
    ['CONVICTION_UP', 'SMART_MONEY_ENTRY'].includes(signal.type) ||
    (signal.type === 'SENTIMENT_SPIKE' && signal.details?.delta > 0);

  const negative = ['CONVICTION_DOWN', 'SMART_MONEY_EXIT'].includes(signal.type);
  const strength = getSignalStrength(signal);
  const isNew = Date.now() - signal.timestamp < 30 * 60 * 1000;

  return (
    <TouchableOpacity
      onPress={() => { haptic(); onPress(signal.symbol, signal.mint); }}
      activeOpacity={0.7}
      style={[
        styles.signalCard,
        {
          borderColor: positive ? C.greenBorder : negative ? C.redBorder : C.border,
        },
      ]}
    >
      <View style={styles.signalHeader}>
        <View style={styles.signalLeft}>
          <TokenIcon symbol={signal.symbol} mint={signal.mint} size={40} />
          <View style={{ marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={[
                  styles.signalType,
                  { color: positive ? C.green : negative ? C.red : C.gold },
                ]}
              >
                {signal.label?.toUpperCase()}
              </Text>
              {/* Signal strength bars */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5 }}>
                {[1, 2, 3].map(i => (
                  <View key={i} style={{
                    width: 3, height: 4 + i * 3, borderRadius: 1,
                    backgroundColor: i <= strength
                      ? (positive ? C.green : negative ? C.red : C.gold)
                      : C.dim + '40',
                  }} />
                ))}
              </View>
            </View>
            <Text style={styles.signalSymbol}>{signal.symbol}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {isNew && (
            <View style={{
              backgroundColor: C.gold, paddingHorizontal: 6, paddingVertical: 2,
              borderRadius: 4, marginBottom: 4,
            }}>
              <Text style={{ fontSize: 8, fontWeight: '800', color: C.bg, letterSpacing: 0.5 }}>NEW</Text>
            </View>
          )}
          <Text style={styles.signalTime}>{timeAgo(signal.timestamp)}</Text>
        </View>
      </View>

      <Text style={styles.signalHeadline}>{signal.headline}</Text>

      {signal.details && (
        <View style={styles.signalTags}>
          {signal.details.netflowUsd != null && (
            <View
              style={[
                styles.tag,
                {
                  backgroundColor:
                    signal.details.netflowUsd > 0 ? C.greenSoft : C.redSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  {
                    color: signal.details.netflowUsd > 0 ? C.green : C.red,
                  },
                ]}
              >
                Flow: {fmt(signal.details.netflowUsd)}
              </Text>
            </View>
          )}

          {signal.details.sentimentScore != null && (
            <View style={[styles.tag, { backgroundColor: C.goldSoft }]}>
              <Text style={[styles.tagText, { color: C.gold }]}>
                Sentiment: {signal.details.sentimentScore}
              </Text>
            </View>
          )}

          {signal.details.confidence && (
            <View style={[styles.tag, { backgroundColor: C.surfaceLight }]}>
              <Text style={[styles.tagText, { color: C.muted }]}>
                {signal.details.confidence}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ════════════════════════════════════════
// SENTIMENT GAUGE
// ════════════════════════════════════════

function SentimentGauge({ score }) {
  const col = score >= 60 ? C.green : score <= 40 ? C.red : C.gold;
  const label =
    score >= 80
      ? 'Strong Conviction'
      : score >= 60
      ? 'Accumulation'
      : score <= 20
      ? 'Strong Distribution'
      : score <= 40
      ? 'Distribution'
      : 'Neutral';

  const W = 260;
  const H = 150;
  const CX = W / 2;
  const CY = 130;
  const R = 100;
  const STROKE = 18;

  const arcPt = (deg, r) => ({
    x: CX + (r || R) * Math.cos((deg * Math.PI) / 180),
    y: CY - (r || R) * Math.sin((deg * Math.PI) / 180),
  });

  const arc = (startDeg, endDeg) => {
    const s = arcPt(startDeg);
    const e = arcPt(endDeg);
    return `M ${s.x} ${s.y} A ${R} ${R} 0 0 0 ${e.x} ${e.y}`;
  };

  const needleAng = 170 - (score / 100) * 160;
  const needleRad = (needleAng * Math.PI) / 180;
  const NEEDLE_LEN = R - STROKE - 8;
  const tipX = CX + NEEDLE_LEN * Math.cos(needleRad);
  const tipY = CY - NEEDLE_LEN * Math.sin(needleRad);
  const baseAng1 = needleRad + Math.PI / 2;
  const baseAng2 = needleRad - Math.PI / 2;
  const BASE_W = 5;
  const b1x = CX + BASE_W * Math.cos(baseAng1);
  const b1y = CY - BASE_W * Math.sin(baseAng1);
  const b2x = CX + BASE_W * Math.cos(baseAng2);
  const b2y = CY - BASE_W * Math.sin(baseAng2);

  const lblR = R + STROKE / 2 + 14;
  const lbl0 = arcPt(170, lblR);
  const lbl50 = arcPt(90, lblR);
  const lbl100 = arcPt(10, lblR);

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={W} height={H}>
        <Path d={arc(10, 170)} fill="none" stroke="#1a1920" strokeWidth={STROKE + 10} strokeLinecap="round" />
        <Path d={arc(10, 170)} fill="none" stroke="#1f1e26" strokeWidth={STROKE + 2} strokeLinecap="round" />
        <Path d={arc(115, 170)} fill="none" stroke="#dc2626" strokeWidth={STROKE} strokeLinecap="round" />
        <Path d={arc(10, 65)} fill="none" stroke="#16a34a" strokeWidth={STROKE} strokeLinecap="round" />
        <Path d={arc(63, 117)} fill="none" stroke="#ca8a04" strokeWidth={STROKE} strokeLinecap="butt" />
        <Path d={arc(10, 170)} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={1} />

        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => {
          const a = (170 - (val / 100) * 160) * Math.PI / 180;
          const isMajor = val % 50 === 0;
          const outerR = R + STROKE / 2 + 1;
          const innerR = outerR - (isMajor ? 7 : 4);
          return (
            <Line key={val}
              x1={CX + outerR * Math.cos(a)} y1={CY - outerR * Math.sin(a)}
              x2={CX + innerR * Math.cos(a)} y2={CY - innerR * Math.sin(a)}
              stroke={isMajor ? '#666' : '#3a3a3a'}
              strokeWidth={isMajor ? 1.5 : 0.8}
              strokeLinecap="round"
            />
          );
        })}

        <Path
          d={`M ${b1x + 1} ${b1y + 2} L ${tipX + 0.5} ${tipY + 1.5} L ${b2x + 1} ${b2y + 2} Z`}
          fill="rgba(0,0,0,0.35)"
        />
        <Path
          d={`M ${b1x} ${b1y} L ${tipX} ${tipY} L ${b2x} ${b2y} Z`}
          fill="#e8e4df"
        />
        <Circle cx={CX} cy={CY} r={9} fill="#111016" stroke="#333" strokeWidth={2.5} />
        <Circle cx={CX} cy={CY} r={4.5} fill={col} />
      </Svg>

      <View style={{ position: 'absolute', top: 0, width: W, height: H }}>
        <Text style={{ position: 'absolute', left: lbl0.x - 8, top: lbl0.y - 6, fontSize: 10, color: '#555', fontWeight: '700' }}>0</Text>
        <Text style={{ position: 'absolute', left: lbl50.x - 6, top: lbl50.y - 7, fontSize: 10, color: '#555', fontWeight: '700' }}>50</Text>
        <Text style={{ position: 'absolute', left: lbl100.x - 6, top: lbl100.y - 6, fontSize: 10, color: '#555', fontWeight: '700' }}>100</Text>
      </View>

      <Text style={[styles.gaugeScore, { color: col, fontSize: 38, marginTop: 2 }]}>{score}</Text>
      <Text style={[styles.gaugeLabel, { color: col, marginTop: 2 }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

// ════════════════════════════════════════
// FEED SCREEN
// ════════════════════════════════════════

function FeedScreen({
  signals,
  brief,
  loading,
  lastUpdated,
  feedError,
  onRefresh,
  onTokenPress,
  walletAddress,
  onConnectWallet,
  onDisconnectWallet,
}) {
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: STATUS_BAR_HEIGHT + 14 }]}>
        <View>
          <View style={styles.brandRow}>
            <Text style={styles.headerTitleWhite}>Sol</Text>
            <Text style={styles.headerTitleGold}>Scope</Text>
          </View>
          <Text style={styles.headerSubGold}>SEE SOLANA CLEARLY</Text>
        </View>

        <View style={styles.headerRight}>
          {walletAddress ? (
            <TouchableOpacity onPress={() => { haptic(); onDisconnectWallet(); }} style={styles.walletPill} activeOpacity={0.7}>
              <View style={[styles.statusDot, { backgroundColor: C.green }]} />
              <Text style={styles.walletPillText}>
                {walletAddress.slice(0, 4)}..{walletAddress.slice(-3)}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => { haptic('medium'); onConnectWallet(); }}
              style={styles.connectBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.connectBtnText}>Connect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: BOTTOM_CONTENT_PADDING }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={C.gold}
            colors={[C.gold]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.briefCard}>
          <Text style={styles.briefLabel}>INTELLIGENCE BRIEF</Text>
          <Text style={styles.briefText}>
            {brief
              ? `${brief.totalSignals24h} signals in 24h. Avg sentiment: ${brief.avgSentiment}.${brief.topInflows?.length ? ` Top inflows: ${brief.topInflows.map(t => t.symbol).join(', ')}.` : ''}`
              : `${signals.filter((s) => s.type === 'CONVICTION_UP').length} conviction increases and ${signals.filter((s) => ['CONVICTION_DOWN', 'SMART_MONEY_EXIT'].includes(s.type)).length} warning signals detected.`
            }
          </Text>
        </View>

        <TopTokensRow onTokenPress={onTokenPress} />

        {/* Section label with live dot and last updated */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12, paddingLeft: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <PulseDot color={C.green} size={6} />
            <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>SMART MONEY SIGNALS</Text>
          </View>
          {lastUpdated > 0 && (
            <Text style={{ fontSize: 10, color: C.dim }}>
              Updated {timeAgo(lastUpdated)}
            </Text>
          )}
        </View>

        {/* Error banner */}
        {feedError && signals.length > 0 && (
          <View style={{ backgroundColor: C.redSoft, borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: C.redBorder }}>
            <Text style={{ fontSize: 11, color: C.red, textAlign: 'center' }}>Connection issue — showing cached data</Text>
          </View>
        )}

        {signals.map((s, i) => (
          <SignalCard key={s.id || i} signal={s} onPress={onTokenPress} />
        ))}

        {signals.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color={C.gold} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>Scanning for signals...</Text>
            <Text style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>Intelligence engine is warming up</Text>
          </View>
        )}

        {/* Skeleton loading cards */}
        {signals.length === 0 && loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        <PoweredByBadge />
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════
// TOKEN DETAIL SCREEN
// ════════════════════════════════════════

function TokenScreen({ symbol, mint, onBack, backLabel, isWatchlisted, onToggleWatchlist }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (useCache = true) => {
    // Check cache first
    if (useCache && mint) {
      const cached = TOKEN_DETAIL_CACHE.get(mint);
      if (cached && Date.now() - cached.timestamp < TOKEN_CACHE_TTL) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    let backendData = null;
    let dexData = null;

    const backendPromise = (async () => {
      try {
        const res = await fetch(`${API}/token/${mint || symbol}`);
        if (res.ok) {
          const d = await res.json();
          if (mint && d.mint && d.mint !== mint) return null;
          return d;
        }
      } catch (e) {}
      return null;
    })();

    // Fetch DEX liquidity from DexScreener, volume + market cap from CoinGecko
    const dexPromise = (async () => {
      if (!mint) return null;

      // CoinGecko: accurate volume & market cap (aggregates all exchanges)
      // Use native ID for SOL, contract address lookup for all other tokens
      const cgPromise = (async () => {
        try {
          const isSol = mint === 'So11111111111111111111111111111111111111112';
          const cgUrl = isSol
            ? 'https://api.coingecko.com/api/v3/coins/solana?localization=false&tickers=false&community_data=false&developer_data=false'
            : `https://api.coingecko.com/api/v3/coins/solana/contract/${mint}`;
          const cgRes = await fetch(cgUrl);
          if (cgRes.ok) {
            const cg = await cgRes.json();
            return {
              price: cg.market_data?.current_price?.usd || 0,
              priceChange24h: cg.market_data?.price_change_percentage_24h || 0,
              volume24h: cg.market_data?.total_volume?.usd || 0,
              marketCap: cg.market_data?.market_cap?.usd || 0,
            };
          }
        } catch (e) {}
        return null;
      })();

      // DexScreener: DEX liquidity + fallback price
      const dexScreenerPromise = (async () => {
        try {
          const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
          if (res.ok) {
            const d = await res.json();
            const pair = (d.pairs || []).find(p =>
              p.chainId === 'solana' && p.baseToken?.address === mint
            );
            if (pair) return {
              price: parseFloat(pair.priceUsd) || 0,
              priceChange24h: pair.priceChange?.h24 || 0,
              volume24h: pair.volume?.h24 || 0,
              liquidity: pair.liquidity?.usd || 0,
              marketCap: pair.marketCap || pair.fdv || 0,
            };
          }
        } catch (e) {}
        return null;
      })();

      const [cgData, dexData] = await Promise.all([cgPromise, dexScreenerPromise]);

      if (!cgData && !dexData) return null;

      // Prefer CoinGecko for volume + market cap, DexScreener for liquidity
      return {
        price: cgData?.price || dexData?.price || 0,
        priceChange24h: cgData?.priceChange24h ?? dexData?.priceChange24h ?? 0,
        volume24h: cgData?.volume24h || dexData?.volume24h || 0,
        liquidity: dexData?.liquidity || 0,
        marketCap: cgData?.marketCap || dexData?.marketCap || 0,
      };
    })();

    [backendData, dexData] = await Promise.all([backendPromise, dexPromise]);

    if (backendData || dexData) {
      const merged = {
        symbol: backendData?.symbol || symbol,
        mint: backendData?.mint || mint,
        price: (backendData?.price > 0 ? backendData.price : dexData?.price) || 0,
        priceChange24h: dexData?.priceChange24h || 0,
        volume24h: dexData?.volume24h || 0,
        liquidity: dexData?.liquidity || 0,
        marketCap: dexData?.marketCap || backendData?.marketCap || 0,
        sentimentScore: backendData?.sentimentScore ?? null,
        trend: backendData?.trend || null,
        confidence: backendData?.confidence || null,
        netflowUsd: backendData?.netflowUsd ?? null,
        holdingsChangePct: backendData?.holdingsChangePct ?? null,
        smartMoneyCount: backendData?.smartMoneyCount ?? null,
        netflow1h: backendData?.netflow1h ?? null,
        netflow7d: backendData?.netflow7d ?? null,
        recentSignals: backendData?.recentSignals || [],
        hasSmartMoney: backendData != null,
      };
      setData(merged);
      if (mint) TOKEN_DETAIL_CACHE.set(mint, { data: merged, timestamp: Date.now() });
    } else {
      setError(true);
    }
    setLoading(false);
  }, [symbol, mint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(false);
    setRefreshing(false);
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={[styles.loadingContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={styles.loadingText}>Loading intelligence...</Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.screen}>
        <View style={[styles.loadingContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>📡</Text>
          <Text style={styles.loadingText}>No data available for {symbol}</Text>
          <TouchableOpacity onPress={onBack} style={{ marginTop: 20 }}>
            <Text style={{ color: C.gold, fontSize: 14 }}>{backLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const priceStr = data.price < 0.01 ? data.price?.toFixed(6) : data.price < 1 ? data.price?.toFixed(4) : data.price?.toFixed(2);
  const priceUp = (data.priceChange24h || 0) >= 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: STATUS_BAR_HEIGHT + 12,
          paddingBottom: BOTTOM_CONTENT_PADDING,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.gold}
            colors={[C.gold]}
          />
        }
      >
        {/* Back + watchlist row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <Text style={styles.backText}>{backLabel}</Text>
          </TouchableOpacity>
          {onToggleWatchlist && (
            <TouchableOpacity
              onPress={() => { haptic('medium'); onToggleWatchlist(data.symbol, data.mint || mint); }}
              activeOpacity={0.7}
              style={{ padding: 10 }}
            >
              <Text style={{ fontSize: 22 }}>{isWatchlisted ? '\u2605' : '\u2606'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Token header with trend arrow */}
        <View style={styles.tokenHeaderRow}>
          <TokenIcon symbol={data.symbol} mint={data.mint} size={50} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={styles.tokenSymbol}>{data.symbol}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.tokenPrice}>${priceStr}</Text>
              <Text style={{
                fontSize: 14, fontWeight: '700',
                color: priceUp ? C.green : C.red,
              }}>
                {priceUp ? '\u25B2' : '\u25BC'} {Math.abs(data.priceChange24h || 0).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* MARKET DATA */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PRICE (24H)</Text>
            <Text
              style={[
                styles.metricValue,
                { color: priceUp ? C.green : C.red },
              ]}
            >
              {priceUp ? '+' : ''}{(data.priceChange24h || 0).toFixed(1)}%
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>VOLUME (24H)</Text>
            <Text style={styles.metricValue}>{fmt(data.volume24h || 0)}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>LIQUIDITY</Text>
            <Text style={styles.metricValue}>{fmt(data.liquidity || 0)}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>MARKET CAP</Text>
            <Text style={styles.metricValue}>{fmt(data.marketCap || 0)}</Text>
          </View>
        </View>

        {/* SMART MONEY SENTIMENT */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SMART MONEY SENTIMENT</Text>
          {data.hasSmartMoney ? (
            <SentimentGauge score={data.sentimentScore} />
          ) : (
            <View style={{ opacity: 0.35 }}>
              <SentimentGauge score={50} />
            </View>
          )}
          {!data.hasSmartMoney && (
            <Text style={{ fontSize: 11, color: C.dim, textAlign: 'center', marginTop: -4, marginBottom: 4 }}>
              Smart money wallets haven't traded this token recently
            </Text>
          )}
        </View>

        {/* SMART MONEY ACTIVITY */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SMART MONEY ACTIVITY</Text>
          {[
            { l: 'Active Wallets', v: data.hasSmartMoney ? `${data.smartMoneyCount || 0} tracking` : '\u2014', col: data.hasSmartMoney ? C.gold : C.dim },
            { l: 'Net Flow (24h)', v: data.hasSmartMoney ? fmt(data.netflowUsd || 0) : '\u2014', col: data.hasSmartMoney ? ((data.netflowUsd || 0) >= 0 ? C.green : C.red) : C.dim },
            { l: '1h Flow', v: data.hasSmartMoney ? fmt(data.netflow1h || 0) : '\u2014', col: data.hasSmartMoney ? ((data.netflow1h || 0) >= 0 ? C.green : C.red) : C.dim },
            { l: '7d Flow', v: data.hasSmartMoney ? fmt(data.netflow7d || 0) : '\u2014', col: data.hasSmartMoney ? ((data.netflow7d || 0) >= 0 ? C.green : C.red) : C.dim },
            { l: 'Holdings Change', v: data.hasSmartMoney ? `${(data.holdingsChangePct || 0) > 0 ? '+' : ''}${(data.holdingsChangePct || 0).toFixed(1)}%` : '\u2014', col: data.hasSmartMoney ? ((data.holdingsChangePct || 0) >= 0 ? C.green : C.red) : C.dim },
            { l: 'Confidence', v: data.hasSmartMoney ? (data.confidence || 'N/A') : '\u2014', col: data.hasSmartMoney ? C.text : C.dim },
          ].map((h) => (
            <View key={h.l} style={styles.activityRow}>
              <Text style={styles.distLabel}>{h.l}</Text>
              <Text style={[styles.distValue, { color: h.col }]}>{h.v}</Text>
            </View>
          ))}
        </View>

        {data.recentSignals?.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RECENT SIGNALS</Text>
            {data.recentSignals.map((s, i) => (
              <View key={i} style={styles.miniSignal}>
                <TokenIcon symbol={s.symbol} mint={s.mint} size={28} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.miniSignalLabel}>{s.label}</Text>
                  <Text style={styles.miniSignalTime}>{timeAgo(s.timestamp)}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <PoweredByBadge />
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════
// WATCHLIST SCREEN
// ════════════════════════════════════════

function WatchlistScreen({ watchlist, onTokenPress, onRemove }) {
  const [prices, setPrices] = useState({});
  const [intel, setIntel] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (watchlist.length === 0) { setLoading(false); return; }
    const mints = watchlist.map(t => t.mint).filter(Boolean);
    if (!mints.length) { setLoading(false); return; }

    // Fetch prices and smart money intelligence in parallel
    const pricePromise = fetch(`https://api.dexscreener.com/latest/dex/tokens/${mints.join(',')}`)
      .then(r => r.json())
      .then(data => {
        const p = {};
        for (const t of watchlist) {
          const pair = (data.pairs || []).find(pr =>
            pr.chainId === 'solana' && pr.baseToken?.address === t.mint
          );
          if (pair) {
            p[t.mint] = {
              price: parseFloat(pair.priceUsd) || 0,
              change24h: pair.priceChange?.h24 || 0,
            };
          }
        }
        setPrices(p);
      })
      .catch(() => {});

    const intelPromise = Promise.all(
      watchlist.map(t =>
        fetch(`${API}/token/${t.symbol}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      const i = {};
      results.forEach((data, idx) => {
        if (data) i[watchlist[idx].mint] = data;
      });
      setIntel(i);
    });

    Promise.all([pricePromise, intelPromise]).finally(() => setLoading(false));
  }, [watchlist]);

  const getSentimentColor = (score) => {
    if (score >= 65) return C.green;
    if (score <= 35) return C.red;
    return C.gold;
  };

  const getTrendLabel = (data) => {
    if (!data) return null;
    if (data.sentimentScore >= 65) return 'Accumulating';
    if (data.sentimentScore <= 35) return 'Distributing';
    return 'Neutral';
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: STATUS_BAR_HEIGHT + 14 }]}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.7 }}>
            Watchlist
          </Text>
          <Text style={{ fontSize: 10, color: C.dim, letterSpacing: 2.4, marginTop: 4, fontWeight: '700' }}>
            YOUR TOKENS
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: BOTTOM_CONTENT_PADDING }}
        showsVerticalScrollIndicator={false}
      >
        {watchlist.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>{'\u2606'}</Text>
            <Text style={styles.emptyText}>No tokens in your watchlist</Text>
            <Text style={{ fontSize: 12, color: C.dim, marginTop: 8, textAlign: 'center', lineHeight: 18 }}>
              Tap the star icon on any token's detail page{'\n'}to add it to your watchlist
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>WATCHING {watchlist.length} TOKEN{watchlist.length !== 1 ? 'S' : ''}</Text>
            {watchlist.map((t) => {
              const p = prices[t.mint];
              const sm = intel[t.mint];
              const priceUp = (p?.change24h || 0) >= 0;
              const sentCol = sm ? getSentimentColor(sm.sentimentScore) : C.dim;
              const trendLabel = getTrendLabel(sm);
              return (
                <TouchableOpacity
                  key={t.mint || t.symbol}
                  onPress={() => { haptic(); onTokenPress(t.symbol, t.mint); }}
                  activeOpacity={0.7}
                  style={styles.watchlistCard}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View>
                      <TokenIcon symbol={t.symbol} mint={t.mint} size={40} />
                      {sm && (
                        <View style={{
                          position: 'absolute', bottom: -2, right: -2,
                          width: 14, height: 14, borderRadius: 7,
                          backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
                        }}>
                          <View style={{
                            width: 8, height: 8, borderRadius: 4,
                            backgroundColor: sentCol,
                          }} />
                        </View>
                      )}
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{t.symbol}</Text>
                        {sm && (
                          <Text style={{ fontSize: 11, fontWeight: '600', color: sentCol }}>
                            {sm.sentimentScore}
                          </Text>
                        )}
                      </View>
                      {p ? (
                        <Text style={{ fontSize: 13, color: C.muted, marginTop: 1 }}>
                          ${p.price < 0.01 ? p.price.toFixed(6) : p.price < 1 ? p.price.toFixed(4) : p.price.toFixed(2)}
                        </Text>
                      ) : loading ? (
                        <View style={{ width: 50, height: 10, borderRadius: 4, backgroundColor: C.surfaceLight, marginTop: 4 }} />
                      ) : null}
                      {sm && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          <Text style={{ fontSize: 10, color: sentCol, fontWeight: '600' }}>
                            {trendLabel}
                          </Text>
                          <Text style={{ fontSize: 10, color: C.dim }}>
                            {sm.smartMoneyCount} wallet{sm.smartMoneyCount !== 1 ? 's' : ''}
                          </Text>
                          {sm.netflowUsd !== 0 && (
                            <Text style={{ fontSize: 10, color: sm.netflowUsd > 0 ? C.green : C.red }}>
                              {sm.netflowUsd > 0 ? '+' : ''}{fmt(sm.netflowUsd)}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                    {p && (
                      <Text style={{
                        fontSize: 14, fontWeight: '700',
                        color: priceUp ? C.green : C.red,
                        marginRight: 10,
                      }}>
                        {priceUp ? '+' : ''}{(p.change24h || 0).toFixed(1)}%
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => { haptic(); onRemove(t.mint); }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ padding: 4 }}
                  >
                    <Text style={{ fontSize: 14, color: C.dim }}>{'\u2715'}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <PoweredByBadge />
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════
// ALERTS SCREEN
// ════════════════════════════════════════

function AlertsScreen({ rules, setRules }) {
  const exampleRules = [
    {
      label: 'Conviction Above 75',
      desc: 'Alert when any token sentiment > 75',
      type: 'sentiment_above',
      value: '75',
    },
    {
      label: 'Large Inflow > $5K',
      desc: 'Alert when smart money inflow exceeds $5K',
      type: 'inflow_above',
      value: '5000',
    },
    {
      label: 'Smart Money Exit',
      desc: 'Alert on all smart money exit signals',
      type: 'smart_money_exit',
      value: 'any',
    },
    {
      label: 'Sentiment Drop Below 30',
      desc: 'Alert when sentiment falls below 30',
      type: 'sentiment_below',
      value: '30',
    },
  ];

  const addRule = (rule) => {
    if (rules.find((r) => r.type === rule.type)) {
      Alert.alert('Already Added', 'This alert rule already exists.');
      return;
    }

    haptic('success');
    const updated = [...rules, { ...rule, id: Date.now().toString(), enabled: true }];
    setRules(updated);

    Alert.alert(
      'Alert Created',
      `You'll be notified when: ${rule.desc}\n\nFor Telegram alerts, message the SolScope bot.`
    );
  };

  const removeRule = (id) => {
    haptic();
    setRules(rules.filter((x) => x.id !== id));
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: STATUS_BAR_HEIGHT + 14 }]}>
        <View>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: C.text,
              letterSpacing: -0.7,
            }}
          >
            Alerts
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: C.dim,
              letterSpacing: 2.4,
              marginTop: 4,
              fontWeight: '700',
            }}
          >
            CUSTOM INTELLIGENCE
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: BOTTOM_CONTENT_PADDING }}
        showsVerticalScrollIndicator={false}
      >
        {rules.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ACTIVE RULES</Text>
            {rules.map((r) => (
              <View key={r.id} style={[styles.ruleCard, { borderColor: C.greenBorder }]}>
                <View style={styles.ruleLeft}>
                  <Text style={{ fontSize: 20 }}>🔔</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.ruleLabel}>{r.label}</Text>
                    <Text style={styles.ruleDesc}>{r.desc}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => removeRule(r.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.ruleRemove}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionLabel}>ADD ALERT RULES</Text>

        {exampleRules.map((r, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => addRule(r)}
            style={styles.quickRule}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.quickRuleLabel}>{r.label}</Text>
              <Text style={styles.quickRuleDesc}>{r.desc}</Text>
            </View>

            <View style={styles.addBadge}>
              <Text style={styles.addBadgeText}>+ Add</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={[styles.card, { marginTop: 20 }]}>
          <Text style={styles.cardTitle}>Telegram Alerts</Text>
          <Text style={styles.cardDesc}>
            Get intelligence signals delivered directly to Telegram. Message the
            SolScope bot to set up real-time notifications.
          </Text>

          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>/feed — Latest signals</Text>
            <Text style={styles.codeText}>/token JUP — Token intelligence</Text>
            <Text style={styles.codeText}>/setalert sentiment_above 75</Text>
            <Text style={styles.codeText}>/brief — Daily intelligence brief</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How Signals Work</Text>
          <Text style={styles.cardDesc}>
            SolScope monitors Solana tokens using Helius for blockchain events,
            Jupiter for market context, and Nansen for smart money intelligence.
            When conviction changes are detected, SolScope sends an alert with the
            relevant token context.
          </Text>
        </View>

        <PoweredByBadge />
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════

export default function App() {
  const [tab, setTab] = useState('feed');
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [brief, setBrief] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [feedError, setFeedError] = useState(false);
  const [sourceTab, setSourceTab] = useState('feed');

  // Persisted state
  const [alertRules, setAlertRules] = useState([]);
  const [watchlist, setWatchlist] = useState([]);

  // Load persisted data on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedRules, savedWatchlist] = await Promise.all([
          AsyncStorage.getItem('solscope_alert_rules'),
          AsyncStorage.getItem('solscope_watchlist'),
        ]);
        if (savedRules) setAlertRules(JSON.parse(savedRules));
        if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
      } catch (e) {}
    })();
  }, []);

  // Persist alert rules
  const updateAlertRules = useCallback((rules) => {
    setAlertRules(rules);
    AsyncStorage.setItem('solscope_alert_rules', JSON.stringify(rules)).catch(() => {});
  }, []);

  // Persist watchlist
  const updateWatchlist = useCallback((list) => {
    setWatchlist(list);
    AsyncStorage.setItem('solscope_watchlist', JSON.stringify(list)).catch(() => {});
  }, []);

  const toggleWatchlist = useCallback((symbol, mint) => {
    setWatchlist(prev => {
      const exists = prev.find(t => t.mint === mint);
      const next = exists ? prev.filter(t => t.mint !== mint) : [...prev, { symbol, mint }];
      AsyncStorage.setItem('solscope_watchlist', JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const isWatchlisted = useCallback((mint) => {
    return watchlist.some(t => t.mint === mint);
  }, [watchlist]);

  // Android back button handler
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tab === 'token' && selectedToken) {
        setTab(sourceTab);
        setSelectedToken(null);
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [tab, selectedToken, sourceTab]);

  const loadFeed = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [feedRes, briefRes] = await Promise.all([
        fetch(`${API}/feed?limit=20`),
        fetch(`${API}/brief`),
      ]);
      let gotData = false;
      if (feedRes.ok) {
        const data = await feedRes.json();
        if (data.signals?.length > 0) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setSignals(data.signals);
          gotData = true;
        }
      }
      if (briefRes.ok) {
        const data = await briefRes.json();
        setBrief(data);
      }
      if (gotData) {
        setLastUpdated(Date.now());
        setFeedError(false);
      }
    } catch (e) {
      setFeedError(true);
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    const interval = setInterval(() => loadFeed(true), 60000);
    return () => clearInterval(interval);
  }, [loadFeed]);

  const connectWallet = useCallback(async () => {
    try {
      const authResult = await transact(async (wallet) => {
        return await wallet.authorize({
          chain: 'solana:mainnet',
          identity: {
            name: 'SolScope',
            uri: 'https://solscope.xyz',
            icon: 'favicon.png',
          },
        });
      });

      const firstAccount = authResult?.accounts?.[0];

      let address = null;
      if (typeof firstAccount?.address === 'string') {
        address = firstAccount.address;
      } else if (firstAccount?.publicKey?.toBase58) {
        address = firstAccount.publicKey.toBase58();
      } else if (firstAccount?.publicKey) {
        address = String(firstAccount.publicKey);
      }

      if (address) {
        haptic('success');
        setWalletAddress(address);
        return;
      }

      setWalletAddress('Connected');
    } catch (e) {
      const msg = String(e?.message || '');

      const userCancelled =
        msg.toLowerCase().includes('cancelled by user') ||
        msg.toLowerCase().includes('canceled by user') ||
        msg.toLowerCase().includes('local association cancelled') ||
        msg.toLowerCase().includes('local association canceled');

      if (userCancelled) {
        return;
      }

      Alert.alert(
        'Wallet Connection Failed',
        msg || 'Could not connect to a Solana mobile wallet.'
      );
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
  }, []);

  const onTokenPress = (symbol, mint) => {
    haptic();
    setSourceTab(tab);
    setSelectedToken({ symbol, mint: mint || null });
    setTab('token');
  };

  if (tab === 'token' && selectedToken) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
        <TokenScreen
          symbol={selectedToken.symbol}
          mint={selectedToken.mint}
          backLabel={`\u2190 Back to ${sourceTab === 'watchlist' ? 'watchlist' : sourceTab === 'alerts' ? 'alerts' : 'feed'}`}
          onBack={() => {
            setTab(sourceTab);
            setSelectedToken(null);
          }}
          isWatchlisted={isWatchlisted(selectedToken.mint)}
          onToggleWatchlist={toggleWatchlist}
        />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />

      {tab === 'feed' && (
        <FeedScreen
          signals={signals}
          brief={brief}
          loading={loading}
          lastUpdated={lastUpdated}
          feedError={feedError}
          onRefresh={loadFeed}
          onTokenPress={onTokenPress}
          walletAddress={walletAddress}
          onConnectWallet={connectWallet}
          onDisconnectWallet={disconnectWallet}
        />
      )}

      {tab === 'watchlist' && (
        <WatchlistScreen
          watchlist={watchlist}
          onTokenPress={onTokenPress}
          onRemove={(mint) => { haptic(); updateWatchlist(watchlist.filter(t => t.mint !== mint)); }}
        />
      )}

      {tab === 'alerts' && <AlertsScreen rules={alertRules} setRules={updateAlertRules} />}

      <View style={styles.bottomNav}>
        {[
          { id: 'feed', ico: '\uD83D\uDCE1', l: 'Signals' },
          { id: 'watchlist', ico: '\u2606', l: 'Watchlist' },
          { id: 'alerts', ico: '\uD83D\uDD14', l: 'Alerts' },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => { haptic(); setTab(t.id); }}
            style={styles.navItem}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, tab === t.id && styles.navIconActive]}>
              {t.ico}
            </Text>
            <Text style={[styles.navLabel, tab === t.id && styles.navLabelActive]}>
              {t.l}
            </Text>
            {tab === t.id && <View style={styles.navDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ════════════════════════════════════════
// STYLES
// ════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, backgroundColor: C.bg },
  scrollView: { flex: 1, paddingHorizontal: 16 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  headerTitleWhite: {
    fontSize: 30,
    fontWeight: '800',
    color: '#f2efea',
    letterSpacing: -1.2,
  },
  headerTitleGold: {
    fontSize: 30,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: -1.2,
    marginLeft: 2,
  },
  headerSubGold: {
    fontSize: 10,
    color: '#9f7a2f',
    letterSpacing: 5,
    fontWeight: '700',
    marginTop: 6,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  connectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: C.goldBorder,
    minWidth: 96,
    alignItems: 'center',
  },
  connectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.gold,
    letterSpacing: 0.2,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.greenSoft,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  walletPillText: {
    fontSize: 11,
    color: C.green,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  briefCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 16,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  briefLabel: {
    fontSize: 10,
    color: C.gold,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 10,
  },
  briefText: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 24,
  },

  sectionLabel: {
    fontSize: 10,
    color: C.dim,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 12,
    paddingLeft: 4,
  },

  topTokenCard: {
    width: 100,
    padding: 12,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 10,
    alignItems: 'center',
    gap: 6,
  },
  topTokenSymbol: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 0.3,
  },
  topTokenPrice: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '500',
  },
  topTokenChange: {
    fontSize: 11,
    fontWeight: '700',
  },

  signalCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    marginBottom: 12,
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  signalLeft: { flexDirection: 'row', alignItems: 'center' },
  signalType: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  signalSymbol: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  signalTime: {
    fontSize: 11,
    color: C.dim,
  },
  signalHeadline: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 2,
  },
  signalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 14,
    color: C.dim,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: C.muted,
  },

  backButton: { paddingVertical: 14 },
  backText: {
    fontSize: 14,
    color: C.muted,
  },

  tokenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tokenSymbol: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.7,
  },
  tokenPrice: {
    fontSize: 15,
    color: C.muted,
    marginTop: 2,
  },

  card: {
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 10,
    color: C.dim,
    letterSpacing: 1.7,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 20,
  },

  gaugeContainer: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  gaugeScore: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
  },
  gaugeLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginTop: 4,
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    width: '47%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  metricLabel: {
    fontSize: 9,
    color: C.dim,
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
  },

  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  distLabel: {
    fontSize: 13,
    color: C.muted,
  },
  distValue: {
    fontSize: 13,
    fontWeight: '600',
  },

  miniSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 6,
  },
  miniSignalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  miniSignalTime: {
    fontSize: 10,
    color: C.dim,
  },

  watchlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },

  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    marginBottom: 8,
  },
  ruleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ruleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  ruleDesc: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  ruleRemove: {
    fontSize: 16,
    color: C.red,
    padding: 8,
  },

  quickRule: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  quickRuleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  quickRuleDesc: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  addBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  addBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.gold,
  },

  codeBlock: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: C.bg,
    gap: 6,
  },
  codeText: {
    fontSize: 12,
    color: C.gold,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  poweredByContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 6,
  },
  poweredByText: {
    fontSize: 8,
    color: C.dim,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 6,
  },
  poweredByLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  brandLogoWrap: {
    alignItems: 'center',
  },
  brandLogo: {
    width: 36,
    height: 36,
    opacity: 0.5,
  },

  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 42 : 18,
    height: BOTTOM_NAV_HEIGHT,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 4,
    minHeight: 54,
  },
  navIcon: {
    fontSize: 22,
    opacity: 0.35,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 11,
    color: C.dim,
    fontWeight: '500',
    marginTop: 3,
  },
  navLabelActive: {
    color: C.gold,
    fontWeight: '700',
  },
  navDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.gold,
    marginTop: 4,
  },
});
