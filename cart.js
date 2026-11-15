import {auth,db,storage} from "./firebase-config.js";
import {onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {collection,doc,getDoc,setDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {ref as storageRef,getBytes,getDownloadURL,uploadBytes} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const $=id=>document.getElementById(id);
const MAX_PROOF_BYTES=5*1024*1024;
const PAYMENT_SETTINGS_PATH="settings/payment-methods.json";
const PAYMENT_LOGOS=[
  {match:/\bkbzpay\b|kbz\s*pay/i,url:"https://www.kbzpay.com/_next/static/media/blue-L.c7123311.webp",alt:"KBZPay"},
  {match:/\bwave\s*pay\b|\bwavepay\b/i,url:"https://www.wavemoney.com.mm/wp-content/uploads/2024/11/wave-logo-small.svg",alt:"Wave Money"},
  {match:/\bkbz\s*bank\b/i,url:"https://www.kbzbank.com/wp-content/uploads/2018/11/logo_retina2.png",alt:"KBZ Bank"},
  {match:/\bcb\s*bank\b/i,url:"https://www.cbbank.com.mm/sites/cbbank.com.mm/files/logo.png",alt:"CB Bank"},
  {match:/\byoma\b/i,url:"https://www.yomabank.com/wp-content/uploads/2023/03/logo.png",alt:"Yoma Bank"},
  {match:/\baya\b/i,url:"https://www.ayabank.com/images/aya-bank-PCL-logo.png",alt:"AYA Bank"}
];
let user=null,cart=[],paymentMethods=[],paymentConfigLoaded=false,paymentConfigError=false;

function paymentLogoFor(method){
  const label=(method.name||"")+" "+(method.id||"");
  return PAYMENT_LOGOS.find(item=>item.match.test(label))||null;
}

function syncDeliveryAddress(){
  const pickup=$("delivery").value==="pickup";
  $("addressField").hidden=pickup;
  $("address").required=!pickup;
}
function syncContactFields(){
  const telegram=$("contactChannel").value==="telegram";
  $("telegramUsernameField").hidden=!telegram;
  $("telegramUsername").required=telegram;
}
$("delivery").addEventListener("change",syncDeliveryAddress);
$("contactChannel").addEventListener("change",syncContactFields);
syncDeliveryAddress();
syncContactFields();

const money=n=>"Ks"+Number(n||0).toLocaleString("en-US");
function read(){try{return JSON.parse(localStorage.getItem("wh-cart")||"[]")}catch{return []}}
function save(){localStorage.setItem("wh-cart",JSON.stringify(cart));render()}
function render(){
  cart=read();
  $("items").replaceChildren();
  if(!cart.length){
    $("items").innerHTML='<div class="empty"><h3>Your cart is empty</h3><p class="muted">Add products from the shop to get started.</p><a href="index.html">Browse products</a></div>';
    $("total").textContent=money(0);$("place").disabled=true;return;
  }
  let total=0;
  cart.forEach((p,i)=>{
    total+=Number(p.price)*Number(p.qty);
    const row=document.createElement("div");row.className="item";
    const im=document.createElement("div");im.className="thumb";
    if(p.image){const img=document.createElement("img");img.src=p.image;img.alt=p.name;im.append(img)}else im.textContent="📱";
    const detail=document.createElement("div"),name=document.createElement("b");name.textContent=p.name;
    const price=document.createElement("div");price.className="muted";price.textContent=money(p.price)+" each";
    const qty=document.createElement("div");qty.className="qty";
    const minus=document.createElement("button");minus.textContent="−";minus.type="button";minus.onclick=()=>{cart[i].qty=Math.max(1,cart[i].qty-1);save()};
    const count=document.createElement("span");count.textContent=p.qty;
    const plus=document.createElement("button");plus.textContent="+";plus.type="button";plus.onclick=()=>{cart[i].qty=Math.min(20,cart[i].qty+1);save()};
    qty.append(minus,count,plus);detail.append(name,price,qty);
    const right=document.createElement("div");right.style.textAlign="right";right.textContent=money(p.price*p.qty);
    const rm=document.createElement("button");rm.className="remove";rm.type="button";rm.textContent="Remove";rm.onclick=()=>{cart.splice(i,1);save()};
    right.append(document.createElement("br"),rm);row.append(im,detail,right);$("items").append(row);
  });
  $("total").textContent=money(total);$("place").disabled=!user||!paymentConfigLoaded||paymentConfigError;
}

async function loadPaymentMethods(){
  const options=$("paymentOptions"),message=$("paymentMessage"),proofField=$("paymentProofField"),proofInput=$("paymentProof");
  $("place").disabled=true;
  options.replaceChildren();
  try{
    const bytes=await getBytes(storageRef(storage,PAYMENT_SETTINGS_PATH),256*1024);
    const config=JSON.parse(new TextDecoder().decode(bytes));
    paymentMethods=Array.isArray(config.methods)?config.methods.filter(method=>method&&method.active!==false&&typeof method.id==="string"):[];
  }catch(error){
    if(error?.code==="storage/object-not-found"){
      try{const response=await fetch("payment-methods.json",{cache:"no-store"});if(!response.ok)throw new Error("Default payment details are unavailable.");const config=await response.json();paymentMethods=Array.isArray(config.methods)?config.methods.filter(method=>method&&method.active!==false&&typeof method.id==="string"):[];}
      catch(fallbackError){console.warn("Could not load default checkout payment methods",fallbackError);paymentMethods=[];}
    }
    else{console.warn("Could not load checkout payment methods",error);paymentConfigError=true;}
  }
  paymentConfigLoaded=true;
  if(paymentConfigError){message.textContent="Payment details could not load. Please refresh the page before placing an order.";proofField.hidden=true;proofInput.required=false;render();return;}
  if(!paymentMethods.length){
    message.textContent="WH Mobile will confirm payment arrangements after receiving your order. Please wait for confirmation before transferring.";
    proofField.hidden=true;proofInput.required=false;render();return;
  }
  message.textContent="Choose a payment method. After transferring, upload your payment screenshot to submit the order.";
  proofField.hidden=false;proofInput.required=true;
  for(const method of paymentMethods){
    const label=document.createElement("label");label.className="payment-option";
    const radio=document.createElement("input");radio.type="radio";radio.name="paymentMethod";radio.value=method.id;radio.required=true;
    const details=document.createElement("span");details.className="payment-option-body";
    const heading=document.createElement("span");heading.className="payment-option-heading";
    const logo=paymentLogoFor(method);
    if(logo){const image=document.createElement("img");image.className="payment-option-logo";image.alt=logo.alt+" logo";image.src=logo.url;image.referrerPolicy="no-referrer";image.loading="lazy";heading.append(image)}
    const title=document.createElement("strong");title.textContent=method.name||"Payment method";heading.append(title);details.append(heading);
    if(method.accountName){const account=document.createElement("span");account.className="payment-account";account.textContent="Account name: "+method.accountName;details.append(account)}
    if(method.accountNumber){const number=document.createElement("span");number.className="payment-account";number.textContent="Account / phone: "+method.accountNumber;details.append(number)}
    if(method.instructions){const note=document.createElement("span");note.className="payment-proof-help";note.textContent=method.instructions;details.append(note)}
    if(method.qrPath||method.qrUrl||method.qrDataUrl){
      try{const image=document.createElement("img");image.alt=(method.name||"Payment")+" QR code";image.src=method.qrDataUrl||method.qrUrl||(await getDownloadURL(storageRef(storage,method.qrPath)));details.append(image)}
      catch{const unavailable=document.createElement("span");unavailable.className="payment-proof-help";unavailable.textContent="QR image unavailable.";details.append(unavailable)}
    }
    label.append(radio,details);options.append(label);
  }
  render();
}
$("paymentProof").addEventListener("change",event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>MAX_PROOF_BYTES){
    event.target.value="";
    $("message").textContent="Choose a JPG, PNG or WebP image no larger than 5 MB.";
  }else $("message").textContent="";
});

