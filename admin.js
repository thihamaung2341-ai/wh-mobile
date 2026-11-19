import { auth, db, storage } from "./firebase-config.js";
import { app as firebaseApp } from "./firebase-config.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ref as storageRef, uploadBytes, uploadBytesResumable, getBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const ADMIN_UID = "SpebSv19yPPE92rdn75zL4fG8sm2";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_GALLERY_IMAGES = 5;
const PAYMENT_SETTINGS_PATH = "settings/payment-methods.json";
let paymentMethods = [];
const $ = id => document.getElementById(id);
const loginBox = $("login"), app = $("app");
function status(message){ const node=$("status");if(node)node.textContent=message; }
function requireAdmin(user){
  if(!user) return false;
  if(ADMIN_UID.startsWith("REPLACE_") || user.uid !== ADMIN_UID){
    status("Access denied. Check ADMIN_UID in admin.js and your Firebase rules.");
    signOut(auth);
    return false;
  }
  return true;
}
function validateImage(file){
  if(!file) return null;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
    throw new Error("Choose a JPG, PNG or WebP image.");
  }
  if(file.size > MAX_IMAGE_BYTES) throw new Error("Image must be 5 MB or smaller.");
  return file;
}
function safeFileName(name){
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-").slice(-90) || "product-image";
}
async function uploadProductImage(productId,file,onProgress=()=>{}){
  validateImage(file);
  const path = "products/" + productId + "/" + Date.now() + "-" + safeFileName(file.name);
  const fileRef = storageRef(storage,path);
  const task = uploadBytesResumable(fileRef,file,{contentType:file.type});
  await new Promise((resolve,reject)=>{
    task.on("state_changed",snapshot=>{
      const percent=snapshot.totalBytes ? Math.round(snapshot.bytesTransferred/snapshot.totalBytes*100) : 0;
      onProgress(percent);
    },reject,resolve);
  });
  return {imageUrl:await getDownloadURL(task.snapshot.ref),imagePath:path};
}
function paymentMethodId(){
  return globalThis.crypto?.randomUUID?.() || "pm-"+Date.now().toString(36)+Math.random().toString(36).slice(2,9);
}
async function savePaymentMethods(methods){
  const payload={schemaVersion:1,methods};
  await uploadBytes(storageRef(storage,PAYMENT_SETTINGS_PATH),new Blob([JSON.stringify(payload)],{type:"application/json"}),{contentType:"application/json"});
  paymentMethods=methods;
}
function paymentQrFromDataUrl(dataUrl){
  const match=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl||"");
  if(!match)throw new Error("A default payment QR image has an unsupported format.");
  const raw=atob(match[2]),bytes=new Uint8Array(raw.length);
  for(let index=0;index<raw.length;index++)bytes[index]=raw.charCodeAt(index);
  const extension=match[1]==="image/jpeg"?"jpg":match[1].slice(6);
  return {blob:new Blob([bytes],{type:match[1]}),extension,contentType:match[1]};
}
async function uploadInlinePaymentQrs(methods){
  const saved=[];
  for(const method of methods){
    if(!method.qrDataUrl){saved.push(method);continue;}
    try{
      const {blob,extension,contentType}=paymentQrFromDataUrl(method.qrDataUrl);
      const path="payment-methods/"+method.id+"/qr."+extension;
      await uploadBytes(storageRef(storage,path),blob,{contentType});
      const {qrDataUrl,...details}=method;
      saved.push({...details,qrPath:path,qrUrl:""});
    }catch(error){console.warn("Could not copy payment QR into Firebase Storage",method.id,error);saved.push(method);}
  }
  return saved;
}
async function loadPaymentMethods(){
  const root=$("paymentMethods");
  if(!root)return;
  try{
    const bytes=await getBytes(storageRef(storage,PAYMENT_SETTINGS_PATH),256*1024);
    const parsed=JSON.parse(new TextDecoder().decode(bytes));
    paymentMethods=Array.isArray(parsed.methods)?parsed.methods.filter(method=>method&&typeof method.id==="string"):[];
    await renderPaymentMethods();
  }catch(error){
    if(error?.code==="storage/object-not-found"){
      try{const response=await fetch("payment-methods.json",{cache:"no-store"});if(!response.ok)throw new Error("Default payment details are unavailable.");const parsed=await response.json();const defaults=Array.isArray(parsed.methods)?parsed.methods.filter(method=>method&&typeof method.id==="string"):[];paymentMethods=await uploadInlinePaymentQrs(defaults);try{await savePaymentMethods(paymentMethods)}catch(syncError){console.warn("Could not copy default payment methods to Firebase Storage",syncError)}}
      catch(fallbackError){console.warn("Could not load default payment methods",fallbackError);paymentMethods=[];}
      await renderPaymentMethods();
      return;
    }
    root.textContent="Could not load payment methods: "+(error?.message||String(error));
  }
}
async function renderPaymentMethods(){
  const root=$("paymentMethods");
  if(!root)return;
  root.replaceChildren();
  if(!paymentMethods.length){root.textContent="No payment methods yet. Add one when your account details and QR image are ready.";return;}
  for(const method of paymentMethods){
    const card=document.createElement("article");card.className="payment-method-card";
    const header=document.createElement("div");header.className="payment-method-card-header";
    const title=document.createElement("strong");title.textContent=method.name||"Payment method";
    const state=document.createElement("span");state.className="muted";state.textContent=method.active===false?"Hidden from checkout":"Shown at checkout";
    header.append(title,state);
    const grid=document.createElement("div");grid.className="payment-method-card-grid";
    [["Account name",method.accountName],["Account or phone number",method.accountNumber],["Checkout instructions",method.instructions||"None"]].forEach(([label,value])=>{
      const item=document.createElement("div");item.className="muted";item.textContent=label+": "+(value||"—");grid.append(item);
    });
    card.append(header,grid);
    if(method.qrPath||method.qrUrl||method.qrDataUrl){
      try{const image=document.createElement("img");image.className="payment-method-qr";image.alt=(method.name||"Payment")+" QR code";image.src=method.qrDataUrl||method.qrUrl||(await getDownloadURL(storageRef(storage,method.qrPath)));card.append(image);}
      catch{const missing=document.createElement("p");missing.className="muted";missing.textContent="QR image could not be loaded.";card.append(missing);}
    }else{const missing=document.createElement("p");missing.className="muted";missing.textContent="No QR image added.";card.append(missing);}
    const actions=document.createElement("div");actions.className="payment-method-actions";
    const edit=document.createElement("button");edit.type="button";edit.className="secondary";edit.textContent="Edit";edit.addEventListener("click",()=>{
      const form=$("paymentMethodForm");form.dataset.editingId=method.id;
      $("paymentMethodName").value=method.name||"";$("paymentAccountName").value=method.accountName||"";$("paymentAccountNumber").value=method.accountNumber||"";$("paymentInstructions").value=method.instructions||"";$("paymentQrImage").value="";
      $("paymentMethodSubmit").textContent="Save payment method";$("paymentMethodFormStatus").textContent=method.qrPath||method.qrUrl||method.qrDataUrl?"Choose a replacement QR image, or leave it blank to keep the current one.":"Add a QR image now or save the account details and add it later.";
      form.scrollIntoView({behavior:"smooth",block:"center"});
    });
    const toggle=document.createElement("button");toggle.type="button";toggle.className="secondary";toggle.textContent=method.active===false?"Show at checkout":"Hide from checkout";toggle.addEventListener("click",async()=>{
      toggle.disabled=true;
      try{await savePaymentMethods(paymentMethods.map(item=>item.id===method.id?{...item,active:item.active===false}:item));await renderPaymentMethods();$("paymentMethodsStatus").textContent="Payment method visibility updated.";}
      catch(error){$("paymentMethodsStatus").textContent="Could not update payment method: "+error.message;toggle.disabled=false;}
    });
    const remove=document.createElement("button");remove.type="button";remove.className="secondary";remove.textContent="Delete";remove.addEventListener("click",async()=>{
      if(!window.confirm("Delete this payment method from checkout?"))return;
      remove.disabled=true;
      try{
        await savePaymentMethods(paymentMethods.filter(item=>item.id!==method.id));
        if(method.qrPath){try{await deleteObject(storageRef(storage,method.qrPath));}catch(error){console.warn("Could not remove old payment QR",error);}}
        await renderPaymentMethods();$("paymentMethodsStatus").textContent="Payment method deleted.";
      }catch(error){$("paymentMethodsStatus").textContent="Could not delete payment method: "+error.message;remove.disabled=false;}
    });
    actions.append(edit,toggle,remove);card.append(actions);root.append(card);
  }
}
function resetPaymentMethodForm(){
  const form=$("paymentMethodForm");form.reset();delete form.dataset.editingId;$("paymentMethodSubmit").textContent="Add payment method";
}
$("paymentMethodForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!requireAdmin(auth.currentUser))return;
  const form=event.currentTarget,editingId=form.dataset.editingId||"",old=paymentMethods.find(item=>item.id===editingId),id=old?.id||paymentMethodId(),file=$("paymentQrImage").files?.[0];
  let uploadedQrPath="";const submit=$("paymentMethodSubmit");submit.disabled=true;submit.textContent=old?"Saving…":"Adding…";
  try{
    if(file){validateImage(file);uploadedQrPath="payment-methods/"+id+"/"+Date.now()+"-"+safeFileName(file.name);await uploadBytes(storageRef(storage,uploadedQrPath),file,{contentType:file.type});}
    const nextMethod={id,name:$("paymentMethodName").value.trim(),accountName:$("paymentAccountName").value.trim(),accountNumber:$("paymentAccountNumber").value.trim(),instructions:$("paymentInstructions").value.trim(),qrPath:uploadedQrPath||old?.qrPath||"",qrUrl:uploadedQrPath?"":old?.qrUrl||"",qrDataUrl:uploadedQrPath?"":old?.qrDataUrl||"",active:old?.active!==false,sortOrder:old?.sortOrder??paymentMethods.length};
    const next=old?paymentMethods.map(method=>method.id===id?nextMethod:method):[...paymentMethods,nextMethod];
    await savePaymentMethods(next);
    if(uploadedQrPath&&old?.qrPath){try{await deleteObject(storageRef(storage,old.qrPath));}catch(error){console.warn("Could not remove replaced payment QR",error);}}
    resetPaymentMethodForm();$("paymentMethodFormStatus").textContent="Payment method saved.";$("paymentMethodsStatus").textContent="";await renderPaymentMethods();
  }catch(error){
    if(uploadedQrPath){try{await deleteObject(storageRef(storage,uploadedQrPath));}catch(cleanupError){console.warn("Could not remove unused payment QR",cleanupError);}}
    $("paymentMethodFormStatus").textContent="Could not save payment method: "+(error?.message||String(error));
  }finally{submit.disabled=false;submit.textContent=form.dataset.editingId?"Save payment method":"Add payment method";}
});
const imageInput = $("productImage");
const ramField = $("ramField");
function updateRamField(){
  const isIphone=/\biphone\b/i.test($("productName")?.value || "");
  if(ramField) ramField.hidden=isIphone;
  if(isIphone && $("ramGb")) $("ramGb").value="";
}
$("productName")?.addEventListener("input",updateRamField);
updateRamField();
const previewWrap = $("previewWrap");
const removeImageButton = $("removeImage");
function clearSelectedPhoto(){
  if(imageInput) imageInput.value="";
  const preview=$("imagePreview");
  preview.hidden=true;
  preview.removeAttribute("src");
  previewWrap.hidden=true;
  removeImageButton.hidden=true;
}
if(imageInput){
  imageInput.addEventListener("change",()=>{
    const file=imageInput.files?.[0], preview=$("imagePreview");
    if(!file){clearSelectedPhoto();return;}
    try{
      validateImage(file);
      preview.src=URL.createObjectURL(file);
      preview.hidden=false;
      previewWrap.hidden=false;
      removeImageButton.hidden=false;
    }catch(error){
      clearSelectedPhoto();
      status(error.message);
    }
  });
}
removeImageButton?.addEventListener("click",clearSelectedPhoto);
onAuthStateChanged(auth, async user => {
  if(user && requireAdmin(user)){
    loginBox.hidden=true; app.hidden=false;
    const tasks=[];
    if($("products"))tasks.push(loadProducts());
    if($("bookings"))tasks.push(loadBookings());
    if($("orders"))tasks.push(loadOrders());
    if($("paymentMethods"))tasks.push(loadPaymentMethods());
    await Promise.all(tasks);
    status("Signed in as "+(user.email || user.uid));
  } else {
    loginBox.hidden=false; app.hidden=true;
  }
});
$("loginForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);}
  catch(err){alert("Login failed: "+err.message);}
});
$("logout")?.addEventListener("click",()=>signOut(auth));
$("productForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!requireAdmin(auth.currentUser)) return;
  const submit=e.target.querySelector('button[type="submit"]');
  const formStatus=$("productFormStatus");
  const announce=message=>{status(message);if(formStatus)formStatus.textContent=message;};
  const file=imageInput?.files?.[0] || null;
  const galleryFiles=Array.from($("productGalleryImages")?.files||[]);
  let uploaded=null, productRef=null, uploadedGallery=[];
  submit.disabled=true;submit.textContent="Saving product…";
  try{
    const priceValue=$("price").value.trim();
    const price=priceValue===""?null:Number(priceValue);
    if(price!==null&&(!Number.isFinite(price)||price<=0)) throw new Error("Enter a price above zero or leave it blank.");
    if(galleryFiles.length>MAX_GALLERY_IMAGES) throw new Error("Choose up to "+MAX_GALLERY_IMAGES+" additional photos.");
    validateImage(file);
    galleryFiles.forEach(validateImage);
    productRef=doc(collection(db,"products"));
    if(file){
      announce("Uploading product photo… 0%");
      uploaded=await uploadProductImage(productRef.id,file,percent=>announce("Uploading product photo… "+percent+"%"));
    }
    for(let index=0;index<galleryFiles.length;index++){
      announce("Uploading gallery photo "+(index+1)+" of "+galleryFiles.length+"…");
      uploadedGallery.push(await uploadProductImage(productRef.id,galleryFiles[index]));
    }
    announce("Saving product details to Firestore…");
    await setDoc(productRef,{
      name:$("productName").value.trim(),brand:$("brand").value.trim(),category:$("category").value.trim(),
      price,stock:Number($("stock").value),
      storageGb:$("storageGb").value ? Number($("storageGb").value) : null,
      ramGb:$("ramGb").value ? Number($("ramGb").value) : null,
      color:$("color").value.trim(),condition:$("condition").value,
      description:$("description").value.trim(),active:true,
      ...(uploaded || {}),galleryImages:uploadedGallery,createdAt:serverTimestamp()
    });
    e.target.reset();$("stock").value="1";updateRamField();$("imagePreview").hidden=true;$("previewWrap").hidden=true;$("removeImage").hidden=true;
    announce("Product saved successfully. Refreshing inventory…");
    await loadProducts();
    announce("Product saved successfully.");
  }catch(err){
    const uploadedPaths=[uploaded?.imagePath,...uploadedGallery.map(item=>item.imagePath)].filter(Boolean);
    for(const path of uploadedPaths){try{await deleteObject(storageRef(storage,path));}catch(cleanupError){console.warn("Image cleanup failed",cleanupError);}}
    const reason=err?.code ? err.code+" — "+err.message : (err?.message || String(err));
    announce("Could not save product: "+reason);
  }finally{submit.disabled=false;submit.textContent="Add product";}
});
async function loadProducts(){
  const root=$("products");if(!root)return;
  try{
    const snap=await getDocs(query(collection(db,"products"),orderBy("createdAt","desc")));
    root.replaceChildren();
    if(snap.empty){root.textContent="No products yet. Add your first product above.";return;}
    snap.forEach(s=>{
      const p=s.data(),row=document.createElement("div");row.className="item";
      const info=document.createElement("div");info.style.display="flex";info.style.gap="12px";info.style.alignItems="center";
      if(p.imageUrl){const image=document.createElement("img");image.className="product-thumb";image.src=p.imageUrl;image.alt=p.name||"Product";info.append(image);}
      const textWrap=document.createElement("div");
      const strong=document.createElement("strong");strong.textContent=p.name||"Unnamed";
      const priceLabel=p.price==null||p.price===""||Number(p.price)<=0?"Price not set":"Price (MMK): "+Number(p.price).toLocaleString("en-US");
      const detail=document.createElement("div");detail.className="muted";detail.textContent=[p.brand,p.category||"Other",p.storageGb?(Number(p.storageGb)>=1024?(Number(p.storageGb)/1024)+" TB storage":Number(p.storageGb)+" GB storage"):"",p.ramGb?Number(p.ramGb)+" GB RAM":"",p.color||"",p.condition||"",priceLabel,"Stock: "+Number(p.stock||0),p.active===false?"Hidden":"Active"].filter(Boolean).join(" · ");
      textWrap.append(strong,detail);info.append(textWrap);
      const actions=document.createElement("div");actions.className="product-row-actions";
      const priceInput=document.createElement("input");priceInput.type="number";priceInput.min="1";priceInput.step="1";priceInput.value=p.price==null||Number(p.price)<=0?"":String(Number(p.price));priceInput.placeholder="Price (MMK)";priceInput.setAttribute("aria-label","Price in MMK for "+(p.name||"product"));priceInput.style.width="135px";
      const stock=document.createElement("input");stock.type="number";stock.min="0";stock.step="1";stock.value=Number(p.stock||0);stock.setAttribute("aria-label","Stock quantity for "+(p.name||"product"));stock.style.width="95px";
      const save=document.createElement("button");save.textContent="Save price & stock";save.addEventListener("click",async()=>{
        const nextPrice=priceInput.value.trim()===""?null:Number(priceInput.value),nextStock=Number(stock.value);
        if(nextPrice!==null&&(!Number.isInteger(nextPrice)||nextPrice<=0)){status("Enter a price above zero or leave it blank.");return;}
        if(!Number.isInteger(nextStock)||nextStock<0){status("Enter a valid stock quantity.");return;}
        save.disabled=true;save.textContent="Saving…";
        try{await updateDoc(doc(db,"products",s.id),{price:nextPrice,stock:nextStock});status("Price and stock updated.");await loadProducts();}
        catch(err){status(err.message);}
        finally{save.disabled=false;save.textContent="Save price & stock";}
      });
      const photo=document.createElement("input");photo.type="file";photo.accept="image/jpeg,image/png,image/webp";photo.className="file-input";photo.setAttribute("aria-label","Choose replacement photo for "+(p.name||"product"));photo.style.maxWidth="190px";
      const upload=document.createElement("button");upload.textContent="Upload / replace photo";upload.addEventListener("click",async()=>{
        const file=photo.files?.[0];if(!file){status("Choose a photo first.");return;}
        try{
          validateImage(file);upload.disabled=true;upload.textContent="Uploading…";
          const next=await uploadProductImage(s.id,file);
          await updateDoc(doc(db,"products",s.id),next);
          if(p.imagePath){try{await deleteObject(storageRef(storage,p.imagePath));}catch(cleanupError){console.warn("Old image could not be deleted",cleanupError);}}
          status("Product photo updated.");await loadProducts();
        }catch(err){status("Photo upload failed: "+err.message);}
        finally{upload.disabled=false;upload.textContent="Upload / replace photo";}
      });
      const galleryPhoto=document.createElement("input");galleryPhoto.type="file";galleryPhoto.accept="image/jpeg,image/png,image/webp";galleryPhoto.multiple=true;galleryPhoto.className="file-input";galleryPhoto.setAttribute("aria-label","Choose additional gallery photos for "+(p.name||"product"));galleryPhoto.style.maxWidth="220px";
      const uploadGallery=document.createElement("button");uploadGallery.className="secondary";uploadGallery.textContent="Add gallery photos";uploadGallery.addEventListener("click",async()=>{
        const files=Array.from(galleryPhoto.files||[]),existing=Array.isArray(p.galleryImages)?p.galleryImages:[];
        if(!files.length){status("Choose one or more gallery photos first.");return;}
        if(existing.length+files.length>MAX_GALLERY_IMAGES){status("This product can have up to "+MAX_GALLERY_IMAGES+" additional gallery photos.");return;}
        let galleryUploads=[];
        try{
          files.forEach(validateImage);uploadGallery.disabled=true;uploadGallery.textContent="Uploading…";
          for(const file of files)galleryUploads.push(await uploadProductImage(s.id,file));
          await updateDoc(doc(db,"products",s.id),{galleryImages:[...existing,...galleryUploads]});
          status("Product gallery updated.");await loadProducts();
        }catch(err){
          for(const item of galleryUploads){try{await deleteObject(storageRef(storage,item.imagePath));}catch(cleanupError){console.warn("Gallery image cleanup failed",cleanupError);}}
          status("Gallery upload failed: "+err.message);
        }finally{uploadGallery.disabled=false;uploadGallery.textContent="Add gallery photos";}
      });
      const toggle=document.createElement("button");toggle.className="secondary";toggle.textContent=p.active===false?"Make active":"Hide";toggle.addEventListener("click",async()=>{try{await updateDoc(doc(db,"products",s.id),{active:p.active===false});await loadProducts();status("Product visibility updated.");}catch(err){status(err.message);}});
      const detailEditor=document.createElement("details");detailEditor.className="product-detail-editor";
      const detailSummary=document.createElement("summary");detailSummary.textContent="Edit product details";
      const detailGrid=document.createElement("div");detailGrid.className="product-detail-grid";
      const detailField=(name,input)=>{const label=document.createElement("label");label.textContent=name;label.append(input);detailGrid.append(label);};
      const storage=document.createElement("input");storage.type="number";storage.min="1";storage.step="1";storage.value=p.storageGb==null?"":String(Number(p.storageGb));storage.placeholder="GB";
      const ram=document.createElement("input");ram.type="number";ram.min="1";ram.step="1";ram.value=p.ramGb==null?"":String(Number(p.ramGb));ram.placeholder="GB";
      const color=document.createElement("input");color.type="text";color.maxLength=40;color.value=p.color||"";color.placeholder="Color, if confirmed";
      const condition=document.createElement("select");
      ["","New","Used","Refurbished"].forEach(value=>{const option=document.createElement("option");option.value=value;option.textContent=value||"Not specified";condition.append(option);});
      if(p.condition&&!Array.from(condition.options).some(option=>option.value===p.condition)){const option=document.createElement("option");option.value=p.condition;option.textContent=p.condition;condition.append(option);}
      condition.value=p.condition||"";
      const description=document.createElement("textarea");description.maxLength=800;description.rows=3;description.value=p.description||"";description.placeholder="Confirmed condition notes, battery health, defects, or included accessories";
      detailField("Storage (GB)",storage);detailField("RAM (GB)",ram);detailField("Color",color);detailField("Condition",condition);detailField("Product details",description);
      const saveDetails=document.createElement("button");saveDetails.className="secondary product-detail-save";saveDetails.type="button";saveDetails.textContent="Save product details";
      saveDetails.addEventListener("click",async()=>{
        const nextStorage=storage.value.trim()===""?null:Number(storage.value),nextRam=ram.value.trim()===""?null:Number(ram.value);
        if(nextStorage!==null&&(!Number.isInteger(nextStorage)||nextStorage<=0)){status("Enter storage as a whole number of GB, or leave it blank.");return;}
        if(nextRam!==null&&(!Number.isInteger(nextRam)||nextRam<=0)){status("Enter RAM as a whole number of GB, or leave it blank.");return;}
        saveDetails.disabled=true;saveDetails.textContent="Saving…";
        try{
          await updateDoc(doc(db,"products",s.id),{storageGb:nextStorage,ramGb:nextRam,color:color.value.trim(),condition:condition.value,description:description.value.trim()});
          status("Product details updated.");await loadProducts();
        }catch(err){status("Could not save product details: "+err.message);}
        finally{saveDetails.disabled=false;saveDetails.textContent="Save product details";}
      });
      detailEditor.append(detailSummary,detailGrid,saveDetails);
      actions.append(priceInput,stock,save,photo,upload,galleryPhoto,uploadGallery,toggle);row.append(info,actions,detailEditor);root.append(row);
    });
  }catch(err){root.textContent="Could not load products: "+err.message;}
}
async function loadBookings(){
  const activeRoot=$("bookings"),archiveRoot=$("bookingsArchive"),archiveCount=$("bookingArchiveCount");
  if(!activeRoot)return;
  try{
    const snap=await getDocs(query(collection(db,"bookings"),orderBy("createdAt","desc")));
    activeRoot.replaceChildren();
    archiveRoot?.replaceChildren();
    let activeTotal=0,completedTotal=0;
    if(snap.empty){
      activeRoot.textContent="No orders or repair bookings yet.";
      if(archiveRoot)archiveRoot.textContent="No completed requests yet.";
      if(archiveCount)archiveCount.textContent="0";
      return;
    }
    snap.forEach(s=>{
      const b=s.data(),isCompleted=b.status==="completed";
      const target=isCompleted&&archiveRoot?archiveRoot:activeRoot;
      const row=document.createElement("div");row.className="item";
      const info=document.createElement("div");
      const title=document.createElement("strong");title.textContent=(b.type==="repair"?"Repair booking":"Phone reservation")+" · "+(b.item||"Item");
      const detail=document.createElement("div");detail.className="muted";detail.textContent=(b.customerName||"Customer")+" · "+(b.phone||"No phone")+" · "+(b.status||"pending")+" · "+(b.notes||"No notes");
      info.append(title,detail);
      const select=document.createElement("select");select.setAttribute("aria-label","Booking status");["pending","confirmed","in_progress","completed","cancelled"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v.replace("_"," ");o.selected=(b.status||"pending")===v;select.append(o);});
      select.addEventListener("change",async()=>{try{await updateDoc(doc(db,"bookings",s.id),{status:select.value,updatedAt:serverTimestamp()});status("Booking status updated.");await loadBookings();}catch(err){status(err.message);}});
      row.append(info,select);target.append(row);
      if(isCompleted&&archiveRoot)completedTotal++;else activeTotal++;
    });
    if(!activeTotal)activeRoot.textContent="No active requests. Completed requests are in the archive below.";
    if(archiveRoot&&!completedTotal)archiveRoot.textContent="No completed requests yet.";
    if(archiveCount)archiveCount.textContent=String(completedTotal);
  }catch(err){
    activeRoot.textContent="Could not load bookings: "+err.message;
    if(archiveRoot)archiveRoot.textContent="Could not load completed requests.";
  }
}

