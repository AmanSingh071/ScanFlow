import React, { useEffect, useMemo, useState } from "react";
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
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Page = { id: string; uri: string; rotation: number };
type DocumentItem = { id: string; name: string; pages: Page[]; date: string; createdAt: number };
type Tab = "Library" | "Scan" | "Tools" | "Settings";
const STORAGE_KEY = "@scanflow_documents_v1";

export default function App() {
  const systemTheme = useColorScheme();
  const [activeTab, setActiveTab] = useState<Tab>("Library");
  const [darkMode, setDarkMode] = useState(systemTheme === "dark");
  const [search, setSearch] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<"off" | "on">("off");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setDocuments(JSON.parse(saved));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  const colors = darkMode ? {
    background:"#0F1115", card:"#1A1E26", cardSecondary:"#222833", text:"#F5F7FA",
    muted:"#9AA4B2", border:"#2B313C", accent:"#4F8CFF", danger:"#FF6B6B"
  } : {
    background:"#F6F7FB", card:"#FFFFFF", cardSecondary:"#EEF2F8", text:"#172033",
    muted:"#738095", border:"#E2E7EF", accent:"#3B82F6", danger:"#EF4444"
  };

  const filteredDocuments = useMemo(() =>
    documents.filter(d => d.name.toLowerCase().includes(search.toLowerCase())), [documents, search]);

  const addPages = (uris: string[]) => {
    setPages(current => [...current, ...uris.map(uri => ({
      id: Math.random().toString(36).slice(2), uri, rotation: 0
    }))]);
  };

  async function importFromGallery() {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return Alert.alert("Permission required", "Allow photo access to import pages.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsMultipleSelection: true, quality: 1
    });
    if (!result.canceled && result.assets.length) {
      addPages(result.assets.map(a => a.uri));
      setScannerOpen(false);
      setReviewOpen(true);
    }
  }

  async function openCamera() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return Alert.alert("Camera permission", "Allow camera access to scan documents.");
    }
    setScannerOpen(false);
    setCameraOpen(true);
  }

  async function capturePage() {
    if (!cameraRef) return;
    try {
      const photo = await cameraRef.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) addPages([photo.uri]);
    } catch {
      Alert.alert("Camera error", "Could not capture the page.");
    }
  }

  function finishScanning() {
    setCameraOpen(false);
    if (pages.length) setReviewOpen(true);
    else setScannerOpen(true);
  }

  function rotatePage(id: string) {
    setPages(current => current.map(p => p.id === id ? {...p, rotation: (p.rotation + 90) % 360} : p));
  }

  function removePage(id: string) {
    setPages(current => current.filter(p => p.id !== id));
  }

  function movePage(index: number, direction: -1 | 1) {
    setPages(current => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function saveDocument() {
    if (!pages.length) return;
    const doc: DocumentItem = {
      id: Date.now().toString(),
      name: "Scan " + new Date().toLocaleString(),
      pages,
      date: "Just now",
      createdAt: Date.now()
    };
    setDocuments(current => [doc, ...current]);
    setPages([]);
    setReviewOpen(false);
    setActiveTab("Library");
  }

  function deleteDocument(id: string) {
    Alert.alert("Delete document?", "This removes it from your ScanFlow library.", [
      {text:"Cancel", style:"cancel"},
      {text:"Delete", style:"destructive", onPress:() => setDocuments(d => d.filter(x => x.id !== id))}
    ]);
  }

  function renderLibrary() {
    return <>
      <View style={styles.header}>
        <View><Text style={[styles.greeting,{color:colors.muted}]}>Your documents</Text><Text style={[styles.title,{color:colors.text}]}>ScanFlow</Text></View>
        <View style={[styles.profileButton,{backgroundColor:colors.cardSecondary}]}><Text style={{fontSize:20}}>📄</Text></View>
      </View>
      <View style={[styles.searchContainer,{backgroundColor:colors.card,borderColor:colors.border}]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search documents..." placeholderTextColor={colors.muted} style={[styles.searchInput,{color:colors.text}]}/>
      </View>
      <View style={styles.quickStats}>
        <View style={[styles.statCard,{backgroundColor:colors.card,borderColor:colors.border}]}><Text style={styles.statEmoji}>📄</Text><Text style={[styles.statNumber,{color:colors.text}]}>{documents.length}</Text><Text style={[styles.statLabel,{color:colors.muted}]}>Documents</Text></View>
        <View style={[styles.statCard,{backgroundColor:colors.card,borderColor:colors.border}]}><Text style={styles.statEmoji}>📑</Text><Text style={[styles.statNumber,{color:colors.text}]}>{documents.reduce((n,d)=>n+d.pages.length,0)}</Text><Text style={[styles.statLabel,{color:colors.muted}]}>Total Pages</Text></View>
      </View>
      <Text style={[styles.sectionTitle,{color:colors.text,marginBottom:12}]}>Recent Documents</Text>
      <FlatList data={filteredDocuments} keyExtractor={i=>i.id} contentContainerStyle={{paddingBottom:130}}
        ListEmptyComponent={<View style={styles.emptyState}><Text style={{fontSize:42}}>📭</Text><Text style={[styles.emptyTitle,{color:colors.text}]}>No documents yet</Text><Text style={{color:colors.muted,marginTop:5}}>Scan or import your first document.</Text></View>}
        renderItem={({item})=><TouchableOpacity onLongPress={()=>deleteDocument(item.id)} style={[styles.documentCard,{backgroundColor:colors.card}]}>
          <View style={[styles.documentIcon,{backgroundColor:colors.cardSecondary}]}>{item.pages[0] ? <Image source={{uri:item.pages[0].uri}} style={styles.thumbnail}/> : <Text style={styles.documentEmoji}>📄</Text>}</View>
          <View style={styles.documentInfo}><Text style={[styles.documentName,{color:colors.text}]} numberOfLines={1}>{item.name}</Text><Text style={[styles.documentMeta,{color:colors.muted}]}>{item.pages.length} page{item.pages.length!==1?"s":""} • {item.date}</Text></View><Text style={{color:colors.muted}}>•••</Text>
        </TouchableOpacity>}
      />
    </>;
  }

  function renderScan() {
    return <View style={styles.centerScreen}>
      <Text style={styles.bigIcon}>📷</Text><Text style={[styles.centerTitle,{color:colors.text}]}>Scan a Document</Text>
      <Text style={[styles.centerDescription,{color:colors.muted}]}>Capture multiple pages, review them, rotate them and save them locally.</Text>
      <TouchableOpacity style={[styles.primaryButton,{backgroundColor:colors.accent}]} onPress={()=>setScannerOpen(true)}><Text style={styles.primaryButtonText}>Start Scanning</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.secondaryButton,{borderColor:colors.border,backgroundColor:colors.card}]} onPress={importFromGallery}><Text style={[styles.secondaryButtonText,{color:colors.text}]}>Import from Gallery</Text></TouchableOpacity>
    </View>;
  }

  function renderTools() {
    const tools = [
      ["🖼️","Image to PDF","Build PDF-ready multi-page documents"],
      ["🔎","OCR Text","Text extraction module"],
      ["📄","Merge PDF","Combine PDF files"],
      ["✂️","Split PDF","Separate PDF pages"],
      ["🗜️","Compress PDF","Reduce PDF size"],
      ["🔄","Convert","PDF, Word and image conversions"]
    ];
    return <><Text style={[styles.screenTitle,{color:colors.text}]}>Tools</Text><Text style={[styles.screenSubtitle,{color:colors.muted}]}>Scanner is now functional. More file engines come next.</Text>
      <View style={styles.toolsGrid}>{tools.map(([emoji,title,subtitle])=><TouchableOpacity key={title} style={[styles.toolCard,{backgroundColor:colors.card,borderColor:colors.border}]} onPress={()=>Alert.alert(title,"This tool is planned for the next ScanFlow build. PDF/Word conversion requires a dedicated document-processing engine.")}>
        <Text style={styles.toolEmoji}>{emoji}</Text><Text style={[styles.toolTitle,{color:colors.text}]}>{title}</Text><Text style={[styles.toolSubtitle,{color:colors.muted}]}>{subtitle}</Text>
      </TouchableOpacity>)}</View>
    </>;
  }

  function renderSettings() {
    return <><Text style={[styles.screenTitle,{color:colors.text}]}>Settings</Text>
      <View style={[styles.settingsCard,{backgroundColor:colors.card,borderColor:colors.border}]}>
        <View style={styles.settingRow}><View><Text style={[styles.settingTitle,{color:colors.text}]}>🌙 Dark Mode</Text><Text style={[styles.settingSubtitle,{color:colors.muted}]}>Change ScanFlow appearance</Text></View>
        <TouchableOpacity style={[styles.toggle,{backgroundColor:darkMode?colors.accent:colors.cardSecondary}]} onPress={()=>setDarkMode(!darkMode)}><View style={[styles.toggleCircle,{marginLeft:darkMode?24:4}]}/></TouchableOpacity></View>
      </View>
      <View style={[styles.settingsCard,{backgroundColor:colors.card,borderColor:colors.border}]}><Text style={[styles.settingTitle,{color:colors.text}]}>💾 Local Library</Text><Text style={[styles.settingSubtitle,{color:colors.muted}]}>Your document list is saved on this device.</Text></View>
    </>;
  }

  const content = activeTab==="Library"?renderLibrary():activeTab==="Scan"?renderScan():activeTab==="Tools"?renderTools():renderSettings();

  return <SafeAreaView style={[styles.container,{backgroundColor:colors.background}]}>
    <StatusBar barStyle={darkMode?"light-content":"dark-content"} backgroundColor={colors.background}/>
    <View style={styles.content}>{content}</View>
    <TouchableOpacity style={[styles.floatingScanButton,{backgroundColor:colors.accent}]} onPress={()=>setScannerOpen(true)}><Text style={styles.floatingScanIcon}>📷</Text></TouchableOpacity>
    <View style={[styles.bottomNav,{backgroundColor:colors.card,borderColor:colors.border}]}>
      {[["Library","📚"],["Scan","📷"],["Tools","🧰"],["Settings","⚙️"]].map(([tab,icon])=><TouchableOpacity key={tab} style={styles.navItem} onPress={()=>setActiveTab(tab as Tab)}><Text style={styles.navIcon}>{icon}</Text><Text style={[styles.navText,{color:activeTab===tab?colors.accent:colors.muted}]}>{tab}</Text></TouchableOpacity>)}
    </View>

    <Modal visible={scannerOpen} transparent animationType="slide" onRequestClose={()=>setScannerOpen(false)}><View style={styles.modalOverlay}><View style={[styles.scannerModal,{backgroundColor:colors.card}]}>
      <View style={[styles.modalHandle,{backgroundColor:colors.border}]}/><Text style={[styles.modalTitle,{color:colors.text}]}>Scan Document</Text><Text style={[styles.modalDescription,{color:colors.muted}]}>Use your camera for a multi-page scan or import existing images.</Text>
      <TouchableOpacity style={[styles.primaryButton,{backgroundColor:colors.accent}]} onPress={openCamera}><Text style={styles.primaryButtonText}>📷 Open Camera</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.secondaryButton,{borderColor:colors.border,backgroundColor:colors.cardSecondary}]} onPress={importFromGallery}><Text style={[styles.secondaryButtonText,{color:colors.text}]}>🖼️ Import Images</Text></TouchableOpacity>
      <TouchableOpacity style={styles.cancelButton} onPress={()=>setScannerOpen(false)}><Text style={[styles.cancelText,{color:colors.muted}]}>Cancel</Text></TouchableOpacity>
    </View></View></Modal>

    <Modal visible={cameraOpen} animationType="slide" onRequestClose={finishScanning}>
      <View style={styles.cameraScreen}>
        <CameraView ref={setCameraRef} style={StyleSheet.absoluteFillObject} facing="back" enableTorch={flash==="on"} />
        <View style={styles.cameraTop}><TouchableOpacity onPress={finishScanning} style={styles.cameraSmall}><Text style={styles.cameraSmallText}>✕</Text></TouchableOpacity><Text style={styles.cameraCounter}>{pages.length} page{pages.length!==1?"s":""}</Text><TouchableOpacity onPress={()=>setFlash(f=>f==="off"?"on":"off")} style={styles.cameraSmall}><Text style={styles.cameraSmallText}>{flash==="on"?"⚡":"◐"}</Text></TouchableOpacity></View>
        <View style={styles.scanFrame}/>
        <View style={styles.cameraBottom}><Text style={styles.cameraHint}>Align the document inside the frame</Text><TouchableOpacity onPress={capturePage} style={styles.captureOuter}><View style={styles.captureInner}/></TouchableOpacity><TouchableOpacity onPress={finishScanning} style={styles.doneCamera}><Text style={styles.doneCameraText}>Done</Text></TouchableOpacity></View>
      </View>
    </Modal>

    <Modal visible={reviewOpen} animationType="slide" onRequestClose={()=>setReviewOpen(false)}><SafeAreaView style={[styles.reviewScreen,{backgroundColor:colors.background}]}>
      <View style={styles.reviewHeader}><TouchableOpacity onPress={()=>setReviewOpen(false)}><Text style={[styles.backText,{color:colors.text}]}>‹ Back</Text></TouchableOpacity><Text style={[styles.reviewTitle,{color:colors.text}]}>Review Pages</Text><Text style={{width:45}}/></View>
      <FlatList horizontal data={pages} keyExtractor={p=>p.id} contentContainerStyle={{padding:16,gap:14}} renderItem={({item,index})=><View style={[styles.pageCard,{backgroundColor:colors.card}]}>
        <Image source={{uri:item.uri}} style={[styles.pageImage,{transform:[{rotate:item.rotation+"deg"}]}]} resizeMode="contain"/>
        <Text style={{color:colors.muted,marginTop:8}}>Page {index+1}</Text>
        <View style={styles.pageActions}><TouchableOpacity onPress={()=>rotatePage(item.id)}><Text style={styles.pageAction}>↻</Text></TouchableOpacity><TouchableOpacity onPress={()=>movePage(index,-1)}><Text style={styles.pageAction}>←</Text></TouchableOpacity><TouchableOpacity onPress={()=>movePage(index,1)}><Text style={styles.pageAction}>→</Text></TouchableOpacity><TouchableOpacity onPress={()=>removePage(item.id)}><Text style={styles.pageAction}>🗑️</Text></TouchableOpacity></View>
      </View>}/>
      <View style={styles.reviewBottom}><TouchableOpacity style={[styles.secondaryButton,{borderColor:colors.border,backgroundColor:colors.card}]} onPress={()=>{setReviewOpen(false);setScannerOpen(true)}}><Text style={[styles.secondaryButtonText,{color:colors.text}]}>+ Add More Pages</Text></TouchableOpacity><TouchableOpacity style={[styles.primaryButton,{backgroundColor:colors.accent}]} onPress={saveDocument}><Text style={styles.primaryButtonText}>Save {pages.length} Page{pages.length!==1?"s":""}</Text></TouchableOpacity></View>
    </SafeAreaView></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container:{flex:1}, content:{flex:1,paddingHorizontal:20,paddingTop:18},
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:22},
  greeting:{fontSize:14,marginBottom:3}, title:{fontSize:32,fontWeight:"800"}, profileButton:{width:46,height:46,borderRadius:23,justifyContent:"center",alignItems:"center"},
  searchContainer:{height:54,borderRadius:16,borderWidth:1,flexDirection:"row",alignItems:"center",paddingHorizontal:16,marginBottom:16},searchIcon:{fontSize:16,marginRight:10},searchInput:{flex:1,fontSize:15},
  quickStats:{flexDirection:"row",gap:12,marginBottom:26},statCard:{flex:1,borderWidth:1,borderRadius:18,padding:16},statEmoji:{fontSize:22,marginBottom:8},statNumber:{fontSize:22,fontWeight:"800"},statLabel:{fontSize:12,marginTop:2},
  sectionTitle:{fontSize:19,fontWeight:"700"},documentCard:{flexDirection:"row",alignItems:"center",borderRadius:18,padding:12,marginBottom:10},documentIcon:{width:58,height:58,borderRadius:14,justifyContent:"center",alignItems:"center",overflow:"hidden"},documentEmoji:{fontSize:26},thumbnail:{width:"100%",height:"100%"},documentInfo:{flex:1,marginLeft:13},documentName:{fontSize:16,fontWeight:"700",marginBottom:5},documentMeta:{fontSize:13},
  emptyState:{alignItems:"center",marginTop:50},emptyTitle:{fontSize:17,fontWeight:"700",marginTop:12},
  centerScreen:{flex:1,alignItems:"center",justifyContent:"center",paddingBottom:80},bigIcon:{fontSize:70,marginBottom:20},centerTitle:{fontSize:26,fontWeight:"800"},centerDescription:{textAlign:"center",fontSize:15,lineHeight:22,marginTop:10,marginBottom:28},primaryButton:{height:54,borderRadius:16,justifyContent:"center",alignItems:"center",width:"100%",marginBottom:12},primaryButtonText:{color:"#fff",fontSize:16,fontWeight:"700"},secondaryButton:{height:54,borderRadius:16,borderWidth:1,justifyContent:"center",alignItems:"center",width:"100%"},secondaryButtonText:{fontSize:15,fontWeight:"700"},
  screenTitle:{fontSize:30,fontWeight:"800",marginTop:8},screenSubtitle:{marginTop:5,marginBottom:22,fontSize:14},toolsGrid:{flexDirection:"row",flexWrap:"wrap",gap:12},toolCard:{width:"48%",borderWidth:1,borderRadius:18,padding:16,minHeight:150},toolEmoji:{fontSize:30,marginBottom:15},toolTitle:{fontSize:15,fontWeight:"800"},toolSubtitle:{fontSize:12,lineHeight:17,marginTop:5},
  settingsCard:{borderWidth:1,borderRadius:18,padding:16,marginTop:22},settingRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},settingTitle:{fontSize:16,fontWeight:"700"},settingSubtitle:{fontSize:12,marginTop:5},toggle:{width:52,height:30,borderRadius:20,paddingVertical:4},toggleCircle:{width:22,height:22,borderRadius:11,backgroundColor:"#fff"},
  bottomNav:{height:76,borderTopWidth:1,flexDirection:"row",justifyContent:"space-around",paddingTop:8},navItem:{alignItems:"center",justifyContent:"center",width:70},navIcon:{fontSize:20,marginBottom:4},navText:{fontSize:11,fontWeight:"600"},floatingScanButton:{position:"absolute",bottom:50,alignSelf:"center",width:64,height:64,borderRadius:32,justifyContent:"center",alignItems:"center",elevation:8},floatingScanIcon:{fontSize:27},
  modalOverlay:{flex:1,justifyContent:"flex-end",backgroundColor:"rgba(0,0,0,.45)"},scannerModal:{borderTopLeftRadius:28,borderTopRightRadius:28,padding:24,paddingBottom:36},modalHandle:{width:45,height:5,borderRadius:3,alignSelf:"center",marginBottom:20},modalTitle:{fontSize:24,fontWeight:"800",marginBottom:7},modalDescription:{fontSize:14,marginBottom:24},cancelButton:{paddingTop:20,alignItems:"center"},cancelText:{fontSize:15,fontWeight:"600"},
  cameraScreen:{flex:1,backgroundColor:"#000"},cameraTop:{position:"absolute",top:55,left:20,right:20,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},cameraSmall:{width:44,height:44,borderRadius:22,backgroundColor:"rgba(0,0,0,.55)",justifyContent:"center",alignItems:"center"},cameraSmallText:{color:"#fff",fontSize:22},cameraCounter:{color:"#fff",fontWeight:"700",backgroundColor:"rgba(0,0,0,.55)",paddingHorizontal:12,paddingVertical:8,borderRadius:16},
  scanFrame:{position:"absolute",top:"24%",left:"8%",right:"8%",height:"46%",borderWidth:2,borderColor:"rgba(255,255,255,.85)",borderRadius:20},cameraBottom:{position:"absolute",bottom:40,left:20,right:20,alignItems:"center"},cameraHint:{color:"#fff",marginBottom:18},captureOuter:{width:78,height:78,borderRadius:39,borderWidth:5,borderColor:"#fff",justifyContent:"center",alignItems:"center"},captureInner:{width:62,height:62,borderRadius:31,backgroundColor:"#fff"},doneCamera:{position:"absolute",right:0,bottom:20,padding:12},doneCameraText:{color:"#fff",fontWeight:"800",fontSize:16},
  reviewScreen:{flex:1},reviewHeader:{height:64,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},backText:{fontSize:16,fontWeight:"700"},reviewTitle:{fontSize:19,fontWeight:"800"},pageCard:{width:260,borderRadius:18,padding:12,alignItems:"center",alignSelf:"center"},pageImage:{width:235,height:360},pageActions:{flexDirection:"row",gap:18,marginTop:12},pageAction:{fontSize:22},reviewBottom:{padding:20,gap:12}
});
