"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MediaManager } from "@/components/client/media-manager";
import { ProductPreview } from "@/components/client/product-preview";
import type { PreviewData } from "@/components/client/product-preview";
import { StatusBadge } from "@/components/client/products-table";
import { VariantsSection } from "@/components/client/variants-section";
import { effectiveSchema, emptyValues, parseSchema } from "@/lib/catalog/attributes";
import { createDraft, setProductStatus, updateProduct } from "@/lib/catalog/actions";
import { discountPercent, parseRupeesToPaise, formatPaise } from "@/lib/catalog/money";
import { seoDescriptionDefault, seoTitleDefault } from "@/lib/catalog/seo";
import type { CategoryPickerItem, ProductBundle } from "@/lib/catalog/queries";

/**
 * Add/Edit product wizard (spec §15). One draft per product; the wizard
 * creates the draft as soon as name + category + price are valid, then
 * autosaves every change and shows "Saved HH:MM ✓" (§16). Attribute fields
 * swap automatically when the category changes (§4, rule 12).
 */

type FormState = {
  name: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  sellingPrice: string;
  mrp: string;
  attributeValues: Record<string, unknown>;
  careInstructions: string;
  weightG: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  dispatchTimeDays: string;
  returnEligible: boolean;
  shippingNotes: string;
  seoTitle: string;
  seoDescription: string;
};

function initialState(bundle: ProductBundle | null): FormState {
  const p = bundle?.product;
  return {
    name: p?.name ?? "",
    categoryId: p?.category_id ?? "",
    shortDescription: p?.short_description ?? "",
    description: p?.description ?? "",
    sellingPrice: p ? String(p.selling_price_paise / 100) : "",
    mrp: p?.mrp_paise ? String(p.mrp_paise / 100) : "",
    attributeValues: (p?.attributes ?? {}) as Record<string, unknown>,
    careInstructions: p?.care_instructions ?? "",
    weightG: p?.weight_g ? String(p.weight_g) : "",
    lengthCm: p?.length_cm ? String(p.length_cm) : "",
    widthCm: p?.width_cm ? String(p.width_cm) : "",
    heightCm: p?.height_cm ? String(p.height_cm) : "",
    dispatchTimeDays: String(p?.dispatch_time_days ?? 3),
    returnEligible: p?.return_eligible ?? true,
    shippingNotes: p?.shipping_notes ?? "",
    seoTitle: p?.seo_title ?? "",
    seoDescription: p?.seo_description ?? "",
  };
}