async function loadOrders(){
 const root=$("orders");if(!root)return;
 try{
  const snap=await getDocs(query(collection(db,"orders"),orderBy("createdAt","desc")));
  root.replaceChildren();
  if(snap.empty){root.textContent="No customer orders yet.";return;}
  snap.forEach(s=>{
   const o=s.data(),row=document.createElement("div");row.className="item";
   const info=document.createElement("div");const title=document.createElement("strong");title.textContent="Order "+s.id.slice(0,8).toUpperCase()+" · "+(o.customerName||"Customer");
   const detail=document.createElement("div");detail.className="muted";detail.textContent=(o.phone||"No phone")+" · Contact: "+(o.contactChannel==="telegram"?"Telegram"+(o.telegramUsername?" "+o.telegramUsername:""):(o.contactChannel==="phone"?"Phone":o.contactChannel==="whatsapp"?"WhatsApp":"Not specified"))+" · Ks"+Number(o.total||0).toLocaleString()+" · "+(o.deliveryAddress||"No address")+" · "+(o.notes||"");
   const products=document.createElement("div");products.className="muted";products.textContent=(o.items||[]).map(p=>p.name+" × "+p.quantity).join(", ");
   const payment=document.createElement("div");payment.className="muted";payment.textContent="Payment: "+(o.paymentMethodName||"Arrange with WH Mobile")+" · "+(o.paymentStatus||"awaiting_confirmation").replaceAll("_"," ");
   info.append(title,detail,products,payment);
   if(o.paymentProofPath){
     const proof=document.createElement("a");proof.href="#";proof.textContent="Load payment proof";proof.setAttribute("aria-label","View payment proof for order "+s.id.slice(0,8));proof.addEventListener("click",async event=>{
       event.preventDefault();
       if(proof.href.startsWith("blob:")){window.open(proof.href,"_blank","noopener,noreferrer");return;}
       if(proof.dataset.loading)return;
       proof.dataset.loading="true";proof.textContent="Loading payment proof…";
       try{const bytes=await getBytes(storageRef(storage,o.paymentProofPath),MAX_IMAGE_BYTES);proof.href=URL.createObjectURL(new Blob([bytes],{type:o.paymentProofContentType||"image/jpeg"}));proof.textContent="Open payment proof";}
       catch(error){proof.textContent="Payment proof unavailable";console.warn("Could not load payment proof",error);}
       finally{delete proof.dataset.loading;}
     });
     info.append(proof);
   }
   const select=document.createElement("select");select.setAttribute("aria-label","Order status");["pending","confirmed","processing","ready_to_ship","shipped","delivered","cancelled"].forEach(v=>{const op=document.createElement("option");op.value=v;op.textContent=v.replaceAll("_"," ");op.selected=(o.status||"pending")===v;select.append(op)});
   select.addEventListener("change",async()=>{try{await updateDoc(doc(db,"orders",s.id),{status:select.value,updatedAt:serverTimestamp()});status("Order status updated.");}catch(err){status("Could not update order: "+err.message)}});
   row.append(info,select);root.append(row);
  });
 }catch(err){const root=$("orders");if(root)root.textContent="Could not load orders: "+err.message;}
}


