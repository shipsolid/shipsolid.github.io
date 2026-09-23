import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { BLOG_CATEGORY_LABELS } from '../lib/blog-categories';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: 'Amit Singh — Blog',
    description:
      'Practitioner-level posts on observability, SRE, platform engineering, and distributed systems.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`,
      categories: [BLOG_CATEGORY_LABELS[post.data.category]],
    })),
    customData: `<language>en-us</language>`,
  });
}
