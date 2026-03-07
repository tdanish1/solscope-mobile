import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  SafeAreaView, ActivityIndicator, RefreshControl, Linking, Alert,
  TextInput, Platform,
} from 'react-native';
import 'react-native-get-random-values';

// ═══════════════════════════════════════════════
// SOLSCOPE — Smart Money Intelligence Feed
// Built for Solana Seeker · Monolith Hackathon
// ═══════════════════════════════════════════════

const API = "https://solscope-production.up.railway.app/api";

// ── Colors ──
const C = {
  bg: '#08070c', surface: '#111016', surfaceLight: '#18171e',
  border: '#1f1e26', text: '#e4e0db', muted: '#7a7780',
  dim: '#3d3b44', gold: '#d4a843', goldSoft: '#1e1812',
  green: '#4ade80', greenSoft: '#0d1a12', greenBorder: '#1a3325',
  red: '#f87171', redSoft: '#1a0d0d', redBorder: '#33191a',
  blue: '#60a5fa',
};

// ── Format helpers ──
const fmt = n => { const a = Math.abs(n); if (a >= 1e9) return "$"+(n/1e9).toFixed(1)+"B"; if (a >= 1e6) return "$"+(n/1e6).toFixed(1)+"M"; if (a >= 1e3) return "$"+(n/1e3).toFixed(1)+"K"; return "$"+n.toFixed(0); };
const timeAgo = ts => { const s = Math.floor((Date.now()-ts)/1000); if(s<60) return s+"s ago"; if(s<3600) return Math.floor(s/60)+"m ago"; if(s<86400) return Math.floor(s/3600)+"h ago"; return Math.floor(s/86400)+"d ago"; };

// ── Mock signals (shown when backend is loading or unavailable) ──
const MOCK_SIGNALS = [
  { id:"1", type:"CONVICTION_UP", emoji:"🔥", label:"Conviction Increasing", symbol:"JUP", headline:"Smart money conviction increasing on JUP", timestamp:Date.now()-180000, details:{netflowUsd:4200000,holdingsChangePct:26,sentimentScore:78,confidence:"HIGH",fundsAccumulating:4}},
  { id:"2", type:"SMART_MONEY_ENTRY", emoji:"🐋", label:"Smart Money Entry", symbol:"DRIFT", headline:"New smart money positions detected in DRIFT", timestamp:Date.now()-420000, details:{newPositions:3,netflowUsd:2100000,holdingsChangePct:31,confidence:"HIGH"}},
  { id:"3", type:"CONVICTION_DOWN", emoji:"⚠️", label:"Conviction Decreasing", symbol:"BONK", headline:"Smart money reducing exposure to BONK", timestamp:Date.now()-900000, details:{netflowUsd:-3800000,holdingsChangePct:-19,sentimentScore:34,confidence:"HIGH"}},
  { id:"4", type:"SENTIMENT_SPIKE", emoji:"⚡", label:"Sentiment Spike", symbol:"PYTH", headline:"Sentiment surging for PYTH (+18 pts)", timestamp:Date.now()-1500000, details:{previousScore:52,currentScore:70,delta:18,sentimentScore:70}},
  { id:"5", type:"SMART_MONEY_EXIT", emoji:"🚪", label:"Smart Money Exit", symbol:"WIF", headline:"Smart money closing positions in WIF", timestamp:Date.now()-2400000, details:{netflowUsd:-2500000,holdingsChangePct:-22,confidence:"MEDIUM"}},
  { id:"6", type:"CONVICTION_UP", emoji:"🔥", label:"Conviction Increasing", symbol:"SOL", headline:"Smart money conviction increasing on SOL", timestamp:Date.now()-3600000, details:{netflowUsd:8400000,holdingsChangePct:12,sentimentScore:82,confidence:"HIGH",fundsAccumulating:7}},
];

