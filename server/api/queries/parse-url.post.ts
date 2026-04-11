import { translateUrl } from '../../modules/url-translator/index';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body || !body.raw_url) {
    throw createError({ statusCode: 400, statusMessage: 'raw_url is required' });
  }

  try {
    const result = translateUrl(body.raw_url);
    return {
      valid: true,
      summary: result.summary,
      apiParams: result.apiParams
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid url'
    };
  }
});
