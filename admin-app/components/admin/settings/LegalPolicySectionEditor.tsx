'use client';

import type { LegalSection } from '@/data/legal-policies';

const textareaClassName = 'min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

export function LegalPolicySectionEditor({
  section,
  sectionNumber,
  sectionCount,
  busy,
  onUpdate,
  onRemoveSection,
  onParagraphChange,
  onAddParagraph,
  onRemoveParagraph,
  onBulletChange,
  onAddBullet,
  onRemoveBullet,
}: {
  section: LegalSection;
  sectionNumber: number;
  sectionCount: number;
  busy: boolean;
  onUpdate: (update: Partial<LegalSection>) => void;
  onRemoveSection: () => void;
  onParagraphChange: (index: number, value: string) => void;
  onAddParagraph: () => void;
  onRemoveParagraph: (index: number) => void;
  onBulletChange: (index: number, value: string) => void;
  onAddBullet: () => void;
  onRemoveBullet: (index: number) => void;
}) {
  return (
    <fieldset className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <legend className="max-w-full px-2 text-base font-semibold">
        Section {sectionNumber}
      </legend>
      <div className="flex justify-end">
        <button
          type="button"
          className="min-h-10 rounded-md px-3 text-sm text-destructive underline underline-offset-4 disabled:opacity-50"
          disabled={busy || sectionCount <= 1}
          onClick={onRemoveSection}
        >
          Remove section
        </button>
      </div>
      <label className="block space-y-2 text-sm font-medium">
        Section heading
        <input
          className="min-h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          value={section.title}
          maxLength={120}
          required
          disabled={busy}
          onChange={(event) => onUpdate({ title: event.target.value })}
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        Summary
        <textarea
          className={textareaClassName}
          value={section.summary}
          maxLength={300}
          rows={2}
          required
          disabled={busy}
          onChange={(event) => onUpdate({ summary: event.target.value })}
        />
      </label>
      {section.paragraphs.map((paragraph, paragraphIndex) => (
        <div key={`${section.id}-paragraph-${paragraphIndex}`} className="space-y-2">
          <label className="block space-y-2 text-sm font-medium">
            Paragraph {paragraphIndex + 1}
            <textarea
              className={textareaClassName}
              value={paragraph}
              maxLength={5000}
              rows={4}
              required
              disabled={busy}
              onChange={(event) =>
                onParagraphChange(paragraphIndex, event.target.value)
              }
            />
          </label>
          <button
            type="button"
            className="min-h-9 rounded-md px-2 text-sm text-destructive underline underline-offset-4 disabled:opacity-50"
            disabled={busy || section.paragraphs.length <= 1}
            onClick={() => onRemoveParagraph(paragraphIndex)}
          >
            Remove paragraph
          </button>
        </div>
      ))}
      <button
        type="button"
        className="min-h-10 rounded-md px-3 text-sm font-medium text-primary underline underline-offset-4 disabled:opacity-50"
        disabled={busy || section.paragraphs.length >= 10}
        onClick={onAddParagraph}
      >
        Add paragraph
      </button>
      {section.bullets?.map((bullet, bulletIndex) => (
        <div key={`${section.id}-bullet-${bulletIndex}`} className="space-y-2">
          <label className="block space-y-2 text-sm font-medium">
            List item {bulletIndex + 1}
            <textarea
              className={textareaClassName}
              value={bullet}
              maxLength={1000}
              rows={2}
              required
              disabled={busy}
              onChange={(event) => onBulletChange(bulletIndex, event.target.value)}
            />
          </label>
          <button
            type="button"
            className="min-h-9 rounded-md px-2 text-sm text-destructive underline underline-offset-4 disabled:opacity-50"
            disabled={busy}
            onClick={() => onRemoveBullet(bulletIndex)}
          >
            Remove list item
          </button>
        </div>
      ))}
      <button
        type="button"
        className="min-h-10 rounded-md px-3 text-sm font-medium text-primary underline underline-offset-4 disabled:opacity-50"
        disabled={busy || (section.bullets?.length ?? 0) >= 20}
        onClick={onAddBullet}
      >
        Add list item
      </button>
    </fieldset>
  );
}
