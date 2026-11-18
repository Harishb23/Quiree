import { useEffect, useState } from "react";
import {
  FolderCog,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { businessCatalogApi } from "../../api/businessApi";
import { getErrorMessage } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import { STOCK_LABELS } from "../../lib/business";
import { Button } from "../../components/ui/Button";
import { SelectField, TextField } from "../../components/ui/Field";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { Modal } from "../../components/ui/Surface";
import { ConfirmDialog, Pagination } from "../../components/ui/Widgets";
import { useToast } from "../../components/ui/Toast";
import { BusinessProductCard } from "../../components/business/catalog/BusinessProductCard";
import { productToPayload } from "../../components/business/catalog/productForm";
import type {
  Product,
  ProductCategory,
  ProductQuery,
  ProductSort,
  StockStatus,
} from "../../types/business";
import { useBusiness } from "./BusinessShell";
import shared from "../dashboard/Dashboard.module.scss";
import styles from "../../components/business/catalog/Catalog.module.scss";

const PAGE_SIZE = 12;

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

/** Returns `value` after it has stopped changing for `delay` ms. */
function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ProductsPage() {
  const { business } = useBusiness();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounced(search);
  const [filters, setFilters] = useState<{
    categoryId: string;
    stock: string;
    visibility: string;
    sort: ProductSort;
  }>({
    categoryId: "",
    stock: "",
    visibility: "",
    sort: "newest",
  });
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [manageCategories, setManageCategories] = useState(false);

  // Any filter change goes back to page 1.
  useEffect(() => setPage(1), [debouncedSearch, filters]);

  const query: ProductQuery = {
    search: debouncedSearch.trim() || undefined,
    categoryId: filters.categoryId || undefined,
    stock: (filters.stock || undefined) as StockStatus | undefined,
    featured: filters.visibility === "featured" ? true : undefined,
    available:
      filters.visibility === "visible"
        ? true
        : filters.visibility === "hidden"
          ? false
          : undefined,
    sort: filters.sort,
    page,
    pageSize: PAGE_SIZE,
  };
  const products = useAsync(
    () => businessCatalogApi.products(business.id, query),
    [business.id, JSON.stringify(query)],
  );
  const categories = useAsync(
    () => businessCatalogApi.productCategories(business.id),
    [business.id],
  );

  const filtered = Boolean(
    query.search || query.categoryId || query.stock || filters.visibility,
  );
  const editTo = (id: string) =>
    `/dashboard/business/${business.id}/products/${id}`;

  async function quickUpdate(
    p: Product,
    patch: Partial<Pick<Product, "isFeatured" | "isAvailable">>,
    message: string,
  ) {
    setBusyId(p.id);
    try {
      const updated = await businessCatalogApi.updateProduct(
        business.id,
        p.id,
        productToPayload(p, patch),
      );
      products.setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((x) => (x.id === updated.id ? updated : x)),
            }
          : prev!,
      );
      toast.success(message);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await businessCatalogApi.deleteProduct(business.id, toDelete.id);
      toast.success(`${toDelete.name} deleted.`);
      setToDelete(null);
      await Promise.all([products.reload(), categories.reload()]);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  const set = (patch: Partial<typeof filters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  const activeFilters = [
    filters.categoryId,
    filters.stock,
    filters.visibility,
  ].filter(Boolean).length;

  return (
    <>
      <div className={shared.pageHeader}>
        <div>
          <h1>Products</h1>
          <p>
            Your catalogue, with prices, stock and details customers see on your
            storefront.
          </p>
        </div>
        <div className={shared.headerActions}>
          <Button
            variant="outline"
            icon={<FolderCog />}
            onClick={() => setManageCategories(true)}
          >
            Categories
          </Button>
          <Button
            to={`/dashboard/business/${business.id}/products/new`}
            icon={<Plus />}
          >
            Add product
          </Button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarSearch}>
          <TextField
            label="Search"
            icon={<Search />}
            placeholder="Name, SKU or description"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant={activeFilters ? "secondary" : "outline"}
            className={styles.filterToggle}
            icon={<SlidersHorizontal />}
            aria-expanded={showFilters}
            aria-controls="product-filters"
            onClick={() => setShowFilters((v) => !v)}
          >
            {activeFilters ? `Filters (${activeFilters})` : "Filters"}
          </Button>
        </div>
        <div
          id="product-filters"
          className={[
            styles.filterFields,
            showFilters && styles.filterFieldsOpen,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <SelectField
            label="Category"
            value={filters.categoryId}
            onChange={(e) => set({ categoryId: e.target.value })}
            options={[
              { value: "", label: "All categories" },
              ...(categories.data ?? []).map((c) => ({
                value: c.id,
                label: `${c.name} (${c.productCount})`,
              })),
            ]}
          />
          <SelectField
            label="Stock"
            value={filters.stock}
            onChange={(e) => set({ stock: e.target.value })}
            options={[
              { value: "", label: "Any stock" },
              ...Object.entries(STOCK_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <SelectField
            label="Show"
            value={filters.visibility}
            onChange={(e) => set({ visibility: e.target.value })}
            options={[
              { value: "", label: "All products" },
              { value: "visible", label: "On storefront" },
              { value: "hidden", label: "Hidden" },
              { value: "featured", label: "Featured" },
            ]}
          />
          <SelectField
            label="Sort by"
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value as ProductSort })}
            options={SORTS}
          />
        </div>
      </div>

      {products.error ? (
        <ErrorState message={products.error} onRetry={products.reload} />
      ) : products.loading && !products.data ? (
        <div
          className={styles.productGrid}
          aria-busy="true"
          aria-label="Loading products"
        >
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton height={160} radius={0} />
              <Skeleton width="70%" height={16} />
              <Skeleton width="40%" height={14} />
            </div>
          ))}
        </div>
      ) : !products.data?.items.length ? (
        filtered ? (
          <EmptyState
            icon={<Search />}
            title="No products match"
            description="Try a different search or clear the filters."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilters({
                    categoryId: "",
                    stock: "",
                    visibility: "",
                    sort: filters.sort,
                  });
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Package />}
            title="No products yet"
            description="Add your first product with photos, price and details — it appears on your storefront straight away."
            action={
              <Button
                to={`/dashboard/business/${business.id}/products/new`}
                icon={<Plus />}
              >
                Add product
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className={styles.productGrid} aria-busy={products.loading}>
            {products.data.items.map((p) => (
              <BusinessProductCard
                key={p.id}
                product={p}
                editTo={editTo(p.id)}
                busy={busyId === p.id}
                onToggleFeatured={() =>
                  quickUpdate(
                    p,
                    { isFeatured: !p.isFeatured },
                    p.isFeatured
                      ? `${p.name} is no longer featured.`
                      : `${p.name} is now featured.`,
                  )
                }
                onToggleAvailable={() =>
                  quickUpdate(
                    p,
                    { isAvailable: !p.isAvailable },
                    p.isAvailable
                      ? `${p.name} is hidden from your storefront.`
                      : `${p.name} is visible on your storefront.`,
                  )
                }
                onDelete={() => setToDelete(p)}
              />
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={products.data.total}
            onChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete product?"
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        <p>
          <strong>{toDelete?.name}</strong> and its photos will be permanently
          removed from your catalogue and storefront.
        </p>
      </ConfirmDialog>

      <CategoryManager
        open={manageCategories}
        businessId={business.id}
        categories={categories.data ?? []}
        onChanged={async () => {
          await Promise.all([categories.reload(), products.reload()]);
        }}
        onClose={() => setManageCategories(false)}
      />
    </>
  );
}

/** Create, rename and delete the business's own product categories. */
function CategoryManager({
  open,
  businessId,
  categories,
  onChanged,
  onClose,
}: {
  open: boolean;
  businessId: string;
  categories: ProductCategory[];
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [toDelete, setToDelete] = useState<ProductCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChanged();
      toast.success(message);
      return true;
    } catch (e) {
      setError(getErrorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const value = name.trim();
    if (!value) return setError("Enter a category name.");
    if (
      await run(
        () => businessCatalogApi.createProductCategory(businessId, value),
        `Category “${value}” added.`,
      )
    )
      setName("");
  }

  async function rename() {
    if (!editing) return;
    const value = editing.name.trim();
    if (!value) return setError("Enter a category name.");
    if (
      await run(
        () =>
          businessCatalogApi.updateProductCategory(
            businessId,
            editing.id,
            value,
          ),
        "Category renamed.",
      )
    )
      setEditing(null);
  }

  return (
    <>
      <Modal
        open={open && !toDelete}
        title="Product categories"
        size="md"
        onClose={onClose}
      >
        <p className={shared.muted} style={{ marginBottom: 14 }}>
          Group your products (e.g. “Sneakers”, “Bouquets”). Customers can
          filter by these on your storefront.
        </p>
        {categories.length > 0 && (
          <ul className={styles.categoryList}>
            {categories.map((c) => (
              <li key={c.id} className={styles.categoryItem}>
                {editing?.id === c.id ? (
                  <>
                    <TextField
                      label={`Rename ${c.name}`}
                      value={editing.name}
                      maxLength={80}
                      autoFocus
                      onChange={(e) =>
                        setEditing({ id: c.id, name: e.target.value })
                      }
                      onKeyDown={(e) => e.key === "Enter" && void rename()}
                    />
                    <Button size="sm" loading={busy} onClick={rename}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span>
                      {c.name}{" "}
                      <span className={shared.muted}>
                        · {c.productCount} products
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing({ id: c.id, name: c.name })}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setToDelete(c)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className={styles.inlineAdd}>
          <TextField
            label="New category"
            placeholder="e.g. Sneakers"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void add()}
          />
          <Button icon={<Plus />} loading={busy && !editing} onClick={add}>
            Add
          </Button>
        </div>
        {error && (
          <p className={styles.fieldError} role="alert">
            {error}
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete category?"
        confirmLabel="Delete category"
        busy={busy}
        onConfirm={async () => {
          if (
            toDelete &&
            (await run(
              () =>
                businessCatalogApi.deleteProductCategory(
                  businessId,
                  toDelete.id,
                ),
              "Category deleted.",
            ))
          )
            setToDelete(null);
        }}
        onClose={() => setToDelete(null)}
      >
        <p>
          <strong>{toDelete?.name}</strong> will be removed. Its{" "}
          {toDelete?.productCount ?? 0} products stay in your catalogue as
          uncategorised.
        </p>
      </ConfirmDialog>
    </>
  );
}
