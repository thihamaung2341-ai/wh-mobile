(function(){
  "use strict";
  const dialog=document.getElementById("productDetailsDialog");
  const detailContent=document.getElementById("productDetailsContent");
  const money=value=>"Ks"+Number(value||0).toLocaleString("en-US");
  function openDetails(id){
    const items=Array.isArray(window.PHONES)?window.PHONES:[];
    const item=items.find(product=>String(product.id)===String(id));
    if(!item||!dialog||!detailContent)return;
    detailContent.replaceChildren();
    const title=document.createElement("h2");title.id="productDetailsTitle";title.textContent=item.n||"Product details";
    const tags=document.createElement("p");tags.textContent=[item.brand,item.storageGb?item.storageGb+" GB":"",item.condition].filter(Boolean).join(" · ");
    const description=document.createElement("p");description.textContent=item.t||"Contact WH Mobile for more information about this item.";
    const price=document.createElement("p");price.className="dialog-price";price.textContent=money(item.p);
    const note=document.createElement("p");note.textContent=item.isDemo?"This is a sample listing. Replace its details and price with your actual inventory before launch.":"Product availability and warranty terms are confirmed by WH Mobile.";
    detailContent.append(title,tags,description,price,note);
    if(typeof dialog.showModal==="function")dialog.showModal();else dialog.setAttribute("open","");
  }
  document.addEventListener("click",event=>{
    const trigger=event.target.closest("[data-product-details]");
    if(trigger){openDetails(trigger.dataset.productDetails);return;}
    if(event.target.closest("[data-close-details]")){dialog?.close();}
  });
  dialog?.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
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
