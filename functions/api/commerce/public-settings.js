import { getCommerceSettings, json } from "../catalog/_shared.js";

export async function onRequestGet({ env }) {
  try {
    const settings = await getCommerceSettings(env);
    return json({
      settings: settings ? {
        shop_name: settings.shop_name,
        allowed_countries: settings.allowed_countries,
        standard_rate_name: settings.standard_rate_name,
        express_enabled: settings.express_enabled,
        express_rate_name: settings.express_rate_name,
      } : null,
    });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
