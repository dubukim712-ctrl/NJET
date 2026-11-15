'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { saveStorefrontLegalPolicyAction } from '@/data/actions/legal-policies';
import { useInvalidateAdminSystemSettingsQuery } from '@/data/commerce/admin-system-settings-client';
import { LegalPolicySectionEditor } from '@/components/admin/settings/LegalPolicySectionEditor';
import type { LegalPolicy, LegalSection } from '@/data/legal-policies';
import { Button } from '@/components/ui/Button';

function textareaClassName() {
  return 'min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';
}

export function LegalPolicyEditor({ policy }: { policy: LegalPolicy }) {
  const router = useRouter();
  const invalidateSettings = useInvalidateAdminSystemSettingsQuery();
  const [draft, setDraft] = useState(policy);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isStale = draft.version !== policy.version;
  const hasChanges = JSON.stringify({
    intro: draft.intro,
    sections: draft.sections,
  }) !== JSON.stringify({
    intro: policy.intro,
    sections: policy.sections,
  });

  const updateSection = (
    sectionIndex: number,
    update: Partial<LegalSection>
  ) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex ? { ...section, ...update } : section
      ),
    }));
  };

  const updateParagraph = (
    sectionIndex: number,
    paragraphIndex: number,
    paragraph: string
  ) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              paragraphs: section.paragraphs.map((value, itemIndex) =>
                itemIndex === paragraphIndex ? paragraph : value
              ),
            }
          : section
      ),
    }));
  };

  const updateBullet = (
    sectionIndex: number,
    bulletIndex: number,
    bullet: string
  ) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex && section.bullets
          ? {
              ...section,
              bullets: section.bullets.map((value, itemIndex) =>
                itemIndex === bulletIndex ? bullet : value
              ),
            }
          : section
      ),
    }));
  };

  const addSection = () => {
    setDraft((current) => ({
      ...current,
      sections: [
        ...current.sections,
        {
          id: `section-${crypto.randomUUID()}`,
          title: '',
          summary: '',
          paragraphs: [''],
        },
      ],
    }));
  };

  const removeSection = (sectionIndex: number) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.filter((_, index) => index !== sectionIndex),
    }));
  };

  const addParagraph = (sectionIndex: number) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex
          ? { ...section, paragraphs: [...section.paragraphs, ''] }
          : section
      ),
    }));
  };

  const removeParagraph = (sectionIndex: number, paragraphIndex: number) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              paragraphs: section.paragraphs.filter(
                (_, itemIndex) => itemIndex !== paragraphIndex
              ),
            }
          : section
      ),
    }));
  };

  const addBullet = (sectionIndex: number) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex
          ? { ...section, bullets: [...(section.bullets ?? []), ''] }
          : section
      ),
    }));
  };

  const removeBullet = (sectionIndex: number, bulletIndex: number) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => {
        if (index !== sectionIndex || !section.bullets) return section;
        const bullets = section.bullets.filter(
          (_, itemIndex) => itemIndex !== bulletIndex
        );
        return { ...section, bullets: bullets.length ? bullets : undefined };
      }),
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || isStale || !hasChanges) return;
    setBusy(true);
    setError(null);
    try {
      const result = await saveStorefrontLegalPolicyAction({
        slug: policy.slug,
        baseVersion: draft.version,
        intro: draft.intro,
        sections: draft.sections,
      });
      if (!result.success) {
        await invalidateSettings();
        router.refresh();
        throw new Error(result.error);
      }
      await invalidateSettings();
      router.refresh();
      setDraft((current) => ({ ...current, version: result.data.version }));
      toast.success(`${policy.title} saved as ${result.data.version}.`);
    } catch (saveError) {
      console.error(`Could not save the ${policy.title} policy.`, saveError);
      const message = saveError instanceof Error
        ? saveError.message
        : 'Could not save this policy. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="max-w-4xl space-y-5" onSubmit={submit}>
      <header>
        <h3 className="text-xl font-semibold">{policy.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Current version {policy.version} · Updated {policy.lastUpdated}. Saving
          creates a new version while retaining previous policy records.
        </p>
      </header>

      {isStale && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm" role="alert">
          This policy changed in another session. Your draft is preserved, but cannot
          be saved until you load the latest version.
          <button
            type="button"
            className="ml-2 min-h-9 font-medium underline underline-offset-4"
            onClick={() => {
              setDraft(policy);
              setError(null);
            }}
          >
            Load latest version
          </button>
        </div>
      )}
      <label className="block space-y-2 text-sm font-medium">
        Introduction
        <textarea
          className={textareaClassName()}
          value={draft.intro}
          maxLength={3000}
          rows={4}
          required
          disabled={busy || isStale}
          onChange={(event) =>
            setDraft((current) => ({ ...current, intro: event.target.value }))
          }
        />
      </label>

      {draft.sections.map((section, sectionIndex) => (
        <LegalPolicySectionEditor
          key={section.id}
          section={section}
          sectionNumber={sectionIndex + 1}
          sectionCount={draft.sections.length}
          busy={busy || isStale}
          onUpdate={(update) => updateSection(sectionIndex, update)}
          onRemoveSection={() => removeSection(sectionIndex)}
          onParagraphChange={(index, value) =>
            updateParagraph(sectionIndex, index, value)
          }
          onAddParagraph={() => addParagraph(sectionIndex)}
          onRemoveParagraph={(index) => removeParagraph(sectionIndex, index)}
          onBulletChange={(index, value) => updateBullet(sectionIndex, index, value)}
          onAddBullet={() => addBullet(sectionIndex)}
          onRemoveBullet={(index) => removeBullet(sectionIndex, index)}
        />
      ))}

      <button
        type="button"
        className="min-h-11 rounded-md border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
        disabled={busy || isStale || draft.sections.length >= 30}
        onClick={addSection}
      >
        Add section
      </button>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" loading={busy} disabled={busy || isStale || !hasChanges}>
        Save policy and publish a new version
      </Button>
    </form>
  );
}
