import { createServerFn } from '@tanstack/react-start';
import type { PublicPageInfo, PublicPageKind } from './page-seo';

export const getPublicPageInfo = createServerFn({ method: 'GET' })
  .inputValidator((input: { kind: PublicPageKind; id: string }) => {
    if (!['course', 'enrollment', 'teacher', 'instructor'].includes(input.kind) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)) throw new Error('Invalid public page');
    return input;
  })
  .handler(async ({ data }): Promise<PublicPageInfo> => {
    const { readPublicPageInfo } = await import('./page-seo.server');
    return readPublicPageInfo(data.kind, data.id);
  });