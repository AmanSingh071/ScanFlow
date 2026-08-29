import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

type DocumentItem = {
  id: string;
  name: string;
  pages: number;
  date: string;
  uri?: string;
};

type Tab = "Library" | "Scan" | "Tools" | "Settings";

export default function App() {
  const systemTheme = useColorScheme();

  const [activeTab, setActiveTab] = useState<Tab>("Library");
  const [darkMode, setDarkMode] = useState(systemTheme === "dark");
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([
    {
      id: "1",
      name: "College Notes",
      pages: 12,
      date: "Today",
    },
    {
      id: "2",
      name: "Assignment",
      pages: 4,
      date: "Yesterday",
    },
    {
      id: "3",
      name: "Receipt",
      pages: 1,
      date: "Aug 27",
    },
  ]);

  const [scannerOpen, setScannerOpen] = useState(false);

  const colors = darkMode
    ? {
        background: "#0F1115",
        card: "#1A1E26",
        cardSecondary: "#222833",
        text: "#F5F7FA",
        muted: "#9AA4B2",
        border: "#2B313C",
        accent: "#4F8CFF",
        danger: "#FF6B6B",
      }
    : {
        background: "#F6F7FB",
        card: "#FFFFFF",
        cardSecondary: "#EEF2F8",
        text: "#172033",
        muted: "#738095",
        border: "#E2E7EF",
        accent: "#3B82F6",
        danger: "#EF4444",
      };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) =>
      doc.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [documents, search]);

  async function importFromGallery() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow photo access to import documents."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      const newDocument: DocumentItem = {
        id: Date.now().toString(),
        name: `Scanned Document ${documents.length + 1}`,
        pages: 1,
        date: "Just now",
        uri: asset.uri,
      };

      setDocuments((current) => [newDocument, ...current]);
      setScannerOpen(false);
      setActiveTab("Library");
    }
  }

  function deleteDocument(id: string) {
    Alert.alert(
      "Delete document?",
      "This will remove the document from your library.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setDocuments((current) =>
              current.filter((document) => document.id !== id)
            );
          },
        },
      ]
    );
  }

  function renderDocument({ item }: { item: DocumentItem }) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.documentCard, { backgroundColor: colors.card }]}
        onLongPress={() => deleteDocument(item.id)}
      >
        <View
          style={[
            styles.documentIcon,
            { backgroundColor: colors.cardSecondary },
          ]}
        >
          {item.uri ? (
            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
          ) : (
            <Text style={styles.documentEmoji}>📄</Text>
          )}
        </View>

        <View style={styles.documentInfo}>
          <Text
            style={[styles.documentName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <Text style={[styles.documentMeta, { color: colors.muted }]}>
            {item.pages} page{item.pages !== 1 ? "s" : ""} • {item.date}
          </Text>
        </View>

        <Text style={[styles.more, { color: colors.muted }]}>•••</Text>
      </TouchableOpacity>
    );
  }

  function renderLibrary() {
    return (
      <>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>
              Your documents
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              ScanFlow
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.profileButton,
              { backgroundColor: colors.cardSecondary },
            ]}
          >
            <Text style={{ fontSize: 20 }}>👤</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={styles.searchIcon}>🔍</Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search documents..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <View style={styles.quickStats}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={styles.statEmoji}>📄</Text>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {documents.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Documents
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={styles.statEmoji}>📑</Text>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {documents.reduce((total, doc) => total + doc.pages, 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Total Pages
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Documents
          </Text>

          <Text style={[styles.viewAll, { color: colors.accent }]}>
            View all
          </Text>
        </View>

        <FlatList
          data={filteredDocuments}
          renderItem={renderDocument}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 130 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 42 }}>📭</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No documents found
              </Text>
            </View>
          }
        />
      </>
    );
  }

  function renderScan() {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.bigIcon}>📷</Text>

        <Text style={[styles.centerTitle, { color: colors.text }]}>
          Scan a Document
        </Text>

        <Text style={[styles.centerDescription, { color: colors.muted }]}>
          Capture a document or import an existing image.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.accent }]}
          onPress={() => setScannerOpen(true)}
        >
          <Text style={styles.primaryButtonText}>Start Scanning</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
          onPress={importFromGallery}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            Import from Gallery
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderTools() {
    const tools = [
      ["🔎", "OCR Text", "Extract text from documents"],
      ["📄", "Merge PDF", "Combine multiple PDFs"],
      ["✂️", "Split PDF", "Separate PDF pages"],
      ["🗜️", "Compress PDF", "Reduce file size"],
      ["🔐", "Protect PDF", "Password protection"],
      ["✨", "Enhance Scan", "Improve document quality"],
    ];

    return (
      <>
        <Text style={[styles.screenTitle, { color: colors.text }]}>
          Tools
        </Text>

        <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
          Powerful document tools
        </Text>

        <View style={styles.toolsGrid}>
          {tools.map(([emoji, title, subtitle]) => (
            <TouchableOpacity
              key={title}
              style={[
                styles.toolCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() =>
                Alert.alert(
                  title,
                  `${title} will be added in the upcoming ScanFlow phase.`
                )
              }
            >
              <Text style={styles.toolEmoji}>{emoji}</Text>
              <Text style={[styles.toolTitle, { color: colors.text }]}>
                {title}
              </Text>
              <Text style={[styles.toolSubtitle, { color: colors.muted }]}>
                {subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  }

  function renderSettings() {
    return (
      <>
        <Text style={[styles.screenTitle, { color: colors.text }]}>
          Settings
        </Text>

        <View
          style={[
            styles.settingsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.settingRow}>
            <View>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                🌙 Dark Mode
              </Text>
              <Text style={[styles.settingSubtitle, { color: colors.muted }]}>
                Change the appearance of ScanFlow
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.toggle,
                {
                  backgroundColor: darkMode
                    ? colors.accent
                    : colors.cardSecondary,
                },
              ]}
              onPress={() => setDarkMode(!darkMode)}
            >
              <View
                style={[
                  styles.toggleCircle,
                  { marginLeft: darkMode ? 24 : 4 },
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.settingsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity style={styles.settingsOption}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              🔒 Security
            </Text>
            <Text style={{ color: colors.muted }}>›</Text>
          </TouchableOpacity>

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />

          <TouchableOpacity style={styles.settingsOption}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              💾 Storage
            </Text>
            <Text style={{ color: colors.muted }}>›</Text>
          </TouchableOpacity>

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />

          <TouchableOpacity style={styles.settingsOption}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              ⭐ ScanFlow Pro
            </Text>
            <Text style={{ color: colors.muted }}>›</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  function renderContent() {
    switch (activeTab) {
      case "Library":
        return renderLibrary();
      case "Scan":
        return renderScan();
      case "Tools":
        return renderTools();
      case "Settings":
        return renderSettings();
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View style={styles.content}>{renderContent()}</View>

      <TouchableOpacity
        style={[styles.floatingScanButton, { backgroundColor: colors.accent }]}
        onPress={() => {
          setActiveTab("Scan");
          setScannerOpen(true);
        }}
      >
        <Text style={styles.floatingScanIcon}>📷</Text>
      </TouchableOpacity>

      <View
        style={[
          styles.bottomNav,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {[
          ["Library", "📚"],
          ["Scan", "📷"],
          ["Tools", "🧰"],
          ["Settings", "⚙️"],
        ].map(([tab, icon]) => (
          <TouchableOpacity
            key={tab}
            style={styles.navItem}
            onPress={() => setActiveTab(tab as Tab)}
          >
            <Text style={styles.navIcon}>{icon}</Text>

            <Text
              style={[
                styles.navText,
                {
                  color:
                    activeTab === tab ? colors.accent : colors.muted,
                },
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={scannerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setScannerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.scannerModal,
              { backgroundColor: colors.card },
            ]}
          >
            <View
              style={[
                styles.modalHandle,
                { backgroundColor: colors.border },
              ]}
            />

            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Scan Document
            </Text>

            <Text style={[styles.modalDescription, { color: colors.muted }]}>
              Choose how you want to add your document.
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.accent },
              ]}
              onPress={() => {
                Alert.alert(
                  "Camera",
                  "Live camera scanning is the next feature we will implement."
                );
              }}
            >
              <Text style={styles.primaryButtonText}>
                📷 Open Camera
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.cardSecondary,
                },
              ]}
              onPress={importFromGallery}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: colors.text },
                ]}
              >
                🖼️ Import Image
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setScannerOpen(false)}
            >
              <Text style={[styles.cancelText, { color: colors.muted }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },

  greeting: {
    fontSize: 14,
    marginBottom: 3,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
  },

  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },

  searchContainer: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
  },

  quickStats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 26,
  },

  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },

  statEmoji: {
    fontSize: 22,
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 22,
    fontWeight: "800",
  },

  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
  },

  viewAll: {
    fontSize: 14,
    fontWeight: "600",
  },

  documentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },

  documentIcon: {
    width: 58,
    height: 58,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  documentEmoji: {
    fontSize: 26,
  },

  thumbnail: {
    width: "100%",
    height: "100%",
  },

  documentInfo: {
    flex: 1,
    marginLeft: 13,
  },

  documentName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 5,
  },

  documentMeta: {
    fontSize: 13,
  },

  more: {
    fontWeight: "700",
    letterSpacing: 2,
  },

  emptyState: {
    alignItems: "center",
    marginTop: 50,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
  },

  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },

  bigIcon: {
    fontSize: 70,
    marginBottom: 20,
  },

  centerTitle: {
    fontSize: 26,
    fontWeight: "800",
  },

  centerDescription: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 28,
  },

  primaryButton: {
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },

  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },

  screenTitle: {
    fontSize: 30,
    fontWeight: "800",
    marginTop: 8,
  },

  screenSubtitle: {
    marginTop: 5,
    marginBottom: 22,
    fontSize: 14,
  },

  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  toolCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    minHeight: 150,
  },

  toolEmoji: {
    fontSize: 30,
    marginBottom: 15,
  },

  toolTitle: {
    fontSize: 15,
    fontWeight: "800",
  },

  toolSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },

  settingsCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginTop: 22,
  },

  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  settingTitle: {
    fontSize: 16,
    fontWeight: "700",
  },

  settingSubtitle: {
    fontSize: 12,
    marginTop: 5,
  },

  toggle: {
    width: 52,
    height: 30,
    borderRadius: 20,
    paddingVertical: 4,
  },

  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },

  settingsOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },

  divider: {
    height: 1,
    marginVertical: 12,
  },

  bottomNav: {
    height: 76,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
  },

  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 70,
  },

  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },

  navText: {
    fontSize: 11,
    fontWeight: "600",
  },

  floatingScanButton: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },

  floatingScanIcon: {
    fontSize: 27,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  scannerModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },

  modalHandle: {
    width: 45,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 7,
  },

  modalDescription: {
    fontSize: 14,
    marginBottom: 24,
  },

  cancelButton: {
    paddingTop: 20,
    alignItems: "center",
  },

  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
});