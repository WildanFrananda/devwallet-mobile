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
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>NFTs</Text>
        <Pressable onPress={() => vm.refresh()}>
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
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <View style={styles.thumbWrap}>
        {nft.image ? (
          <Image source={{ uri: nft.image }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.placeholder]}>
            <Text style={styles.placeholderText}>?</Text>
          </View>
        )}
        <Text style={styles.chainBadge}>{chainLabel(nft.chain)}</Text>
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
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  back: { color: "#007AFF", fontSize: 14 },
  refresh: { fontSize: 18 },
  title: { fontSize: 18, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#B00020", padding: 12, textAlign: "center" },
  grid: { padding: 12, gap: 12 },
  row: { gap: 12 },
  tile: { flex: 1, backgroundColor: "#F8F8FA", borderRadius: 12, padding: 8 },
  thumbWrap: { position: "relative" },
  thumb: { width: "100%", aspectRatio: 1, borderRadius: 8, backgroundColor: "#E0E0E0" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 32, color: "#999" },
  chainBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.55)",
    color: "#FFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden"
  },
  tileName: { fontSize: 13, fontWeight: "600", marginTop: 6 },
  tileMeta: { fontSize: 11, opacity: 0.6 },
  emptyBox: { padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyBody: { fontSize: 13, opacity: 0.6, textAlign: "center", marginTop: 6 },
  detailContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  detailHeader: { paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12 },
  detailBody: { padding: 16, gap: 12 },
  detailImage: { width: "100%", aspectRatio: 1, borderRadius: 12, backgroundColor: "#E0E0E0" },
  detailName: { fontSize: 20, fontWeight: "700" },
  detailCollection: { fontSize: 13, opacity: 0.65 },
  detailDescription: { fontSize: 13, lineHeight: 18 },
  detailMetaBox: { backgroundColor: "#F8F8FA", borderRadius: 10, padding: 12, gap: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  metaLabel: { fontSize: 11, fontWeight: "700", opacity: 0.55, width: 80 },
  metaValue: { fontSize: 12, flexShrink: 1, textAlign: "right" },
  mono: { fontFamily: "Courier" },
  linkText: { fontSize: 13, color: "#007AFF", textAlign: "center", marginTop: 8 }
})

export default NftGalleryScreen