onAuthStateChanged(auth,async currentUser=>{
  user=currentUser;
  $("authNote").textContent=user?"Signed in as "+(user.email||user.displayName||"customer"):"Please sign in or create an account before checkout.";
  if(user){
    $("authNote").innerHTML='Signed in · <a href="account.html">Manage account details</a>';
    try{const snap=await getDoc(doc(db,"customers",user.uid));if(snap.exists()){const d=snap.data();$("fullName").value=d.name||user.displayName||"";$("phone").value=d.phone||"";$("address").value=d.deliveryAddress||""}}catch(error){console.warn(error)}
  }
  render();
});

$("checkout").addEventListener("submit",async event=>{
  event.preventDefault();
  if(!user){location.href="login.html?next=cart.html";return}
  if(!cart.length)return;
  const name=$("fullName").value.trim(),phone=$("phone").value.trim(),delivery=$("delivery").value;
  const contactChannel=$("contactChannel").value,telegramUsername=$("telegramUsername").value.trim();
  const enteredAddress=$("address").value.trim(),address=delivery==="pickup"?"Store pickup":enteredAddress;
  if(!name||!phone||(delivery!=="pickup"&&!address)||(contactChannel==="telegram"&&!telegramUsername))return;
  const selectedId=document.querySelector('input[name="paymentMethod"]:checked')?.value||"";
  const selectedMethod=paymentMethods.find(method=>method.id===selectedId)||null;
  const proofFile=$("paymentProof").files?.[0]||null;
  if(paymentMethods.length&&!selectedMethod){$("message").textContent="Choose a payment method.";return}
  if(paymentMethods.length&&!proofFile){$("message").textContent="Upload the payment screenshot before placing the order.";return}
  if(proofFile&&(!["image/jpeg","image/png","image/webp"].includes(proofFile.type)||proofFile.size>MAX_PROOF_BYTES)){$("message").textContent="Choose a JPG, PNG or WebP image no larger than 5 MB.";return}
  const btn=$("place");btn.disabled=true;btn.textContent="Placing order…";$("message").textContent="";
  try{
    const items=cart.map(product=>({productId:String(product.id),name:String(product.name),price:Number(product.price),quantity:Number(product.qty),image:String(product.image||"")}));
    const total=items.reduce((sum,product)=>sum+product.price*product.quantity,0);
    const orderRef=doc(collection(db,"orders"));
    let paymentProofPath="";
    if(proofFile){
      paymentProofPath="payment-proofs/"+user.uid+"/"+orderRef.id+"/proof";
      await uploadBytes(storageRef(storage,paymentProofPath),proofFile,{contentType:proofFile.type});
    }
    const customerUpdate={userId:user.uid,name,phone,updatedAt:serverTimestamp()};
    if(delivery!=="pickup")customerUpdate.deliveryAddress=address;
    try{await setDoc(doc(db,"customers",user.uid),customerUpdate,{merge:true})}catch(error){console.warn("Could not update saved customer details",error)}
    await setDoc(orderRef,{
      userId:user.uid,customerName:name,phone,deliveryAddress:address,deliveryMethod:delivery,contactChannel,telegramUsername,
      notes:$("notes").value.trim(),items,total,currency:"MMK",status:"pending",
      paymentMethodId:selectedMethod?.id||"",paymentMethodName:selectedMethod?.name||"",
      paymentStatus:proofFile?"proof_submitted":"awaiting_confirmation",
      paymentProofPath,paymentProofContentType:proofFile?.type||"",paymentProofSubmittedAt:proofFile?serverTimestamp():null,
      createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    });
    localStorage.removeItem("wh-cart");cart=[];location.href="track-orders.html?order="+encodeURIComponent(orderRef.id);
  }catch(error){
    console.error(error);$("message").textContent="We couldn't place your order. Please try again or contact WH Mobile.";
    btn.disabled=false;btn.textContent="Place order";
  }
});

render();
loadPaymentMethods();

