
const PHYLOPIC_API = 'https://api.phylopic.org';

export interface PhyloPicImage {
  taxonName: string;
  imageUrl: string;
  imagePageUrl: string | null;
  build: string;
}

interface ApiLink {
  href?: string;
  url?: string;
}

interface ApiNode {
  name?: string;
  uuid?: string;
  _links?: {
    self?: ApiLink | string;
    items?: Array<ApiLink | string>;
    primaryImage?: ApiLink | string;
  };
  _embedded?: {
    items?: ApiNode[];
    primaryImage?: ApiPrimaryImage;
  };
  primaryImage?: ApiPrimaryImage;
}

interface ApiPrimaryImage {
  _links?: {
    self?: ApiLink | string;
    vectorFile?: ApiLink | string;
    rasterFiles?: Array<ApiLink | string>;
    sourceFile?: ApiLink | string;
  };
}

interface ApiIndex {
  build?: string | number;
}

function getHref(link: ApiLink | string | undefined): string | null {
  if (!link) return null;
  if (typeof link === 'string') return link;
  return link.href || link.url || null;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.phylopic.v2+json',
    },
  });

  if (!response.ok) {
    throw new Error(`PhyloPic API returned HTTP ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

let buildPromise: Promise<string> | null = null;

async function getApiBuild(): Promise<string> {
  if (!buildPromise) {
    buildPromise = getJson<ApiIndex>(PHYLOPIC_API)
      .then((index) => {
        if (index.build === undefined || index.build === null) {
          throw new Error('PhyloPic did not provide an API build.');
        }

        return String(index.build);
      })
      .catch((error: unknown) => {
        buildPromise = null;
        throw error;
      });
  }

  return buildPromise;
}

function makeApiUrl(
  path: string,
  build: string,
  parameters: Record<string, string> = {},
): string {
  const url = new URL(path, PHYLOPIC_API);
  url.searchParams.set('build', build);

  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value);
  }

  return url.href;
}

function getSearchItems(data: ApiNode): Array<ApiNode | ApiLink | string> {
  if (data._embedded?.items) {
    return data._embedded.items;
  }

  return data._links?.items || [];
}

async function searchNodes(
  name: string,
  build: string,
): Promise<Array<ApiNode | ApiLink | string>> {
  const url = makeApiUrl('/nodes', build, {
    filter_name: name.trim().toLowerCase(),
    page: '0',
  });

  try {
    const data = await getJson<ApiNode>(url);
    return getSearchItems(data);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('HTTP 404')
    ) {
      // Some searches return 404 when there are no direct matches.
      return [];
    }

    throw error;
  }
}

export async function findPhyloPicImage(
  scientificName: string,
): Promise<PhyloPicImage | null> {
  const query = scientificName.trim();
  if (!query) return null;

  const build = await getApiBuild();
  const items = await searchNodes(query, build);
  const firstItem = items[0];

  if (!firstItem) return null;

  const nodeHref = typeof firstItem === 'string'
    ? firstItem
    : 'href' in firstItem || 'url' in firstItem
      ? getHref(firstItem as ApiLink)
      : getHref((firstItem as ApiNode)._links?.self);

  if (!nodeHref) {
    throw new Error('PhyloPic search returned a result without a node URL.');
  }

  const nodeUrl = new URL(nodeHref, PHYLOPIC_API);
  nodeUrl.searchParams.set('build', build);
  nodeUrl.searchParams.set('embed_primaryImage', 'true');

  const node = await getJson<ApiNode>(nodeUrl.href);

  let primaryImage =
    node._embedded?.primaryImage ||
    node.primaryImage ||
    null;

  if (!primaryImage) {
    const primaryImageHref = getHref(node._links?.primaryImage);

    if (primaryImageHref) {
      const imageUrl = new URL(primaryImageHref, PHYLOPIC_API);
      imageUrl.searchParams.set('build', build);
      primaryImage = await getJson<ApiPrimaryImage>(imageUrl.href);
    }
  }

  if (!primaryImage) return null;

  const vectorUrl = getHref(primaryImage._links?.vectorFile);
  const rasterUrl = (primaryImage._links?.rasterFiles || [])
    .map(getHref)
    .find((url): url is string => Boolean(url));

  const imageUrl =
    vectorUrl ||
    rasterUrl ||
    getHref(primaryImage._links?.sourceFile);

  if (!imageUrl) return null;

  return {
    taxonName: node.name || query,
    imageUrl: new URL(imageUrl, PHYLOPIC_API).href,
    imagePageUrl: getHref(primaryImage._links?.self),
    build,
  };
}
