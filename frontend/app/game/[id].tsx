
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardCell } from '../../components/CardCell';
import { Colors } from '../../constants/colors';
import { BASE_URL } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { apiGetPerson } from '../../services/authService';
import { apiGetDecks } from '../../services/deckService';
import {
  apiCancelMatch,
  apiForfeit,
  apiGetMatchState,
  apiMatchHeartbeat,
  apiRespondInvite,
  apiSetReady,
  apiSubmitMove,
  apiUnsetReady,
  apiVoteRematch,
} from '../../services/matchService';
import {
  ATTR_COLOR,
  ATTR_LABEL,
  CardAttribute,
  CardStateDto,
  isDiscarded,
  MatchStateResponse,
  TurnStateDto,
} from '../../types/match';
import { parseServerDate } from '../../utils/date';
import { DeckData } from '../../types/decks';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W  = Math.floor((SCREEN_W - 24 - 4 * 8) / 5);
const CARD_H  = Math.round(CARD_W * 1.5);
const DISC_W  = Math.floor(CARD_W * 0.68);
const DISC_GAP = 6;

const LOBBY_SLOT_GAP = 6;
const LOBBY_SLOT_W   = Math.floor((SCREEN_W - 48 - 28 - LOBBY_SLOT_GAP * 4) / 5);
const LOBBY_SLOT_H   = Math.round(LOBBY_SLOT_W * 1.5); 

function imgUri(path: string | null) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
}

function secondsLeft(iso: string, total = 45): number {
  const elapsed = (Date.now() - parseServerDate(iso).getTime()) / 1000;
  return Math.max(0, Math.ceil(total - elapsed));
}

function HandCard({
  card,
  selected,
  isMine,
  onPress,
}: {
  card: CardStateDto;
  selected: boolean;
  isMine: boolean;
  onPress?: () => void;
}) {
  const isBlocked = isMine && card.legendBlocked;

  return (
    <View style={styles.handWrapper}>
      
      <View style={{ position: 'relative' }}>
        <CardCell
          card={card}
          owned
          width={CARD_W}
          disabled={!isMine}
          onPress={isMine && !isBlocked ? onPress : undefined}
        />
        {selected && (
          <View style={[StyleSheet.absoluteFill, styles.selectedRing]} pointerEvents="none" />
        )}

{isBlocked && (
          <Pressable
            style={[StyleSheet.absoluteFill, styles.legendBlockedOverlay]}
            onPress={onPress}
          >
            <Ionicons name="ban" size={Math.round(CARD_W * 0.48)} color="rgba(255,80,80,0.9)" />
          </Pressable>
        )}
      </View>

<View style={styles.attrDots}>
        {(['ATTACK', 'CONTROL', 'DEFENSE'] as CardAttribute[]).map(a => {
          const used =
            a === 'ATTACK'  ? card.attackUsed :
            a === 'CONTROL' ? card.controlUsed : card.defenseUsed;
          return (
            <View
              key={a}
              style={[styles.attrDot, { backgroundColor: used ? 'rgba(150,150,150,0.35)' : ATTR_COLOR[a] }]}
            />
          );
        })}
      </View>
    </View>
  );
}

function AttributePicker({
  card,
  visible,
  onSelect,
  onClose,
}: {
  card: CardStateDto | null;
  visible: boolean;
  onSelect: (attr: CardAttribute) => void;
  onClose: () => void;
}) {
  if (!card) return null;

  const attrs: CardAttribute[] = ['ATTACK', 'CONTROL', 'DEFENSE'];
  const values: Record<CardAttribute, number> = {
    ATTACK:  card.attack,
    CONTROL: card.control,
    DEFENSE: card.defense,
  };
  const usedMap: Record<CardAttribute, boolean> = {
    ATTACK:  card.attackUsed,
    CONTROL: card.controlUsed,
    DEFENSE: card.defenseUsed,
  };
  const isLegend = card.type === 'LEGEND';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />

<View style={styles.pickerCardRow}>
            {imgUri(card.imageUrl) ? (
              <Image
                source={{ uri: imgUri(card.imageUrl)! }}
                style={styles.pickerCardImg}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.pickerCardImg, { backgroundColor: Colors.primaryLight }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.pickerCardName} numberOfLines={2}>{card.name}</Text>
              {isLegend && (
                <View style={styles.legendBadge}>
                  <Text style={styles.legendBadgeText}>LEYENDA</Text>
                </View>
              )}
              <Text style={styles.pickerRating}>⭐ {card.rating}</Text>
            </View>
          </View>

          <Text style={styles.pickerSubtitle}>Elige el atributo a usar</Text>

          {attrs.map(a => {
            const used = usedMap[a];
            return (
              <Pressable
                key={a}
                style={({ pressed }) => [
                  styles.attrRow,
                  { borderLeftColor: ATTR_COLOR[a] },
                  used && styles.attrRowUsed,
                  !used && pressed && styles.attrRowPressed,
                ]}
                onPress={() => !used && onSelect(a)}
                disabled={used}
              >
                <View style={[styles.attrColorBar, { backgroundColor: ATTR_COLOR[a] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.attrLabel, used && styles.attrLabelUsed]}>
                    {ATTR_LABEL[a]}
                  </Text>
                </View>
                <Text style={[styles.attrValue, used && styles.attrLabelUsed]}>
                  {used ? '–' : values[a]}
                </Text>
                {used && (
                  <Ionicons name="checkmark-circle" size={16} color={Colors.textLight} style={{ marginLeft: 6 }} />
                )}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

function RevealOverlay({
  turn,
  myRole,
  onDismiss,
}: {
  turn: TurnStateDto;
  myRole: 'player1' | 'player2';
  onDismiss: () => void;
}) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const slide1    = useRef(new Animated.Value(-SCREEN_W * 0.5)).current;
  const slide2    = useRef(new Animated.Value(SCREEN_W * 0.5)).current;
  const resultOp  = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(slide1, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.spring(slide2, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      ]),
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(resultOp, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      ]),
      Animated.delay(1800),
    ]).start(() => onDismiss());
  }, []);

  const isP1 = myRole === 'player1';
  const myCard      = isP1 ? turn.player1CardName   : turn.player2CardName;
  const myAttr      = isP1 ? turn.player1Attribute  : turn.player2Attribute;
  const myVal       = isP1 ? turn.player1Value       : turn.player2Value;
  const myImg       = isP1 ? turn.player1CardImage   : turn.player2CardImage;
  const oppCard     = isP1 ? turn.player2CardName    : turn.player1CardName;
  const oppAttr     = isP1 ? turn.player2Attribute   : turn.player1Attribute;
  const oppVal      = isP1 ? turn.player2Value        : turn.player1Value;
  const oppImg      = isP1 ? turn.player2CardImage    : turn.player1CardImage;

  const myWins  = turn.result === (isP1 ? 'PLAYER1_WINS' : 'PLAYER2_WINS');
  const oppWins = turn.result === (isP1 ? 'PLAYER2_WINS' : 'PLAYER1_WINS');
  const isTie   = turn.result === 'TIE';

  const resultText  = isTie ? '¡Empate!' : myWins ? '¡Punto tuyo!' : '¡Punto rival!';
  const resultColor = isTie ? '#F59E0B' : myWins ? '#22C55E' : '#EF4444';

  return (
    <Modal visible transparent animationType="none">
      <Animated.View style={[styles.revealOverlay, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

        <View style={styles.revealContent}>

<Animated.View style={[
            styles.revealCard,
            myWins && styles.revealCardWinner,
            { transform: [{ translateX: slide1 }] },
          ]}>
            {imgUri(myImg) ? (
              <Image source={{ uri: imgUri(myImg)! }} style={styles.revealCardImg} resizeMode="contain" />
            ) : (
              <View style={[styles.revealCardImg, { backgroundColor: Colors.primaryLight }]} />
            )}
            <Text style={styles.revealCardName} numberOfLines={2}>{myCard}</Text>
            {myAttr && (
              <View style={[styles.revealAttrBadge, { backgroundColor: ATTR_COLOR[myAttr] }]}>
                <Text style={styles.revealAttrText}>{ATTR_LABEL[myAttr]}</Text>
              </View>
            )}
            <Text style={[styles.revealValue, myWins && styles.revealValueWinner]}>{myVal}</Text>
            {myWins && <View style={styles.winGlow} />}
          </Animated.View>

<View style={styles.vsWrap}>
            <Text style={styles.vsText}>VS</Text>
          </View>

<Animated.View style={[
            styles.revealCard,
            oppWins && styles.revealCardWinner,
            { transform: [{ translateX: slide2 }] },
          ]}>
            {imgUri(oppImg) ? (
              <Image source={{ uri: imgUri(oppImg)! }} style={styles.revealCardImg} resizeMode="contain" />
            ) : (
              <View style={[styles.revealCardImg, { backgroundColor: Colors.primaryLight }]} />
            )}
            <Text style={styles.revealCardName} numberOfLines={2}>{oppCard}</Text>
            {oppAttr && (
              <View style={[styles.revealAttrBadge, { backgroundColor: ATTR_COLOR[oppAttr] }]}>
                <Text style={styles.revealAttrText}>{ATTR_LABEL[oppAttr]}</Text>
              </View>
            )}
            <Text style={[styles.revealValue, oppWins && styles.revealValueWinner]}>{oppVal}</Text>
            {oppWins && <View style={styles.winGlow} />}
          </Animated.View>
        </View>

<Animated.View style={[
          styles.resultBanner,
          { opacity: resultOp, transform: [{ scale: resultScale }], borderColor: resultColor },
        ]}>
          <Text style={[styles.resultText, { color: resultColor }]}>{resultText}</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function CountdownTimer({ initialSeconds, total = 45 }: { initialSeconds: number; total?: number }) {
  const mountMs      = useRef(Date.now());
  const startSeconds = useRef(initialSeconds);

  const [secs, setSecs] = useState(initialSeconds);

  useEffect(() => {
    mountMs.current      = Date.now();
    startSeconds.current = initialSeconds;
    setSecs(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - mountMs.current) / 1000;
      setSecs(Math.max(0, Math.ceil(startSeconds.current - elapsed)));
    }, 250);
    return () => clearInterval(id);
  }, []);

  if (secs === 0) {
    return (
      <View style={styles.waitChip}>
        <ActivityIndicator size="small" color={Colors.textLight} />
        <Text style={styles.waitChipText}>Procesando…</Text>
      </View>
    );
  }

  const pct   = secs / total;
  const color = secs > 15 ? '#22C55E' : secs > 5 ? '#F59E0B' : '#EF4444';

  const SIZE   = 64;
  const HALF   = SIZE / 2;
  const STROKE = 7;
  const INNER  = SIZE - STROKE * 2;

  const filledDeg   = pct * 360;
  const rightRotate = Math.min(filledDeg, 180) - 180;
  const leftRotate  = Math.max(filledDeg - 180, 0) - 180;

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      
      <View style={{ position: 'absolute', width: SIZE, height: SIZE,
        borderRadius: HALF, backgroundColor: '#E5E7EB' }} />

<View style={{ position: 'absolute', top: 0, left: HALF,
        width: HALF, height: SIZE, overflow: 'hidden' }}>
        
        <View style={{ position: 'absolute', top: 0, left: -HALF,
          width: SIZE, height: SIZE,
          transform: [{ rotate: `${rightRotate}deg` }] }}>
          
          <View style={{ position: 'absolute', top: 0, right: 0,
            width: HALF, height: SIZE,
            borderTopRightRadius: HALF, borderBottomRightRadius: HALF,
            backgroundColor: color }} />
        </View>
      </View>

<View style={{ position: 'absolute', top: 0, left: 0,
        width: HALF, height: SIZE, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, left: 0,
          width: SIZE, height: SIZE,
          transform: [{ rotate: `${leftRotate}deg` }] }}>
          
          <View style={{ position: 'absolute', top: 0, left: 0,
            width: HALF, height: SIZE,
            borderTopLeftRadius: HALF, borderBottomLeftRadius: HALF,
            backgroundColor: color }} />
        </View>
      </View>

<View style={{ position: 'absolute',
        width: INNER, height: INNER, borderRadius: INNER / 2,
        backgroundColor: Colors.background,
        alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color }}>{secs}</Text>
      </View>
    </View>
  );
}

function GameStartOverlay({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const scale   = useRef(new Animated.Value(2.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step >= 4) { onDone(); return; }
    const isGo = step === 3;
    scale.setValue(isGo ? 0.3 : 2.8);
    opacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale,   { toValue: 1, duration: isGo ? 280 : 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 120,              useNativeDriver: true }),
      ]),
      Animated.delay(isGo ? 700 : 360),
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setStep(s => s + 1); });
  }, [step]);

  const LABELS = ['3', '2', '1', '¡A\nJUGAR!'];

  return (
    <Modal visible transparent animationType="none">
      <View style={styles.gsOverlay}>
        <Animated.Text
          style={[styles.gsNumber, step === 3 && styles.gsGo, { transform: [{ scale }], opacity }]}
        >
          {LABELS[step] ?? ''}
        </Animated.Text>
      </View>
    </Modal>
  );
}

