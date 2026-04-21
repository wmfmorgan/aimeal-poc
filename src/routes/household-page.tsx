import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useHousehold } from "@/hooks/use-household";
import {
  APPLIANCE_PRESETS,
  BIG_9_ALLERGENS,
  COOKING_SKILL_LEVELS,
  DIET_TYPES,
  HOUSEHOLD_COPY,
  type CookingSkillLevel,
  type MemberDraft,
} from "@/lib/household/types";
import {
  addTag,
  hasHouseholdErrors,
  removeTag,
  toggleChip,
  validateHousehold,
  validateMemberName,
} from "@/lib/household/validation";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-sm text-[#803b26]" role="alert">
      {message}
    </p>
  );
}

function SubmitBanner({ message, tone }: { message: string; tone: "error" | "success" }) {
  const colours =
    tone === "error"
      ? "bg-[rgba(128,59,38,0.08)] text-[#803b26]"
      : "bg-[rgba(74,103,65,0.10)] text-[var(--color-sage-deep)]";

  return (
    <p className={`rounded-xl px-4 py-3 text-sm leading-6 ${colours}`} role="alert">
      {message}
    </p>
  );
}

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-xl border px-4 py-3 text-base text-[var(--color-ink)] bg-white/80",
    "placeholder:text-[var(--color-muted)] transition-colors outline-none",
    hasError
      ? "border-[#803b26] focus:ring-2 focus:ring-[#803b26]/30"
      : "border-[rgba(74,103,65,0.2)] focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/20",
  ].join(" ");
}

function submitCls() {
  return [
    "rounded-xl bg-[#4A6741] px-6 text-white font-semibold text-sm tracking-wide",
    "transition-opacity disabled:opacity-60 min-h-[44px]",
  ].join(" ");
}

function chipCls(active: boolean) {
  return [
    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
    active
      ? "border-[#4A6741] bg-[#4A6741] text-white"
      : "border-[rgba(74,103,65,0.25)] bg-white/80 text-[var(--color-sage-deep)] hover:border-[#4A6741]",
  ].join(" ");
}

function emptyMember(): MemberDraft {
  return {
    name: "",
    allergies: [],
    avoidances: [],
    dietType: "",
    isExpanded: true,
    isConfirmingDelete: false,
  };
}

function memberKey(member: MemberDraft, index: number): string {
  return member.id ?? `draft-${index}`;
}

function describeMember(member: MemberDraft): string {
  const dietLabel = DIET_TYPES.find((option) => option.value === member.dietType)?.label;
  const constraints = [...member.allergies, ...member.avoidances];
  const visible = constraints.slice(0, 3);
  const overflow = constraints.length - visible.length;

  if (!dietLabel && visible.length === 0) {
    return HOUSEHOLD_COPY.noConstraints;
  }

  const pieces = [dietLabel, visible.join(", "), overflow > 0 ? `+ ${overflow} more` : null].filter(
    Boolean
  );

  return pieces.join(" · ");
}

