import { auth, db, storage } from "./firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const ADMIN_UID = "SpebSv19yPPE92rdn75zL4fG8sm2";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const $ = id => document.getElementById(id);
const loginBox = $("login"), app = $("app");
function status(message){ $("status").textContent = message; }
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
async function uploadProductImage(productId,file){
  validateImage(file);
  const path = "products/" + productId + "/" + Date.now() + "-" + safeFileName(file.name);
  const fileRef = storageRef(storage,path);
  await uploadBytes(fileRef,file,{contentType:file.type});
  return {imageUrl:await getDownloadURL(fileRef),imagePath:path};
}
const imageInput = $("productImage");
if(imageInput){
  imageInput.addEventListener("change",()=>{
    const file=imageInput.files?.[0], preview=$("imagePreview");
    if(!file){preview.hidden=true;preview.removeAttribute("src");return;}
    try{
      validateImage(file);
      preview.src=URL.createObjectURL(file);
      preview.hidden=false;
    }catch(error){
      imageInput.value="";preview.hidden=true;status(error.message);
    }
  });
}
onAuthStateChanged(auth, async user => {
  if(user && requireAdmin(user)){
    loginBox.hidden=true; app.hidden=false;
    await Promise.all([loadProducts(),loadBookings()]);
    status("Signed in as "+(user.email || user.uid));
  } else {
    loginBox.hidden=false; app.hidden=true;
  }
});
$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);}
  catch(err){alert("Login failed: "+err.message);}
});
$("logout").addEventListener("click",()=>signOut(auth));
$("productForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!requireAdmin(auth.currentUser)) return;
  const submit=e.target.querySelector('button[type="submit"]');
  const file=imageInput?.files?.[0] || null;
  let uploaded=null, productRef=null;
  submit.disabled=true;submit.textContent="Saving product…";
  try{
    validateImage(file);
    productRef=doc(collection(db,"products"));
    if(file){
      status("Uploading product photo…");
      uploaded=await uploadProductImage(productRef.id,file);
    }
    await setDoc(productRef,{
      name:$("productName").value.trim(),category:$("category").value.trim(),
      price:Number($("price").value),stock:Number($("stock").value),
      description:$("description").value.trim(),active:true,
      ...(uploaded || {}),createdAt:serverTimestamp()
    });
    e.target.reset();$("stock").value="1";$("imagePreview").hidden=true;
    status("Product and photo saved successfully.");await loadProducts();
  }catch(err){
    if(uploaded?.imagePath){
      try{await deleteObject(storageRef(storage,uploaded.imagePath));}catch(cleanupError){console.warn("Image cleanup failed",cleanupError);}
    }
    status("Could not save product: "+err.message);
  }finally{submit.disabled=false;submit.textContent="Add product";}
});
async function loadProducts(){
  try{
    const snap=await getDocs(query(collection(db,"products"),orderBy("createdAt","desc")));
    $("products").replaceChildren();
    if(snap.empty){$("products").textContent="No products yet. Add your first product above.";return;}
    snap.forEach(s=>{
      const p=s.data(),row=document.createElement("div");row.className="item";
      const info=document.createElement("div");info.style.display="flex";info.style.gap="12px";info.style.alignItems="center";
      if(p.imageUrl){const image=document.createElement("img");image.className="product-thumb";image.src=p.imageUrl;image.alt=p.name||"Product";info.append(image);}
      const textWrap=document.createElement("div");
      const strong=document.createElement("strong");strong.textContent=p.name||"Unnamed";
      const detail=document.createElement("div");detail.className="muted";detail.textContent=(p.category||"Other")+" · Price (MMK): "+Number(p.price||0).toLocaleString()+" · Stock: "+Number(p.stock||0)+" · "+(p.active===false?"Hidden":"Active");
      textWrap.append(strong,detail);info.append(textWrap);
      const actions=document.createElement("div");
      const stock=document.createElement("input");stock.type="number";stock.min="0";stock.value=Number(p.stock||0);stock.setAttribute("aria-label","Stock quantity for "+(p.name||"product"));stock.style.width="95px";
      const save=document.createElement("button");save.textContent="Update stock";save.addEventListener("click",async()=>{try{await updateDoc(doc(db,"products",s.id),{stock:Number(stock.value)});status("Stock updated.");}catch(err){status(err.message);}});
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
      const toggle=document.createElement("button");toggle.className="secondary";toggle.textContent=p.active===false?"Make active":"Hide";toggle.addEventListener("click",async()=>{try{await updateDoc(doc(db,"products",s.id),{active:p.active===false});await loadProducts();status("Product visibility updated.");}catch(err){status(err.message);}});
      actions.append(stock,save,photo,upload,toggle);row.append(info,actions);$("products").append(row);
    });
  }catch(err){$("products").textContent="Could not load products: "+err.message;}
}
async function loadBookings(){
  try{
    const snap=await getDocs(query(collection(db,"bookings"),orderBy("createdAt","desc")));
    $("bookings").replaceChildren();
    if(snap.empty){$("bookings").textContent="No orders or repair bookings yet.";return;}
    snap.forEach(s=>{
      const b=s.data(),row=document.createElement("div");row.className="item";
      const info=document.createElement("div");
      const title=document.createElement("strong");title.textContent=(b.type==="repair"?"Repair booking":"Phone reservation")+" · "+(b.item||"Item");
      const detail=document.createElement("div");detail.className="muted";detail.textContent=(b.customerName||"Customer")+" · "+(b.phone||"No phone")+" · "+(b.status||"pending")+" · "+(b.notes||"No notes");
      info.append(title,detail);
      const select=document.createElement("select");select.setAttribute("aria-label","Booking status");["pending","confirmed","in_progress","completed","cancelled"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v.replace("_"," ");o.selected=(b.status||"pending")===v;select.append(o);});
      select.addEventListener("change",async()=>{try{await updateDoc(doc(db,"bookings",s.id),{status:select.value,updatedAt:serverTimestamp()});status("Booking status updated.");}catch(err){status(err.message);}});
      row.append(info,select);$("bookings").append(row);
    });
  }catch(err){$("bookings").textContent="Could not load bookings: "+err.message;}
}
