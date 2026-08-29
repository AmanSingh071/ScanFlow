import React,{useEffect,useMemo,useState}from"react";
import{Alert,FlatList,Image,Modal,SafeAreaView,StatusBar,StyleSheet,Text,TextInput,TouchableOpacity,View,useColorScheme}from"react-native";
import{CameraView,useCameraPermissions}from"expo-camera";
import*as ImagePicker from"expo-image-picker";
import*as Print from"expo-print";
import*as Sharing from"expo-sharing";
import AsyncStorage from"@react-native-async-storage/async-storage";

type Page={id:string;uri:string;rotation:number};
type Doc={id:string;name:string;pages:Page[];createdAt:number;favorite:boolean;folder:string;pdfUri?:string};
type Tab="Library"|"Scan"|"Tools"|"Settings";
const KEY="@scanflow_v2";
const uid=()=>Date.now().toString()+Math.random().toString(36).slice(2,7);

export default function App(){
 const sys=useColorScheme();
 const[tab,setTab]=useState<Tab>("Library"),[dark,setDark]=useState(sys==="dark"),[search,setSearch]=useState("");
 const[docs,setDocs]=useState<Doc[]>([]),[trash,setTrash]=useState<Doc[]>([]),[folder,setFolder]=useState("All");
 const[sort,setSort]=useState<"new"|"name"|"pages">("new");
 const[scanner,setScanner]=useState(false),[camera,setCamera]=useState(false),[review,setReview]=useState(false),[pages,setPages]=useState<Page[]>([]);
 const[ref,setRef]=useState<CameraView|null>(null),[permission,ask]=useCameraPermissions(),[flash,setFlash]=useState(false);
 const[menu,setMenu]=useState<Doc|null>(null),[rename,setRename]=useState(""),[renaming,setRenaming]=useState(false);
 const c=dark?{bg:"#0D1117",card:"#161B22",soft:"#212936",text:"#F0F6FC",muted:"#8B98A9",border:"#30363D",accent:"#4F8CFF",danger:"#FF6B6B"}:{bg:"#F5F7FB",card:"#FFF",soft:"#EEF2F7",text:"#162033",muted:"#718096",border:"#E2E8F0",accent:"#3B82F6",danger:"#EF4444"};

 useEffect(()=>{AsyncStorage.getItem(KEY).then(x=>{if(x){const v=JSON.parse(x);setDocs(v.docs||[]);setTrash(v.trash||[])}})},[]);
 useEffect(()=>{AsyncStorage.setItem(KEY,JSON.stringify({docs,trash}))},[docs,trash]);

 const folders=useMemo(()=>["All",...Array.from(new Set(docs.map(d=>d.folder).filter(Boolean)))], [docs]);
 const shown=useMemo(()=>docs.filter(d=>(folder==="All"||d.folder===folder)&&d.name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==="name"?a.name.localeCompare(b.name):sort==="pages"?b.pages.length-a.pages.length:b.createdAt-a.createdAt),[docs,folder,search,sort]);

 const add=(uris:string[])=>setPages(x=>[...x,...uris.map(uri=>({id:uid(),uri,rotation:0}))]);
 async function gallery(){const p=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!p.granted)return Alert.alert("Permission required","Allow image access.");const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsMultipleSelection:true,quality:0.9});if(!r.canceled){add(r.assets.map(a=>a.uri));setScanner(false);setReview(true)}}
 async function openCam(){if(!permission?.granted){const p=await ask();if(!p.granted)return Alert.alert("Camera permission required","Allow camera access.");}setScanner(false);setCamera(true)}
 async function snap(){try{const p=await ref?.takePictureAsync({quality:0.9});if(p?.uri)add([p.uri])}catch{Alert.alert("Camera error","Could not capture image.")}}
 function finish(){setCamera(false);pages.length?setReview(true):setScanner(true)}
 function rotate(id:string){setPages(x=>x.map(p=>p.id===id?{...p,rotation:(p.rotation+90)%360}:p))}
 function remove(id:string){setPages(x=>x.filter(p=>p.id!==id))}
 function move(i:number,d:number){setPages(x=>{const j=i+d;if(j<0||j>=x.length)return x;const y=[...x];[y[i],y[j]]=[y[j],y[i]];return y})}
 function save(){if(!pages.length)return;setDocs(x=>[{id:uid(),name:"Scan "+new Date().toLocaleString(),pages,createdAt:Date.now(),favorite:false,folder:"My Scans"},...x]);setPages([]);setReview(false);setTab("Library")}
 async function exportPdf(doc:Doc){
  try{
   const html="<html><body style='margin:0;background:#fff'>"+doc.pages.map(p=>"<div style='page-break-after:always;padding:12px'><img src='"+p.uri+"' style='width:100%;height:auto;display:block'/></div>").join("")+"</body></html>";
   const r=await Print.printToFileAsync({html});
   setDocs(x=>x.map(d=>d.id===doc.id?{...d,pdfUri:r.uri}:d));
   if(await Sharing.isAvailableAsync())await Sharing.shareAsync(r.uri,{mimeType:"application/pdf",dialogTitle:"Share "+doc.name});
   else Alert.alert("PDF created",r.uri);
  }catch(e){Alert.alert("PDF error","Could not create the PDF on this device.")}
 }
 async function shareDoc(doc:Doc){if(doc.pdfUri&&await Sharing.isAvailableAsync())return Sharing.shareAsync(doc.pdfUri,{mimeType:"application/pdf"});return exportPdf(doc)}
 function toggleFav(id:string){setDocs(x=>x.map(d=>d.id===id?{...d,favorite:!d.favorite}:d))}
 function trashDoc(doc:Doc){setDocs(x=>x.filter(d=>d.id!==doc.id));setTrash(x=>[doc,...x]);setMenu(null)}
 function restore(doc:Doc){setTrash(x=>x.filter(d=>d.id!==doc.id));setDocs(x=>[doc,...x])}
 function doRename(){if(!menu||!rename.trim())return;setDocs(x=>x.map(d=>d.id===menu.id?{...d,name:rename.trim()}:d));setRenaming(false);setMenu(null)}
 function addFolder(){Alert.prompt?.("New folder","Enter folder name",name=>{if(name)setFolder(name)});if(!Alert.prompt)Alert.alert("Folders","Create a folder from the document menu in this build.")}
 const tool=(title:string,msg:string)=>Alert.alert(title,msg);

 const library=<>
  <View style={s.header}><View><Text style={[s.muted,{color:c.muted}]}>Your document workspace</Text><Text style={[s.title,{color:c.text}]}>ScanFlow</Text></View><TouchableOpacity onPress={()=>setDark(!dark)} style={[s.circle,{backgroundColor:c.soft}]}><Text>{dark?"☀️":"🌙"}</Text></TouchableOpacity></View>
  <View style={[s.search,{backgroundColor:c.card,borderColor:c.border}]}><Text>🔍</Text><TextInput value={search} onChangeText={setSearch} placeholder="Search documents" placeholderTextColor={c.muted} style={[s.input,{color:c.text}]}/></View>
  <View style={s.chips}>{folders.map(f=><TouchableOpacity key={f} onPress={()=>setFolder(f)} style={[s.chip,{backgroundColor:folder===f?c.accent:c.card,borderColor:c.border}]}><Text style={{color:folder===f?"#fff":c.text,fontWeight:"700"}}>{f}</Text></TouchableOpacity>)}</View>
  <View style={s.row}><Text style={[s.section,{color:c.text}]}>Library ({shown.length})</Text><TouchableOpacity onPress={()=>setSort(sort==="new"?"name":sort==="name"?"pages":"new")}><Text style={{color:c.accent,fontWeight:"700"}}>Sort: {sort}</Text></TouchableOpacity></View>
  <FlatList data={shown} keyExtractor={x=>x.id} contentContainerStyle={{paddingBottom:120}} ListEmptyComponent={<View style={s.empty}><Text style={{fontSize:48}}>📭</Text><Text style={[s.emptyTitle,{color:c.text}]}>No documents found</Text><Text style={{color:c.muted}}>Scan or import pages to begin.</Text></View>}
  renderItem={({item})=><TouchableOpacity onPress={()=>shareDoc(item)} onLongPress={()=>{setMenu(item);setRename(item.name)}} style={[s.doc,{backgroundColor:c.card}]}>
   <View style={[s.thumbBox,{backgroundColor:c.soft}]}>{item.pages[0]?<Image source={{uri:item.pages[0].uri}} style={s.thumb}/>:<Text>📄</Text>}</View>
   <View style={{flex:1,marginLeft:12}}><View style={s.row}><Text numberOfLines={1} style={[s.docName,{color:c.text}]}>{item.name}</Text>{item.favorite&&<Text>⭐</Text>}</View><Text style={{color:c.muted,fontSize:12}}>{item.pages.length} pages • {item.folder}</Text><Text style={{color:c.muted,fontSize:11,marginTop:3}}>{new Date(item.createdAt).toLocaleDateString()}</Text></View>
   <TouchableOpacity onPress={()=>{setMenu(item);setRename(item.name)}}><Text style={{color:c.muted,fontSize:20}}>⋮</Text></TouchableOpacity>
  </TouchableOpacity>}/></>;

 const scan=<View style={s.center}><Text style={{fontSize:72}}>📷</Text><Text style={[s.centerTitle,{color:c.text}]}>Scan anything</Text><Text style={[s.desc,{color:c.muted}]}>Capture multiple pages or import photos, then turn them into a shareable PDF.</Text><TouchableOpacity style={[s.primary,{backgroundColor:c.accent}]} onPress={()=>setScanner(true)}><Text style={s.primaryText}>Start Scanner</Text></TouchableOpacity><TouchableOpacity style={[s.secondary,{backgroundColor:c.card,borderColor:c.border}]} onPress={gallery}><Text style={{color:c.text,fontWeight:"700"}}>Import Images</Text></TouchableOpacity></View>;

 const tools=<><Text style={[s.screenTitle,{color:c.text}]}>Tools</Text><Text style={[s.sub,{color:c.muted}]}>Document utilities available in ScanFlow</Text><View style={s.grid}>
 {[
 ["📄","Image to PDF",()=>setTab("Scan")],["📤","Export & Share",()=>tool("Export","Open any document and tap it to create/share a PDF.")],
 ["⭐","Favorites",()=>setDocs(x=>[...x.filter(d=>d.favorite),...x.filter(d=>!d.favorite)])],["🗑️","Trash",()=>Alert.alert("Trash",trash.length?trash.map(x=>x.name).join("\n"):"Trash is empty")],
 ["✏️","Rename",()=>tool("Rename","Long-press or tap the ⋮ menu on a document.")],["🖼️","Multi-page Import",gallery],
 ["🔎","OCR Text","OCR requires an additional on-device/cloud recognition engine; architecture is ready for the next native module."],["🔄","PDF ↔ Word","Reliable layout-preserving Word conversion needs a document conversion backend."],
 ["🗜️","Compress PDF","PDF compression is planned with a native processing engine."],["✂️","Split / Merge","PDF page manipulation is planned for the dedicated PDF engine batch."]
 ].map(([icon,title,action]:any)=><TouchableOpacity key={title} onPress={action} style={[s.tool,{backgroundColor:c.card,borderColor:c.border}]}><Text style={{fontSize:28}}>{icon}</Text><Text style={[s.toolTitle,{color:c.text}]}>{title}</Text></TouchableOpacity>)}</View></>;

 const settings=<><Text style={[s.screenTitle,{color:c.text}]}>Settings</Text>
 <TouchableOpacity onPress={()=>setDark(!dark)} style={[s.setting,{backgroundColor:c.card,borderColor:c.border}]}><Text style={{fontSize:20}}>🌙</Text><View style={{flex:1,marginLeft:12}}><Text style={[s.settingTitle,{color:c.text}]}>Dark mode</Text><Text style={{color:c.muted,fontSize:12}}>Change appearance</Text></View><Text style={{color:c.accent,fontWeight:"700"}}>{dark?"ON":"OFF"}</Text></TouchableOpacity>
 <View style={[s.setting,{backgroundColor:c.card,borderColor:c.border}]}><Text style={{fontSize:20}}>📊</Text><View style={{marginLeft:12}}><Text style={[s.settingTitle,{color:c.text}]}>Storage summary</Text><Text style={{color:c.muted,fontSize:12}}>{docs.length} documents • {docs.reduce((n,d)=>n+d.pages.length,0)} pages • {trash.length} in trash</Text></View></View>
 </>;

 const body=tab==="Library"?library:tab==="Scan"?scan:tab==="Tools"?tools:settings;
 return <SafeAreaView style={[s.root,{backgroundColor:c.bg}]}><StatusBar barStyle={dark?"light-content":"dark-content"}/><View style={s.content}>{body}</View>
 <TouchableOpacity onPress={()=>setScanner(true)} style={[s.fab,{backgroundColor:c.accent}]}><Text style={{fontSize:26}}>📷</Text></TouchableOpacity>
 <View style={[s.nav,{backgroundColor:c.card,borderColor:c.border}]}>{([["Library","📚"],["Scan","📷"],["Tools","🧰"],["Settings","⚙️"]] as [Tab,string][]).map(([t,i])=><TouchableOpacity key={t} onPress={()=>setTab(t)} style={s.navItem}><Text style={{fontSize:19}}>{i}</Text><Text style={{color:tab===t?c.accent:c.muted,fontSize:11,fontWeight:"700"}}>{t}</Text></TouchableOpacity>)}</View>

 <Modal visible={scanner} transparent animationType="slide"><View style={s.overlay}><View style={[s.sheet,{backgroundColor:c.card}]}><Text style={[s.sheetTitle,{color:c.text}]}>Create a document</Text><Text style={{color:c.muted,marginBottom:20}}>Camera scan or import multiple images.</Text><TouchableOpacity style={[s.primary,{backgroundColor:c.accent}]} onPress={openCam}><Text style={s.primaryText}>📷 Open Camera</Text></TouchableOpacity><TouchableOpacity style={[s.secondary,{backgroundColor:c.soft,borderColor:c.border}]} onPress={gallery}><Text style={{color:c.text,fontWeight:"700"}}>🖼️ Import Images</Text></TouchableOpacity><TouchableOpacity onPress={()=>setScanner(false)} style={s.cancel}><Text style={{color:c.muted}}>Cancel</Text></TouchableOpacity></View></View></Modal>

 <Modal visible={camera} animationType="slide"><View style={s.cam}><CameraView ref={setRef} style={StyleSheet.absoluteFillObject} facing="back" enableTorch={flash}/><View style={s.camTop}><TouchableOpacity onPress={finish} style={s.camBtn}><Text style={s.camTxt}>✕</Text></TouchableOpacity><Text style={s.counter}>{pages.length} pages</Text><TouchableOpacity onPress={()=>setFlash(!flash)} style={s.camBtn}><Text style={s.camTxt}>{flash?"⚡":"◐"}</Text></TouchableOpacity></View><View style={s.frame}/><View style={s.camBottom}><Text style={s.camHint}>Fit the document inside the frame</Text><TouchableOpacity onPress={snap} style={s.capture}><View style={s.captureIn}/></TouchableOpacity><TouchableOpacity onPress={finish} style={s.done}><Text style={s.doneTxt}>Done</Text></TouchableOpacity></View></View></Modal>

 <Modal visible={review} animationType="slide"><SafeAreaView style={[s.root,{backgroundColor:c.bg}]}><View style={s.reviewHead}><TouchableOpacity onPress={()=>setReview(false)}><Text style={[s.back,{color:c.text}]}>‹ Back</Text></TouchableOpacity><Text style={[s.reviewTitle,{color:c.text}]}>Review ({pages.length})</Text><View style={{width:40}}/></View><FlatList horizontal data={pages} keyExtractor={p=>p.id} contentContainerStyle={{padding:16,gap:14}} renderItem={({item,index})=><View style={[s.page,{backgroundColor:c.card}]}><Image source={{uri:item.uri}} style={[s.pageImg,{transform:[{rotate:item.rotation+"deg"}]}]} resizeMode="contain"/><Text style={{color:c.muted}}>Page {index+1}</Text><View style={s.actions}><TouchableOpacity onPress={()=>rotate(item.id)}><Text>↻</Text></TouchableOpacity><TouchableOpacity onPress={()=>move(index,-1)}><Text>←</Text></TouchableOpacity><TouchableOpacity onPress={()=>move(index,1)}><Text>→</Text></TouchableOpacity><TouchableOpacity onPress={()=>remove(item.id)}><Text>🗑️</Text></TouchableOpacity></View></View>}/><View style={s.reviewBottom}><TouchableOpacity style={[s.secondary,{backgroundColor:c.card,borderColor:c.border}]} onPress={()=>{setReview(false);setScanner(true)}}><Text style={{color:c.text,fontWeight:"700"}}>+ Add pages</Text></TouchableOpacity><TouchableOpacity style={[s.primary,{backgroundColor:c.accent}]} onPress={save}><Text style={s.primaryText}>Save document</Text></TouchableOpacity></View></SafeAreaView></Modal>

 <Modal visible={!!menu} transparent animationType="slide"><View style={s.overlay}><View style={[s.sheet,{backgroundColor:c.card}]}>{menu&&<><Text style={[s.sheetTitle,{color:c.text}]} numberOfLines={1}>{menu.name}</Text><TouchableOpacity style={s.menuRow} onPress={()=>setRenaming(true)}><Text style={[s.menuText,{color:c.text}]}>✏️ Rename</Text></TouchableOpacity><TouchableOpacity style={s.menuRow} onPress={()=>toggleFav(menu.id)}><Text style={[s.menuText,{color:c.text}]}>{menu.favorite?"☆ Remove favorite":"⭐ Add to favorites"}</Text></TouchableOpacity><TouchableOpacity style={s.menuRow} onPress={()=>exportPdf(menu)}><Text style={[s.menuText,{color:c.text}]}>📄 Create / share PDF</Text></TouchableOpacity><TouchableOpacity style={s.menuRow} onPress={()=>trashDoc(menu)}><Text style={[s.menuText,{color:c.danger}]}>🗑️ Move to trash</Text></TouchableOpacity><TouchableOpacity onPress={()=>setMenu(null)} style={s.cancel}><Text style={{color:c.muted}}>Close</Text></TouchableOpacity></>}</View></View></Modal>

 <Modal visible={renaming} transparent animationType="fade"><View style={s.overlay}><View style={[s.renameBox,{backgroundColor:c.card}]}><Text style={[s.sheetTitle,{color:c.text}]}>Rename document</Text><TextInput value={rename} onChangeText={setRename} autoFocus style={[s.renameInput,{color:c.text,borderColor:c.border}]} placeholderTextColor={c.muted}/><TouchableOpacity style={[s.primary,{backgroundColor:c.accent}]} onPress={doRename}><Text style={s.primaryText}>Save name</Text></TouchableOpacity><TouchableOpacity onPress={()=>setRenaming(false)}><Text style={{color:c.muted,textAlign:"center"}}>Cancel</Text></TouchableOpacity></View></View></Modal>
 </SafeAreaView>
}
const s=StyleSheet.create({
 root:{flex:1},content:{flex:1,paddingHorizontal:18,paddingTop:14},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:18},muted:{fontSize:13},title:{fontSize:31,fontWeight:"900"},circle:{width:44,height:44,borderRadius:22,justifyContent:"center",alignItems:"center"},search:{height:52,borderWidth:1,borderRadius:16,flexDirection:"row",alignItems:"center",paddingHorizontal:14,gap:10},input:{flex:1,fontSize:15},chips:{flexDirection:"row",gap:8,marginVertical:14},chip:{paddingHorizontal:12,paddingVertical:8,borderRadius:14,borderWidth:1},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},section:{fontSize:18,fontWeight:"800",marginBottom:10},doc:{flexDirection:"row",alignItems:"center",padding:11,borderRadius:18,marginBottom:9},thumbBox:{width:60,height:60,borderRadius:13,overflow:"hidden",justifyContent:"center",alignItems:"center"},thumb:{width:"100%",height:"100%"},docName:{fontWeight:"800",fontSize:15},empty:{alignItems:"center",marginTop:55},emptyTitle:{fontSize:18,fontWeight:"800",marginTop:10},center:{flex:1,justifyContent:"center",alignItems:"center",paddingBottom:90,paddingHorizontal:20},centerTitle:{fontSize:27,fontWeight:"900",marginTop:14},desc:{textAlign:"center",lineHeight:21,marginTop:8,marginBottom:25},primary:{width:"100%",height:54,borderRadius:16,alignItems:"center",justifyContent:"center",marginBottom:10},primaryText:{color:"#fff",fontWeight:"800",fontSize:16},secondary:{width:"100%",height:52,borderRadius:16,borderWidth:1,alignItems:"center",justifyContent:"center"},screenTitle:{fontSize:30,fontWeight:"900",marginTop:6},sub:{marginTop:5,marginBottom:18},grid:{flexDirection:"row",flexWrap:"wrap",gap:11},tool:{width:"48%",minHeight:112,borderWidth:1,borderRadius:18,padding:15,justifyContent:"space-between"},toolTitle:{fontWeight:"800",fontSize:14},setting:{flexDirection:"row",alignItems:"center",padding:16,borderWidth:1,borderRadius:18,marginTop:14},settingTitle:{fontWeight:"800",fontSize:15},nav:{height:76,borderTopWidth:1,flexDirection:"row",justifyContent:"space-around",paddingTop:8},navItem:{alignItems:"center",width:72,gap:3},fab:{position:"absolute",bottom:47,alignSelf:"center",width:62,height:62,borderRadius:31,alignItems:"center",justifyContent:"center",elevation:7},overlay:{flex:1,backgroundColor:"rgba(0,0,0,.48)",justifyContent:"flex-end"},sheet:{borderTopLeftRadius:28,borderTopRightRadius:28,padding:24,paddingBottom:35},sheetTitle:{fontSize:22,fontWeight:"900",marginBottom:8},cancel:{alignItems:"center",paddingTop:18},cam:{flex:1,backgroundColor:"#000"},camTop:{position:"absolute",top:54,left:18,right:18,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},camBtn:{width:44,height:44,borderRadius:22,backgroundColor:"rgba(0,0,0,.55)",alignItems:"center",justifyContent:"center"},camTxt:{color:"#fff",fontSize:20},counter:{color:"#fff",backgroundColor:"rgba(0,0,0,.55)",padding:9,borderRadius:15,fontWeight:"800"},frame:{position:"absolute",top:"23%",left:"8%",right:"8%",height:"48%",borderWidth:2,borderColor:"#fff",borderRadius:18},camBottom:{position:"absolute",bottom:35,left:18,right:18,alignItems:"center"},camHint:{color:"#fff",marginBottom:15},capture:{width:76,height:76,borderRadius:38,borderWidth:5,borderColor:"#fff",alignItems:"center",justifyContent:"center"},captureIn:{width:60,height:60,borderRadius:30,backgroundColor:"#fff"},done:{position:"absolute",right:0,bottom:18},doneTxt:{color:"#fff",fontWeight:"900",fontSize:16},reviewHead:{height:62,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},back:{fontWeight:"800",fontSize:16},reviewTitle:{fontWeight:"900",fontSize:18},page:{width:260,borderRadius:18,padding:12,alignItems:"center"},pageImg:{width:235,height:360},actions:{width:"100%",flexDirection:"row",justifyContent:"space-around",marginTop:12},reviewBottom:{padding:18,gap:10},menuRow:{paddingVertical:15,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:"#9994"},menuText:{fontSize:16,fontWeight:"700"},renameBox:{margin:24,borderRadius:22,padding:22},renameInput:{borderWidth:1,borderRadius:14,height:50,paddingHorizontal:14,marginBottom:14}
});