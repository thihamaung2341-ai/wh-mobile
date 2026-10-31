# WH Mobile Firebase database setup

This repository now has a Firestore starter integration for products and customer bookings.

## 1. Enable Firestore
1. Open https://console.firebase.google.com/ and select the **wh-mobile** project.
2. Open **Build → Firestore Database**.
3. Click **Create database** and choose Production mode.
4. Choose a database region close to your customers. The region cannot easily be changed later.

## 2. Set the store administrator UID
1. Open **Build → Authentication → Users**.
2. Register your own store-owner account through the website.
3. Copy that account's **UID** (not its email or password).
4. In `admin.js`, replace `REPLACE_WITH_YOUR_FIREBASE_AUTH_UID` in `ADMIN_UID` with the UID.
5. In `firestore.rules`, replace the same placeholder with that exact UID.
6. In Firebase Console → Firestore Database → Rules, paste the complete contents of `firestore.rules` and click **Publish**.

Do not publish the rules with the placeholder unchanged: admin access will remain locked. Never put a password or service-account private key in GitHub.

## 3. Use the admin dashboard
Visit `https://thihamaung2341-ai.github.io/wh-mobile/admin.html`, sign in with the owner account, and add products. Product fields are name, category, price, stock and description. Active products appear on the homepage after Firestore has products.

## 4. Customer flow
Signed-in customers can submit phone reservations and repair bookings from the homepage. The requests are saved in the `bookings` collection with status `pending`. The admin dashboard can change status to confirmed, in progress, completed or cancelled.

## Collections
- `products`: public active catalog; writes restricted to admin.
- `bookings`: customer reservation and repair requests; customers create/read their own, admin manages all.
- `customers`: reserved for private customer profile data; owner/admin only.

## Important limitations / next steps
- The existing sample catalog remains visible until at least one active product is added in the admin dashboard.
- The homepage currently has product cards and booking records, not a payment checkout. Do not store card numbers or payment credentials in Firestore.
- This is a starter shop-management workflow. Before public launch, test rules with separate customer and admin accounts and add spam protection / App Check.
