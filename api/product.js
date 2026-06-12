export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  // Extract product ID from the path (e.g. /shop/product/18)
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1] === '' ? segments[segments.length - 2] : segments[segments.length - 1];

  // Fetch the actual index.html from the root to inject into
  let html = '<!DOCTYPE html><html><head></head><body></body></html>';
  try {
    const htmlRes = await fetch(new URL('/', req.url));
    if (htmlRes.ok) {
      html = await htmlRes.text();
    }
  } catch (err) {
    console.error('Failed to fetch base HTML:', err);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && id && html.includes('</head>')) {
    try {
      const dbUrl = `${supabaseUrl}/rest/v1/products?id=eq.${id}&select=*,product_variants(*)`;
      const dbRes = await fetch(dbUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const data = await dbRes.json();

      if (data && data.length > 0) {
        const product = data[0];
        const title = `${product.name} - Spark Stage`;
        const description = product.description || 'Exclusive items at Spark Stage Shop';
        const imageUrl = product.image_url;
        let price = 0;
        
        if (product.product_variants && product.product_variants.length > 0) {
          price = product.product_variants[0].price;
        }

        const metaTags = `
          <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
          <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
          <meta property="og:image" content="${imageUrl}" />
          <meta property="og:url" content="${url.href}" />
          <meta property="og:type" content="product" />
          <meta property="product:brand" content="Spark Stage" />
          <meta property="product:availability" content="in stock" />
          <meta property="product:price:amount" content="${price}" />
          <meta property="product:price:currency" content="IDR" />
        `;

        html = html.replace('</head>', `${metaTags}\n</head>`);
      }
    } catch (dbErr) {
      console.error('Failed to fetch product data:', dbErr);
    }
  }

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  });
}
