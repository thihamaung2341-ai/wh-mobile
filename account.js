import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
const $ = id => document.getElementById(id);
let currentUser = null;
function initials(name,email){const v=(name||email||"W").trim();return (v.split(/\s+/).length>1?v.split(/\s+/).slice(0,2).map(x=>x[0]).join(""):v.slice(0,1)).toUpperCase();}
onAuthStateChanged(auth,async user=>{
 if(!user){location.replace("login.html?next=account.html");return;}
 currentUser=user;
 $("displayName").textContent=user.displayName||"WH Mobile customer";
 $("displayEmail").textContent=user.email||"";
 $("avatar").textContent=initials(user.displayName,user.email);
 $("name").value=user.displayName||"";
 $("email").value=user.email||"";
 try{
  const snap=await getDoc(doc(db,"customers",user.uid));
  if(snap.exists()){
   const data=snap.data();
   $("phone").value=data.phone||"";
   $("address").value=data.deliveryAddress||"";
   if(data.name && !user.displayName) $("name").value=data.name;
  }
 }catch(err){$("message").className="msg error";$("message").textContent="Could not load saved contact details. You can still enter them and try saving.";}
});
$("profileForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!currentUser)return;
 const name=$("name").value.trim(),phone=$("phone").value.trim(),deliveryAddress=$("address").value.trim();
 if(!name||!phone||!deliveryAddress)return;
 $("save").disabled=true;$("message").className="msg";$("message").textContent="Saving your information…";
 try{
  await updateProfile(currentUser,{displayName:name});
  await setDoc(doc(db,"customers",currentUser.uid),{
   userId:currentUser.uid,name,phone,email:currentUser.email||"",
   deliveryAddress,updatedAt:serverTimestamp()
  },{merge:true});
  $("displayName").textContent=name;$("avatar").textContent=initials(name,currentUser.email);
  $("message").className="msg ok";$("message").textContent="Your name, phone number and delivery address have been saved.";
 }catch(err){$("message").className="msg error";$("message").textContent="Could not save your information. Please try again.";}
 finally{$("save").disabled=false;}
});
$("logout").addEventListener("click",async()=>{await signOut(auth);location.href="index.html";});