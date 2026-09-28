import { escapeHtml, textToHtml } from '../mail/email-html';

type Email = { subject: string; text: string; html: string };

function storyCmsUrl(siteUrl: string, articleId: string) {
  return `${siteUrl}/cms/stories/${articleId}`;
}

export function reviewSubmittedAdminAlert(opts: {
  articleId: string;
  title: string;
  authorName: string | null;
  siteUrl: string;
}): Email {
  const url = storyCmsUrl(opts.siteUrl, opts.articleId);
  const author = opts.authorName || 'An author';
  return {
    subject: `[Prizni] Story submitted for review: ${opts.title}`,
    text: [
      `${author} submitted a story for review.`,
      '',
      opts.title,
      '',
      `Review and publish: ${url}`,
    ].join('\n'),
    html: `
      <p><strong>${escapeHtml(author)}</strong> submitted a story for review.</p>
      <p><strong>${escapeHtml(opts.title)}</strong></p>
      <p><a href="${url}">Review and publish in the CMS</a></p>
    `,
  };
}

export function changesRequestedEmail(opts: {
  articleId: string;
  title: string;
  recipientName: string;
  note: string;
  siteUrl: string;
}): Email {
  const url = storyCmsUrl(opts.siteUrl, opts.articleId);
  const name = escapeHtml(opts.recipientName);
  const title = escapeHtml(opts.title);
  return {
    subject: `Prizni · ${opts.title}`,
    text: [
      `Здравейте, ${opts.recipientName},`,
      '',
      `Редакцията върна историята ви „${opts.title}“ с бележка:`,
      '',
      opts.note,
      '',
      `Редактирайте и я изпратете отново за преглед: ${url}`,
      '',
      '---',
      '',
      `Hello ${opts.recipientName},`,
      '',
      `The editors sent your story “${opts.title}” back with a note:`,
      '',
      opts.note,
      '',
      `Edit it and submit it for review again: ${url}`,
      '',
      '— Prizni',
    ].join('\n'),
    html: `
      <p>Здравейте, ${name},</p>
      <p>Редакцията върна историята ви „${title}“ с бележка:</p>
      <blockquote style="border-left:3px solid #0C2686;margin:12px 0;padding:4px 12px;">${textToHtml(opts.note)}</blockquote>
      <p><a href="${url}">Редактирайте и я изпратете отново за преглед</a></p>
      <hr/>
      <p>Hello ${name},</p>
      <p>The editors sent your story “${title}” back with a note:</p>
      <blockquote style="border-left:3px solid #0C2686;margin:12px 0;padding:4px 12px;">${textToHtml(opts.note)}</blockquote>
      <p><a href="${url}">Edit it and submit it for review again</a></p>
      <p>— Prizni</p>
    `,
  };
}