export function ProductWizard({
  categories,
  bundle,
}: {
  categories: CategoryPickerItem[];
  bundle: ProductBundle | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(bundle));
  const [productId, setProductId] = useState<string | null>(bundle?.product.id ?? null);
  // Ref mirror: async saves read the latest product id without waiting for
  // a re-render, so a second save can never re-run the create path.
  const productIdRef = useRef<string | null>(bundle?.product.id ?? null);
  const busyRef = useRef(false);
  const [productCode, setProductCode] = useState<string | null>(
    bundle?.product.product_code ?? null,
  );
  const [status, setStatus] = useState(bundle?.product.status ?? "DRAFT");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedSnapshot = useRef<string>("");

  const category = categories.find((c) => c.id === form.categoryId) ?? null;
  const parent = category?.parentId
    ? (categories.find((c) => c.id === category.parentId) ?? null)
    : null;
  const schema = useMemo(() => {
    if (!category) return [];
    const own = parseSchema(category.attributeSchemaJson);
    // Top-level categories carry their own schema; subcategories override
    // the parent's when they define fields (effectiveSchema).
    if (!category.parentId) return own;
    return effectiveSchema(
      parent ? parseSchema(parent.attributeSchemaJson) : [],
      own,
    );
  }, [category, parent]);
  const editorSchema = useMemo(
    () => schema.filter((f) => f.key !== "care_instructions"),
    [schema],
  );

  const pricePaise = parseRupeesToPaise(form.sellingPrice);
  const mrpPaise = form.mrp.trim() === "" ? null : parseRupeesToPaise(form.mrp);
  const discount =
    mrpPaise !== null && pricePaise !== null ? discountPercent(mrpPaise, pricePaise) : null;

  const canCreate =
    productId === null && form.name.trim() !== "" && form.categoryId !== "" && pricePaise !== null && pricePaise > 0;
  const canSave =
    form.name.trim() !== "" && form.categoryId !== "" && pricePaise !== null && pricePaise > 0;
  const activeVariants = (bundle?.variants ?? []).filter((v) => v.isActive);

  const previewData: PreviewData = {
    name: form.name,
    productCode,
    status,
    shortDescription: form.shortDescription,
    description: form.description,
    sellingPricePaise: pricePaise,
    mrpPaise,
    attributes: editorSchema.flatMap((field) => {
      const value = form.attributeValues[field.key];
      if (value === undefined || value === null || value === "") return [];
      const text = typeof value === "boolean" ? (value ? "Yes" : "") : String(value);
      return text === "" ? [] : [{ label: field.label, value: text }];
    }),
    media: bundle?.media ?? [],
    stock:
      activeVariants.length > 0
        ? activeVariants.reduce((sum, v) => sum + v.quantity, 0)
        : null,
    lowStock: (bundle?.variants ?? []).some(
      (v) => v.quantity > 0 && v.quantity <= v.lowStockThreshold,
    ),
    seoTitleOverride: form.seoTitle,
    seoDescriptionOverride: form.seoDescription,
  };

  const buildPatch = useCallback(
    (state: FormState): Parameters<typeof updateProduct>[1] => ({
      name: state.name,
      shortDescription: state.shortDescription,
      description: state.description,
      sellingPricePaise: parseRupeesToPaise(state.sellingPrice) ?? 0,
      mrpPaise: state.mrp.trim() === "" ? null : parseRupeesToPaise(state.mrp),
      attributeValues: state.attributeValues,
      categoryId: state.categoryId,
      careInstructions: state.careInstructions,
      weightG: state.weightG.trim() === "" ? null : Number(state.weightG),
      lengthCm: state.lengthCm.trim() === "" ? null : Number(state.lengthCm),
      widthCm: state.widthCm.trim() === "" ? null : Number(state.widthCm),
      heightCm: state.heightCm.trim() === "" ? null : Number(state.heightCm),
      dispatchTimeDays: Number(state.dispatchTimeDays || "3"),
      returnEligible: state.returnEligible,
      shippingNotes: state.shippingNotes,
      seoTitle: state.seoTitle,
      seoDescription: state.seoDescription,
    }),
    [],
  );

  // One save path for autosave and "Save draft" (§16 + §15H). In new-product
  // mode the first valid save creates the draft and then immediately pushes
  // the full form — createDraft persists only name/category/price, so
  // anything else typed before the draft existed must be flushed through
  // updateProduct or it is lost (the autosave race this closes).
  const performSave = useCallback(
    async (state: FormState) => {
      const price = parseRupeesToPaise(state.sellingPrice);
      if (
        state.name.trim() === "" ||
        state.categoryId === "" ||
        price === null ||
        price <= 0
      ) {
        return;
      }
      if (busyRef.current) return;
      busyRef.current = true;
      setSaving(true);
      setNotice(null);
      try {
        const snapshot = JSON.stringify(state);
        if (productIdRef.current === null) {
          const created = await createDraft({
            name: state.name,
            categoryId: state.categoryId,
            sellingPricePaise: price,
            mrpPaise: state.mrp.trim() === "" ? null : parseRupeesToPaise(state.mrp),
            shortDescription: state.shortDescription,
          });
          if (!created.ok) {
            setNotice(created.error);
            return;
          }
          productIdRef.current = created.data.id;
          setProductId(created.data.id);
          setProductCode(created.data.productCode);
          window.history.replaceState(null, "", `/client/products/${created.data.id}`);
          const followUp = await updateProduct(created.data.id, buildPatch(state));
          if (!followUp.ok) {
            setNotice(followUp.error);
            return;
          }
        } else {
          const result = await updateProduct(productIdRef.current, buildPatch(state));
          if (!result.ok) {
            setNotice(result.error);
            return;
          }
        }
        savedSnapshot.current = snapshot;
        setSavedAt(new Date());
      } finally {
        busyRef.current = false;
        setSaving(false);
      }
    },
    [buildPatch],
  );

  // Autosave (§16): debounced on every change.
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);

    const snapshot = JSON.stringify(form);
    if (snapshot === savedSnapshot.current) return;
    if (form.name.trim() === "" || form.categoryId === "" || pricePaise === null || pricePaise <= 0) {
      return;
    }

    saveTimer.current = setTimeout(() => {
      void performSave(form);
    }, 2000);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, pricePaise, performSave]);

  function saveNow() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void performSave(form);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function changeCategory(categoryId: string) {
    const cat = categories.find((c) => c.id === categoryId) ?? null;
    const parentCat = cat?.parentId
      ? (categories.find((c) => c.id === cat.parentId) ?? null)
      : null;
    const nextSchema = !cat
      ? []
      : cat.parentId
        ? effectiveSchema(
            parentCat ? parseSchema(parentCat.attributeSchemaJson) : [],
            parseSchema(cat.attributeSchemaJson),
          )
        : parseSchema(cat.attributeSchemaJson);
    setForm((prev) => ({
      ...prev,
      categoryId,
      // §4: fields change automatically with the category — reset values.
      attributeValues: emptyValues(nextSchema),
    }));
  }

  async function publish() {
    if (!productId) return;
    const result = await setProductStatus(productId, "publish");
    if (result.ok) {
      setStatus("PUBLISHED");
      router.refresh();
    } else {
      setNotice(result.error);
    }
  }

  const topLevel = categories.filter((c) => c.parentId === null);
  const subcategories = category
    ? categories.filter((c) => c.parentId === (category.parentId ?? category.id))
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600">
            {productId ? "Edit product" : "Add product"}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-wine-900">
            {form.name.trim() === "" ? "New product" : form.name}
          </h1>
          <p className="mt-1 text-xs text-wine-900/50">
            {productCode ? (
              <>
                {productCode} · <StatusBadge status={status} />
              </>
            ) : (
              "Product ID: auto-generated on save — not editable (§3)"
            )}
          </p>
        </div>
        <div className="text-right text-xs text-wine-900/60">
          {saving ? (
            <span>Saving…</span>
          ) : savedAt ? (
            <span>Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓</span>
          ) : null}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={saveNow}
              disabled={saving || !canSave}
              className="rounded-full border border-wine-900/20 px-4 py-2 text-xs font-medium text-wine-900 hover:border-gold-500 disabled:opacity-40"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-full border border-wine-900/20 px-4 py-2 text-xs font-medium text-wine-900 hover:border-gold-500"
            >
              Preview
            </button>
            {productId && status === "DRAFT" ? (
              <button
                type="button"
                onClick={publish}
                className="rounded-full bg-wine-900 px-4 py-2 text-xs font-medium text-ivory-50 hover:bg-wine-800"
              >
                Publish
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {notice ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-800">{notice}</p>
      ) : null}
      {!productId && canCreate === false && form.name.trim() !== "" ? (
        <p className="mt-4 rounded-xl bg-gold-50 px-4 py-2 text-sm text-wine-900/70">
          Fill name, category and a valid price — the draft saves itself.
        </p>
      ) : null}

      {/* A. Basic information */}
      <Section title="Basic information">
        <Field label="Product name *">
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category *">
            <select
              value={category?.parentId ?? form.categoryId}
              onChange={(e) => changeCategory(e.target.value)}
              className={inputClass}
            >
              <option value="">Select…</option>
              {topLevel.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subcategory">
            <select
              value={category?.parentId ? form.categoryId : ""}
              onChange={(e) => e.target.value && changeCategory(e.target.value)}
              className={inputClass}
              disabled={!category}
            >
              <option value="">—</option>
              {subcategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Short description">
          <input
            value={form.shortDescription}
            onChange={(e) => set("shortDescription", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Full description">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={5}
            className={inputClass}
          />
        </Field>
      </Section>

      {/* B. Images */}
      <Section title="Product photos">
        {productId && productCode ? (
          <MediaManager productId={productId} productCode={productCode} media={bundle?.media ?? []} />
        ) : (
          <p className="text-sm text-wine-900/60">
            Photos unlock once the draft exists — fill name, category and price above.
          </p>
        )}
      </Section>

      {/* C. Pricing */}
      <Section title="Pricing">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Selling price (₹) *">
            <input
              inputMode="decimal"
              value={form.sellingPrice}
              onChange={(e) => set("sellingPrice", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="MRP (₹)">
            <input
              inputMode="decimal"
              value={form.mrp}
              onChange={(e) => set("mrp", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Discount">
            <p className="rounded-xl bg-wine-900/5 px-3 py-2 text-sm text-wine-900/70">
              {discount !== null ? `${discount}% off` : "—"}
            </p>
          </Field>
        </div>
        {pricePaise === null && form.sellingPrice.trim() !== "" ? (
          <p className="text-xs text-red-700">
            Enter an amount like 5999 or 5999.50 — stored as paise (§15C).
          </p>
        ) : null}
        {mrpPaise !== null && pricePaise !== null && mrpPaise < pricePaise ? (
          <p className="text-xs text-red-700">MRP must be ≥ selling price.</p>
        ) : null}
      </Section>

      {/* D. Inventory + variants */}
      <Section title="Inventory & variants">
        {productId ? (
          <VariantsSection productId={productId} variants={bundle?.variants ?? []} />
        ) : (
          <p className="text-sm text-wine-900/60">
            Stock and variants unlock once the draft exists. Every product keeps a
            DEFAULT variant (§3).
          </p>
        )}
      </Section>

      {/* E. Category-specific attributes */}
      <Section title={`Attributes${category ? ` · ${parent?.name ?? category.name}` : ""}`}>
        {editorSchema.length === 0 ? (
          <p className="text-sm text-wine-900/60">
            No category selected, or this category has no extra fields.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {editorSchema.map((field) => (
              <Field key={field.key} label={field.label}>
                {field.type === "option" ? (
                  <select
                    value={String(form.attributeValues[field.key] ?? "")}
                    onChange={(e) =>
                      set("attributeValues", {
                        ...form.attributeValues,
                        [field.key]: e.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {(field.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : field.type === "boolean" ? (
                  <label className="flex items-center gap-2 text-sm text-wine-900/80">
                    <input
                      type="checkbox"
                      checked={form.attributeValues[field.key] === true}
                      onChange={(e) =>
                        set("attributeValues", {
                          ...form.attributeValues,
                          [field.key]: e.target.checked,
                        })
                      }
                    />
                    Yes
                  </label>
                ) : (
                  <input
                    value={String(form.attributeValues[field.key] ?? "")}
                    onChange={(e) =>
                      set("attributeValues", {
                        ...form.attributeValues,
                        [field.key]: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                )}
              </Field>
            ))}
          </div>
        )}
      </Section>

      {/* F. Shipping */}
      <Section title="Shipping & care">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Weight (g)">
            <input inputMode="numeric" value={form.weightG} onChange={(e) => set("weightG", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Length (cm)">
            <input inputMode="numeric" value={form.lengthCm} onChange={(e) => set("lengthCm", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Width (cm)">
            <input inputMode="numeric" value={form.widthCm} onChange={(e) => set("widthCm", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Height (cm)">
            <input inputMode="numeric" value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Dispatch time (days)">
            <input inputMode="numeric" value={form.dispatchTimeDays} onChange={(e) => set("dispatchTimeDays", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Return eligible">
            <label className="flex items-center gap-2 py-2 text-sm text-wine-900/80">
              <input
                type="checkbox"
                checked={form.returnEligible}
                onChange={(e) => set("returnEligible", e.target.checked)}
              />
              Yes
            </label>
          </Field>
        </div>
        <Field label="Shipping notes">
          <input value={form.shippingNotes} onChange={(e) => set("shippingNotes", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Care instructions">
          <textarea
            value={form.careInstructions}
            onChange={(e) => set("careInstructions", e.target.value)}
            rows={2}
            className={inputClass}
          />
        </Field>
      </Section>

      {/* G. SEO */}
      <Section title="SEO">
        <p className="text-xs text-wine-900/50">
          Left blank, metadata is auto-generated — this is what searchers see today:
        </p>
        <div className="rounded-xl bg-wine-900/5 px-3 py-2 text-xs text-wine-900/70">
          <span className="font-medium text-wine-900">
            {seoTitleDefault(form.name)}
          </span>
          <span className="mt-0.5 block">
            {seoDescriptionDefault(form.name, form.shortDescription)}
          </span>
        </div>
        <Field label="SEO title override">
          <input value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className={inputClass} />
        </Field>
        <Field label="SEO description override">
          <textarea value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} rows={2} className={inputClass} />
        </Field>
      </Section>

      {previewOpen ? (
        <ProductPreview data={previewData} onClose={() => setPreviewOpen(false)} />
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-wine-900/15 bg-white px-3 py-2 text-sm text-wine-900 focus:border-gold-500 focus:outline-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl border border-wine-900/10 bg-white p-5">
      <h2 className="font-serif text-lg text-wine-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-wine-900/60">
        {label}
      </span>
      {children}
    </label>
  );
}

export { formatPaise };
