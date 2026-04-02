import React, { useState, useEffect, useRef } from 'react';
import { Plus, Loader2, X, Lock } from 'lucide-react';
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
}

export const Closet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('TODO');
  const isPremium = useDiagnosisStore(state => state.isPremium);

  const ITEM_LIMIT = isPremium ? 20 : 5;
  const isLimitReached = items.length >= ITEM_LIMIT;

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching closet items:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['TODO', ...Array.from(new Set(items.map(item => item.category?.toUpperCase() || 'OTRO')))];

  const filteredItems = activeCategory === 'TODO' 
    ? items 
    : items.filter(item => (item.category?.toUpperCase() || 'OTRO') === activeCategory);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (isLimitReached) {
      alert(`Has alcanzado el límite de ${ITEM_LIMIT} prendas para tu plan actual.`);
      return;
    }

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

      const { data: { publicUrl } } = supabase.storage
        .from('closet-items')
        .getPublicUrl(filePath);

      // 3. Auto-categorize with Gemini AI
      const aiData = await categorizeClothing(base64);

      // 4. Save to Database
      const { data: insertedData, error: insertError } = await supabase
        .from('closet_items')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          name: aiData.name,
          category: aiData.category,
          subcategory: aiData.subcategory,
          color: aiData.color
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update UI
      setItems(prev => [insertedData, ...prev]);

    } catch (err) {
      console.error('Upload error:', err);
      alert('Hubo un error al subir la prenda. Por favor intenta de nuevo.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
          <div 
            onClick={() => navigate('/paywall')}
            className="mb-6 p-4 bg-off-white border border-light-gray flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-black" />
              <p className="font-sans text-[11px] text-black">Aumentar capacidad a 20 prendas</p>
            </div>
            <span className="overline-text text-[10px] text-black underline tracking-wider">UPGRADE</span>
          </div>
        )}

        <div className="flex gap-4 mt-6 overflow-x-auto no-scrollbar overline-text text-[10px]">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap pb-1 uppercase ${activeCategory === cat ? 'border-b border-black text-black' : 'text-mid-gray'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-mid-gray" />
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
            <div key={item.id} className="bg-white group cursor-pointer relative">
              <div className="aspect-[3/4] overflow-hidden bg-off-white">
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-1">
                <h3 className="overline-text text-[10px] tracking-[0.05em] truncate uppercase">{item.name}</h3>
                <p className="caption-text text-dark-gray capitalize">{item.subcategory} · {item.color}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Indicator Overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-black" />
          <div className="text-center">
            <h3 className="overline-text text-black tracking-[0.1em] mb-1">ANALIZANDO PRENDA</h3>
            <p className="font-sans text-[11px] text-mid-gray">Categorizando con IA...</p>
          </div>
        </div>
      )}

      <div className="fixed bottom-24 right-6 z-40">
        <button 
          onClick={() => {
            if (isLimitReached) {
              navigate('/paywall');
            } else {
              fileInputRef.current?.click();
            }
          }}
          disabled={uploading}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-colors disabled:opacity-50 ${isLimitReached && !isPremium ? 'bg-mid-gray' : 'bg-black text-white hover:bg-charcoal'}`}
        >
          {isLimitReached && !isPremium ? <Lock className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
        </button>
      </div>
    </div>
  );
};
