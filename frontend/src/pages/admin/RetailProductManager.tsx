import { useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  AlertCircle,
  FolderTree,
  ChevronDown,
  ChevronUp,
  Star,
  Upload,
  Images,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import {
  ADMIN_MENU_ITEMS,
  ADMIN_MENU_SECTIONS,
} from "../../constants/adminMenu";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/Toast";
import { useAdminRetailProducts } from "../../hooks/useAdminRetailProducts";
import { useRetailCategories } from "../../hooks/useRetailCategories";
import { uploadPublicAssetToImageKit } from "../../lib/publicImagekitUpload";
import { uploadToR2 } from "../../lib/r2Upload";
import { supabase } from "../../lib/supabase";
import {
  useRetailProductImages,
  useRetailProductImageMutations,
} from "../../hooks/useRetailProductImages";
import type { ProductRetail } from "../../types";
import { formatCurrency } from "../../utils/formatters";

const DEPARTMENTS = [
  { id: "glam", label: "Glam" },
  { id: "charmbar", label: "Charm Bar" },
  { id: "sparkclub", label: "Spark Club" },
];

export default function RetailProductManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { products, isLoading, createProduct, updateProduct, deleteProduct } =
    useAdminRetailProducts();
  const {
    categories,
    isLoading: isLoadingCats,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useRetailCategories();

  const [search, setSearch] = useState("");
  const [activeDept, setActiveDept] = useState<string>("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("all"); // all, active, inactive
  const [categoryFilter, setCategoryFilter] = useState<string>("all"); // all, no-category
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const [galleryUrlInput, setGalleryUrlInput] = useState("");
  const [galleryUploading, setGalleryUploading] = useState(false);

  // Gallery hooks (only active when editing)
  const { data: galleryImages = [], isLoading: galleryLoading } =
    useRetailProductImages(editingId);
  const { uploadAndAdd, addImage, setPrimary, deleteImage } =
    useRetailProductImageMutations(editingId);

  const [formData, setFormData] = useState<Partial<ProductRetail>>({
    name: "",
    slug: "",
    description: "",
    price: 0,
    stock: 0,
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
    image: null,
    is_active: true,
    retail_category: null,
    retail_subcategory_id: null,
    variant: "",
  });

  // Category Manager State
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [catActiveDept, setCatActiveDept] = useState<
    "glam" | "charmbar" | "sparkclub"
  >("glam");
  const [catEditingId, setCatEditingId] = useState<number | null>(null);
  // null = adding root category, number = adding sub to this parent id
  const [catParentId, setCatParentId] = useState<number | null>(null);
  const [catFormData, setCatFormData] = useState({
    name: "",
    slug: "",
    is_active: true,
  });

  const resetCatForm = () => {
    setCatFormData({ name: "", slug: "", is_active: true });
    setCatEditingId(null);
    setCatParentId(null);
  };

  const handleCatSave = async () => {
    if (!catFormData.name || !catFormData.slug) {
      showToast("error", "Name dan Slug wajib diisi");
      return;
    }
    try {
      if (catEditingId) {
        await updateCategory({ id: catEditingId, updates: catFormData });
        showToast("success", "Berhasil diperbarui");
      } else {
        await createCategory({
          department: catActiveDept,
          name: catFormData.name,
          slug: catFormData.slug,
          is_active: catFormData.is_active,
          parent_id: catParentId,
        });
        showToast(
          "success",
          catParentId ? "Sub-category berhasil ditambahkan" : "Category berhasil ditambahkan",
        );
      }
      resetCatForm();
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleCatDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    try {
      await deleteCategory(id);
      showToast("success", "Category deleted");
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleSlugify = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, "-");

  const filteredProducts = useMemo(() => {
    let list = products;
    
    // Filter by department
    if (activeDept !== "all") {
      list = list.filter((p) => p.retail_category === activeDept);
    }
    
    // Filter by active/inactive status
    if (activeStatusFilter === "active") {
      list = list.filter((p) => p.is_active === true);
    } else if (activeStatusFilter === "inactive") {
      list = list.filter((p) => p.is_active === false);
    }
    
    // Filter by category presence
    if (categoryFilter === "no-category") {
      list = list.filter((p) => !p.retail_category_id);
    }
    
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
      );
    }
    
    return list;
  }, [products, activeDept, activeStatusFilter, categoryFilter, search]);

  // Reset to first page when filters change
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  const openAddModal = () => {
    setEditingId(null);
    setImageFile(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      price: 0,
      stock: 0,
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
      image: null,
      is_active: true,
      retail_category: "glam",
      retail_category_id: null,
      retail_subcategory_id: null,
      variant: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: ProductRetail) => {
    setEditingId(product.id);
    setImageFile(null);
    setGalleryUrlInput("");
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      price: product.price,
      stock: product.stock,
      weight: product.weight,
      length: product.length || 0,
      width: product.width || 0,
      height: product.height || 0,
      image: product.image,
      is_active: product.is_active,
      retail_category: product.retail_category,
      retail_category_id: product.retail_category_id ?? null,
      retail_subcategory_id: product.retail_subcategory_id,
      variant: product.variant || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await deleteProduct(id);
      showToast("success", "Product deleted successfully");
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleSave = async () => {
    if (
      !formData.name ||
      !formData.slug ||
      !formData.retail_category ||
      !formData.retail_category_id
    ) {
      showToast("error", "Name, Slug, Department, dan Category wajib diisi.");
      return;
    }

    setIsUploading(true);
    try {
      let finalImageUrl = formData.image;

      // Upload image if selected
      if (imageFile) {
        const useR2 = import.meta.env.VITE_USE_R2_UPLOAD === 'true';
        
        if (useR2) {
          // Use Cloudflare R2 upload (new flow)
          console.log('Uploading to R2...');
          const tempProductId = editingId || 999999; // Use temp ID for new products
          finalImageUrl = await uploadToR2({
            file: imageFile,
            productId: tempProductId,
          });
          console.log('R2 upload successful:', finalImageUrl);
        } else {
          // Fallback to ImageKit upload (legacy flow)
          console.log('Uploading to ImageKit (fallback)...');
          const fileName = `${formData.slug}-${Date.now()}`;
          finalImageUrl = await uploadPublicAssetToImageKit({
            file: imageFile,
            fileName,
            folderPath: "public/retail-products",
          });
          console.log('ImageKit upload successful:', finalImageUrl);
        }
      }

      const updates = { ...formData, image: finalImageUrl };

      let savedProductId = editingId;
      if (editingId) {
        await updateProduct({ id: editingId, updates });
        showToast("success", "Product updated successfully");
      } else {
        const newProduct = await createProduct(updates);
        savedProductId = (newProduct as any)?.id ?? null;
        showToast("success", "Product created successfully");
      }

      // Sync product image as primary in gallery (display_order 0)
      // Shift existing gallery images to order 1, 2, ... so product image stays first
      if (savedProductId && finalImageUrl) {
        // Shift existing non-primary images up by 1
        const { data: existing } = await supabase
          .from("product_retail_images")
          .select("id, display_order, image_url")
          .eq("product_retail_id", savedProductId)
          .order("display_order", { ascending: true });

        if (existing && existing.length > 0) {
          // Unset all primaries and shift orders
          await supabase
            .from("product_retail_images")
            .update({ is_primary: false })
            .eq("product_retail_id", savedProductId);
          for (const img of existing) {
            await supabase
              .from("product_retail_images")
              .update({ display_order: img.display_order + 1 })
              .eq("id", img.id);
          }
          // Check if same URL already exists as an entry
          const alreadyExists = existing.find(
            (img: any) => img.image_url === finalImageUrl,
          );
          if (!alreadyExists) {
            await supabase.from("product_retail_images").insert({
              product_retail_id: savedProductId,
              image_url: finalImageUrl,
              is_primary: true,
              display_order: 0,
            });
          } else {
            await supabase
              .from("product_retail_images")
              .update({ is_primary: true, display_order: 0 })
              .eq("id", alreadyExists.id);
          }
        } else {
          // No existing gallery images — just insert
          await supabase.from("product_retail_images").insert({
            product_retail_id: savedProductId,
            image_url: finalImageUrl,
            is_primary: true,
            display_order: 0,
          });
        }
      }

      // Invalidate gallery cache so carousel section refreshes
      if (savedProductId) {
        queryClient.invalidateQueries({
          queryKey: ["retailProductImages", savedProductId],
        });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 3-tier form options
  const formCategories = useMemo(() => {
    if (!formData.retail_category) return [];
    return categories.filter(
      (c) => c.department === formData.retail_category && c.parent_id === null,
    );
  }, [categories, formData.retail_category]);

  const formSubcategories = useMemo(() => {
    if (!formData.retail_category_id) return [];
    return categories.filter(
      (c) => c.parent_id === formData.retail_category_id,
    );
  }, [categories, formData.retail_category_id]);

  // Root categories for active dept in category manager
  const catRootCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.parent_id === null && c.department === catActiveDept,
      ),
    [categories, catActiveDept],
  );

  // Sub-categories grouped by parent in category manager
  const catSubsByParent = useMemo(() => {
    const map = new Map<number, typeof categories>();
    categories
      .filter((c) => c.parent_id !== null && c.department === catActiveDept)
      .forEach((c) => {
        const arr = map.get(c.parent_id!) ?? [];
        arr.push(c);
        map.set(c.parent_id!, arr);
      });
    return map;
  }, [categories, catActiveDept]);

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="retail-products"
      title="E-Commerce Retail Inventory"
      subtitle="Manage online products and categories independently from the physical POS."
      onLogout={signOut}
    >
      {/* ── Category Manager (Expandable) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <button
          onClick={() => setShowCategoryManager(!showCategoryManager)}
          className="w-full flex justify-between items-center px-5 py-4 bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-[#ff4b86]" />
            <h2 className="font-bold text-gray-800">
              Manage Retail Categories
            </h2>
          </div>
          {showCategoryManager ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showCategoryManager && (
          <div className="p-5 border-t border-gray-100 flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                {DEPARTMENTS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setCatActiveDept(d.id as any);
                      resetCatForm();
                    }}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${catActiveDept === d.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* ── Category Manager tree list ── */}
              <div className="space-y-3">
                {catRootCategories.length === 0 && (
                  <p className="text-sm text-gray-400 p-4 text-center border border-dashed border-gray-200 rounded-lg">
                    Belum ada category di {catActiveDept}.
                  </p>
                )}
                {catRootCategories.map((root) => {
                  const subs = catSubsByParent.get(root.id) ?? [];
                  return (
                    <div key={root.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Root row */}
                      <div className="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 transition-colors group">
                        <div>
                          <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                            {root.name}
                            {!root.is_active && (
                              <span className="text-[9px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 uppercase">
                                Hidden
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-gray-400 font-mono">/{root.slug}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            title="Tambah sub-category"
                            onClick={() => {
                              resetCatForm();
                              setCatParentId(root.id);
                            }}
                            className="text-[#ff4b86] p-1 hover:bg-pink-50 rounded text-xs font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setCatEditingId(root.id);
                              setCatParentId(null);
                              setCatFormData({ name: root.name, slug: root.slug, is_active: root.is_active });
                            }}
                            className="text-blue-500 p-1 hover:bg-blue-50 rounded"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCatDelete(root.id, root.name)}
                            className="text-red-500 p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Sub-category rows */}
                      {subs.length > 0 && (
                        <div className="divide-y divide-gray-100">
                          {subs.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex justify-between items-center px-4 py-2.5 pl-8 bg-white hover:bg-gray-50 transition-colors"
                            >
                              <div>
                                <span className="text-sm text-gray-700 flex items-center gap-1">
                                  <span className="text-gray-300 text-xs">└</span>
                                  {sub.name}
                                  {!sub.is_active && (
                                    <span className="text-[9px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 uppercase">
                                      Hidden
                                    </span>
                                  )}
                                </span>
                                <p className="text-xs text-gray-400 font-mono pl-3">/{sub.slug}</p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setCatEditingId(sub.id);
                                    setCatParentId(sub.parent_id);
                                    setCatFormData({ name: sub.name, slug: sub.slug, is_active: sub.is_active });
                                  }}
                                  className="text-blue-500 p-1 hover:bg-blue-50 rounded"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleCatDelete(sub.id, sub.name)}
                                  className="text-red-500 p-1 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:w-[350px] bg-gray-50 p-4 rounded-xl border border-gray-200 h-fit">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm">
                  {catEditingId
                    ? "Edit Category"
                    : catParentId
                      ? `Tambah Sub-Category`
                      : "Tambah Category"}
                </h3>
                {(catEditingId || catParentId) && (
                  <button
                    onClick={resetCatForm}
                    className="text-xs text-gray-500 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Show parent info when adding sub */}
              {!catEditingId && catParentId && (
                <div className="mb-3 px-3 py-2 bg-pink-50 border border-pink-100 rounded-lg text-xs text-pink-700 font-semibold">
                  Parent: {catRootCategories.find((c) => c.id === catParentId)?.name}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={catFormData.name}
                    onChange={(e) =>
                      setCatFormData((p) => ({
                        ...p,
                        name: e.target.value,
                        slug: catEditingId
                          ? p.slug
                          : handleSlugify(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 px-3 py-1.5 rounded-md text-sm outline-none focus:border-[#ff4b86]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={catFormData.slug}
                    onChange={(e) =>
                      setCatFormData((p) => ({
                        ...p,
                        slug: handleSlugify(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 px-3 py-1.5 rounded-md text-sm font-mono outline-none focus:border-[#ff4b86]"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={catFormData.is_active}
                    onChange={(e) =>
                      setCatFormData((p) => ({
                        ...p,
                        is_active: e.target.checked,
                      }))
                    }
                    className="rounded text-[#ff4b86]"
                  />
                  <span className="text-xs font-bold text-gray-600">
                    Active
                  </span>
                </label>
                <button
                  onClick={handleCatSave}
                  className="w-full bg-[#ff4b86] text-white py-2 rounded-md text-sm font-bold hover:bg-[#e63d75] transition-colors mt-2"
                >
                  {catEditingId ? "Update" : catParentId ? "Tambah Sub-Category" : "Tambah Category"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        {/* Row 1: Department Tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => {
              setActiveDept("all");
              setCurrentPage(1);
            }}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeDept === "all" ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            All
          </button>
          {DEPARTMENTS.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setActiveDept(d.id);
                setCurrentPage(1);
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeDept === d.id ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Row 2: Additional Filters and Search */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Status Filter */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => {
                  setActiveStatusFilter("all");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${activeStatusFilter === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                All Status
              </button>
              <button
                onClick={() => {
                  setActiveStatusFilter("active");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${activeStatusFilter === "active" ? "bg-green-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                ✓ Active
              </button>
              <button
                onClick={() => {
                  setActiveStatusFilter("inactive");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${activeStatusFilter === "inactive" ? "bg-red-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                ✕ Inactive
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => {
                  setCategoryFilter("all");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${categoryFilter === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                All Categories
              </button>
              <button
                onClick={() => {
                  setCategoryFilter("no-category");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${categoryFilter === "no-category" ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                ⚠ No Category
              </button>
            </div>
          </div>

          {/* Search and Add Product */}
          <div className="flex flex-col items-end gap-2 w-full md:w-auto">
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#ff4b86]"
                />
              </div>
              <button
                onClick={openAddModal}
                className="flex items-center justify-center gap-2 bg-[#ff4b86] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#e63d75] shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>
            {filteredProducts.length > 0 && (
              <p className="text-xs text-gray-500 font-sans">
                Showing{" "}
                {Math.min(
                  (currentPage - 1) * PAGE_SIZE + 1,
                  filteredProducts.length,
                )}
                –{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} of{" "}
                {filteredProducts.length} products
              </p>
            )}
          </div>
        </div>

        {/* Row 3: Stats Summary */}
        {products.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-gray-900">{products.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Active:</span>
              <span className="font-bold text-green-700">
                {products.filter((p) => p.is_active).length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-gray-600">Inactive:</span>
              <span className="font-bold text-red-700">
                {products.filter((p) => !p.is_active).length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-gray-600">No Category:</span>
              <span className="font-bold text-orange-700">
                {products.filter((p) => !p.retail_category_id).length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="text-center p-10 text-gray-500 animate-pulse">
          Loading products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center p-16 bg-white rounded-xl border border-gray-200">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-500">No products found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-[#ff4b86] transition-colors group relative"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded z-10 w-fit">
                    {product.retail_category}{" "}
                    {product.retail_categories?.name
                      ? `/ ${product.retail_categories.name}`
                      : ""}
                  </span>
                  {!product.retail_category_id && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-600 px-2 py-0.5 rounded z-10 w-fit flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" />
                      No Category
                    </span>
                  )}
                </div>
                <div className="flex gap-1 z-10">
                  <button
                    onClick={() => openEditModal(product)}
                    className="text-blue-500 hover:bg-blue-50 bg-white shadow-sm p-1.5 rounded-md"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id, product.name)}
                    className="text-red-500 hover:bg-red-50 bg-white shadow-sm p-1.5 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Image Preview */}
              <div className="aspect-square bg-gray-50 rounded-lg mb-3 overflow-hidden border border-gray-100 flex items-center justify-center -mx-4 -mt-12 pt-12 relative">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <span className="material-symbols-outlined text-gray-300 text-4xl">
                    inventory_2
                  </span>
                )}
                {!product.is_active && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="bg-red-500 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded shadow-sm">
                      Inactive
                    </span>
                  </div>
                )}
              </div>

              <h3 className="font-bold text-gray-900 line-clamp-1">
                {product.name}
              </h3>
              <p className="text-xs text-gray-400 font-mono mb-3">
                {product.slug}
              </p>

              <div className="flex justify-between items-end mt-4">
                <div>
                  <p className="text-xs text-gray-500">
                    Stock:{" "}
                    <span className="font-bold text-gray-900">
                      {product.stock}
                    </span>
                  </p>
                  <p className="text-lg font-black text-[#ff4b86]">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                {!product.is_active && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold uppercase">
                    Inactive
                  </span>
                )}
              </div>

              {/* Weight badge — bottom-right corner of card */}
              {product.weight > 0 && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1 text-black text-[15px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {product.weight >= 1000
                    ? `${(product.weight / 1000).toFixed(product.weight % 1000 === 0 ? 0 : 1)} kg`
                    : `${product.weight} g`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">
                chevron_left
              </span>{" "}
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
              )
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1)
                  acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item as number)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                      currentPage === item
                        ? "bg-[#ff4b86] text-white shadow-sm"
                        : "border border-gray-200 text-gray-600 hover:border-[#ff4b86] hover:text-[#ff4b86]"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              Next{" "}
              <span className="material-symbols-outlined text-[18px]">
                chevron_right
              </span>
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="bg-white rounded-2xl w-full max-w-2xl relative shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="font-bold text-lg">
                {editingId ? "Edit Retail Product" : "New Retail Product"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Details ── */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        name: e.target.value,
                        slug: editingId
                          ? p.slug
                          : handleSlugify(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:border-[#ff4b86] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Variant Name
                  </label>
                  <input
                    type="text"
                    value={formData.variant || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, variant: e.target.value }))
                    }
                    placeholder="e.g. Size M, Merah (optional)"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:border-[#ff4b86] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        slug: handleSlugify(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 bg-gray-50 px-3 py-2 rounded-lg text-sm font-mono focus:border-[#ff4b86] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Department
                  </label>
                  <select
                    value={formData.retail_category || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        retail_category: e.target.value as any,
                        retail_category_id: null,
                        retail_subcategory_id: null,
                      }))
                    }
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm bg-white outline-none"
                  >
                    <option value="" disabled>
                      Pilih Department
                    </option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={formData.retail_category_id || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        retail_category_id: Number(e.target.value),
                        retail_subcategory_id: null,
                      }))
                    }
                    disabled={!formData.retail_category || isLoadingCats}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm bg-white outline-none disabled:opacity-50"
                  >
                    <option value="">Pilih Category</option>
                    {formCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Sub-Category (Optional)
                  </label>
                  <select
                    value={formData.retail_subcategory_id || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        retail_subcategory_id: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    disabled={!formData.retail_category_id || isLoadingCats}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm bg-white outline-none disabled:opacity-50"
                  >
                    <option value="">Pilih Sub-Category</option>
                    {formSubcategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        price: e.target.value === "" ? ("" as any) : Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        stock: e.target.value === "" ? ("" as any) : Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Weight (g)
                  </label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        weight: e.target.value === "" ? ("" as any) : Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Length (cm)
                  </label>
                  <input
                    type="number"
                    value={formData.length ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        length: e.target.value === "" ? ("" as any) : Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Width (cm)
                  </label>
                  <input
                    type="number"
                    value={formData.width ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        width: e.target.value === "" ? ("" as any) : Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={formData.height ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        height: e.target.value === "" ? ("" as any) : Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  Product Image
                </label>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                  {/* Upload Option */}
                  <div className="flex items-start gap-4">
                    {(imageFile || formData.image) && (
                      <img
                        src={
                          imageFile
                            ? URL.createObjectURL(imageFile)
                            : (formData.image as string)
                        }
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0 bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/100x100?text=Invalid+Image";
                        }}
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-bold text-gray-600">
                        Option 1: Upload New File
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setImageFile(e.target.files[0]);
                          }
                        }}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#ff4b86]/10 file:text-[#ff4b86] hover:file:bg-[#ff4b86]/20 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase">
                      Or
                    </span>
                    <div className="flex-grow border-t border-gray-300"></div>
                  </div>

                  {/* Paste URL Option */}
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">
                      Option 2: Paste Existing Image URL
                    </p>
                    <input
                      type="url"
                      placeholder="https://ik.imagekit.io/..."
                      value={(formData.image as string) || ""}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, image: e.target.value }));
                        // Jika user mengetik URL, kita batalkan file yang dipilih (jika ada)
                        if (e.target.value) {
                          setImageFile(null);
                        }
                      }}
                      className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none focus:border-[#ff4b86]"
                    />
                  </div>
                </div>
              </div>

              {/* ── Carousel Images Manager (edit-only, below product image) ── */}
              {editingId && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <Images className="w-4 h-4 text-[#ff4b86]" />
                      <span className="text-xs font-bold text-gray-700 uppercase">
                        Carousel Images
                      </span>
                      {galleryImages.length > 0 && (
                        <span className="bg-[#ff4b86] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {galleryImages.length}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      Product image = primary · Carousel = 2nd, 3rd…
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Gallery Grid */}
                    {galleryLoading ? (
                      <div className="text-center py-6 text-gray-400 text-sm animate-pulse">
                        Loading images...
                      </div>
                    ) : galleryImages.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                        No carousel images yet. Add below — the product image
                        above is already the primary.
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {galleryImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative group rounded-lg overflow-hidden border-2 border-gray-100 aspect-square bg-gray-50"
                          >
                            <img
                              src={img.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            {img.is_primary && (
                              <div className="absolute top-1 left-1 bg-[#ff4b86] text-white text-[8px] font-bold uppercase px-1 py-0.5 rounded-full flex items-center gap-0.5">
                                <Star className="w-2 h-2 fill-white" /> Primary
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-center gap-1.5">
                              {!img.is_primary && (
                                <button
                                  title="Set as primary"
                                  onClick={() => setPrimary.mutate(img.id)}
                                  disabled={setPrimary.isPending}
                                  className="bg-yellow-400 text-white p-1 rounded-full hover:bg-yellow-500 disabled:opacity-50"
                                >
                                  <Star className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                title="Delete"
                                onClick={() => {
                                  if (window.confirm("Delete this image?"))
                                    deleteImage.mutate(img.id);
                                }}
                                disabled={deleteImage.isPending}
                                className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 disabled:opacity-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new carousel image */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        ref={galleryFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setGalleryUploading(true);
                          try {
                            await uploadAndAdd.mutateAsync({
                              file,
                              isPrimary: false,
                              displayOrder: galleryImages.length,
                            });
                            showToast("success", "Image uploaded!");
                          } catch (err: any) {
                            showToast("error", err.message);
                          } finally {
                            setGalleryUploading(false);
                            if (galleryFileRef.current)
                              galleryFileRef.current.value = "";
                          }
                        }}
                      />
                      <button
                        onClick={() => galleryFileRef.current?.click()}
                        disabled={galleryUploading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff4b86] text-white rounded-lg text-xs font-bold hover:bg-[#e63d75] disabled:opacity-50 flex-shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {galleryUploading ? "Uploading..." : "Upload"}
                      </button>
                      <input
                        type="url"
                        placeholder="or paste image URL…"
                        value={galleryUrlInput}
                        onChange={(e) => setGalleryUrlInput(e.target.value)}
                        className="flex-1 border border-gray-300 px-3 py-1.5 rounded-lg text-sm outline-none focus:border-[#ff4b86] min-w-0"
                      />
                      <button
                        onClick={async () => {
                          if (!galleryUrlInput.trim()) return;
                          try {
                            await addImage.mutateAsync({
                              imageUrl: galleryUrlInput.trim(),
                              isPrimary: false,
                              displayOrder: galleryImages.length,
                            });
                            setGalleryUrlInput("");
                            showToast("success", "Image added!");
                          } catch (err: any) {
                            showToast("error", err.message);
                          }
                        }}
                        disabled={!galleryUrlInput.trim() || addImage.isPending}
                        className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900 disabled:opacity-40 flex-shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      is_active: e.target.checked,
                    }))
                  }
                  className="rounded text-[#ff4b86] w-4 h-4"
                />
                <span className="text-sm font-bold text-gray-700">
                  Active (Visible in Shop)
                </span>
              </label>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isUploading}
                className="px-5 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold bg-[#ff4b86] text-white hover:bg-[#e63d75] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />{" "}
                {isUploading ? "Saving..." : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
