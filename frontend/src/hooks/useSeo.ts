import { useEffect } from 'react';

type SeoOptions = {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
};

export default function useSeo({ title, description, canonical, noindex }: SeoOptions) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);

      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', description);
      } else {
        const newOgDescription = document.createElement('meta');
        newOgDescription.setAttribute('property', 'og:description');
        newOgDescription.setAttribute('content', description);
        document.head.appendChild(newOgDescription);
      }

      const twitterDescription = document.querySelector('meta[name="twitter:description"]');
      if (twitterDescription) {
        twitterDescription.setAttribute('content', description);
      } else {
        const newTwitterDescription = document.createElement('meta');
        newTwitterDescription.setAttribute('name', 'twitter:description');
        newTwitterDescription.setAttribute('content', description);
        document.head.appendChild(newTwitterDescription);
      }
    }

    if (typeof noindex === 'boolean') {
      let robots = document.querySelector('meta[name="robots"]');
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', noindex ? 'noindex, nofollow' : 'index, follow');
    }

    if (canonical) {
      let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    if (title) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', title);
      } else {
        const newOgTitle = document.createElement('meta');
        newOgTitle.setAttribute('property', 'og:title');
        newOgTitle.setAttribute('content', title);
        document.head.appendChild(newOgTitle);
      }

      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) {
        twitterTitle.setAttribute('content', title);
      } else {
        const newTwitterTitle = document.createElement('meta');
        newTwitterTitle.setAttribute('name', 'twitter:title');
        newTwitterTitle.setAttribute('content', title);
        document.head.appendChild(newTwitterTitle);
      }
    }
  }, [title, description, canonical, noindex]);
}
