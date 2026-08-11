import { getCommerceSettings, json, readJson, requireAdmin, supabaseFetch } from "../catalog/_shared.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function createToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function getSiteUrl(env) {
  return String(env.PUBLIC_SITE_URL || "https://shkeeno.com").replace(/\/+$/, "");
}

function buildProductUrl(siteUrl, slug) {
  return `${String(siteUrl || "https://shkeeno.com").replace(/\/+$/, "")}/shop/${slug}`;
}

function buildBrandLogoUrl(siteUrl) {
  return `${String(siteUrl || "https://shkeeno.com").replace(/\/+$/, "")}/api/brand/logo`;
}

export function getNewsletterEnv(env) {
  const resendApiKey = env.RESEND_API_KEY || "";
  const fromEmail = env.NEWSLETTER_FROM_EMAIL || env.ORDER_FROM_EMAIL || "";

  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  if (!fromEmail) {
    throw new Error("Missing newsletter sender email configuration.");
  }

  return { resendApiKey, fromEmail };
}

export async function sendEmail(env, payload) {
  const { resendApiKey } = getNewsletterEnv(env);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function getNewsletterSettings(env) {
  const settings = await getCommerceSettings(env);
  const siteUrl = getSiteUrl(env);
  return {
    siteUrl,
    brandName: settings?.brand_name || "Shkeeno",
    brandWordmark: settings?.brand_wordmark || "SHKEENO",
    brandSvg: settings?.brand_svg || "",
    brandLogoUrl: buildBrandLogoUrl(siteUrl),
    supportEmail: settings?.support_email || env.ORDER_SUPPORT_EMAIL || "",
    newsletterEnabled: settings?.newsletter_enabled !== false,
    senderName: settings?.newsletter_sender_name || settings?.brand_name || "Shkeeno",
    replyToEmail: settings?.newsletter_reply_to_email || settings?.support_email || env.ORDER_SUPPORT_EMAIL || "",
    confirmSubject: settings?.newsletter_confirm_subject || "Confirm your Shkeeno subscription",
    digestSubject: settings?.newsletter_digest_subject || "New products designed with intention",
    digestIntro: settings?.newsletter_digest_intro || "A few new additions designed with intention.",
    autoSendEnabled: settings?.newsletter_auto_send_enabled !== false,
    scheduleWeekday: Number(settings?.newsletter_schedule_weekday ?? 1),
    scheduleHourUtc: Number(settings?.newsletter_schedule_hour_utc ?? 9),
    lastCampaignSentAt: settings?.newsletter_last_campaign_sent_at || null,
  };
}

function renderBrandLockup(settings, color) {
  if (settings.brandLogoUrl) {
    return `
      <img
        src="${settings.brandLogoUrl}"
        alt="${escapeHtml(settings.brandName)}"
        width="180"
        style="display:block;width:180px;max-width:100%;height:auto;border:0;"
      />
    `;
  }

  return `
    <div style="font-family:Arial Black,Arial,sans-serif;font-size:32px;font-weight:900;letter-spacing:0;line-height:0.9;color:${color};text-transform:uppercase;">
      ${escapeHtml(settings.brandWordmark)}
    </div>
  `;
}

function renderEmailShell(settings, { eyebrow = "Shkeeno", title, intro = "", body, ctaLabel = "", ctaHref = "" }) {
  const cta = ctaLabel && ctaHref
    ? `
      <p style="margin:26px 0 0;">
        <a href="${ctaHref}" style="display:inline-block;background:#202020;color:#f3f0e8;padding:14px 18px;text-decoration:none;font:700 13px Arial,sans-serif;text-transform:uppercase;">${escapeHtml(ctaLabel)}</a>
      </p>
    `
    : "";

  return `
    <div style="margin:0;background:#f3f0e8;padding:0;color:#202020;">
      <div style="max-width:640px;margin:0 auto;padding:28px 20px 36px;font-family:Arial,sans-serif;color:#202020;">
        <div style="padding:0 0 22px;border-bottom:2px solid #202020;">
          ${renderBrandLockup(settings, "#202020")}
        </div>
        <p style="margin:22px 0 12px;font:700 12px Arial,sans-serif;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(eyebrow)}</p>
        <h1 style="margin:0 0 16px;font:800 34px/0.95 Arial,sans-serif;">${escapeHtml(title)}</h1>
        ${intro ? `<p style="margin:0 0 18px;font:400 18px/1.5 Arial,sans-serif;">${escapeHtml(intro)}</p>` : ""}
        <div style="font:400 15px/1.7 Arial,sans-serif;color:#202020;">
          ${body}
        </div>
        ${cta}
      </div>
    </div>
  `;
}

function confirmationEmailHtml(settings, confirmUrl, unsubscribeUrl) {
  return renderEmailShell(settings, {
    eyebrow: "Newsletter / confirm",
    title: "Confirm your subscription.",
    intro: "One click and you are in. We only send when new products are worth your attention.",
    body: `
      <p style="margin:0 0 18px;">We add products selectively and send a weekly digest only when there is something new designed with intention.</p>
      <p style="margin:0 0 18px;">Please confirm that you want these emails.</p>
      <p style="margin:0;">
        <a href="${confirmUrl}" style="display:inline-block;background:#202020;color:#f3f0e8;padding:14px 18px;text-decoration:none;font:700 13px Arial,sans-serif;text-transform:uppercase;">Confirm subscription</a>
      </p>
      <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#555;">
        If you did not request this, you can ignore this email or <a href="${unsubscribeUrl}" style="color:#202020;text-decoration:underline;">unsubscribe here</a>.
      </p>
    `,
  });
}

function digestEmailHtml(settings, products, unsubscribeUrl) {
  const productList = products.map((product) => {
    const image = product.product_images?.[0]?.url || product.image_url || "";
    const price = `£${(Number(product.price_gbp || 0) / 100).toFixed(2)}`;
    const href = buildProductUrl(settings.siteUrl, product.slug);

    return `
      <tr>
        <td style="padding:0 0 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:2px solid #202020;background:#f3f0e8;">
            <tr>
              <td style="padding:14px;">
                ${image ? `<img src="${image}" alt="${escapeHtml(product.name)}" style="display:block;width:100%;height:auto;border:0;background:#d8ccba;" />` : `<div style="width:100%;aspect-ratio:1;background:#d8ccba;"></div>`}
              </td>
            </tr>
            <tr>
              <td style="padding:0 14px 16px;">
                <p style="margin:0 0 8px;font:700 12px Arial,sans-serif;text-transform:uppercase;">${escapeHtml(price)}</p>
                <h2 style="margin:0 0 10px;font:800 28px/0.95 Arial,sans-serif;">${escapeHtml(product.name)}</h2>
                <p style="margin:0 0 14px;font:400 15px/1.6 Arial,sans-serif;">${escapeHtml(product.short_description || "")}</p>
                <a href="${href}" style="display:inline-block;background:#202020;color:#f3f0e8;padding:12px 16px;text-decoration:none;font:700 13px Arial,sans-serif;text-transform:uppercase;">View product</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join("");

  return renderEmailShell(settings, {
    eyebrow: "Shkeeno / weekly digest",
    title: settings.digestSubject,
    intro: settings.digestIntro,
    body: `
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:6px;">
        ${productList}
      </table>
      <p style="margin:6px 0 0;font-size:13px;line-height:1.6;color:#555;">
        You are receiving this because you confirmed the Shkeeno newsletter.
        <a href="${unsubscribeUrl}" style="color:#202020;text-decoration:underline;">Unsubscribe</a>.
      </p>
    `,
  });
}

async function findSubscriberBy(column, value, env) {
  const response = await supabaseFetch(
    env,
    `/newsletter_subscribers?${column}=eq.${encodeURIComponent(value)}&select=*&limit=1`,
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = await response.json();
  return rows[0] || null;
}

export async function upsertPendingSubscriber(env, { email, source = "footer" }) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await findSubscriberBy("normalized_email", normalizedEmail, env);
  const now = new Date().toISOString();
  const confirmToken = createToken();
  const base = {
    email: String(email || "").trim(),
    normalized_email: normalizedEmail,
    status: "pending",
    source,
    confirm_token: confirmToken,
    updated_at: now,
  };

  if (existing) {
    if (existing.status === "subscribed") {
      return { ...existing, alreadySubscribed: true };
    }

    const update = {
      ...base,
      unsubscribe_token: existing.unsubscribe_token || createToken(),
      unsubscribed_at: null,
    };

    if (existing.status === "pending") {
      update.confirmed_at = null;
    }

    const response = await supabaseFetch(
      env,
      `/newsletter_subscribers?normalized_email=eq.${encodeURIComponent(normalizedEmail)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(update),
      },
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const [subscriber] = await response.json();
    return {
      ...subscriber,
      resentConfirmation: existing.status === "pending",
      reactivatedSubscription: existing.status === "unsubscribed",
    };
  }

  const createResponse = await supabaseFetch(env, "/newsletter_subscribers", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      ...base,
      unsubscribe_token: createToken(),
      created_at: now,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(await createResponse.text());
  }

  const [subscriber] = await createResponse.json();
  return { ...subscriber, isNewSubscriber: true };
}

export async function confirmSubscriber(env, token) {
  const subscriber = await findSubscriberBy("confirm_token", token, env);
  if (!subscriber) {
    throw new Error("This confirmation link is invalid or expired.");
  }

  if (subscriber.status === "subscribed") {
    return { ...subscriber, alreadyConfirmed: true };
  }

  const now = new Date().toISOString();
  const response = await supabaseFetch(
    env,
    `/newsletter_subscribers?id=eq.${encodeURIComponent(subscriber.id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "subscribed",
        confirmed_at: subscriber.confirmed_at || now,
        unsubscribed_at: null,
        updated_at: now,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const [updated] = await response.json();
  return updated;
}

export async function unsubscribeSubscriber(env, token) {
  const subscriber = await findSubscriberBy("unsubscribe_token", token, env);
  if (!subscriber) {
    throw new Error("This unsubscribe link is invalid or expired.");
  }

  if (subscriber.status === "unsubscribed") {
    return { ...subscriber, alreadyUnsubscribed: true };
  }

  const now = new Date().toISOString();
  const response = await supabaseFetch(
    env,
    `/newsletter_subscribers?id=eq.${encodeURIComponent(subscriber.id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "unsubscribed",
        unsubscribed_at: now,
        updated_at: now,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const [updated] = await response.json();
  return updated;
}

export async function sendConfirmationEmail(env, subscriber) {
  const settings = await getNewsletterSettings(env);
  const { fromEmail } = getNewsletterEnv(env);
  const siteUrl = getSiteUrl(env);
  const confirmUrl = `${siteUrl}/newsletter/confirm?token=${encodeURIComponent(subscriber.confirm_token)}`;
  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`;

  return sendEmail(env, {
    from: `${settings.senderName} <${fromEmail}>`,
    to: [subscriber.email],
    subject: settings.confirmSubject,
    html: confirmationEmailHtml(settings, confirmUrl, unsubscribeUrl),
    ...(settings.replyToEmail ? { reply_to: settings.replyToEmail } : {}),
  });
}

export async function getAudienceCounts(env) {
  const response = await supabaseFetch(
    env,
    "/newsletter_subscribers?select=status,confirmed_at,created_at,unsubscribed_at",
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = await response.json();
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  return rows.reduce((acc, row) => {
    acc.total += 1;
    if (row.status === "subscribed") acc.subscribed += 1;
    if (row.status === "pending") acc.pending += 1;
    if (row.status === "unsubscribed") acc.unsubscribed += 1;
    if (row.created_at && new Date(row.created_at).getTime() >= sevenDaysAgo) acc.last7 += 1;
    return acc;
  }, {
    total: 0,
    subscribed: 0,
    pending: 0,
    unsubscribed: 0,
    last7: 0,
  });
}

export async function listRecentSubscribers(env, limit = 50) {
  const response = await supabaseFetch(
    env,
    `/newsletter_subscribers?select=id,email,status,source,confirmed_at,unsubscribed_at,created_at,last_sent_at&order=created_at.desc&limit=${limit}`,
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function listRecentCampaigns(env, limit = 20) {
  const response = await supabaseFetch(
    env,
    `/newsletter_campaigns?select=*&order=created_at.desc&limit=${limit}`,
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function listQueuedProducts(env, limit = 24) {
  const select = [
    "id",
    "slug",
    "name",
    "short_description",
    "price_gbp",
    "weight_grams",
    "include_in_newsletter",
    "newsletter_promoted_at",
    "product_images(url,sort_order)",
    "created_at",
  ].join(",");

  const response = await supabaseFetch(
    env,
    `/products?select=${encodeURIComponent(select)}&is_published=eq.true&include_in_newsletter=eq.true&newsletter_promoted_at=is.null&order=created_at.desc&limit=${limit}`,
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = await response.json();
  return rows.map((row) => ({
    ...row,
    product_images: [...(row.product_images || [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export async function listSubscribedAudience(env) {
  const response = await supabaseFetch(
    env,
    "/newsletter_subscribers?select=id,email,unsubscribe_token,last_sent_at&status=eq.subscribed&order=confirmed_at.asc",
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function createCampaign(env, settings, products, subscriberCount) {
  const now = new Date().toISOString();
  const response = await supabaseFetch(env, "/newsletter_campaigns", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      kind: "weekly_digest",
      status: "draft",
      subject: settings.digestSubject,
      intro: settings.digestIntro,
      sender_name: settings.senderName,
      subscriber_count: subscriberCount,
      product_count: products.length,
      scheduled_for: now,
      created_at: now,
      updated_at: now,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const [campaign] = await response.json();

  if (products.length > 0) {
    const snapshotRows = products.map((product, index) => ({
      campaign_id: campaign.id,
      product_id: product.id,
      product_slug: product.slug,
      product_name: product.name,
      short_description: product.short_description,
      price_gbp: product.price_gbp,
      weight_grams: product.weight_grams,
      image_url: product.product_images?.[0]?.url || null,
      sort_order: index,
    }));

    const snapshotResponse = await supabaseFetch(env, "/newsletter_campaign_products", {
      method: "POST",
      body: JSON.stringify(snapshotRows),
    });

    if (!snapshotResponse.ok) {
      throw new Error(await snapshotResponse.text());
    }
  }

  return campaign;
}

async function finalizeCampaign(env, campaignId, values) {
  const response = await supabaseFetch(env, `/newsletter_campaigns?id=eq.${encodeURIComponent(campaignId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      ...values,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const [campaign] = await response.json();
  return campaign;
}

async function markProductsPromoted(env, products, sentAt) {
  for (const product of products) {
    const response = await supabaseFetch(env, `/products?id=eq.${encodeURIComponent(product.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        newsletter_promoted_at: sentAt,
        updated_at: sentAt,
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  }
}

async function markSubscribersSent(env, subscribers, sentAt) {
  for (const subscriber of subscribers) {
    const response = await supabaseFetch(env, `/newsletter_subscribers?id=eq.${encodeURIComponent(subscriber.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        last_sent_at: sentAt,
        updated_at: sentAt,
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  }
}

function isNewsletterDue(settings, now = new Date()) {
  const weekday = Number(settings.scheduleWeekday ?? 1);
  const hour = Number(settings.scheduleHourUtc ?? 9);
  const sameWeekday = now.getUTCDay() === weekday;
  const sameHour = now.getUTCHours() === hour;

  if (!sameWeekday || !sameHour) return false;

  if (!settings.lastCampaignSentAt) return true;

  const lastSent = new Date(settings.lastCampaignSentAt);
  if (Number.isNaN(lastSent.getTime())) return true;

  return !(
    lastSent.getUTCFullYear() === now.getUTCFullYear()
    && lastSent.getUTCMonth() === now.getUTCMonth()
    && lastSent.getUTCDate() === now.getUTCDate()
    && lastSent.getUTCHours() === now.getUTCHours()
  );
}

function scheduleLabel(settings) {
  const weekday = Number(settings.scheduleWeekday ?? 1);
  const hour = Number(settings.scheduleHourUtc ?? 9);
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return `${days[weekday] || "Monday"} at ${String(hour).padStart(2, "0")}:00 UTC`;
}

export async function buildDigestPreview(env) {
  const settings = await getNewsletterSettings(env);
  const products = await listQueuedProducts(env);
  const audience = await listSubscribedAudience(env);

  return {
    settings,
    subject: settings.digestSubject,
    intro: settings.digestIntro,
    products,
    subscriberCount: audience.length,
    ready: settings.newsletterEnabled && products.length > 0 && audience.length > 0,
    autoSendEnabled: settings.autoSendEnabled,
    cadence: scheduleLabel(settings),
    lastCampaignSentAt: settings.lastCampaignSentAt,
  };
}

export async function sendWeeklyDigest(env, options = {}) {
  const force = options.force !== false;
  const preview = await buildDigestPreview(env);
  const settings = preview.settings;

  if (!preview.settings.newsletterEnabled) {
    return { ok: false, skipped: true, reason: "Newsletter is disabled." };
  }

  if (preview.products.length === 0) {
    return { ok: false, skipped: true, reason: "No queued products to send." };
  }

  if (preview.subscriberCount === 0) {
    return { ok: false, skipped: true, reason: "No subscribed audience yet." };
  }

  if (!force && !preview.settings.autoSendEnabled) {
    return { ok: false, skipped: true, reason: "Automatic sending is turned off." };
  }

  if (!force && !isNewsletterDue(preview.settings)) {
    return { ok: false, skipped: true, reason: `Digest is scheduled for ${scheduleLabel(preview.settings)}.` };
  }

  const subscribers = await listSubscribedAudience(env);
  const campaign = await createCampaign(env, preview.settings, preview.products, subscribers.length);
  const { fromEmail } = getNewsletterEnv(env);

  let sentCount = 0;
  let failedCount = 0;
  let lastError = "";
  const successfulSubscribers = [];

  for (const subscriber of subscribers) {
    try {
      const unsubscribeUrl = `${settings.siteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`;
      await sendEmail(env, {
        from: `${preview.settings.senderName} <${fromEmail}>`,
        to: [subscriber.email],
        subject: preview.settings.digestSubject,
        html: digestEmailHtml(settings, preview.products, unsubscribeUrl),
        ...(preview.settings.replyToEmail ? { reply_to: preview.settings.replyToEmail } : {}),
      });
      sentCount += 1;
      successfulSubscribers.push(subscriber);
    } catch (error) {
      failedCount += 1;
      lastError = error.message || "Newsletter send failed.";
    }
  }

  const sentAt = new Date().toISOString();
  const status = failedCount === 0 ? "sent" : sentCount > 0 ? "partial" : "failed";

  await finalizeCampaign(env, campaign.id, {
    status,
    sent_at: sentCount > 0 ? sentAt : null,
    sent_count: sentCount,
    failed_count: failedCount,
    error_message: lastError || null,
  });

  if (sentCount > 0) {
    await markProductsPromoted(env, preview.products, sentAt);
    await markSubscribersSent(env, successfulSubscribers, sentAt);
    const settingsResponse = await supabaseFetch(env, "/commerce_settings?id=eq.1", {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        newsletter_last_campaign_sent_at: sentAt,
        updated_at: sentAt,
      }),
    });

    if (!settingsResponse.ok) {
      throw new Error(await settingsResponse.text());
    }
  }

  return {
    ok: sentCount > 0,
    campaignId: campaign.id,
    status,
    sentCount,
    failedCount,
    productCount: preview.products.length,
    subscriberCount: subscribers.length,
    reason: lastError || "",
  };
}

export async function newsletterOverview(env) {
  const [settings, counts, queuedProducts, recentSubscribers, recentCampaigns] = await Promise.all([
    getNewsletterSettings(env),
    getAudienceCounts(env),
    listQueuedProducts(env, 12),
    listRecentSubscribers(env, 50),
    listRecentCampaigns(env, 20),
  ]);

  return {
    settings,
    counts,
    queuedProducts,
    recentSubscribers,
    recentCampaigns,
  };
}

export { escapeHtml, json, readJson, requireAdmin };
