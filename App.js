import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import 'react-native-get-random-values';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

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
  SOL: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  JUP: 'https://static.jup.ag/jup/icon.png',
  BONK: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
};

const LOCAL_TOKEN_ICONS = {
  DRIFT: require('./assets/tokens/drift.png'),
  PYTH: require('./assets/tokens/pyth.png'),
  WIF: require('./assets/tokens/wif.png'),
};

const BRAND_LOGOS = {
  nansen: require('./assets/brands/nansen.png'),
  helius: require('./assets/brands/helius.png'),
  jupiter: require('./assets/brands/jupiter.png'),
};

function PoweredByBadge() {
  return (
    <View style={styles.poweredByContainer}>
      <Text style={styles.poweredByText}>Powered by</Text>
      <View style={styles.poweredByLogos}>
        <View style={styles.brandLogoWrap}><Image source={BRAND_LOGOS.nansen} style={[styles.brandLogo, { width: 46, height: 46 }]} resizeMode="contain" /></View>
        <View style={styles.brandLogoWrap}><Image source={BRAND_LOGOS.helius} style={styles.brandLogo} resizeMode="contain" /></View>
        <View style={styles.brandLogoWrap}><Image source={BRAND_LOGOS.jupiter} style={styles.brandLogo} resizeMode="contain" /></View>
      </View>
    </View>
  );
}

function TokenIcon({ symbol, size = 32 }) {
  const upper = (symbol || '').toUpperCase();
  const localSource = LOCAL_TOKEN_ICONS[upper];
  const remoteUri = REMOTE_TOKEN_ICONS[upper];
  const [remoteFailed, setRemoteFailed] = useState(false);

  if (localSource) {
    return (
      <Image
        source={localSource}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: '#1a1920',
        }}
        resizeMode="cover"
      />
    );
  }

  if (remoteUri && !remoteFailed) {
    return (
      <Image
        source={{ uri: remoteUri }}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: '#1a1920',
        }}
        resizeMode="cover"
        onError={() => setRemoteFailed(true)}
      />
    );
  }

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
      <Text
        style={{
          color: '#aaa',
          fontSize: size * 0.38,
          fontWeight: '700',
        }}
      >
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


function SignalCard({ signal, onPress }) {
  const positive =
    ['CONVICTION_UP', 'SMART_MONEY_ENTRY'].includes(signal.type) ||
    (signal.type === 'SENTIMENT_SPIKE' && signal.details?.delta > 0);

  const negative = ['CONVICTION_DOWN', 'SMART_MONEY_EXIT'].includes(signal.type);

  return (
    <TouchableOpacity
      onPress={() => onPress(signal.symbol)}
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
          <TokenIcon symbol={signal.symbol} size={40} />
          <View style={{ marginLeft: 12 }}>
            <Text
              style={[
                styles.signalType,
                { color: positive ? C.green : negative ? C.red : C.gold },
              ]}
            >
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

  return (
    <View style={styles.gaugeContainer}>
      <Text style={[styles.gaugeScore, { color: col }]}>{score}</Text>
      <Text style={[styles.gaugeLabel, { color: col }]}>{label.toUpperCase()}</Text>
      <View style={styles.gaugeBarBg}>
        <View
          style={[
            styles.gaugeBarFill,
            { width: `${score}%`, backgroundColor: col },
          ]}
        />
      </View>
    </View>
  );
}

function FeedScreen({
  signals,
  loading,
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
            <TouchableOpacity onPress={onDisconnectWallet} style={styles.walletPill} activeOpacity={0.7}>
              <View style={[styles.statusDot, { backgroundColor: C.green }]} />
              <Text style={styles.walletPillText}>
                {walletAddress.slice(0, 4)}..{walletAddress.slice(-3)}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onConnectWallet}
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
            {signals.filter((s) => s.type === 'CONVICTION_UP').length} conviction
            increases and{' '}
            {signals.filter((s) =>
              ['CONVICTION_DOWN', 'SMART_MONEY_EXIT'].includes(s.type)
            ).length}{' '}
            warning signals detected in the last 24 hours.
          </Text>
        </View>

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

        <PoweredByBadge />
      </ScrollView>
    </View>
  );
}

