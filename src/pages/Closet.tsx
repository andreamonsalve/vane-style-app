import React, { useState, useEffect, useRef } from 'react';
import { Plus, Loader2, Lock, Trash2, Heart } from 'lucide-react';
import { supabase } from '@/src/lib/supabaseClient';
import { useAuth } from '@/src/contexts/AuthContext';
import { categorizeClothing } from '@/src/lib/geminiService';
import { useDiagnosisStore } from '@/src/lib/diagnosisStore';
import { useNavigate } from 'react-router-dom';

interface ClosetItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  color: string;
  image_url: string;
  storage_path: string;
  is_favorite: boolean;
}

export const Closet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('TODO');
  const isPremium = useDiagnosisStore(state => state.isPremium);

  const ITEM_LIMIT = isPremium ? 20 : 10;
  const isLimitReached = items.length >= ITEM_LIMIT;

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const getSignedUrl = async (imageUrl: string): Promise<string> => {
    // Extract storage path from full URL or use as-is if already a path
    let path = imageUrl;
    const publicMarker = '/storage/v1/object/public/closet-items/';
    const signedMarker = '/storage/v1/object/sign/closet-items/';
    if (imageUrl.includes(publicMarker)) {
      path = imageUrl.split(publicMarker)[1];
    } else if (imageUrl.includes(signedMarker)) {
      path = imageUrl.split(signedMarker)[1].split('?')[0];
    }

    const { data } = await supabase.storage
      .from('closet-items')
      .createSignedUrl(path, 3600);
    return data?.signedUrl || imageUrl;
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const itemsWithUrls = await Promise.all(
        (data || []).map(async (item) => ({
          ...item,
          storage_path: item.image_url,
          image_url: await getSignedUrl(item.image_url),
          is_favorite: item.is_favorite ?? false,
        }))
      );
      setItems(itemsWithUrls);
    } catch (err) {
      console.error('Error fetching closet items:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['TODO', 'FAVORITO', ...Array.from(new Set(items.map((item: ClosetItem) => item.category?.toUpperCase() || 'OTRO')))];

  const filteredItems = activeCategory === 'TODO'
    ? items
    : activeCategory === 'FAVORITO'
    ? items.filter(item => item.is_favorite)
    : items.filter(item => (item.category?.toUpperCase() || 'OTRO') === activeCategory);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (isLimitReached) {
      setUploadError(`Has alcanzado el límite de ${ITEM_LIMIT} prendas. Actualiza a Premium para agregar más.`);
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      // 1. Get Base64 for Gemini
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (event) => resolve((event.target?.result as string).split(',')[1]);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      // 2. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('closet-items')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Auto-categorize with Gemini AI
      const aiData = await categorizeClothing(base64);

      // 4. Save to Database — store the storage path, not the full public URL
      const { data: insertedData, error: insertError } = await supabase
        .from('closet_items')
        .insert({
          user_id: user.id,
          image_url: filePath,
          name: aiData.name,
          category: aiData.category,
          subcategory: aiData.subcategory,
          color: aiData.color
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update UI — use signed URL for immediate display
      const signedUrl = await getSignedUrl(insertedData.image_url);
      setItems(prev => [{
        ...insertedData,
        storage_path: insertedData.image_url,
        image_url: signedUrl,
        is_favorite: false,
      }, ...prev]);

    } catch (err) {
      setUploadError('Hubo un error al subir la prenda. Por favor intenta de nuevo.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (item: ClosetItem) => {
    await supabase.storage.from('closet-items').remove([item.storage_path]);
    await supabase.from('closet_items').delete().eq('id', item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const handleToggleFavorite = async (item: ClosetItem) => {
    const newValue = !item.is_favorite;
    const { error } = await supabase
      .from('closet_items')
      .update({ is_favorite: newValue })
      .eq('id', item.id);
    if (error) {
      console.error('Error al actualizar favorito:', error.message);
      return;
    }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_favorite: newValue } : i));
  };

  return (
    <div className="pb-24 min-h-screen bg-white">
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden" 
      />

      <header className="px-6 pt-12 mb-8">
        <div className="flex justify-between items-end mb-4">
          <h1 className="display-lg">TU CLOSET</h1>
          <div className="text-right">
            <span className="overline-text text-[10px] text-mid-gray block">CAPACIDAD</span>
            <span className={`font-sans text-[12px] ${isLimitReached ? 'text-error font-medium' : 'text-black'}`}>
              {items.length} / {ITEM_LIMIT}
            </span>
          </div>
        </div>
        
        {!isPremium && isLimitReached && (
          <button
            onClick={() => navigate('/paywall')}
            className="mb-6 w-full p-4 bg-off-white border border-light-gray flex items-center justify-between hover:bg-light-gray transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            aria-label="Aumentar capacidad a 20 prendas — ir a Premium"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-black" aria-hidden="true" />
              <p className="font-sans text-[11px] text-black">Aumentar capacidad a 20 prendas</p>
            </div>
            <span className="overline-text text-[10px] text-black underline tracking-wider">UPGRADE</span>
          </button>
        )}

        {uploadError && (
          <p
            role="alert"
            aria-live="assertive"
            className="mb-4 font-sans text-[12px] text-error border border-error/20 bg-error/5 px-3 py-2"
          >
            {uploadError}
          </p>
        )}

        <div
          role="tablist"
          aria-label="Filtrar por categoría"
          className="flex gap-4 mt-6 overflow-x-auto no-scrollbar overline-text text-[10px]"
        >
          {categories.map(cat => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              aria-pressed={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap pb-1 uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${activeCategory === cat ? 'border-b border-black text-black' : 'text-mid-gray hover:text-charcoal'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center p-12" role="status" aria-label="Cargando prendas">
          <Loader2 className="w-8 h-8 animate-spin text-mid-gray" aria-hidden="true" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="px-6 text-center py-12">
          <p className="font-sans text-[13px] text-dark-gray mb-4">
            Tu closet está vacío.
          </p>
          <p className="font-sans text-[11px] text-mid-gray">
            Sube fotos de tus prendas y la IA de VaneStyle las categorizará automáticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-[1px] bg-light-gray border-y border-light-gray">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white relative">
              <div className="aspect-[3/4] overflow-hidden bg-off-white relative">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {/* Action buttons */}
                <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                  <button
                    onClick={() => handleToggleFavorite(item)}
                    aria-label={item.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 transition-colors ${item.is_favorite ? 'fill-black text-black' : 'text-mid-gray'}`}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    aria-label="Eliminar prenda"
                    className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-mid-gray" aria-hidden="true" />
                  </button>
                </div>
                {/* Category tag */}
                {item.category && (
                  <div className="absolute bottom-2 left-2">
                    <span className="font-sans text-[9px] font-medium bg-white/90 px-2 py-0.5 uppercase tracking-wide">
                      {item.category}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 space-y-0.5">
                <h3 className="overline-text text-[10px] tracking-[0.05em] truncate uppercase">{item.name}</h3>
                <p className="caption-text text-dark-gray capitalize">{item.color}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Indicator Overlay */}
      {uploading && (
        <div
          className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4"
          role="status"
          aria-label="Analizando prenda con IA, por favor espera"
          aria-live="assertive"
        >
          <Loader2 className="w-10 h-10 animate-spin text-black" aria-hidden="true" />
          <div className="text-center">
            <p className="overline-text text-black tracking-[0.1em] mb-1">ANALIZANDO PRENDA</p>
            <p className="font-sans text-[11px] text-mid-gray">Categorizando con IA...</p>
          </div>
        </div>
      )}

      <div className="fixed bottom-24 right-6 z-40">
        <button
          onClick={() => {
            if (isLimitReached && !isPremium) {
              navigate('/paywall');
            } else {
              fileInputRef.current?.click();
            }
          }}
          disabled={uploading}
          aria-label={isLimitReached && !isPremium ? 'Límite alcanzado — ir a Premium' : 'Agregar prenda al closet'}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${isLimitReached && !isPremium ? 'bg-mid-gray' : 'bg-black text-white hover:bg-charcoal active:scale-95'}`}
        >
          {isLimitReached && !isPremium
            ? <Lock className="w-6 h-6 text-white" aria-hidden="true" />
            : <Plus className="w-6 h-6 text-white" aria-hidden="true" />
          }
        </button>
      </div>
    </div>
  );
};