function RoundStartOverlay({ round, onDone }: { round: number; onDone: () => void }) {
  const bgOp   = useRef(new Animated.Value(0)).current;
  const scale  = useRef(new Animated.Value(0.15)).current;
  const textOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(bgOp,  { toValue: 1, duration: 220,                                        useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 140, friction: 7,                            useNativeDriver: true }),
        Animated.timing(textOp,{ toValue: 1, duration: 220,                                        useNativeDriver: true }),
      ]),
      Animated.delay(1500),
      Animated.parallel([
        Animated.timing(bgOp,  { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(textOp,{ toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => onDone());
  }, []);

  return (
    <Modal visible transparent animationType="none">
      <Animated.View style={[styles.rsOverlay, { opacity: bgOp }]}>
        <Animated.View style={[styles.rsCard, { transform: [{ scale }], opacity: textOp }]}>
          <Text style={styles.rsLabel}>RONDA</Text>
          <Text style={styles.rsNum}>{round}</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const STAR_POSITIONS: { top?: number; bottom?: number; left?: number; right?: number }[] = [
  { top: -52, left: 46 },
  { top: -30, left: 96 },
  { top: 40,  left: 112 },
  { bottom: -10, left: 82 },
  { bottom: -30, left: 38 },
  { top: 38,  left: -16 },
];

function FinishedOverlay({
  state,
  userId,
  onDone,
}: {
  state: MatchStateResponse;
  userId: number;
  onDone: () => void;
}) {
  const isWin     = state.winnerId != null && state.winnerId === userId;
  const isDraw    = state.draw || state.winnerId == null;
  const isAbandon = state.wonByAbandon;

  const bgOp      = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconOp    = useRef(new Animated.Value(0)).current;
  const titleOp   = useRef(new Animated.Value(0)).current;
  const titleY    = useRef(new Animated.Value(32)).current;
  const subOp     = useRef(new Animated.Value(0)).current;
  const starAnims = useRef(STAR_POSITIONS.map(() => new Animated.Value(0))).current;

  const icon       = isWin ? 'trophy' : isDraw ? 'remove-circle-outline' : 'sad-outline';
  const iconColor  = isWin ? '#FFF176' : isDraw ? '#FFF' : '#EF4444';
  const title      = isWin ? '¡VICTORIA!' : isDraw ? '¡EMPATE!'  : 'DERROTA';
  const sub        = isWin
    ? (isAbandon ? '¡El rival ha abandonado!' : '¡Enhorabuena!')
    : isDraw
    ? 'Ha sido muy igualado'
    : (isAbandon ? 'Has abandonado la partida' : 'Mejor suerte la próxima');
  const bgColor    = isWin ? 'rgba(161,124,0,0.94)' : isDraw ? 'rgba(71,85,105,0.94)' : 'rgba(24,24,40,0.94)';
  const holdMs     = isWin ? 1600 : 1100;

  useEffect(() => {
    const popAnims: Animated.CompositeAnimation[] = [
      Animated.spring(iconScale, { toValue: 1, tension: 75, friction: 5, useNativeDriver: true }),
      Animated.timing(iconOp, { toValue: 1, duration: 200, useNativeDriver: true }),
    ];
    if (isWin) {
      popAnims.push(
        Animated.stagger(90, starAnims.map(a =>
          Animated.spring(a, { toValue: 1, tension: 110, friction: 6, useNativeDriver: true }),
        )),
      );
    }

    Animated.sequence([
      Animated.timing(bgOp, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.parallel(popAnims),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(titleOp, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(titleY,  { toValue: 0, duration: 260, useNativeDriver: true }),
      ]),
      Animated.delay(140),
      Animated.timing(subOp, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.delay(holdMs),
      Animated.timing(bgOp, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <Modal visible transparent animationType="none">
      <Animated.View style={[styles.foOverlay, { backgroundColor: bgColor, opacity: bgOp }]}>

<View style={styles.foIconWrap}>
          <Animated.View style={{ transform: [{ scale: iconScale }], opacity: iconOp }}>
            <Ionicons name={icon as any} size={88} color={iconColor} />
          </Animated.View>
          {isWin && starAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[styles.foStar, STAR_POSITIONS[i], { transform: [{ scale: anim }], opacity: anim }]}
            >
              <Ionicons name="star" size={18} color="#FFF176" />
            </Animated.View>
          ))}
        </View>

<Animated.Text style={[
          styles.foTitle,
          isWin && styles.foTitleWin,
          { opacity: titleOp, transform: [{ translateY: titleY }] },
        ]}>
          {title}
        </Animated.Text>

<Animated.Text style={[styles.foSub, { opacity: subOp }]}>{sub}</Animated.Text>

      </Animated.View>
    </Modal>
  );
}

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refreshBadges, persistUser, releaseLevelUp } = useAuth();

  const matchId = Number(id);

  const [state,      setState]      = useState<MatchStateResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const [decks,        setDecks]        = useState<DeckData[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<number | null>(null);
  const [readying,     setReadying]     = useState(false);
  const [unreadying,   setUnreadying]   = useState(false);

  const [pickedCard, setPickedCard] = useState<CardStateDto | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [revealTurn,          setRevealTurn]          = useState<TurnStateDto | null>(null);
  
  const lastRevealedKeyRef = useRef<string>('');

  const pendingRoundStartRef   = useRef<number | null>(null);
  const pendingFinishedAnimRef = useRef(false);
  const finishedAnimShownRef   = useRef(false);

  const [showForfeit, setShowForfeit] = useState(false);
  const [forfeiting,  setForfeiting]  = useState(false);

  const [votingRematch,       setVotingRematch]       = useState(false);
  
  const [rematchDeclined,     setRematchDeclined]     = useState(false);
  
  const [rematchRejectedBy,   setRematchRejectedBy]   = useState<string | null>(null);
  
  const prevMyVoteRef = useRef<boolean>(false);
  
  const [rematchTick, setRematchTick] = useState(0);
  
  const matchFinishedAtRef = useRef<number | null>(null);
  
  const REMATCH_WINDOW_MS = 30_000;

  const [showGameStart,    setShowGameStart]    = useState(false);
  const [showRoundStart,   setShowRoundStart]   = useState<number | null>(null);
  const [showFinishedAnim, setShowFinishedAnim] = useState(false);
  
  const [resultsReady,     setResultsReady]     = useState(false);
  const prevStateRef = useRef<MatchStateResponse | null>(null);

  const didFinishInSessionRef = useRef(false);

  const [legendMsgVisible, setLegendMsgVisible] = useState(false);
  const legendMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showLegendMsg = useCallback(() => {
    if (legendMsgTimer.current) clearTimeout(legendMsgTimer.current);
    setLegendMsgVisible(true);
    legendMsgTimer.current = setTimeout(() => setLegendMsgVisible(false), 2500);
  }, []);

  const myRole = useMemo(() => {
    if (!state || !user) return null;
    return state.player1.id === user.id ? 'player1' : 'player2';
  }, [state, user]);

  const myCards  = myRole === 'player1' ? state?.player1Cards : state?.player2Cards;
  const oppCards = myRole === 'player1' ? state?.player2Cards : state?.player1Cards;

  const mySubmitted  = myRole === 'player1'
    ? state?.pendingTurn?.player1Submitted
    : state?.pendingTurn?.player2Submitted;

  useEffect(() => {
    if (!state) return;
    const prev = prevStateRef.current;

    if (prev?.status === 'WAITING_READY' && state.status === 'IN_PROGRESS') {
      setShowGameStart(true);
    }

    if (
      state.status === 'IN_PROGRESS' && prev &&
      state.currentRoundNumber > (prev.currentRoundNumber ?? 0) &&
      state.currentRoundNumber > 1
    ) {
      pendingRoundStartRef.current = state.currentRoundNumber;
    }

    if (state.status === 'FINISHED' && prev?.status === 'IN_PROGRESS') {
      didFinishInSessionRef.current = true;
      pendingFinishedAnimRef.current = true;
      matchFinishedAtRef.current = Date.now(); 
      if (user) {
        apiGetPerson(user.id).then(persistUser).catch(() => {});
      }
    }

    prevStateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!didFinishInSessionRef.current || matchFinishedAtRef.current == null) return;
    const id = setInterval(() => setRematchTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [state?.status]);

  useEffect(() => {
    if (!state || state.status !== 'FINISHED' || !myRole) return;
    const myVote     = myRole === 'player1' ? state.player1WantsRematch : state.player2WantsRematch;
    const oppNick    = (myRole === 'player1' ? state.player2 : state.player1).nickname;
    if (prevMyVoteRef.current === true && !myVote && state.rematchMatchId == null) {
      setRematchRejectedBy(oppNick);
      setTimeout(() => setRematchDeclined(true), 3000);
    }
    prevMyVoteRef.current = myVote;
  }, [state?.player1WantsRematch, state?.player2WantsRematch, state?.rematchMatchId]);

  const drainAnimQueue = useCallback(() => {
    if (pendingRoundStartRef.current !== null) {
      setShowRoundStart(pendingRoundStartRef.current);
      pendingRoundStartRef.current = null;
    } else if (pendingFinishedAnimRef.current && !finishedAnimShownRef.current) {
      finishedAnimShownRef.current  = true;
      pendingFinishedAnimRef.current = false;
      setShowFinishedAnim(true);
    }
  }, []);

  useEffect(() => {
    if (state?.status !== 'FINISHED') return;
    if (!didFinishInSessionRef.current) return;
    if (finishedAnimShownRef.current) return;
    if (revealTurn !== null) return; 
    const timer = setTimeout(() => {
      if (!finishedAnimShownRef.current && pendingFinishedAnimRef.current) {
        finishedAnimShownRef.current  = true;
        pendingFinishedAnimRef.current = false;
        setShowFinishedAnim(true);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [state?.status, revealTurn]);

  const applyMatchState = useCallback((s: MatchStateResponse) => {
    setState(prev => {
      if (prev === null) {
        if (s.lastCompletedTurn) {
          lastRevealedKeyRef.current =
            `${s.lastCompletedTurn.roundNumber}_${s.lastCompletedTurn.turnNumber}`;
        }
        return s;
      }

      if (s.lastCompletedTurn && s.lastCompletedTurn.result !== 'PENDING') {
        const key = `${s.lastCompletedTurn.roundNumber}_${s.lastCompletedTurn.turnNumber}`;
        if (key !== lastRevealedKeyRef.current) {
          lastRevealedKeyRef.current = key;
          setRevealTurn(s.lastCompletedTurn);
        }
      }
      return s;
    });
  }, []);

const fetchState = useCallback(async () => {
    try {
      const s = await apiGetMatchState(matchId);
      applyMatchState(s);
      return s;
    } catch (e: any) {
      setError(e.message || 'Error de conexión');
      return null;
    }
  }, [matchId, applyMatchState]);

  useEffect(() => releaseLevelUp, [releaseLevelUp]);

useEffect(() => {
    let cancelled = false;
    fetchState().then(s => {
      if (cancelled) return;
      if (s?.status === 'WAITING_READY' && user) {
        apiGetDecks(user.id)
          .then(d => { if (!cancelled) setDecks(d); })
          .catch(() => {});
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

useEffect(() => {
    if (!state) return;
    const terminal = ['FINISHED', 'REJECTED', 'CANCELLED'];
    if (terminal.includes(state.status)) return;

    const delay = (state.status === 'IN_PROGRESS' && mySubmitted) ? 500 : 2000;

    const interval = setInterval(async () => {
      const s = await fetchState();
      if (s?.status === 'WAITING_READY' && user && decks.length === 0) {
        apiGetDecks(user.id).then(setDecks).catch(() => {});
      }
    }, delay);

    return () => clearInterval(interval);
  }, [state?.status, mySubmitted, fetchState, user, decks.length]);

useEffect(() => {
    if (!user || !state || state.status !== 'IN_PROGRESS') return;
    const tick = () => apiMatchHeartbeat(matchId, user.id);
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [matchId, user, state?.status]);

  useEffect(() => {
    if (!state || state.status !== 'FINISHED') return;
    if (!didFinishInSessionRef.current) return;
    if (state.rematchMatchId != null) return;

    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [state?.status, state?.rematchMatchId]);

  useEffect(() => {
    if (state?.rematchMatchId != null && didFinishInSessionRef.current) {
      router.replace(`/game/${state.rematchMatchId}` as any);
    }
  }, [state?.rematchMatchId]);

const handleRespondInvite = async (accept: boolean) => {
    if (!user) return;
    try {
      setLoading(true);
      await apiRespondInvite(matchId, user.id, accept);
      refreshBadges();
      if (!accept) { router.back(); return; }
      const s = await fetchState();
      if (s?.status === 'WAITING_READY') {
        const d = await apiGetDecks(user.id);
        setDecks(d);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    try {
      await apiCancelMatch(matchId, user.id);
      refreshBadges();
      router.back();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSetReady = async () => {
    if (!user || selectedDeck === null) return;
    setReadying(true);
    try {
      await apiSetReady(matchId, user.id, selectedDeck);
      await fetchState();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setReadying(false);
    }
  };

  const handleUnsetReady = async () => {
    if (!user) return;
    setUnreadying(true);
    try {
      const s = await apiUnsetReady(matchId, user.id);
      setState(s);
      setSelectedDeck(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUnreadying(false);
    }
  };

  const handleCardSelect = (card: CardStateDto) => {
    if (isDiscarded(card)) return;
    if (card.legendBlocked) {
      showLegendMsg();
      return;
    }
    setPickedCard(card);
    setShowPicker(true);
  };

  const handleSubmitMove = async (attr: CardAttribute) => {
    if (!user || !pickedCard || submitting) return;
    setShowPicker(false);
    setSubmitting(true);
    try {
      const s = await apiSubmitMove(matchId, user.id, pickedCard.cardId, attr);
      applyMatchState(s); 
      setPickedCard(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForfeit = async () => {
    if (!user || forfeiting) return;
    setShowForfeit(false);
    setForfeiting(true);
    try {
      const s = await apiForfeit(matchId, user.id);
      applyMatchState(s);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setForfeiting(false);
    }
  };

const handleRematchVote = async (wants: boolean) => {
    if (!user || votingRematch) return;
    if (!wants) setRematchDeclined(true);
    setVotingRematch(true);
    try {
      const s = await apiVoteRematch(matchId, user.id, wants);
      applyMatchState(s);
    } catch (e: any) {
      if (!wants) setRematchDeclined(false);
      setError(e?.message || 'No se pudo procesar el voto');
    } finally {
      setVotingRematch(false);
    }
  };

if (loading || !state) {
    return (
      <SafeAreaView style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.root, styles.centered]}>
        <Ionicons name="wifi-outline" size={48} color={Colors.textLight} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => { setError(null); fetchState(); }}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textDark} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {state.status === 'IN_PROGRESS'
            ? `Ronda ${state.currentRoundNumber}`
            : 'Partida'}
        </Text>
        {state.status === 'IN_PROGRESS' && (
          <Pressable style={styles.forfeitBtn} onPress={() => setShowForfeit(true)}>
            <Ionicons name="flag-outline" size={20} color="#EF4444" />
          </Pressable>
        )}
        {state.status !== 'IN_PROGRESS' && <View style={{ width: 40 }} />}
      </View>

      {state.status === 'PENDING_INVITE' && renderPendingInvite()}
      {state.status === 'WAITING_READY'  && renderLobby()}
      {state.status === 'IN_PROGRESS'    && renderInProgress()}
      
      {['FINISHED', 'REJECTED', 'CANCELLED'].includes(state.status)
        && (resultsReady || !didFinishInSessionRef.current)
        && renderFinished()}

{revealTurn && myRole && (
        <RevealOverlay
          turn={revealTurn}
          myRole={myRole}
          onDismiss={() => {
            setRevealTurn(null);
            drainAnimQueue();
          }}
        />
      )}

<AttributePicker
        card={pickedCard}
        visible={showPicker}
        onSelect={handleSubmitMove}
        onClose={() => { setShowPicker(false); setPickedCard(null); }}
      />

{showGameStart && (
        <GameStartOverlay onDone={() => setShowGameStart(false)} />
      )}

{showRoundStart !== null && (
        <RoundStartOverlay
          round={showRoundStart}
          onDone={() => {
            setShowRoundStart(null);
            drainAnimQueue();
          }}
        />
      )}

{showFinishedAnim && state && myRole && (
        <FinishedOverlay
          state={state}
          userId={user!.id}
          onDone={() => { setShowFinishedAnim(false); setResultsReady(true); }}
        />
      )}

{showForfeit && (
        <Modal visible transparent animationType="fade">
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogCard}>
              <Ionicons name="flag" size={36} color="#EF4444" />
              <Text style={styles.dialogTitle}>¿Abandonar?</Text>
              <Text style={styles.dialogMsg}>
                Si abandonas, tu rival gana automáticamente.
              </Text>
              <View style={styles.dialogBtns}>
                <Pressable style={styles.dialogBtnCancel} onPress={() => setShowForfeit(false)}>
                  <Text style={styles.dialogBtnCancelText}>Seguir jugando</Text>
                </Pressable>
                <Pressable style={styles.dialogBtnConfirm} onPress={handleForfeit} disabled={forfeiting}>
                  {forfeiting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.dialogBtnConfirmText}>Abandonar</Text>
                  }
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );

function renderPendingInvite() {
    if (!user || !myRole) return null;
    const initiator  = state!.player1;
    const isReceiver = myRole === 'player2';

    return (
      <View style={[styles.phaseContainer, styles.centered]}>
        
        <View style={styles.inviteAvatarWrap}>
          {imgUri(initiator.profilePhoto) ? (
            <Image source={{ uri: imgUri(initiator.profilePhoto)! }} style={styles.inviteAvatar} />
          ) : (
            <View style={[styles.inviteAvatar, styles.inviteAvatarFallback]}>
              <Ionicons name="person" size={40} color={Colors.primary} />
            </View>
          )}
          <View style={styles.swordBadge}>
            <Ionicons name="game-controller" size={18} color="#fff" />
          </View>
        </View>

        <Text style={styles.inviteTitle}>
          {isReceiver ? '¡Te han retado!' : 'Invitación enviada'}
        </Text>
        <Text style={styles.inviteSub}>
          {isReceiver
            ? `${initiator.nickname} quiere jugar contigo`
            : `Esperando que ${state!.player2.nickname} acepte…`}
        </Text>

        {isReceiver ? (
          <View style={styles.inviteBtnRow}>
            <Pressable style={[styles.inviteActionBtn, styles.inviteRejectBtn]} onPress={() => handleRespondInvite(false)}>
              <Ionicons name="close" size={24} color="#EF4444" />
              <Text style={styles.inviteRejectText}>Rechazar</Text>
            </Pressable>
            <Pressable style={[styles.inviteActionBtn, styles.inviteAcceptBtn]} onPress={() => handleRespondInvite(true)}>
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.inviteAcceptText}>Aceptar</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.cancelInviteBtn} onPress={handleCancel}>
            <Text style={styles.cancelInviteText}>Cancelar invitación</Text>
          </Pressable>
        )}
      </View>
    );
  }

function renderLobby() {
    if (!user || !myRole) return null;
    const meReady   = myRole === 'player1' ? state!.player1Ready : state!.player2Ready;
    const oppReady  = myRole === 'player1' ? state!.player2Ready : state!.player1Ready;
    const opponent  = myRole === 'player1' ? state!.player2 : state!.player1;

    return (
      <ScrollView style={styles.phaseContainer} contentContainerStyle={{ gap: 20, paddingBottom: 32 }}>
        
        <View style={styles.lobbyPlayers}>
          <View style={styles.lobbyPlayer}>
            {imgUri(user.profilePhoto) ? (
              <Image source={{ uri: imgUri(user.profilePhoto)! }} style={styles.lobbyAvatar} />
            ) : (
              <View style={[styles.lobbyAvatar, styles.lobbyAvatarFallback]}>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </View>
            )}
            <Text style={styles.lobbyNick} numberOfLines={1}>{user.nickname}</Text>
            <View style={[styles.readyBadge, meReady && styles.readyBadgeOn]}>
              <Text style={[styles.readyBadgeText, meReady && styles.readyBadgeTextOn]}>
                {meReady ? 'LISTO' : 'Eligiendo'}
              </Text>
            </View>
          </View>

          <View style={styles.lobbyVs}>
            <Text style={styles.lobbyVsText}>VS</Text>
          </View>

          <View style={styles.lobbyPlayer}>
            {imgUri(opponent.profilePhoto) ? (
              <Image source={{ uri: imgUri(opponent.profilePhoto)! }} style={styles.lobbyAvatar} />
            ) : (
              <View style={[styles.lobbyAvatar, styles.lobbyAvatarFallback]}>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </View>
            )}
            <Text style={styles.lobbyNick} numberOfLines={1}>{opponent.nickname}</Text>
            <View style={[styles.readyBadge, oppReady && styles.readyBadgeOn]}>
              <Text style={[styles.readyBadgeText, oppReady && styles.readyBadgeTextOn]}>
                {oppReady ? 'LISTO' : 'Eligiendo'}
              </Text>
            </View>
          </View>
        </View>

{!meReady && (
          <>
            <View style={styles.deckPickHeader}>
              <Text style={styles.deckPickTitle}>Elige tu baraja</Text>
              <Pressable
                style={({ pressed }) => [styles.goToDecksBtn, pressed && { opacity: 0.7 }]}
                onPress={() => router.push('/decks' as any)}
              >
                <Ionicons name="albums-outline" size={14} color={Colors.primary} />
                <Text style={styles.goToDecksBtnText}>Gestionar barajas</Text>
              </Pressable>
            </View>
            {decks.length === 0 ? (
              <View style={styles.noDeckWrap}>
                <Ionicons name="albums-outline" size={40} color={Colors.textLight} />
                <Text style={styles.noDeckText}>
                  No tienes barajas.{'\n'}Créa una desde el botón de arriba.
                </Text>
              </View>
            ) : (
              decks.filter(d => d.cards.length === 5).map(deck => {
                const isSelected  = selectedDeck === deck.id;
                const legendCount = deck.cards.filter(e => e.card.type === 'LEGEND').length;
                return (
                  <Pressable
                    key={deck.id}
                    style={[styles.lobbyDeckCard, isSelected && styles.lobbyDeckCardSelected]}
                    onPress={() => setSelectedDeck(isSelected ? null : deck.id)}
                  >
                    
                    <View style={styles.lobbyDeckTop}>
                      <View style={[styles.lobbyDeckIcon, isSelected && styles.lobbyDeckIconSelected]}>
                        <Ionicons name="layers" size={22} color={isSelected ? Colors.primary : Colors.textMid} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.lobbyDeckName, isSelected && styles.lobbyDeckNameSelected]} numberOfLines={1}>
                          {deck.name}
                        </Text>
                        <View style={styles.lobbyDeckMeta}>
                          <Text style={styles.lobbyDeckMetaText}>{deck.cards.length} / 5 cartas</Text>
                          {legendCount > 0 && (
                            <>
                              <Text style={styles.lobbyMetaDot}>·</Text>
                              <Ionicons name="star" size={11} color="#F59E0B" />
                              <Text style={styles.lobbyDeckMetaText}>
                                {legendCount} leyenda{legendCount !== 1 ? 's' : ''}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={isSelected ? Colors.primary : Colors.border}
                      />
                    </View>

<View style={styles.lobbySlotsRow}>
                      {deck.cards.map(({ deckCardId, card }) => (
                        <CardCell
                          key={deckCardId}
                          card={card}
                          owned
                          width={LOBBY_SLOT_W}
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })
            )}

            <Pressable
              style={[styles.readyBtn, (selectedDeck === null || readying) && styles.readyBtnDisabled]}
              onPress={handleSetReady}
              disabled={selectedDeck === null || readying}
            >
              {readying
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.readyBtnText}>¡Listo!</Text>
              }
            </Pressable>
          </>
        )}

        {meReady && (
          <View style={styles.waitingWrap}>
            
            <View style={styles.waitingRow}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.waitingText}>
                Esperando a {opponent.nickname}…
              </Text>
            </View>
            
            <Pressable
              style={[styles.changeBtn, unreadying && { opacity: 0.6 }]}
              onPress={handleUnsetReady}
              disabled={unreadying}
            >
              {unreadying
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Text style={styles.changeBtnText}>Cancelar</Text>}
            </Pressable>
          </View>
        )}

        <Pressable style={styles.cancelInviteBtn} onPress={handleCancel}>
          <Text style={styles.cancelInviteText}>Salir del lobby</Text>
        </Pressable>
      </ScrollView>
    );
  }

function renderInProgress() {
    if (!myRole || !state) return null;

    const myWinsR   = myRole === 'player1' ? state.roundsWonPlayer1 : state.roundsWonPlayer2;
    const oppWinsR  = myRole === 'player1' ? state.roundsWonPlayer2 : state.roundsWonPlayer1;
    const myWinsT   = myRole === 'player1' ? state.turnsWonPlayer1InRound : state.turnsWonPlayer2InRound;
    const oppWinsT  = myRole === 'player1' ? state.turnsWonPlayer2InRound : state.turnsWonPlayer1InRound;
    const opponent  = myRole === 'player1' ? state.player2 : state.player1;
    const pt        = state.pendingTurn;

    const iWaiting = !!mySubmitted && pt?.result === 'PENDING';

    const anyOverlayActive = !!revealTurn || showRoundStart !== null || showGameStart;

    const oppHasSubmitted = pt?.result === 'PENDING'
      && (myRole === 'player1' ? pt.player2Submitted : pt.player1Submitted);
    const oppConnected = myRole === 'player1' ? state.player2Connected : state.player1Connected;
    const rivalLate = iWaiting && !oppHasSubmitted && !oppConnected;

    return (
      <View style={styles.gameContainer}>

<View style={styles.scoreboard}>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreRoundLabel}>Rondas</Text>
            <Text style={styles.scoreRound}>{myWinsR} – {oppWinsR}</Text>
          </View>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreRoundLabel}>Turno {pt?.turnNumber ?? '–'}</Text>
            <Text style={styles.scoreTurn}>{myWinsT} – {oppWinsT}</Text>
          </View>
        </View>

{(() => {
          const oppActive    = (oppCards ?? []).filter(c => !isDiscarded(c));
          const oppDiscarded = (oppCards ?? []).filter(isDiscarded);
          return (
            <View style={styles.oppZone}>
              <View style={styles.oppHeader}>
                {imgUri(opponent.profilePhoto) ? (
                  <Image source={{ uri: imgUri(opponent.profilePhoto)! }} style={styles.oppAvatar} />
                ) : (
                  <View style={[styles.oppAvatar, styles.oppAvatarFallback]}>
                    <Ionicons name="person" size={14} color={Colors.primary} />
                  </View>
                )}
                <Text style={styles.oppNick} numberOfLines={1}>{opponent.nickname}</Text>
                {oppHasSubmitted && (
                  <View style={styles.submittedBadge}>
                    <Ionicons name="checkmark" size={11} color="#fff" />
                    <Text style={styles.submittedBadgeText}>Jugado</Text>
                  </View>
                )}
                {rivalLate && !oppHasSubmitted && (
                  <View style={styles.rivalLateBadge}>
                    <Ionicons name="wifi-outline" size={11} color="#F59E0B" />
                    <Text style={styles.rivalLateBadgeText}>Sin respuesta</Text>
                  </View>
                )}
              </View>

<View style={styles.oppCardsRow}>
                {oppActive.map(c => (
                  <View key={c.cardId} style={styles.oppCard} />
                ))}
              </View>

{oppDiscarded.length > 0 && (
                <View style={styles.discardSection}>
                  <Text style={styles.discardLabel}>
                    Descartes rival ({oppDiscarded.length})
                  </Text>
                  <View style={styles.discardRow}>
                    {oppDiscarded.map(c => (
                      <CardCell
                        key={c.cardId}
                        card={c}
                        owned
                        width={DISC_W}
                        compact
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })()}

<View style={styles.timerZone}>
          {pt && pt.result === 'PENDING' ? (
            anyOverlayActive ? (
              null
            ) : (
              <>
                
                <CountdownTimer key={pt.turnCreatedAt} initialSeconds={45} />
                {iWaiting && (
                  <View style={[styles.waitChip, rivalLate && styles.waitChipLate]}>
                    {rivalLate
                      ? <Ionicons name="wifi-outline" size={13} color="#F59E0B" />
                      : <ActivityIndicator size="small" color={Colors.textLight} />
                    }
                    <Text style={[styles.waitChipText, rivalLate && styles.waitChipTextLate]}>
                      {rivalLate ? 'Sin respuesta del rival…' : 'Esperando al rival…'}
                    </Text>
                  </View>
                )}
              </>
            )
          ) : (
            <View style={styles.waitChip}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          )}
        </View>

{(() => {
          const myActive    = (myCards ?? []).filter(c => !isDiscarded(c));
          const myDiscarded = (myCards ?? []).filter(isDiscarded);
          return (
            <View style={styles.myZone}>
              <Text style={styles.myZoneLabel}>
                {iWaiting ? 'Esperando al rival' : submitting ? 'Enviando…' : 'Tu mano — elige una carta'}
              </Text>

{legendMsgVisible && (
                <View style={styles.legendBlockChip}>
                  <Ionicons name="ban" size={14} color="#EF4444" />
                  <Text style={styles.legendBlockChipText}>
                    No puedes usar una Legend 3 turnos seguidos
                  </Text>
                </View>
              )}

<View style={styles.myCardsRow}>
                {myActive.map(c => (
                  <HandCard
                    key={c.cardId}
                    card={c}
                    selected={pickedCard?.cardId === c.cardId}
                    isMine={!iWaiting && !submitting}
                    onPress={() => handleCardSelect(c)}
                  />
                ))}
              </View>

{myDiscarded.length > 0 && (
                <View style={styles.discardSection}>
                  <Text style={styles.discardLabel}>
                    Descartadas ({myDiscarded.length})
                  </Text>
                  <View style={styles.discardRow}>
                    {myDiscarded.map(c => (
                      <CardCell
                        key={c.cardId}
                        card={c}
                        owned
                        width={DISC_W}
                        compact
                      />
                    ))}
                  </View>
                </View>
              )}

<Pressable
                style={({ pressed }) => [
                  styles.forfeitGameBtn,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setShowForfeit(true)}
              >
                <Ionicons name="flag-outline" size={13} color="#EF4444" />
                <Text style={styles.forfeitGameBtnText}>Rendirse</Text>
              </Pressable>
            </View>
          );
        })()}
      </View>
    );
  }

function renderFinished() {
    if (!user || !state) return null;

    const isFinished   = state.status === 'FINISHED';
    const isRejected   = state.status === 'REJECTED';

    let icon: any = 'close-circle-outline';
    let iconColor = Colors.textLight;
    let title = '';
    let sub   = '';

    if (isFinished) {
      if (state.draw) {
        icon = 'remove-circle-outline'; iconColor = '#F59E0B';
        title = '¡Empate!';
        sub   = 'Nadie ha ganado esta vez';
      } else if (state.winnerId === user.id) {
        icon = 'trophy'; iconColor = '#F59E0B';
        title = '¡Victoria!';
        sub   = state.wonByAbandon
          ? 'El rival ha abandonado la partida'
          : '¡Enhorabuena, eres el mejor!';
      } else {
        icon = 'sad-outline'; iconColor = '#EF4444';
        title = 'Derrota';
        sub   = state.wonByAbandon
          ? 'Has abandonado la partida'
          : '¡Toca entrenar más!';
      }
    } else if (isRejected) {
      icon = 'close-circle-outline'; iconColor = '#EF4444';
      title = 'Invitación rechazada';
      sub   = 'Tu rival no ha aceptado el reto';
    } else {
      icon = 'ban-outline'; iconColor = Colors.textLight;
      title = 'Partida cancelada';
      sub   = 'La partida fue cancelada';
    }

    const isP1       = myRole === 'player1';
    const myRoundsW  = isP1 ? state.roundsWonPlayer1 : state.roundsWonPlayer2;
    const oppRoundsW = isP1 ? state.roundsWonPlayer2 : state.roundsWonPlayer1;
    const myTurnsW   = isP1 ? state.turnsWonPlayer1InRound : state.turnsWonPlayer2InRound;
    const oppTurnsW  = isP1 ? state.turnsWonPlayer2InRound : state.turnsWonPlayer1InRound;
    const opponent   = isP1 ? state.player2 : state.player1;

    const myWon  = isFinished && state.winnerId === user.id;
    const oppWon = isFinished && state.winnerId !== null && state.winnerId !== user.id;
    const isDraw = isFinished && state.draw;
    const myRoundColor  = myWon  ? '#22C55E' : oppWon ? Colors.textLight : isDraw ? '#F59E0B' : Colors.primary;
    const oppRoundColor = oppWon ? '#EF4444' : myWon  ? Colors.textLight : isDraw ? '#F59E0B' : Colors.textMid;

    const showTurnsSub = isFinished && Math.max(state.roundsWonPlayer1, state.roundsWonPlayer2) < 3;

    const myXp  = isP1 ? state.rewardXpPlayer1  : state.rewardXpPlayer2;
    const myPts = isP1 ? state.rewardPackPointsPlayer1 : state.rewardPackPointsPlayer2;

    const rematchSecsLeft = matchFinishedAtRef.current != null
      ? Math.max(0, Math.ceil((matchFinishedAtRef.current + REMATCH_WINDOW_MS - Date.now()) / 1000))
      : 0;
    void rematchTick;
    const showRematchSection = isFinished
      && didFinishInSessionRef.current
      && !rematchDeclined
      && (rematchSecsLeft > 0 || state.rematchMatchId != null);
    const myVotedRematch  = isP1 ? state.player1WantsRematch : state.player2WantsRematch;
    const oppVotedRematch = isP1 ? state.player2WantsRematch : state.player1WantsRematch;

    const lastTurn = state.lastCompletedTurn;

    return (
      <ScrollView
        style={styles.phaseContainer}
        contentContainerStyle={styles.finishContent}
        showsVerticalScrollIndicator={false}
      >
        
        <View style={styles.finishedIconWrap}>
          <Ionicons name={icon} size={64} color={iconColor} />
        </View>
        <Text style={styles.finishedTitle}>{title}</Text>
        <Text style={styles.finishedSub}>{sub}</Text>

{isFinished && (
          <View style={styles.finalScore}>
            <Text style={styles.finalScoreLabel}>Resultado</Text>
            <View style={styles.finalScoreRow}>
              <Text style={[styles.finalScoreNum, { color: myRoundColor }]}>{myRoundsW}</Text>
              <Text style={styles.finalScoreSep}>–</Text>
              <Text style={[styles.finalScoreNum, { color: oppRoundColor }]}>{oppRoundsW}</Text>
            </View>
            <Text style={styles.finalScoreVs}>Tú vs {opponent.nickname}</Text>
            
            {showTurnsSub && (
              <View style={styles.finalTurnsRow}>
                <Text style={styles.finalTurnsScore}>{myTurnsW}–{oppTurnsW}</Text>
                <Text style={styles.finalTurnsLabel}> turnos en la última ronda</Text>
              </View>
            )}
          </View>
        )}

{isFinished && lastTurn && !state.wonByAbandon && (() => {
          const myCardName = isP1 ? lastTurn.player1CardName  : lastTurn.player2CardName;
          const myAttr     = isP1 ? lastTurn.player1Attribute : lastTurn.player2Attribute;
          const myVal      = isP1 ? lastTurn.player1Value      : lastTurn.player2Value;
          const myImg      = isP1 ? lastTurn.player1CardImage  : lastTurn.player2CardImage;
          const oppCardName = isP1 ? lastTurn.player2CardName  : lastTurn.player1CardName;
          const oppAttr     = isP1 ? lastTurn.player2Attribute : lastTurn.player1Attribute;
          const oppVal      = isP1 ? lastTurn.player2Value      : lastTurn.player1Value;
          const oppImg      = isP1 ? lastTurn.player2CardImage  : lastTurn.player1CardImage;
          const gcMyWins  = lastTurn.result === (isP1 ? 'PLAYER1_WINS' : 'PLAYER2_WINS');
          const gcOppWins = lastTurn.result === (isP1 ? 'PLAYER2_WINS' : 'PLAYER1_WINS');
          const gcTie     = lastTurn.result === 'TIE';
          const gcResText  = gcTie ? 'Empate' : gcMyWins ? 'Tú ganaste' : 'Rival ganó';
          const gcResColor = gcTie ? '#F59E0B' : gcMyWins ? '#22C55E' : '#EF4444';
          return (
            <View style={styles.gcCard}>
              <Text style={styles.gcTitle}>Golpe de gracia · Ronda {lastTurn.roundNumber} · Turno {lastTurn.turnNumber}</Text>
              <View style={styles.gcRow}>
                
                <View style={[styles.gcCardSlot, gcMyWins && styles.gcCardWinner]}>
                  {imgUri(myImg) ? (
                    <Image source={{ uri: imgUri(myImg)! }} style={styles.gcImg} resizeMode="contain" />
                  ) : (
                    <View style={[styles.gcImg, { backgroundColor: Colors.primaryLight }]} />
                  )}
                  <Text style={styles.gcCardName} numberOfLines={1}>{myCardName ?? '–'}</Text>
                  {myAttr && (
                    <View style={[styles.gcAttrBadge, { backgroundColor: ATTR_COLOR[myAttr] }]}>
                      <Text style={styles.gcAttrText}>{ATTR_LABEL[myAttr]}</Text>
                    </View>
                  )}
                  <Text style={[styles.gcValue, gcMyWins && { color: '#22C55E' }]}>{myVal ?? '–'}</Text>
                </View>
                
                <View style={styles.gcVs}>
                  <Text style={styles.gcVsText}>VS</Text>
                </View>
                
                <View style={[styles.gcCardSlot, gcOppWins && styles.gcCardWinner]}>
                  {imgUri(oppImg) ? (
                    <Image source={{ uri: imgUri(oppImg)! }} style={styles.gcImg} resizeMode="contain" />
                  ) : (
                    <View style={[styles.gcImg, { backgroundColor: Colors.primaryLight }]} />
                  )}
                  <Text style={styles.gcCardName} numberOfLines={1}>{oppCardName ?? '–'}</Text>
                  {oppAttr && (
                    <View style={[styles.gcAttrBadge, { backgroundColor: ATTR_COLOR[oppAttr] }]}>
                      <Text style={styles.gcAttrText}>{ATTR_LABEL[oppAttr]}</Text>
                    </View>
                  )}
                  <Text style={[styles.gcValue, gcOppWins && { color: '#22C55E' }]}>{oppVal ?? '–'}</Text>
                </View>
              </View>
              <View style={[styles.gcResult, { borderColor: gcResColor + '55', backgroundColor: gcResColor + '18' }]}>
                <Text style={[styles.gcResultText, { color: gcResColor }]}>{gcResText}</Text>
              </View>
            </View>
          );
        })()}

{isFinished && (
          <View style={styles.rewardsCard}>
            <Text style={styles.rewardsCardTitle}>Recompensas obtenidas</Text>
            <View style={styles.rewardsRow}>
              <View style={styles.rewardItem}>
                <Ionicons name="trophy-outline" size={28} color="#F59E0B" />
                <Text style={styles.rewardLabel}>Experiencia</Text>
                <Text style={styles.rewardValue}>+{myXp}</Text>
              </View>
              <View style={styles.rewardSep} />
              <View style={styles.rewardItem}>
                <Ionicons name="hourglass-outline" size={28} color={Colors.primary} />
                <Text style={styles.rewardLabel}>Pts. de sobre</Text>
                <Text style={styles.rewardValue}>+{myPts}</Text>
              </View>
            </View>
          </View>
        )}

{showRematchSection && (() => {
          const meAvatar    = imgUri(user.profilePhoto);
          const oppAvatar   = imgUri(opponent.profilePhoto);

          return (
            <View style={styles.rematchCard}>
              
              <View style={styles.rematchHeader}>
                <Text style={styles.rematchTitle}>¿Revancha?</Text>
                <View style={styles.rematchCountdownBadge}>
                  <Ionicons name="time-outline" size={13} color={rematchSecsLeft <= 10 ? '#EF4444' : Colors.primary} />
                  <Text style={[
                    styles.rematchCountdownText,
                    rematchSecsLeft <= 10 && { color: '#EF4444' },
                  ]}>
                    {rematchSecsLeft}s
                  </Text>
                </View>
              </View>

<View style={styles.rematchPlayers}>
                
                <View style={styles.rematchPlayer}>
                  <View style={[
                    styles.rematchAvatarWrap,
                    myVotedRematch && styles.rematchAvatarAccepted,
                  ]}>
                    {meAvatar ? (
                      <Image source={{ uri: meAvatar }} style={styles.rematchAvatar} />
                    ) : (
                      <View style={[styles.rematchAvatar, { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="person" size={22} color={Colors.primary} />
                      </View>
                    )}
                    {myVotedRematch && (
                      <View style={styles.rematchVoteBadge}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.rematchPlayerName} numberOfLines={1}>Tú</Text>
                  <Text style={[
                    styles.rematchVoteLabel,
                    myVotedRematch ? styles.rematchVoteLabelYes : styles.rematchVoteLabelWaiting,
                  ]}>
                    {myVotedRematch ? '¡Listo!' : '...'}
                  </Text>
                </View>

<Text style={styles.rematchVs}>VS</Text>

<View style={styles.rematchPlayer}>
                  <View style={[
                    styles.rematchAvatarWrap,
                    oppVotedRematch && styles.rematchAvatarAccepted,
                  ]}>
                    {oppAvatar ? (
                      <Image source={{ uri: oppAvatar }} style={styles.rematchAvatar} />
                    ) : (
                      <View style={[styles.rematchAvatar, { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="person" size={22} color={Colors.primary} />
                      </View>
                    )}
                    {oppVotedRematch && (
                      <View style={styles.rematchVoteBadge}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.rematchPlayerName} numberOfLines={1}>{opponent.nickname}</Text>
                  <Text style={[
                    styles.rematchVoteLabel,
                    oppVotedRematch ? styles.rematchVoteLabelYes : styles.rematchVoteLabelWaiting,
                  ]}>
                    {oppVotedRematch ? '¡Listo!' : '...'}
                  </Text>
                </View>
              </View>

{rematchRejectedBy ? (
                <View style={styles.rematchRejectedRow}>
                  <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                  <Text style={styles.rematchRejectedText}>
                    {rematchRejectedBy} ha rechazado la revancha
                  </Text>
                </View>
              ) : !myVotedRematch ? (
                
                <View style={styles.rematchBtnRow}>
                  <Pressable
                    style={[styles.rematchAcceptBtn, (votingRematch || rematchSecsLeft === 0) && styles.readyBtnDisabled]}
                    onPress={() => handleRematchVote(true)}
                    disabled={votingRematch || rematchSecsLeft === 0}
                  >
                    {votingRematch
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <Ionicons name="refresh" size={16} color="#fff" />
                          <Text style={styles.rematchAcceptBtnText}>¡Revancha!</Text>
                        </>
                    }
                  </Pressable>
                  <Pressable
                    style={styles.rematchDeclineBtn}
                    onPress={() => handleRematchVote(false)}
                    disabled={votingRematch}
                  >
                    <Text style={styles.rematchDeclineBtnText}>No</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.rematchWaitingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.rematchWaitingText}>
                    {oppVotedRematch ? '¡Arrancando…!' : `Esperando a ${opponent.nickname}…`}
                  </Text>
                </View>
              )}
            </View>
          );
        })()}

<Pressable
          style={showRematchSection ? styles.backBtnOutline : styles.readyBtn}
          onPress={() => router.back()}
        >
          <Text style={showRematchSection ? styles.backBtnOutlineText : styles.readyBtnText}>
            Volver
          </Text>
        </Pressable>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: Colors.background },
  centered:  { alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 52,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  backBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  topBarTitle: { fontSize: 17, fontWeight: '800', color: Colors.textDark },
  forfeitBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },

  errorText:    { fontSize: 15, color: Colors.textMid, textAlign: 'center', marginTop: 12 },
  retryBtn:     { marginTop: 20, backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  phaseContainer: { flex: 1, padding: 24 },
  gameContainer:  { flex: 1 },

  inviteAvatarWrap: { position: 'relative', marginBottom: 20 },
  inviteAvatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: Colors.primary },
  inviteAvatarFallback: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  swordBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  inviteTitle: { fontSize: 24, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  inviteSub:   { fontSize: 14, color: Colors.textMid, textAlign: 'center', marginTop: 6, marginBottom: 32, lineHeight: 20 },
  inviteBtnRow: { flexDirection: 'row', gap: 16, width: '100%', maxWidth: 300 },
  inviteActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 16,
  },
  inviteRejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1.5, borderColor: '#FCA5A5' },
  inviteAcceptBtn: { backgroundColor: Colors.primary },
  inviteRejectText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  inviteAcceptText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelInviteBtn: {
    alignSelf: 'center', marginTop: 16,
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
  },
  cancelInviteText: { fontSize: 13, fontWeight: '600', color: Colors.textMid },

  lobbyPlayers: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 20,
    padding: 20, gap: 8,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  lobbyPlayer: { flex: 1, alignItems: 'center', gap: 8 },
  lobbyAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: Colors.primary },
  lobbyAvatarFallback: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  lobbyNick: { fontSize: 13, fontWeight: '700', color: Colors.textDark, textAlign: 'center' },
  lobbyVs: { paddingHorizontal: 8 },
  lobbyVsText: { fontSize: 20, fontWeight: '900', color: Colors.textLight },
  readyBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.border,
  },
  readyBadgeOn: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  readyBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.textLight, letterSpacing: 0.5 },
  readyBadgeTextOn: { color: '#16A34A' },

  deckPickHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  deckPickTitle: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  goToDecksBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryLight, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  goToDecksBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  noDeckWrap: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  noDeckText: { fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 20 },
  lobbyDeckCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18, borderWidth: 1.5, borderColor: Colors.border,
    padding: 14, gap: 12,
  },
  lobbyDeckCardSelected: {
    borderColor: Colors.primary, backgroundColor: Colors.primaryLight,
  },
  lobbyDeckTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lobbyDeckIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  lobbyDeckIconSelected: { backgroundColor: Colors.primary + '22' },
  lobbyDeckName: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  lobbyDeckNameSelected: { color: Colors.primary },
  lobbyDeckMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  lobbyDeckMetaText: { fontSize: 12, color: Colors.textLight },
  lobbyMetaDot: { fontSize: 12, color: Colors.textLight },
  lobbySlotsRow: { flexDirection: 'row', gap: LOBBY_SLOT_GAP },
  readyBtn: {
    width: '100%',
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  readyBtnDisabled: { backgroundColor: '#DDD', shadowOpacity: 0 },
  readyBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  waitingWrap: { alignItems: 'center', gap: 14, paddingVertical: 20 },
  waitingRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waitingText: { fontSize: 14, color: Colors.textMid, fontWeight: '600' },
  changeBtn: {
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  changeBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textMid },

scoreboard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
    paddingVertical: 10, paddingHorizontal: 24,
  },
  scoreBlock: { flex: 1, alignItems: 'center' },
  scoreRoundLabel: { fontSize: 10, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.8 },
  scoreRound: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  scoreTurn:  { fontSize: 22, fontWeight: '900', color: Colors.textDark },

  oppZone: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.primaryLight },
  oppHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  oppAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary },
  oppAvatarFallback: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  oppNick: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textDark },
  submittedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#22C55E', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  submittedBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  rivalLateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F59E0B22', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: '#F59E0B66',
  },
  rivalLateBadgeText: { fontSize: 10, fontWeight: '700', color: '#F59E0B' },
  oppCardsRow: { flexDirection: 'row', gap: 6 },
  oppCard: {
    width: CARD_W, height: CARD_H,
    borderRadius: 8,
    backgroundColor: Colors.primary + 'BB',
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  timerZone: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  waitChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  waitChipLate: {
    borderColor: '#F59E0B66',
    backgroundColor: '#F59E0B11',
  },
  waitChipText: { fontSize: 13, color: Colors.textMid, fontWeight: '600' },
  waitChipTextLate: { color: '#F59E0B', fontWeight: '700' },

  myZone: { flex: 1, padding: 12 },
  myZoneLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMid, marginBottom: 8 },
  myCardsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  handWrapper: {
    alignItems: 'center',
  },
  attrDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
    width: CARD_W,
  },
  attrDot: { flex: 1, height: 4, borderRadius: 2 },
  selectedRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8, borderWidth: 2.5, borderColor: Colors.primary,
  },

  legendBlockedOverlay: {
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
  },

  legendBlockChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEE2E2', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FCA5A5',
    alignSelf: 'flex-start', marginBottom: 6,
  },
  legendBlockChipText: {
    fontSize: 12, fontWeight: '700', color: '#EF4444', flexShrink: 1,
  },

  discardSection: { marginTop: 10, gap: 4 },
  discardLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textLight, letterSpacing: 0.4,
  },
  discardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: DISC_GAP },

  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, gap: 12,
  },
  pickerHandle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: Colors.border,
    marginBottom: 4,
  },
  pickerCardRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  pickerCardImg: { width: 60, height: 84, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border },
  pickerCardName: { fontSize: 15, fontWeight: '800', color: Colors.textDark, flexShrink: 1 },
  pickerRating: { fontSize: 13, color: Colors.textMid, marginTop: 4 },
  legendBadge: {
    alignSelf: 'flex-start', backgroundColor: '#F59E0B',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4,
  },
  legendBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  pickerSubtitle: { fontSize: 13, fontWeight: '700', color: Colors.textMid },
  attrRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 14, gap: 10, borderLeftWidth: 0,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  attrRowUsed: { opacity: 0.45 },
  attrRowPressed: { opacity: 0.75 },
  attrColorBar: { width: 4, height: 32, borderRadius: 2 },
  attrLabel: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  attrLabelUsed: { color: Colors.textLight },
  attrValue: { fontSize: 22, fontWeight: '900', color: Colors.textDark, minWidth: 36, textAlign: 'right' },

  revealOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center',
    gap: 20,
  },
  revealContent: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20,
  },
  revealCard: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 20, padding: 12,
    borderWidth: 2, borderColor: Colors.border,
  },
  revealCardWinner: {
    borderColor: '#22C55E', borderWidth: 3,
    shadowColor: '#22C55E', shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
  },
  revealCardImg: { width: '100%', aspectRatio: 1 / 1.5, borderRadius: 10 },
  revealCardName: { fontSize: 12, fontWeight: '700', color: Colors.textDark, textAlign: 'center' },
  revealAttrBadge: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  revealAttrText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  revealValue: { fontSize: 32, fontWeight: '900', color: Colors.textDark },
  revealValueWinner: { color: '#22C55E' },
  winGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.08)',
  },

  vsWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  vsText: { fontSize: 13, fontWeight: '900', color: '#fff' },

  resultBanner: {
    paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 24, backgroundColor: Colors.background,
    borderWidth: 2.5,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  resultText: { fontSize: 22, fontWeight: '900', textAlign: 'center' },

  forfeitGameBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', marginTop: 14,
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 12, borderWidth: 1.5,
    borderColor: '#FCA5A5', backgroundColor: '#FEF2F2',
  },
  forfeitGameBtnText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },

  dialogOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  dialogCard: {
    backgroundColor: Colors.background, borderRadius: 24,
    padding: 28, alignItems: 'center', gap: 12, width: '100%', maxWidth: 340,
  },
  dialogTitle: { fontSize: 20, fontWeight: '900', color: Colors.textDark },
  dialogMsg:   { fontSize: 14, color: Colors.textMid, textAlign: 'center', lineHeight: 20 },
  dialogBtns:  { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  dialogBtnCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  dialogBtnCancelText: { fontSize: 14, fontWeight: '600', color: Colors.textMid, textAlign: 'center' },
  dialogBtnConfirm: {
    flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EF4444',
  },
  dialogBtnConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'center' },

  gsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,10,25,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gsNumber: {
    fontSize: 120,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  gsGo: {
    fontSize: 68,
    color: '#FFF176',
    textShadowColor: '#F59E0B',
    letterSpacing: 2,
  },

  rsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,10,25,0.80)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 56,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  rsLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  rsNum: {
    fontSize: 100,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 110,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  foOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  foIconWrap: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  foStar: {
    position: 'absolute',
  },
  foTitle: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 2,
  },
  foTitleWin: {
    color: '#FFF176',
    textShadowColor: 'rgba(255,220,0,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  foSub: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },

finishContent: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 20,
    paddingBottom: 48,
  },

  rewardsCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    padding: 18,
    gap: 12,
  },
  rewardsCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMid,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rewardItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  rewardSep: {
    width: 1,
    backgroundColor: Colors.primaryLight,
    marginVertical: 4,
  },
  rewardLabel: {
    fontSize: 12,
    color: Colors.textMid,
    fontWeight: '600',
  },
  rewardValue: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textDark,
  },

  rematchCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    padding: 18,
    gap: 14,
  },
  rematchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rematchTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.textDark,
  },
  rematchCountdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rematchCountdownText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  rematchPlayers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  rematchPlayer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  rematchAvatarWrap: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2.5, borderColor: Colors.border,
    position: 'relative',
  },
  rematchAvatarAccepted: {
    borderColor: '#22C55E',
    shadowColor: '#22C55E', shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  rematchAvatar: {
    width: '100%', height: '100%', borderRadius: 28,
  },
  rematchVoteBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.background,
  },
  rematchPlayerName: {
    fontSize: 12, fontWeight: '700', color: Colors.textDark,
    maxWidth: 80,
  },
  rematchVoteLabel: {
    fontSize: 11, fontWeight: '700',
  },
  rematchVoteLabelYes: { color: '#22C55E' },
  rematchVoteLabelWaiting: { color: Colors.textLight },
  rematchVs: {
    fontSize: 14, fontWeight: '900', color: Colors.textLight,
    paddingHorizontal: 4,
  },
  rematchBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rematchAcceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  rematchAcceptBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  rematchDeclineBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  rematchDeclineBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textMid },
  rematchWaitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  rematchWaitingText: {
    fontSize: 13,
    color: Colors.textMid,
    fontWeight: '600',
  },
  rematchRejectedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 6,
  },
  rematchRejectedText: {
    fontSize: 14, fontWeight: '700', color: '#EF4444',
  },

  backBtnOutline: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  backBtnOutlineText: { fontSize: 15, fontWeight: '600', color: Colors.textMid },

  finishedIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  finishedTitle: { fontSize: 28, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  finishedSub:   { fontSize: 14, color: Colors.textMid, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  finalScore: {
    alignItems: 'center', gap: 4,
    backgroundColor: Colors.surface, borderRadius: 20,
    paddingVertical: 20, paddingHorizontal: 40,
    borderWidth: 1, borderColor: Colors.primaryLight,
    marginBottom: 24, width: '100%',
  },
  finalScoreLabel: { fontSize: 11, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 1 },
  finalScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  finalScoreNum: { fontSize: 48, fontWeight: '900' },
  finalScoreSep: { fontSize: 24, color: Colors.textLight },
  finalScoreVs:  { fontSize: 13, color: Colors.textMid },

  finalTurnsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  finalTurnsScore: { fontSize: 15, fontWeight: '800', color: Colors.textMid },
  finalTurnsLabel: { fontSize: 12, color: Colors.textLight },

  gcCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    padding: 16,
    gap: 12,
  },
  gcTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMid,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  gcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gcCardSlot: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  gcCardWinner: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34,197,94,0.06)',
  },
  gcImg: {
    width: '100%',
    aspectRatio: 1 / 1.5,
    borderRadius: 8,
  },
  gcCardName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'center',
  },
  gcAttrBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  gcAttrText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },
  gcValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textDark,
  },
  gcVs: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gcVsText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
  },
  gcResult: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  gcResultText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