function TokenScreen({ symbol, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/token/${symbol}`);
        if (res.ok) {
          const d = await res.json();
          setData(d);
        } else {
          setError(true);
        }
      } catch (e) {
        setError(true);
      }
      setLoading(false);
    })();
  }, [symbol]);

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
            <Text style={{ color: C.gold, fontSize: 14 }}>← Back to feed</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: STATUS_BAR_HEIGHT + 12,
          paddingBottom: BOTTOM_CONTENT_PADDING,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back to feed</Text>
        </TouchableOpacity>

        <View style={styles.tokenHeaderRow}>
          <TokenIcon symbol={data.symbol} size={50} />
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.tokenSymbol}>{data.symbol}</Text>
            <Text style={styles.tokenPrice}>
              ${data.price < 0.01 ? data.price?.toFixed(6) : data.price?.toFixed(4)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>SMART MONEY SENTIMENT</Text>
          <SentimentGauge score={data.sentimentScore} />
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>NET FLOW (24H)</Text>
            <Text
              style={[
                styles.metricValue,
                { color: data.netflowUsd >= 0 ? C.green : C.red },
              ]}
            >
              {fmt(data.netflowUsd)}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>HOLDINGS CHANGE</Text>
            <Text
              style={[
                styles.metricValue,
                { color: data.holdingsChangePct >= 0 ? C.green : C.red },
              ]}
            >
              {data.holdingsChangePct > 0 ? '+' : ''}
              {data.holdingsChangePct?.toFixed(1)}%
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

        <View style={styles.card}>
          <Text style={styles.cardLabel}>HOLDER DISTRIBUTION</Text>
          {[
            { l: 'Smart Money', v: data.holderDistribution?.smartMoney || 0, col: C.gold },
            { l: 'Retail', v: data.holderDistribution?.retail || 0, col: C.blue },
            { l: 'Exchange', v: data.holderDistribution?.exchange || 0, col: C.muted },
          ].map((h) => (
            <View key={h.l} style={styles.distRow}>
              <View style={styles.distHeader}>
                <Text style={styles.distLabel}>{h.l}</Text>
                <Text style={[styles.distValue, { color: h.col }]}>
                  {h.v.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.distBarBg}>
                <View
                  style={[
                    styles.distBarFill,
                    { width: `${h.v}%`, backgroundColor: h.col },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {data.recentSignals?.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RECENT SIGNALS</Text>
            {data.recentSignals.map((s, i) => (
              <View key={i} style={styles.miniSignal}>
                <TokenIcon symbol={s.symbol} size={28} />
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

function AlertsScreen() {
  const [rules, setRules] = useState([]);

  const exampleRules = [
    {
      label: 'Conviction Above 75',
      desc: 'Alert when any token sentiment > 75',
      type: 'sentiment_above',
      value: '75',
    },
    {
      label: 'Large Inflow > $2M',
      desc: 'Alert when smart money inflow exceeds $2M',
      type: 'inflow_above',
      value: '2000000',
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

    setRules([...rules, { ...rule, id: Date.now().toString(), enabled: true }]);

    Alert.alert(
      'Alert Created ✓',
      `You'll be notified when: ${rule.desc}\n\nFor Telegram alerts, message the SolScope bot.`
    );
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
                  onPress={() => setRules(rules.filter((x) => x.id !== r.id))}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.ruleRemove}>✕</Text>
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
          <Text style={styles.cardTitle}>📬 Telegram Alerts</Text>
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
          <Text style={styles.cardTitle}>⚙️ How Signals Work</Text>
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

export default function App() {
  const [tab, setTab] = useState('feed');
  const [signals, setSignals] = useState([]);
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
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed();
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

  const onTokenPress = (symbol) => {
    setSelectedToken(symbol);
    setTab('token');
  };

  if (tab === 'token' && selectedToken) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent />
        <TokenScreen
          symbol={selectedToken}
          onBack={() => {
            setTab('feed');
            setSelectedToken(null);
          }}
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
          loading={loading}
          onRefresh={loadFeed}
          onTokenPress={onTokenPress}
          walletAddress={walletAddress}
          onConnectWallet={connectWallet}
          onDisconnectWallet={disconnectWallet}
        />
      )}

      {tab === 'alerts' && <AlertsScreen />}

      <View style={styles.bottomNav}>
        {[
          { id: 'feed', ico: '📡', l: 'Signals' },
          { id: 'alerts', ico: '🔔', l: 'Alerts' },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setTab(t.id)}
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
    marginTop: 4,
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
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 12,
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
  gaugeBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1a1920',
    width: '80%',
    marginTop: 14,
    overflow: 'hidden',
  },
  gaugeBarFill: {
    height: '100%',
    borderRadius: 2,
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

  distRow: { marginBottom: 12 },
  distHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  distLabel: {
    fontSize: 13,
    color: C.muted,
  },
  distValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  distBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1a1920',
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    borderRadius: 2,
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
    marginTop: 24,
    marginBottom: 12,
    paddingVertical: 8,
  },
  poweredByText: {
    fontSize: 10,
    color: C.dim,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 10,
  },
  poweredByLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  brandLogoWrap: {
    width: 80,
    alignItems: 'center',
  },
  brandLogo: {
    width: 36,
    height: 36,
    opacity: 0.7,
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
    paddingHorizontal: 30,
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