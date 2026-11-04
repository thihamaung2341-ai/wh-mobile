(function(){
  "use strict";
  const date=document.getElementById("d");
  if(date){const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());date.min=now.toISOString().slice(0,16);}
  function updateCartBadges(){
    let cart=[];try{cart=JSON.parse(localStorage.getItem("wh-cart")||"[]")}catch{}
    const count=cart.reduce((sum,item)=>sum+Math.max(0,Number(item.qty)||0),0);
    document.querySelectorAll("#cartCountTop,#catalogCartCount").forEach(node=>node.textContent=count);
  }
  window.addEventListener("storage",event=>{if(event.key==="wh-cart")updateCartBadges();});
  updateCartBadges();
})();