export function HouseholdPage() {
  const navigate = useNavigate();
  const { household, error, isLoading, upsert } = useHousehold();

  const [householdName, setHouseholdName] = useState("");
  const [cookingSkill, setCookingSkill] = useState<CookingSkillLevel | "">("");
  const [appliances, setAppliances] = useState<string[]>([]);
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [draftSource, setDraftSource] = useState<string | null>(null);
  const [allergyInputs, setAllergyInputs] = useState<Record<string, string>>({});
  const [avoidanceInputs, setAvoidanceInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isLoading) return;

    const nextSource = household?.id ?? "__new__";
    if (draftSource === nextSource) return;

    setHouseholdName(household?.name ?? "");
    setCookingSkill(household?.cookingSkillLevel ?? "");
    setAppliances(household?.appliances ?? []);
    setMembers(
      household?.members.map((member) => ({
        id: member.id,
        name: member.name,
        allergies: member.allergies,
        avoidances: member.avoidances,
        dietType: member.dietType,
        isExpanded: false,
        isConfirmingDelete: false,
      })) ?? []
    );
    setFieldErrors({});
    setSubmitError(null);
    setAllergyInputs({});
    setAvoidanceInputs({});
    setDraftSource(nextSource);
  }, [draftSource, household, isLoading]);

  const isFirstTime = !isLoading && household === null;

  function setMember(index: number, updater: (member: MemberDraft) => MemberDraft) {
    setMembers((current) => current.map((member, currentIndex) => (currentIndex === index ? updater(member) : member)));
  }

  function clearMemberNameError(index: number, nextName: string) {
    const nextKey = `member-${index}-name`;
    const nextError = validateMemberName(nextName) ?? undefined;
    setFieldErrors((current) => ({
      ...current,
      [nextKey]: nextError,
    }));
  }

  function addMember() {
    setMembers((current) => [...current, emptyMember()]);
    setFieldErrors((current) => ({
      ...current,
      members: undefined,
    }));
    setSubmitSuccess(null);
  }

  function handleTagKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    kind: "allergies" | "avoidances"
  ) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    const member = members[index];
    if (!member) return;

    const key = memberKey(member, index);
    if (kind === "allergies") {
      const nextTags = addTag(member.allergies, allergyInputs[key] ?? "");
      setMember(index, (current) => ({ ...current, allergies: nextTags }));
      setAllergyInputs((current) => ({ ...current, [key]: "" }));
      return;
    }

    const nextTags = addTag(member.avoidances, avoidanceInputs[key] ?? "");
    setMember(index, (current) => ({ ...current, avoidances: nextTags }));
    setAvoidanceInputs((current) => ({ ...current, [key]: "" }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    const nextErrors: Record<string, string | undefined> = {
      ...validateHousehold(householdName, members),
    };

    if (!cookingSkill) {
      nextErrors.cookingSkill = HOUSEHOLD_COPY.validationSkillRequired;
    }

    members.forEach((member, index) => {
      const message = validateMemberName(member.name);
      if (message) {
        nextErrors[`member-${index}-name`] = message;
      }
    });

    setFieldErrors(nextErrors);
    setSubmitError(null);
    setSubmitSuccess(null);

    if (hasHouseholdErrors(nextErrors)) {
      return;
    }

    try {
      const resolvedCookingSkill = cookingSkill as CookingSkillLevel;

      await upsert.mutateAsync({
        name: householdName.trim(),
        cookingSkillLevel: resolvedCookingSkill,
        appliances,
        members: members.map((member) => ({
          id: member.id,
          name: member.name.trim(),
          allergies: member.allergies,
          avoidances: member.avoidances,
          dietType: member.dietType || undefined,
        })),
      });
      setMembers((current) =>
        current.map((member) => ({
          ...member,
          isExpanded: false,
          isConfirmingDelete: false,
        }))
      );
      setSubmitSuccess(HOUSEHOLD_COPY.successBanner);
      setSubmitError(null);
    } catch {
      setSubmitError(HOUSEHOLD_COPY.errorBanner);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
          {HOUSEHOLD_COPY.pageEyebrow}
        </p>
        <h2 className="mt-3 font-display text-[20px] font-semibold leading-snug text-[var(--color-sage-deep)]">
          {HOUSEHOLD_COPY.loadingLabel}
        </h2>
      </section>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8" noValidate>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.9fr)]">
        <div className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
            {HOUSEHOLD_COPY.pageEyebrow}
          </p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--color-sage-deep)] md:text-5xl">
            {HOUSEHOLD_COPY.pageHeading}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-muted)]">
            {HOUSEHOLD_COPY.pageBody}
          </p>
        </div>

        {isFirstTime && (
          <aside className="rounded-[1.75rem] border-l-4 border-[#d7c8a3] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">First visit</p>
            <h3 className="mt-3 font-display text-[20px] font-semibold leading-snug text-[var(--color-sage-deep)]">
              {HOUSEHOLD_COPY.nudgeHeading}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">{HOUSEHOLD_COPY.nudgeBody}</p>
          </aside>
        )}
      </section>

      {error && <SubmitBanner message={error.message} tone="error" />}
      {submitError && <SubmitBanner message={submitError} tone="error" />}
      {submitSuccess && <SubmitBanner message={submitSuccess} tone="success" />}

      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-8 md:py-8">
        <div className="mb-6 space-y-3">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
            {HOUSEHOLD_COPY.basicsEyebrow}
          </p>
          <h2 className="font-display text-[20px] font-semibold leading-snug text-[var(--color-sage-deep)]">
            {HOUSEHOLD_COPY.basicsHeading}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-[var(--color-muted)]">{HOUSEHOLD_COPY.basicsBody}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <label htmlFor="household-name" className="mb-2 block text-sm font-semibold text-[var(--color-ink)]">
              {HOUSEHOLD_COPY.nameLabel}
            </label>
            <input
              id="household-name"
              type="text"
              value={householdName}
              onChange={(event) => {
                setHouseholdName(event.target.value);
                setFieldErrors((current) => ({ ...current, name: undefined }));
              }}
              className={inputCls(!!fieldErrors.name)}
              placeholder={HOUSEHOLD_COPY.namePlaceholder}
              disabled={upsert.isPending}
            />
            <FieldError message={fieldErrors.name} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--color-ink)]">
              {HOUSEHOLD_COPY.skillLabel}
            </label>
            <div className="flex rounded-xl bg-[rgba(74,103,65,0.06)] p-1">
              {COOKING_SKILL_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    setCookingSkill(level);
                    setFieldErrors((current) => ({ ...current, cookingSkill: undefined }));
                  }}
                  className={[
                    "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors min-h-[44px]",
                    cookingSkill === level
                      ? "bg-[#4A6741] text-white shadow-sm"
                      : "text-[var(--color-sage-deep)] hover:bg-white/60",
                  ].join(" ")}
                  disabled={upsert.isPending}
                >
                  {level === "beginner"
                    ? HOUSEHOLD_COPY.skillBeginner
                    : level === "intermediate"
                      ? HOUSEHOLD_COPY.skillIntermediate
                      : HOUSEHOLD_COPY.skillAdvanced}
                </button>
              ))}
            </div>
            <FieldError message={fieldErrors.cookingSkill} />
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-8 md:py-8">
        <div className="mb-6 space-y-3">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
            {HOUSEHOLD_COPY.membersEyebrow}
          </p>
          <h2 className="font-display text-[20px] font-semibold leading-snug text-[var(--color-sage-deep)]">
            {HOUSEHOLD_COPY.membersHeading}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-[var(--color-muted)]">{HOUSEHOLD_COPY.membersBody}</p>
        </div>

        <div className="space-y-4">
          {members.length === 0 && (
            <div className="rounded-xl bg-white/60 px-4 py-4 text-sm leading-7 text-[var(--color-muted)]">
              {HOUSEHOLD_COPY.emptyMembersState}
            </div>
          )}

          {members.map((member, index) => {
            const key = memberKey(member, index);
            const memberNameError = fieldErrors[`member-${index}-name`];

            return (
              <article key={key} className="rounded-[1.5rem] bg-white/60 px-4 py-4 md:px-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {member.name.trim() || `Member ${index + 1}`}
                    </p>
                    <p className="text-xs leading-6 text-[var(--color-muted)]">{describeMember(member)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMember(index, (current) => ({
                          ...current,
                          isExpanded: !current.isExpanded,
                          isConfirmingDelete: false,
                        }))
                      }
                      className="min-h-[44px] px-2 text-sm text-[var(--color-sage-deep)] hover:underline"
                    >
                      {member.isExpanded
                        ? HOUSEHOLD_COPY.collapseMemberAction
                        : HOUSEHOLD_COPY.expandMemberAction}
                    </button>
                    {!member.isConfirmingDelete ? (
                      <button
                        type="button"
                        onClick={() =>
                          setMember(index, (current) => ({
                            ...current,
                            isConfirmingDelete: true,
                            isExpanded: false,
                          }))
                        }
                        className="min-h-[44px] px-2 text-sm text-[#803b26] hover:underline"
                      >
                        {HOUSEHOLD_COPY.deleteMemberAction}
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[rgba(128,59,38,0.06)] px-3 py-2">
                        <span className="text-xs text-[#803b26]">{HOUSEHOLD_COPY.deleteConfirmPrompt}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setMembers((current) => current.filter((_, currentIndex) => currentIndex !== index));
                            setFieldErrors((current) => {
                              const next = { ...current };
                              delete next[`member-${index}-name`];
                              return next;
                            });
                          }}
                          className="min-h-[44px] px-2 text-sm text-[#803b26] hover:underline"
                        >
                          {HOUSEHOLD_COPY.deleteMemberAction}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMember(index, (current) => ({
                              ...current,
                              isConfirmingDelete: false,
                            }))
                          }
                          className="min-h-[44px] px-2 text-sm text-[var(--color-sage-deep)] hover:underline"
                        >
                          {HOUSEHOLD_COPY.deleteCancelAction}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {member.isExpanded && (
                  <div className="mt-6 space-y-6 rounded-[1.25rem] bg-[rgba(255,255,255,0.76)] px-4 py-4 md:px-5">
                  <div>
                      <label
                        htmlFor={`member-name-${key}`}
                        className="mb-2 block text-sm font-semibold text-[var(--color-ink)]"
                      >
                        {HOUSEHOLD_COPY.memberNameLabel}
                      </label>
                      <input
                        id={`member-name-${key}`}
                        type="text"
                        value={member.name}
                        onChange={(event) => {
                          const nextName = event.target.value;
                          setMember(index, (current) => ({ ...current, name: nextName }));
                          clearMemberNameError(index, nextName);
                        }}
                        className={inputCls(!!memberNameError)}
                        placeholder={HOUSEHOLD_COPY.memberNamePlaceholder}
                        disabled={upsert.isPending}
                      />
                      <FieldError message={memberNameError} />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink)]">{HOUSEHOLD_COPY.allergiesLabel}</p>
                        <p className="mt-1 text-sm leading-7 text-[var(--color-muted)]">
                          {HOUSEHOLD_COPY.allergiesHelper}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {BIG_9_ALLERGENS.map((allergen) => (
                          <button
                            key={allergen}
                            type="button"
                            onClick={() =>
                              setMember(index, (current) => ({
                                ...current,
                                allergies: toggleChip(current.allergies, allergen),
                              }))
                            }
                            className={chipCls(member.allergies.includes(allergen))}
                            disabled={upsert.isPending}
                          >
                            {allergen}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {member.allergies.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-[rgba(74,103,65,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-sage-deep)]"
                          >
                            {tag}
                            <button
                              type="button"
                              aria-label={`Remove ${tag}`}
                              className="text-[var(--color-muted)] hover:text-[#803b26]"
                              onClick={() =>
                                setMember(index, (current) => ({
                                  ...current,
                                  allergies: removeTag(current.allergies, tag),
                                }))
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={allergyInputs[key] ?? ""}
                        onChange={(event) =>
                          setAllergyInputs((current) => ({ ...current, [key]: event.target.value }))
                        }
                        onKeyDown={(event) => handleTagKeyDown(event, index, "allergies")}
                        className={inputCls(false)}
                        placeholder={HOUSEHOLD_COPY.allergiesTagPlaceholder}
                        disabled={upsert.isPending}
                      />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink)]">{HOUSEHOLD_COPY.avoidancesLabel}</p>
                        <p className="mt-1 text-sm leading-7 text-[var(--color-muted)]">
                          {HOUSEHOLD_COPY.avoidancesHelper}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {member.avoidances.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-[rgba(74,103,65,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-sage-deep)]"
                          >
                            {tag}
                            <button
                              type="button"
                              aria-label={`Remove ${tag}`}
                              className="text-[var(--color-muted)] hover:text-[#803b26]"
                              onClick={() =>
                                setMember(index, (current) => ({
                                  ...current,
                                  avoidances: removeTag(current.avoidances, tag),
                                }))
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={avoidanceInputs[key] ?? ""}
                        onChange={(event) =>
                          setAvoidanceInputs((current) => ({ ...current, [key]: event.target.value }))
                        }
                        onKeyDown={(event) => handleTagKeyDown(event, index, "avoidances")}
                        className={inputCls(false)}
                        placeholder={HOUSEHOLD_COPY.avoidancesTagPlaceholder}
                        disabled={upsert.isPending}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`member-diet-${key}`}
                        className="mb-2 block text-sm font-semibold text-[var(--color-ink)]"
                      >
                        {HOUSEHOLD_COPY.dietTypeLabel}
                      </label>
                      <select
                        id={`member-diet-${key}`}
                        value={member.dietType}
                        onChange={(event) =>
                          setMember(index, (current) => ({ ...current, dietType: event.target.value }))
                        }
                        className={inputCls(false)}
                        disabled={upsert.isPending}
                      >
                        <option value="">{HOUSEHOLD_COPY.dietTypePlaceholder}</option>
                        {DIET_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <FieldError message={fieldErrors.members} />

        <div className="mt-6">
          <button
            type="button"
            onClick={addMember}
            className="min-h-[44px] rounded-full bg-white px-5 text-sm font-semibold text-[var(--color-sage-deep)] shadow-sm transition-colors hover:bg-[rgba(255,255,255,0.86)]"
          >
            {HOUSEHOLD_COPY.addMemberCta}
          </button>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-8 md:py-8">
        <div className="mb-6 space-y-3">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
            {HOUSEHOLD_COPY.appliancesEyebrow}
          </p>
          <h2 className="font-display text-[20px] font-semibold leading-snug text-[var(--color-sage-deep)]">
            {HOUSEHOLD_COPY.appliancesHeading}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-[var(--color-muted)]">{HOUSEHOLD_COPY.appliancesHelper}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {APPLIANCE_PRESETS.map((appliance) => (
            <button
              key={appliance}
              type="button"
              onClick={() => setAppliances((current) => toggleChip(current, appliance))}
              className={chipCls(appliances.includes(appliance))}
              disabled={upsert.isPending}
            >
              {appliance}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:flex-row md:items-center md:justify-between md:px-8 md:py-6">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Save changes in place</p>
          <p className="text-sm leading-7 text-[var(--color-muted)]">
            Save stays on this route so you can verify the household state immediately.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {household && (
            <button
              type="button"
              onClick={() => navigate("/plan/new")}
              className="min-h-[44px] rounded-xl bg-[#4A6741] px-6 py-3 text-sm font-semibold tracking-wide text-white transition-opacity hover:opacity-90"
            >
              Generate Your Plan →
            </button>
          )}
          <button type="submit" disabled={upsert.isPending} className={submitCls()}>
            {upsert.isPending ? HOUSEHOLD_COPY.saveCtaLoading : HOUSEHOLD_COPY.saveCta}
          </button>
        </div>
      </section>
    </form>
  );
}
