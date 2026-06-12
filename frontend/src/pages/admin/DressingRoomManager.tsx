import { useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { DressingRoomCollectionsView } from './dressing-room-manager/DressingRoomCollectionsView';
import { DressingRoomEditorView } from './dressing-room-manager/DressingRoomEditorView';
import { useDressingRoomManagerController } from './dressing-room-manager/useDressingRoomManagerController';
import { DressingRoomCSVImportModal } from '../../components/admin/DressingRoomCSVImportModal';
import { saveInventoryProductMutation } from './store-inventory/inventoryProductMutations';
import { supabase } from '../../lib/supabase';
import { useState } from 'react';

// ─── Component ──────────────────────────────────────────────────────────
export default function DressingRoomManager() {
    const { signOut, session, getValidAccessToken, refreshSession } = useAuth();
    const menuSections = useAdminMenuSections();
    const [showCSVImport, setShowCSVImport] = useState(false);
    const [isImportingCSV, setIsImportingCSV] = useState(false);
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const controller = useDressingRoomManagerController(showToast);
    const {
        view, collections, selectedCollection, looks, loading, saving, formTitle, formDescription, showCreateForm,
        uploadingLookId, pendingUpload, containerWidth, isDragging, editingModelName, modelNameValue,
        editingCollectionInfo, collectionTitle, collectionDesc, productSearch, productResults, searchingProducts, showProductPicker,
        setView, setSelectedCollection, setFormTitle, setFormDescription, setShowCreateForm, setPendingUpload, setIsDragging,
        setEditingModelName, setModelNameValue, setEditingCollectionInfo, setCollectionTitle, setCollectionDesc, setShowProductPicker,
        handleCreateCollection, handleToggleActive, handleDeleteCollection, openEditor, handleSaveCollectionInfo, handleAddLook, handleAddPhoto,
        handleReplacePhoto, handleDeletePhoto, handleSaveModelName, handleDeleteLook, searchProducts, handleLinkProduct, handleUnlinkProduct,
        containerRef, getActivePhotoIndex, setActivePhotoIndex, goPhotoNext, goPhotoPrev, handleDragEnd,
    } = controller;

    const handleCSVImport = async (drafts: any[]) => {
        setIsImportingCSV(true);
        let successCount = 0;
        let failCount = 0;

        try {
            // Get Dressing Room category id
            const { data: category } = await supabase
                .from('categories')
                .select('id')
                .eq('name', 'Dressing Room')
                .single();
            
            const categoryId = category?.id || null;

            for (const draft of drafts) {
                try {
                    await saveInventoryProductMutation({
                        draft: { ...draft, category_id: categoryId },
                        newImages: [],
                        removedImageUrls: [],
                        auth: { session, getValidAccessToken, refreshSession },
                    });
                    successCount++;
                } catch (error) {
                    failCount++;
                    console.error(`Failed to import ${draft.name}:`, error);
                }
            }

            showToast(
                failCount === 0 ? 'success' : 'info',
                `Import selesai: ${successCount} produk berhasil${failCount > 0 ? `, ${failCount} gagal` : ''}`
            );
        } catch (error) {
            console.error('Failed to process CSV import:', error);
            showToast('error', 'Terjadi kesalahan saat memproses import CSV');
        } finally {
            setIsImportingCSV(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <AdminLayout
            title="Dressing Room"
            subtitle="Kelola koleksi dressing room"
            menuItems={ADMIN_MENU_ITEMS}
            menuSections={menuSections}
            defaultActiveMenuId="dressing-room"
            onLogout={signOut}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept=".png,image/png"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && pendingUpload) {
                        if (pendingUpload.kind === 'add-photo') void handleAddPhoto(pendingUpload.lookId, f);
                        if (pendingUpload.kind === 'replace-photo') void handleReplacePhoto(pendingUpload.lookId, pendingUpload.photoId, pendingUpload.previousUrl, f);
                    }
                    e.target.value = '';
                    setPendingUpload(null);
                }}
            />

            {view === 'list' ? (
                <DressingRoomCollectionsView
                    loading={loading}
                    saving={saving}
                    collections={collections}
                    showCreateForm={showCreateForm}
                    formTitle={formTitle}
                    formDescription={formDescription}
                    onToggleCreateForm={() => setShowCreateForm(!showCreateForm)}
                    onOpenCSVImport={() => setShowCSVImport(true)}
                    onChangeFormTitle={setFormTitle}
                    onChangeFormDescription={setFormDescription}
                    onCreateCollection={() => void handleCreateCollection()}
                    onToggleActive={(collection) => void handleToggleActive(collection)}
                    onOpenEditor={openEditor}
                    onDeleteCollection={(collectionId) => void handleDeleteCollection(collectionId)}
                />
            ) : (
                <DressingRoomEditorView
                    selectedCollection={selectedCollection}
                    looks={looks}
                    fileInputRef={fileInputRef}
                    pendingUpload={pendingUpload}
                    editingCollectionInfo={editingCollectionInfo}
                    collectionTitle={collectionTitle}
                    collectionDesc={collectionDesc}
                    editingModelName={editingModelName}
                    modelNameValue={modelNameValue}
                    showProductPicker={showProductPicker}
                    productSearch={productSearch}
                    productResults={productResults}
                    searchingProducts={searchingProducts}
                    uploadingLookId={uploadingLookId}
                    containerWidth={containerWidth}
                    isDragging={isDragging}
                    getActivePhotoIndex={getActivePhotoIndex}
                    setActivePhotoIndex={setActivePhotoIndex}
                    onBack={() => { setView('list'); setSelectedCollection(null); setEditingCollectionInfo(false); }}
                    onChangeCollectionTitle={setCollectionTitle}
                    onChangeCollectionDesc={setCollectionDesc}
                    onToggleEditingCollectionInfo={(value) => {
                        setEditingCollectionInfo(value);
                        if (!value) {
                            setCollectionTitle(selectedCollection?.title || '');
                            setCollectionDesc(selectedCollection?.description || '');
                        }
                    }}
                    onSaveCollectionInfo={() => void handleSaveCollectionInfo()}
                    onAddLook={() => void handleAddLook()}
                    onPrepareUpload={setPendingUpload}
                    onDeleteLook={(lookId, imageUrl) => void handleDeleteLook(lookId, imageUrl)}
                    onSetEditingModelName={setEditingModelName}
                    onSetModelNameValue={setModelNameValue}
                    onSaveModelName={(lookId) => void handleSaveModelName(lookId)}
                    onToggleProductPicker={() => setShowProductPicker(!showProductPicker)}
                    onSearchProducts={(query) => void searchProducts(query)}
                    onLinkProduct={(lookId, variantId) => void handleLinkProduct(lookId, variantId)}
                    onUnlinkProduct={(itemId) => void handleUnlinkProduct(itemId)}
                    onDeletePhoto={(photoId, imageUrl) => void handleDeletePhoto(photoId, imageUrl)}
                    onGoPhotoPrev={goPhotoPrev}
                    onGoPhotoNext={goPhotoNext}
                    onContainerRef={containerRef}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={handleDragEnd}
                />
            )}

            <DressingRoomCSVImportModal
                isOpen={showCSVImport}
                onClose={() => setShowCSVImport(false)}
                onImport={handleCSVImport}
                isImporting={isImportingCSV}
            />
        </AdminLayout>
    );
}
