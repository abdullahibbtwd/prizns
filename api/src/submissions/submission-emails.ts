import { SubmissionStatus } from '@prisma/client';
import { escapeHtml, textToHtml } from '../mail/email-html';

type SubmissionLike = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  place: string;
  title: string;
  category: string;
  description: string;
};

type Email = { subject: string; text: string; html: string };

function bilingual(
  name: string,
  bg: string,
  en: string,
  extraHtml = '',
  extraText = '',
): Pick<Email, 'text' | 'html'> {
  const safeName = escapeHtml(name);
  return {
    text: [
      `Здравейте, ${name},`,
      '',
      bg,
      extraText,
      '',
      '---',
      '',
      `Hello ${name},`,
      '',
      en,
      extraText,
      '',
      '— Prizni',
    ].join('\n'),
    html: `
      <p>Здравейте, ${safeName},</p>
      <p>${bg}</p>
      ${extraHtml}
      <hr/>
      <p>Hello ${safeName},</p>
      <p>${en}</p>
      ${extraHtml}
      <p>— Prizni</p>
    `,
  };
}

export function submissionReceiptEmail(row: SubmissionLike): Email {
  return {
    subject: `Prizni · ${row.title}`,
    ...bilingual(
      row.name,
      `Получихме историята ви „${escapeHtml(row.title)}“. Редакцията ще я прегледа и ще ви пишем, когато статусът се промени.`,
      `We received your story “${escapeHtml(row.title)}”. The editors will review it and we will email you when its status changes.`,
    ),
  };
}

const DECISION_COPY: Partial<
  Record<SubmissionStatus, { bg: string; en: string }>
> = {
  [SubmissionStatus.REVIEW]: {
    bg: 'Историята ви е в редакционен преглед.',
    en: 'Your story is now in editorial review.',
  },
  [SubmissionStatus.CHANGES]: {
    bg: 'Редакцията има няколко въпроса или предложения за промени. Ще се свържем с вас с подробности.',
    en: 'The editors have a few questions or suggested changes. We will be in touch with details.',
  },
  [SubmissionStatus.APPROVED]: {
    bg: 'Историята ви е одобрена и се подготвя за публикуване. Благодарим ви!',
    en: 'Your story has been approved and is being prepared for publication. Thank you!',
  },
  [SubmissionStatus.REJECTED]: {
    bg: 'Благодарим ви, че споделихте историята си. Този път няма да можем да я публикуваме.',
    en: 'Thank you for sharing your story. This time we are unable to publish it.',
  },
};

export function hasDecisionEmail(status: SubmissionStatus): boolean {
  return Boolean(DECISION_COPY[status]);
}

export function submissionStatusEmail(
  row: SubmissionLike,
  status: SubmissionStatus,
  message?: string | null,
): Email | null {
  const copy = DECISION_COPY[status];
  if (!copy && !message?.trim()) return null;
  const note = message?.trim();
  const noteHtml = note
    ? `<blockquote style="border-left:3px solid #0C2686;margin:12px 0;padding:4px 12px">${textToHtml(note)}</blockquote>`
    : '';
  return {
    subject: `Prizni · ${row.title}`,
    ...bilingual(
      row.name,
      copy?.bg ?? `Съобщение от редакцията относно „${escapeHtml(row.title)}“:`,
      copy?.en ?? `A message from the editors about “${escapeHtml(row.title)}”:`,
      noteHtml,
      note ? `\n${note}` : '',
    ),
  };
}

export function submissionAdminAlert(
  row: SubmissionLike,
  siteUrl: string,
  photoCount: number,
): Email {
  const cmsUrl = `${siteUrl}/cms/submissions/${row.id}`;
  return {
    subject: `[Prizni] New submission: ${row.title}`,
    text: [
      `New story submitted via Write for Us`,
      `From: ${row.name} <${row.email}>${row.phone ? `, ${row.phone}` : ''}`,
      `Place: ${row.place}`,
      `Category: ${row.category}`,
      `Photos: ${photoCount}`,
      '',
      row.description,
      '',
      `Review: ${cmsUrl}`,
    ].join('\n'),
    html: `
      <p><strong>New story submitted via Write for Us</strong></p>
      <p>
        From: ${escapeHtml(row.name)} &lt;${escapeHtml(row.email)}&gt;${row.phone ? `, ${escapeHtml(row.phone)}` : ''}<br/>
        Place: ${escapeHtml(row.place)}<br/>
        Category: ${escapeHtml(row.category)}<br/>
        Photos: ${photoCount}
      </p>
      <p><strong>${escapeHtml(row.title)}</strong></p>
      ${textToHtml(row.description)}
      <p><a href="${cmsUrl}">Review in CMS</a></p>
    `,
  };
}
