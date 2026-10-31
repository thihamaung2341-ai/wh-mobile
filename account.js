import { auth } from "./firebase-config.js";
import { onAuthStateChanged, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
const $ = id => document.getElementById(id);
let currentUser = null;
function initials(name,email){const v=(name||email||"W").trim();return (v.split(/\s+/).length>1?v.split(/\s+/).slice(0,2).map(x=>x[0]).join(""):v.slice(0,1)).toUpperCase();}
onAuthStateChanged(auth,user=>{
 if(!user){location.replace("login.html?next=account.html");return;}
 currentUser=user;
 $("displayName").textContent=user.displayName||"WH Mobile customer";
 $("displayEmail").textContent=user.email||"";
 $("avatar").textContent=initials(user.displayName,user.email);
 $("name").value=user.displayName||"";
 $("email").value=user.email||"";
});
$("profileForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!currentUser)return;
 const name=$("name").value.trim();if(!name)return;
 $("save").disabled=true;$("message").className="msg";$("message").textContent="Saving…";
 try{await updateProfile(currentUser,{displayName:name});$("displayName").textContent=name;$("avatar").textContent=initials(name,currentUser.email);$("message").className="msg ok";$("message").textContent="Your account name has been updated.";}
 catch(err){$("message").className="msg error";$("message").textContent="Could not save changes. Please try again.";}
 finally{$("save").disabled=false;}
});
$("logout").addEventListener("click",async()=>{await signOut(auth);location.href="index.html";});