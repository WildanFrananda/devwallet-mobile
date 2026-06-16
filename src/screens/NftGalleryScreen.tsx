import { useState, type JSX } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Linking
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { useViewModel, useStream, useInit } from "react-native-mobile-mvvm"
import NftGalleryViewModel from "../viewmodels/NftGalleryViewModel"
import Nft from "../models/nft.model"
import { Chain } from "../core/constants/chains.enum"
import DotGridBackground from "../components/DotGridBackground"
import { colors, typography, spacing, radius, hairline, chainColors, type ChainColorKey } from "../theme"

const COLUMN_COUNT = 2

function NftGalleryScreen(): JSX.Element {
  const vm = useViewModel(NftGalleryViewModel)
  const nav = useNavigation()
  const insets = useSafeAreaInsets()
  const state = useStream(vm.state$, vm.state$.value)
  const [detail, setDetail] = useState<Nft | null>(null)

  useInit(() => vm.refresh())

  const list = state.status === "success" ? state.data : []

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <DotGridBackground />
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>NFTs</Text>
        <Pressable onPress={() => vm.refresh()} hitSlop={8}>
          <Text style={styles.refresh}>↻</Text>
        </Pressable>
      </View>

      {state.status === "loading" && list.length === 0 && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}
      {state.status === "error" && <Text style={styles.errorText}>{state.message}</Text>}
      {state.status === "success" && list.length === 0 && <EmptyState />}

      <FlatList
        data={list}
        keyExtractor={item => item.key()}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={state.status === "loading"} onRefresh={() => vm.refresh()} />
        }
        renderItem={({ item }) => <NftTile nft={item} onPress={() => setDetail(item)} />}
      />

      <DetailModal nft={detail} onClose={() => setDetail(null)} />
    </View>
  )
}

function NftTile({ nft, onPress }: { nft: Nft; onPress: () => void }): JSX.Element {
  const hue = chainColors[nft.chain as ChainColorKey] ?? colors.border
  return (
    <Pressable style={[styles.tile, { borderColor: hue + "33" }]} onPress={onPress}>
      <View style={styles.thumbWrap}>
        {nft.image ? (
          <Image source={{ uri: nft.image }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.placeholder]}>
            <Text style={styles.placeholderText}>?</Text>
          </View>
        )}
        <View style={[styles.chainBadge, { backgroundColor: hue + "e6" }]}>
          <Text style={styles.chainBadgeText}>{chainLabel(nft.chain)}</Text>
        </View>
      </View>
      <Text style={styles.tileName} numberOfLines={1}>
        {nft.name}
      </Text>
      {nft.collection && (
        <Text style={styles.tileMeta} numberOfLines={1}>
          {nft.collection}
        </Text>
      )}
    </Pressable>
  )
}

function DetailModal({ nft, onClose }: { nft: Nft | null; onClose: () => void }): JSX.Element {
  return (
    <Modal visible={nft !== null} animationType="slide" onRequestClose={onClose}>
      {nft && (
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <Pressable onPress={onClose}>
              <Text style={styles.back}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.detailBody}>
            {nft.image ? (
              <Image source={{ uri: nft.image }} style={styles.detailImage} resizeMode="contain" />
            ) : (
              <View style={[styles.detailImage, styles.placeholder]}>
                <Text style={styles.placeholderText}>?</Text>
              </View>
            )}
            <Text style={styles.detailName}>{nft.name}</Text>
            {nft.collection && <Text style={styles.detailCollection}>{nft.collection}</Text>}
            {nft.description && <Text style={styles.detailDescription}>{nft.description}</Text>}
            <View style={styles.detailMetaBox}>
              <Meta label="chain" value={chainLabel(nft.chain)} />
              <Meta label="contract" value={nft.contractAddress} mono />
              <Meta label="tokenId" value={nft.tokenId} mono />
            </View>
            {nft.image && (
              <Pressable
                onPress={() => nft.image !== null && void Linking.openURL(nft.image)}
              >
                <Text style={styles.linkText}>Open image ↗</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}
    </Modal>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, mono === true && styles.mono]} selectable>
        {value}
      </Text>
    </View>
  )
}

function EmptyState(): JSX.Element {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyTitle}>No NFTs yet</Text>
      <Text style={styles.emptyBody}>
        Mint one on Sepolia OpenSea or use a faucet contract on Polygon Amoy, then pull-to-refresh.
      </Text>
    </View>
  )
}

function chainLabel(chain: Chain): string {
  switch (chain) {
    case Chain.EVM_SEPOLIA:
      return "Sepolia"
    case Chain.EVM_POLYGON_AMOY:
      return "Amoy"
    case Chain.EVM_BASE_SEPOLIA:
      return "Base"
    case Chain.SOLANA_DEVNET:
      return "SOL"
    default:
      return chain
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm
  },
  back: { ...typography.monoLabelSm, color: colors.accentText },
  refresh: { fontSize: 18, color: colors.accentText },
  title: { ...typography.titleMd, color: colors.textPrimary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { ...typography.monoDataSm, color: colors.error, padding: spacing.md, textAlign: "center" },
  grid: { padding: spacing.md, gap: spacing.md },
  row: { gap: spacing.md },
  tile: {
    flex: 1,
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.sm
  },
  thumbWrap: { position: "relative" },
  thumb: { width: "100%", aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.elevation2 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 32, color: colors.textMuted },
  chainBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.xs
  },
  chainBadgeText: { ...typography.labelXs, fontSize: 10, color: colors.onAccent },
  tileName: { ...typography.titleMd, fontSize: 13, color: colors.textPrimary, marginTop: spacing.xs },
  tileMeta: { ...typography.monoDataSm, color: colors.textMuted },
  emptyBox: { padding: 32, alignItems: "center" },
  emptyTitle: { ...typography.titleMd, color: colors.textPrimary },
  emptyBody: { ...typography.bodyMd, color: colors.textMuted, textAlign: "center", marginTop: spacing.xs },
  detailContainer: { flex: 1, backgroundColor: colors.background },
  detailHeader: { paddingHorizontal: spacing.lg, paddingTop: 50, paddingBottom: spacing.sm },
  detailBody: { padding: spacing.lg, gap: spacing.md },
  detailImage: { width: "100%", aspectRatio: 1, borderRadius: radius.lg, backgroundColor: colors.elevation2 },
  detailName: { ...typography.headlineLg, color: colors.textPrimary },
  detailCollection: { ...typography.bodyMd, color: colors.textSecondary },
  detailDescription: { ...typography.bodyMd, color: colors.textSecondary },
  detailMetaBox: {
    backgroundColor: colors.elevation1,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  metaLabel: { ...typography.labelXs, color: colors.textMuted, width: 80 },
  metaValue: { ...typography.monoDataSm, color: colors.textSecondary, flexShrink: 1, textAlign: "right" },
  mono: { ...typography.monoDataSm, color: colors.textPrimary },
  linkText: { ...typography.monoLabelSm, color: colors.accentText, textAlign: "center", marginTop: spacing.sm }
})

export default NftGalleryScreen