const telegramFunctions=getFunctions(firebaseApp,"us-central1");
const getTelegramBotProfile=httpsCallable(telegramFunctions,"getTelegramBotProfile");
const updateTelegramBotProfile=httpsCallable(telegramFunctions,"updateTelegramBotProfile");
async function loadTelegramProfile(){
  const message=$("telegramProfileStatus"),reload=$("telegramProfileReload");
  if(!message||!auth.currentUser||auth.currentUser.uid!==ADMIN_UID)return;
  message.textContent="Loading profile from Telegram…";
  if(reload)reload.disabled=true;
  try{
    const response=await getTelegramBotProfile(),profile=response.data||{};
    $("telegramBotName").value=profile.name||"";
    $("telegramBotDescription").value=profile.description||"";
    $("telegramBotShortDescription").value=profile.shortDescription||"";
    message.textContent="Loaded from Telegram. Save changes here to update the bot profile.";
  }catch(error){message.textContent="Could not load the Telegram profile: "+(error?.message||String(error));}
  finally{if(reload)reload.disabled=false;}
}
$("telegramProfileReload")?.addEventListener("click",loadTelegramProfile);
$("telegramProfileForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!auth.currentUser||auth.currentUser.uid!==ADMIN_UID)return;
  const submit=$("telegramProfileSubmit"),message=$("telegramProfileStatus");
  const profile={name:$("telegramBotName").value.trim(),description:$("telegramBotDescription").value.trim(),shortDescription:$("telegramBotShortDescription").value.trim()};
  if(!profile.name||profile.name.length>64||profile.description.length>512||profile.shortDescription.length>120){
    message.textContent="Check the limits: name up to 64, description up to 512, and short bio up to 120 characters.";return;
  }
  submit.disabled=true;submit.textContent="Saving profile…";message.textContent="Updating Telegram…";
  try{await updateTelegramBotProfile(profile);message.textContent="Telegram bot profile updated.";}
  catch(error){message.textContent="Could not update the Telegram profile: "+(error?.message||String(error));}
  finally{submit.disabled=false;submit.textContent="Save Telegram profile";}
});
onAuthStateChanged(auth,user=>{if(user&&user.uid===ADMIN_UID&&$("telegramProfileForm"))loadTelegramProfile();});
