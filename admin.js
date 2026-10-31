import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// IMPORTANT: Replace this with the UID of your own Firebase admin account.
// Find it in Firebase Console > Authentication > Users after creating your account.
const ADMIN_UID = "SpebSv19yPPE92rdn75zL4fG8sm2";
const $ = id => document.getElementById(id);
const loginBox = $("login"), app = $("app");
function status(message){ $("status").textContent = message; }
function requireAdmin(user){
  if(!user) return false;
  if(ADMIN_UID.startsWith("REPLACE_") || user.uid !== ADMIN_UID){
    status("Access denied. Set ADMIN_UID in admin.js to your Firebase user UID and publish the matching Firestore rules.");
    signOut(auth);
    return false;
  }
  return true;
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
  try{
    await addDoc(collection(db,"products"),{
      name:$("productName").value.trim(),category:$("category").value.trim(),
      price:Number($("price").value),stock:Number($("stock").value),
      description:$("description").value.trim(),active:true,createdAt:serverTimestamp()
    });
    e.target.reset(); $("stock").value="1";
    status("Product added."); await loadProducts();
  }catch(err){status("Could not add product: "+err.message);}
});
async function loadProducts(){
  try{
    const snap=await getDocs(query(collection(db,"products"),orderBy("createdAt","desc")));
    $("products").replaceChildren();
    if(snap.empty){$("products").textContent="No products yet. Add your first product above.";return;}
    snap.forEach(s=>{
      const p=s.data(), row=document.createElement("div");row.className="item";
      const info=document.createElement("div");
      const strong=document.createElement("strong");strong.textContent=p.name||"Unnamed";
      const detail=document.createElement("div");detail.className="muted";detail.textContent=(p.category||"Other")+" · Price: "+Number(p.price||0).toLocaleString()+" · Stock: "+Number(p.stock||0)+" · "+(p.active===false?"Hidden":"Active");
      info.append(strong,detail);
      const actions=document.createElement("div");
      const stock=document.createElement("input");stock.type="number";stock.min="0";stock.value=Number(p.stock||0);stock.setAttribute("aria-label","Stock quantity for "+(p.name||"product"));stock.style.width="95px";
      const save=document.createElement("button");save.textContent="Update stock";save.addEventListener("click",async()=>{try{await updateDoc(doc(db,"products",s.id),{stock:Number(stock.value)});status("Stock updated.");}catch(err){status(err.message);}});
      const toggle=document.createElement("button");toggle.className="secondary";toggle.textContent=p.active===false?"Make active":"Hide";toggle.addEventListener("click",async()=>{try{await updateDoc(doc(db,"products",s.id),{active:p.active===false});await loadProducts();status("Product visibility updated.");}catch(err){status(err.message);}});
      actions.append(stock,save,toggle);row.append(info,actions);$("products").append(row);
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
