import Stripe from "stripe";
import { db } from "./firebaseAdmin.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const PRICE_TO_TIER = {
  [process.env.STRIPE_PRICE_PLUS]: "plus",
  [process.env.STRIPE_PRICE_PRO]: "pro",
};

// Creates a Stripe Checkout session for a tier upgrade. The frontend calls
// this, then redirects the browser to the returned URL - Stripe hosts the
// actual payment form, so card data never touches this app's code at all.
export async function createCheckoutSession(req, res) {
  if (!stripe) return res.status(503).json({ error: "Stripe is not configured on this server." });
  try {
    const { uid, tier } = req.body;
    if (!uid || !tier) return res.status(400).json({ error: "uid and tier are required" });

    const priceId = tier === "plus" ? process.env.STRIPE_PRICE_PLUS : tier === "pro" ? process.env.STRIPE_PRICE_PRO : null;
    if (!priceId) return res.status(400).json({ error: "Unknown tier - expected 'plus' or 'pro'" });

    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });
    const user = userSnap.data();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      // uid travels through Stripe and comes back on the webhook event so
      // we know which Firestore user to upgrade once payment is confirmed -
      // this is the link between "someone paid" and "which account gets it".
      client_reference_id: uid,
      success_url: `${process.env.CLIENT_URL}/tiers?checkout=success`,
      cancel_url: `${process.env.CLIENT_URL}/tiers?checkout=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("createCheckoutSession error:", err);
    return res.status(500).json({ error: "Could not start checkout" });
  }
}

// Stripe calls this after payment events happen. This is the ONLY place a
// user's tier gets upgraded to a paid plan - Firestore rules block clients
// from writing their own tier field, so this webhook (using the Admin SDK)
// is the sole trusted path. This closes the gap flagged earlier: "anyone
// could theoretically set their own tier in Firestore."
export async function handleStripeWebhook(req, res) {
  if (!stripe) return res.status(503).json({ error: "Stripe is not configured on this server." });
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    // req.body must be the raw buffer here (see index.js - this route uses
    // express.raw()), required for Stripe's signature verification.
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const uid = session.client_reference_id;
    const priceId = session?.line_items?.data?.[0]?.price?.id;

    // line_items isn't expanded by default on the webhook payload, so fetch
    // the subscription to find which price was actually purchased.
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const purchasedPriceId = subscription.items.data[0].price.id;
    const tier = PRICE_TO_TIER[purchasedPriceId];

    if (uid && tier) {
      await db.collection("users").doc(uid).update({
        tier,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
      });
      console.log(`Upgraded user ${uid} to ${tier} after confirmed payment`);
    } else {
      console.warn("Checkout completed but could not resolve uid/tier", { uid, purchasedPriceId });
    }
  }

  // When a subscription is cancelled or payment fails repeatedly, downgrade
  // back to free so access doesn't stay unlocked after someone stops paying.
  if (event.type === "customer.subscription.deleted" || event.type === "invoice.payment_failed") {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    const snap = await db.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get();
    if (!snap.empty) {
      await snap.docs[0].ref.update({ tier: "free" });
      console.log(`Downgraded customer ${customerId} to free after ${event.type}`);
    }
  }

  return res.status(200).json({ received: true });
}
