import { auth, db } from "./firebase-config.js";
import {
  collection, getDocs, query, where, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const form = document.getElementById("f");
const grid = document.getElementById("grid");

// Replace sample products with active products from Firestore when products exist.
async function loadProducts() {
  if (!grid || !Array.isArray(window.PHONES)) return;
  try {
    const snap = await getDocs(query(collection(db, "products"), where("active", "==", true)));
    if (snap.empty) return; // Keep the existing sample catalog until products are added.
    window.PHONES = snap.docs.map(d => {
      const p = d.data();
      return {
        id: d.id,
        n: String(p.name || "Unnamed product"),
        p: Number(p.price || 0),
        c: String(p.category || "Other"),
        t: String(p.description || (Number(p.stock || 0) + " in stock")),
        i: String(p.imageUrl || "")
      };
    });
    window.cats = ["All"].concat([...new Set(window.PHONES.map(p => p.c))]);
    window.cur = "All";
    if (typeof window.render === "function") window.render();
    if (typeof window.setMode === "function") window.setMode("reserve");
  } catch (error) {
    console.error("Could not load Firestore products:", error);
  }
}

// Save phone reservations and repair bookings to Firestore.
if (form) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const user = auth.currentUser;
    const output = document.getElementById("out");
    const value = id => document.getElementById(id)?.value?.trim() || "";
    if (!user) {
      output.style.display = "block";
      output.textContent = "Please log in before submitting a reservation or repair booking.";
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Saving…";

    try {
      const isRepair = document.querySelector(".tabs .chip.on")?.dataset.t === "repair";
      const record = {
        userId: user.uid,
        customerName: value("n"),
        phone: value("p"),
        type: isRepair ? "repair" : "reservation",
        item: value("s"),
        preferredAt: value("d") || null,
        notes: value("m"),
        status: "pending",
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, "bookings"), record);
      output.style.display = "block";
      output.textContent = "Your request has been saved successfully. WH Mobile will contact you to confirm it.";
      form.reset();
    } catch (error) {
      console.error("Booking save failed:", error);
      output.style.display = "block";
      output.textContent = "We couldn't save your request. Please check your connection or try again later.";
    } finally {
      submit.disabled = false;
      submit.textContent = "Submit request";
    }
  }, true);
}

onAuthStateChanged(auth, user => {
  if (!user && form) {
    const note = document.createElement("p");
    note.className = "sub";
    note.textContent = "Log in to submit a reservation or repair booking.";
    form.prepend(note);
  }
});

loadProducts();
