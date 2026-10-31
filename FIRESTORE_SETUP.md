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


## 5. Enable Firebase Storage for product photos
1. In Firebase Console, open **Build → Storage** (or https://console.firebase.google.com/project/wh-mobile/storage).
2. Click **Get started** and create the default Storage bucket. Choose a region close to your Firestore region when prompted.
3. Open the Storage **Rules** tab.
4. Copy the complete contents of the repository's `storage.rules` file into the editor and click **Publish**.
5. Wait for the bucket to finish provisioning, then reload `admin.html`.

The admin form accepts JPG, PNG and WebP photos up to 5 MB. Photos are stored in the `products/{productId}/` folder and their download URL is saved with the product document in Firestore. The storefront displays the saved photo automatically. Existing products can also have photos added or replaced from the Products & inventory list.

Storage may require enabling billing depending on your Firebase project's current Storage plan and bucket eligibility. Follow the Firebase Console prompts; do not enter payment information unless you and the account owner have reviewed the plan and charges.

## 6. Telegram booking notifications

The backend includes a Firestore trigger that sends a Telegram message when a new reservation or repair booking is saved. It includes the customer's name and phone number, the requested item, preferred time, notes, and booking status. It sends new submissions only; existing bookings are not replayed.

### Create a Telegram bot

1. In Telegram, open **@BotFather**, send `/newbot`, and follow its prompts.
2. Keep the bot token private. Do not paste it into GitHub, the website, or this chat.
3. Open your new bot and send it `/start` so it is allowed to message you.
4. Get your numeric Telegram user ID from **@userinfobot**. For a private chat with your own bot, this is the chat ID.

### Store the credentials and deploy

From a local copy of this repository, install the Firebase CLI if needed, then run these commands from the repository folder:

```sh
firebase login
firebase functions:secrets:set TELEGRAM_BOT_TOKEN --project wh-mobile
firebase functions:secrets:set TELEGRAM_CHAT_ID --project wh-mobile
firebase deploy --only functions:notifyBooking --project wh-mobile
```

The secret commands prompt for their values and store them in Google Secret Manager. Enter the bot token and chat ID there; do not add them to a file or share them in chat. After deployment, submit a test reservation from a customer account to confirm the message arrives.

**Billing:** Deploying Firebase Cloud Functions requires the Firebase project to use the pay-as-you-go **Blaze** plan. Linking billing enables usage-based charges; review the Firebase pricing and configure budget alerts before upgrading. Secret Manager and function deployment/build resources may also have charges. The code is committed, but the bot will not send messages until the bot, secrets, billing plan, and function deployment are set up.