const MOCK_TOKEN = (sym) => ({
  symbol: sym, price: sym==="SOL"?138.42:sym==="JUP"?1.24:sym==="DRIFT"?1.15:sym==="BONK"?0.0000312:sym==="PYTH"?0.38:0.89,
  sentimentScore: sym==="JUP"?78:sym==="BONK"?34:sym==="SOL"?82:sym==="DRIFT"?71:65,
  trend: sym==="BONK"?"DISTRIBUTION":"ACCUMULATION", confidence:"HIGH",
  netflowUsd: sym==="BONK"?-3800000:sym==="WIF"?-2500000:4200000,
  holdingsChangePct: sym==="BONK"?-19:sym==="WIF"?-22:26,
  holderDistribution:{ smartMoney:18, retail:67, exchange:15 },
  smartMoneyCount: sym==="JUP"?4:sym==="SOL"?7:3,
  recentSignals: MOCK_SIGNALS.filter(s=>s.symbol===sym).slice(0,3),
});

// ════════════════════════════════════════════════
// SIGNAL CARD COMPONENT
// ════════════════════════════════════════════════
function SignalCard({ signal, onPress }) {
  const positive = ["CONVICTION_UP","SMART_MONEY_ENTRY"].includes(signal.type) || (signal.type === "SENTIMENT_SPIKE" && signal.details?.delta > 0);
  const negative = ["CONVICTION_DOWN","SMART_MONEY_EXIT"].includes(signal.type);

  return (
    <TouchableOpacity onPress={() => onPress(signal.symbol)} activeOpacity={0.7}
      style={[styles.signalCard, { borderColor: positive ? C.greenBorder : negative ? C.redBorder : C.border }]}>
      <View style={styles.signalHeader}>
        <View style={styles.signalLeft}>
          <Text style={styles.signalEmoji}>{signal.emoji}</Text>
          <View>
            <Text style={[styles.signalType, { color: positive ? C.green : negative ? C.red : C.gold }]}>
              {signal.label?.toUpperCase()}
            </Text>
            <Text style={styles.signalSymbol}>{signal.symbol}</Text>
          </View>
        </View>
        <Text style={styles.signalTime}>{timeAgo(signal.timestamp)}</Text>
      </View>
      <Text style={styles.signalHeadline}>{signal.headline}</Text>
      {signal.details && (
        <View style={styles.signalTags}>
          {signal.details.netflowUsd != null && (
            <View style={[styles.tag, { backgroundColor: signal.details.netflowUsd > 0 ? C.greenSoft : C.redSoft }]}>
              <Text style={[styles.tagText, { color: signal.details.netflowUsd > 0 ? C.green : C.red }]}>
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
            <View style={[styles.tag, { backgroundColor: C.surface }]}>
              <Text style={[styles.tagText, { color: C.muted }]}>{signal.details.confidence}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ════════════════════════════════════════════════
// SENTIMENT GAUGE
// ════════════════════════════════════════════════
function SentimentGauge({ score }) {
  const col = score >= 60 ? C.green : score <= 40 ? C.red : C.gold;
  const label = score >= 80 ? "Strong Conviction" : score >= 60 ? "Accumulation" : score <= 20 ? "Strong Distribution" : score <= 40 ? "Distribution" : "Neutral";
  return (
    <View style={styles.gaugeContainer}>
      <Text style={[styles.gaugeScore, { color: col }]}>{score}</Text>
      <Text style={[styles.gaugeLabel, { color: col }]}>{label.toUpperCase()}</Text>
      <View style={styles.gaugeBarBg}>
        <View style={[styles.gaugeBarFill, { width: `${score}%`, backgroundColor: col }]} />
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════
// SCREEN 1: INTELLIGENCE FEED
// ════════════════════════════════════════════════
function FeedScreen({ signals, loading, onRefresh, onTokenPress, walletAddress, onConnectWallet }) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SolScope</Text>
          <Text style={styles.headerSub}>SEE SOLANA CLEARLY</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusDot, { backgroundColor: loading ? C.gold : C.green }]} />
          <Text style={[styles.statusText, { color: loading ? C.gold : C.green }]}>
            {loading ? "LOADING" : "LIVE"}
          </Text>
        </View>
      </View>

      {/* Wallet Connection */}
      {!walletAddress ? (
        <TouchableOpacity onPress={onConnectWallet} style={styles.walletBanner} activeOpacity={0.8}>
          <Text style={styles.walletBannerIcon}>🔗</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.walletBannerTitle}>Connect Wallet</Text>
            <Text style={styles.walletBannerSub}>Tap to connect via Solana Mobile Wallet</Text>
          </View>
          <Text style={styles.walletBannerArrow}>→</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.walletConnected}>
          <Text style={styles.walletConnectedIcon}>✓</Text>
          <Text style={styles.walletConnectedText}>
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={C.gold} />}
        showsVerticalScrollIndicator={false}>

        {/* Intelligence Brief */}
        <View style={styles.briefCard}>
          <Text style={styles.briefLabel}>INTELLIGENCE BRIEF</Text>
          <Text style={styles.briefText}>
            {signals.filter(s => s.type === "CONVICTION_UP").length} conviction increases and{" "}
            {signals.filter(s => ["CONVICTION_DOWN", "SMART_MONEY_EXIT"].includes(s.type)).length} warning
            signals detected in the last 24 hours.
          </Text>
        </View>

        {/* Signal Feed */}
        <Text style={styles.sectionLabel}>LATEST SIGNALS</Text>
        {signals.map((s, i) => (
          <SignalCard key={s.id || i} signal={s} onPress={onTokenPress} />
        ))}

        {signals.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={styles.emptyText}>Scanning for signals...</Text>
          </View>
        )}

        {/* Attribution */}
        <Text style={styles.attribution}>Data: Nansen · Helius · Jupiter</Text>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════
// SCREEN 2: TOKEN INTELLIGENCE PAGE
// ════════════════════════════════════════════════
function TokenScreen({ symbol, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/token/${symbol}`);
        if (res.ok) { const d = await res.json(); setData(d); setLoading(false); return; }
      } catch (e) {}
      setData(MOCK_TOKEN(symbol));
      setLoading(false);
    })();
  }, [symbol]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={styles.loadingText}>Loading intelligence...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const flowPositive = data.netflowUsd >= 0;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back to feed</Text>
        </TouchableOpacity>

        {/* Token header */}
        <View style={styles.tokenHeader}>
          <Text style={styles.tokenSymbol}>{data.symbol}</Text>
          <Text style={styles.tokenPrice}>
            ${data.price < 0.01 ? data.price?.toFixed(6) : data.price?.toFixed(4)}
          </Text>
        </View>

        {/* Sentiment gauge */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SMART MONEY SENTIMENT</Text>
          <SentimentGauge score={data.sentimentScore} />
        </View>

        {/* Key metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>NET FLOW (24H)</Text>
            <Text style={[styles.metricValue, { color: flowPositive ? C.green : C.red }]}>
              {fmt(data.netflowUsd)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>HOLDINGS CHANGE</Text>
            <Text style={[styles.metricValue, { color: data.holdingsChangePct >= 0 ? C.green : C.red }]}>
              {data.holdingsChangePct > 0 ? "+" : ""}{data.holdingsChangePct?.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>CONFIDENCE</Text>
            <Text style={styles.metricValue}>{data.confidence}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>SMART MONEY</Text>
            <Text style={styles.metricValue}>{data.smartMoneyCount} wallets</Text>
          </View>
        </View>

        {/* Holder distribution */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>HOLDER DISTRIBUTION</Text>
          {[
            { l: "Smart Money", v: data.holderDistribution?.smartMoney || 0, col: C.gold },
            { l: "Retail", v: data.holderDistribution?.retail || 0, col: C.blue },
            { l: "Exchange", v: data.holderDistribution?.exchange || 0, col: C.muted },
          ].map(h => (
            <View key={h.l} style={styles.distRow}>
              <View style={styles.distHeader}>
                <Text style={styles.distLabel}>{h.l}</Text>
                <Text style={[styles.distValue, { color: h.col }]}>{h.v.toFixed(1)}%</Text>
              </View>
              <View style={styles.distBarBg}>
                <View style={[styles.distBarFill, { width: `${h.v}%`, backgroundColor: h.col }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Recent signals */}
        {data.recentSignals?.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RECENT SIGNALS</Text>
            {data.recentSignals.map((s, i) => (
              <View key={i} style={styles.miniSignal}>
                <Text style={styles.miniSignalEmoji}>{s.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniSignalLabel}>{s.label}</Text>
                  <Text style={styles.miniSignalTime}>{timeAgo(s.timestamp)}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={styles.attribution}>Data: Nansen · Helius · Jupiter</Text>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════
// SCREEN 3: ALERTS
// ════════════════════════════════════════════════
function AlertsScreen() {
  const [rules, setRules] = useState([]);

  const exampleRules = [
    { label: "Conviction Above 75", desc: "Alert when any token sentiment > 75", type: "sentiment_above", value: "75" },
    { label: "Large Inflow", desc: "Alert when smart money inflow > $2M", type: "inflow_above", value: "2000000" },
    { label: "Smart Money Exit", desc: "Alert on all smart money exit signals", type: "smart_money_exit", value: "any" },
  ];

  const addQuickRule = (rule) => {
    if (rules.find(r => r.type === rule.type)) {
      Alert.alert("Already Added", "This alert rule already exists.");
      return;
    }
    setRules([...rules, { ...rule, id: Date.now().toString(), enabled: true }]);
    Alert.alert("Alert Created", `You'll be notified when: ${rule.desc}\n\nFor Telegram alerts, message the SolScope bot.`);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alerts</Text>
          <Text style={styles.headerSub}>CUSTOM INTELLIGENCE</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Active rules */}
        {rules.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ACTIVE RULES</Text>
            {rules.map((r, i) => (
              <View key={r.id} style={styles.ruleCard}>
                <View style={styles.ruleLeft}>
                  <Text style={styles.ruleEmoji}>🔔</Text>
                  <View>
                    <Text style={styles.ruleLabel}>{r.label}</Text>
                    <Text style={styles.ruleDesc}>{r.desc}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setRules(rules.filter(x => x.id !== r.id))}>
                  <Text style={styles.ruleRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Quick add */}
        <Text style={styles.sectionLabel}>QUICK ADD</Text>
        {exampleRules.map((r, i) => (
          <TouchableOpacity key={i} onPress={() => addQuickRule(r)} style={styles.quickRule} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickRuleLabel}>{r.label}</Text>
              <Text style={styles.quickRuleDesc}>{r.desc}</Text>
            </View>
            <Text style={styles.quickRuleAdd}>+ Add</Text>
          </TouchableOpacity>
        ))}

        {/* Telegram section */}
        <View style={[styles.card, { marginTop: 20 }]}>
          <Text style={styles.cardTitle}>Telegram Alerts</Text>
          <Text style={styles.cardDesc}>
            Get intelligence signals delivered directly to Telegram. Message the SolScope bot and use commands like:
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>/feed — Latest signals</Text>
            <Text style={styles.codeText}>/token JUP — Token page</Text>
            <Text style={styles.codeText}>/setalert sentiment_above 75</Text>
            <Text style={styles.codeText}>/brief — Daily brief</Text>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How Signals Work</Text>
          <Text style={styles.cardDesc}>
            SolScope continuously monitors Solana tokens using Helius for blockchain events, Jupiter for market context, and Nansen for smart money intelligence. When conviction changes, new entries, exits, or sentiment spikes are detected — you get notified. No noise. Only signal.
          </Text>
        </View>

        <Text style={styles.attribution}>Data: Nansen · Helius · Jupiter</Text>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState('feed');
  const [signals, setSignals] = useState(MOCK_SIGNALS);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/feed?limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.signals?.length > 0) setSignals(data.signals);
      }
    } catch (e) { /* use existing/mock data */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Solana Mobile Wallet connection
  const connectWallet = useCallback(async () => {
    try {
      // Attempt Solana Mobile Wallet Adapter
      const { transact } = await import('@solana-mobile/mobile-wallet-adapter-protocol');
      const authResult = await transact(async (wallet) => {
        const auth = await wallet.authorize({
          identity: {
            name: 'SolScope',
            uri: 'https://solscope.xyz',
            icon: 'https://solscope.xyz/icon.png',
          },
          cluster: 'mainnet-beta',
        });
        return auth;
      });

      if (authResult?.accounts?.[0]) {
        const address = authResult.accounts[0].address;
        // Convert bytes to base58 if needed
        const addr = typeof address === 'string' ? address :
          require('bs58')?.encode?.(address) || 'Connected';
        setWalletAddress(addr);
        Alert.alert('Wallet Connected', `Connected: ${addr.slice(0,8)}...`);
      }
    } catch (e) {
      // Fallback: prompt to install a Solana wallet
      Alert.alert(
        'Connect Wallet',
        'To connect your wallet, make sure you have a Solana wallet app installed (Phantom, Solflare, or Seed Vault).',
        [
          { text: 'Open Phantom', onPress: () => Linking.openURL('https://phantom.app/download') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, []);

  const onTokenPress = (symbol) => {
    setSelectedToken(symbol);
    setTab('token');
  };

  // Token detail screen
  if (tab === 'token' && selectedToken) {
    return <TokenScreen symbol={selectedToken} onBack={() => { setTab('feed'); setSelectedToken(null); }} />;
  }

  return (
    <View style={styles.container}>
      {/* Active screen */}
      {tab === 'feed' && (
        <FeedScreen
          signals={signals}
          loading={loading}
          onRefresh={loadFeed}
          onTokenPress={onTokenPress}
          walletAddress={walletAddress}
          onConnectWallet={connectWallet}
        />
      )}
      {tab === 'alerts' && <AlertsScreen />}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => setTab('feed')} style={styles.navItem} activeOpacity={0.7}>
          <Text style={[styles.navIcon, tab === 'feed' && styles.navIconActive]}>📡</Text>
          <Text style={[styles.navLabel, tab === 'feed' && styles.navLabelActive]}>Signals</Text>
          {tab === 'feed' && <View style={styles.navDot} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('alerts')} style={styles.navItem} activeOpacity={0.7}>
          <Text style={[styles.navIcon, tab === 'alerts' && styles.navIconActive]}>🔔</Text>
          <Text style={[styles.navLabel, tab === 'alerts' && styles.navLabelActive]}>Alerts</Text>
          {tab === 'alerts' && <View style={styles.navDot} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, backgroundColor: C.bg },
  scrollView: { flex: 1, paddingHorizontal: 16 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 10, color: C.dim, letterSpacing: 2, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '600', letterSpacing: 1 },

  // Wallet
  walletBanner: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 0, padding: 14, borderRadius: 12, backgroundColor: C.goldSoft, borderWidth: 1, borderColor: '#2a2010', gap: 12 },
  walletBannerIcon: { fontSize: 20 },
  walletBannerTitle: { fontSize: 14, fontWeight: '600', color: C.gold },
  walletBannerSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  walletBannerArrow: { fontSize: 18, color: C.gold },
  walletConnected: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 0, padding: 10, borderRadius: 10, backgroundColor: C.greenSoft, borderWidth: 1, borderColor: C.greenBorder, gap: 8, justifyContent: 'center' },
  walletConnectedIcon: { fontSize: 14, color: C.green, fontWeight: '700' },
  walletConnectedText: { fontSize: 12, color: C.green, fontWeight: '500', letterSpacing: 1 },

  // Brief card
  briefCard: { marginTop: 16, padding: 16, borderRadius: 14, backgroundColor: C.goldSoft, borderWidth: 1, borderColor: '#2a2010' },
  briefLabel: { fontSize: 10, color: C.gold, letterSpacing: 1.5, fontWeight: '600', marginBottom: 6 },
  briefText: { fontSize: 14, color: C.muted, lineHeight: 22 },

  // Section label
  sectionLabel: { fontSize: 10, color: C.dim, letterSpacing: 1.5, fontWeight: '600', marginTop: 20, marginBottom: 12, paddingLeft: 2 },

  // Signal card
  signalCard: { padding: 16, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, marginBottom: 10 },
  signalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  signalLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signalEmoji: { fontSize: 22 },
  signalType: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8 },
  signalSymbol: { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 1 },
  signalTime: { fontSize: 10, color: C.dim },
  signalHeadline: { fontSize: 14, color: C.muted, lineHeight: 21 },
  signalTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '500' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyEmoji: { fontSize: 36, marginBottom: 12 },
  emptyText: { fontSize: 14, color: C.dim },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: C.muted },

  // Back button
  backButton: { paddingVertical: 14 },
  backText: { fontSize: 14, color: C.muted },

  // Token page
  tokenHeader: { marginBottom: 20 },
  tokenSymbol: { fontSize: 32, fontWeight: '700', color: C.text },
  tokenPrice: { fontSize: 16, color: C.muted, marginTop: 4 },

  // Card
  card: { borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, padding: 18, marginBottom: 14 },
  cardLabel: { fontSize: 10, color: C.dim, letterSpacing: 1.5, fontWeight: '600', marginBottom: 10 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: C.text, marginBottom: 8 },
  cardDesc: { fontSize: 13, color: C.muted, lineHeight: 20 },

  // Gauge
  gaugeContainer: { alignItems: 'center', paddingVertical: 14 },
  gaugeScore: { fontSize: 52, fontWeight: '700' },
  gaugeLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: '600', marginTop: 4 },
  gaugeBarBg: { height: 4, borderRadius: 2, backgroundColor: '#1a1920', width: '80%', marginTop: 14, overflow: 'hidden' },
  gaugeBarFill: { height: '100%', borderRadius: 2 },

  // Metrics grid
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricCard: { width: '48%', flexGrow: 1, padding: 14, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  metricLabel: { fontSize: 9, color: C.dim, letterSpacing: 1, fontWeight: '600', marginBottom: 6 },
  metricValue: { fontSize: 18, fontWeight: '600', color: C.text },

  // Distribution
  distRow: { marginBottom: 12 },
  distHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  distLabel: { fontSize: 13, color: C.muted },
  distValue: { fontSize: 13, fontWeight: '500' },
  distBarBg: { height: 4, borderRadius: 2, backgroundColor: '#1a1920', overflow: 'hidden' },
  distBarFill: { height: '100%', borderRadius: 2 },

  // Mini signal
  miniSignal: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, marginBottom: 6 },
  miniSignalEmoji: { fontSize: 18 },
  miniSignalLabel: { fontSize: 13, fontWeight: '500', color: C.text },
  miniSignalTime: { fontSize: 10, color: C.dim },

  // Alert rules
  ruleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.greenBorder, marginBottom: 8 },
  ruleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  ruleEmoji: { fontSize: 18 },
  ruleLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  ruleDesc: { fontSize: 11, color: C.muted, marginTop: 2 },
  ruleRemove: { fontSize: 16, color: C.red, padding: 8 },

  // Quick rules
  quickRule: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  quickRuleLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  quickRuleDesc: { fontSize: 11, color: C.muted, marginTop: 2 },
  quickRuleAdd: { fontSize: 13, fontWeight: '600', color: C.gold },

  // Code block
  codeBlock: { marginTop: 12, padding: 14, borderRadius: 10, backgroundColor: C.bg, gap: 6 },
  codeText: { fontSize: 12, color: C.gold, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Attribution
  attribution: { textAlign: 'center', fontSize: 10, color: C.dim, marginTop: 20, letterSpacing: 1 },

  // Bottom nav
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 10 },
  navItem: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 4 },
  navIcon: { fontSize: 22, opacity: 0.3 },
  navIconActive: { opacity: 1 },
  navLabel: { fontSize: 10, color: C.dim, fontWeight: '500', marginTop: 2 },
  navLabelActive: { color: C.gold, fontWeight: '600' },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.gold, marginTop: 4 },
});
