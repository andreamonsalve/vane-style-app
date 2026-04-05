import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ChevronLeft, Bookmark } from 'lucide-react';
import { supabase } from '@/src/lib/supabaseClient';
import { useAuth } from '@/src/contexts/AuthContext';
import { useDiagnosisStore } from '@/src/lib/diagnosisStore';
import { generateOutfits } from '@/src/lib/geminiService';
import type { OutfitSuggestion } from '@/src/lib/geminiService';

// ─── Types ────────────────────────────────────────────────

interface ClosetItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  color: string;
  image_url: string;
  storage_path: string;
}

interface GeneratedOutfit {
  tempId: string;
  name: string;
  occasion: string;
  anchorItem: ClosetItem;
  outfitItems: ClosetItem[];
  matchScore: number;
  reasoning: string;
  missingItem?: { category: string; description: string };
}

interface SavedOutfit extends GeneratedOutfit {
  dbId: string;
  savedName: string;
  savedAt: string;
  isOutfitOfTheDay: boolean;
  scheduledFor?: string;
}

type OutfitView = 'library' | 'anchor' | 'occasion' | 'generating' | 'suggestions' | 'detail' | 'save';

const OCCASIONS = [
  { key: 'trabajo', label: 'Trabajo', sub: 'Profesional y cómoda' },
  { key: 'casual', label: 'Casual', sub: 'Día a día, sin esfuerzo aparente' },
  { key: 'noche', label: 'Noche y eventos', sub: 'Salidas, cenas, reuniones' },
  { key: 'especial', label: 'Ocasión especial', sub: 'Bodas, galas, celebraciones' },
];

// ─── Helpers ──────────────────────────────────────────────

const getSignedUrl = async (imageUrl: string): Promise<string> => {
  let path = imageUrl;
  const publicMarker = '/storage/v1/object/public/closet-items/';
  const signedMarker = '/storage/v1/object/sign/closet-items/';
  if (imageUrl.includes(publicMarker)) path = imageUrl.split(publicMarker)[1];
  else if (imageUrl.includes(signedMarker)) path = imageUrl.split(signedMarker)[1].split('?')[0];

  const { data } = await supabase.storage.from('closet-items').createSignedUrl(path, 3600);
  return data?.signedUrl || imageUrl;
};

// ─── Main Component ───────────────────────────────────────

export const Outfits = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { faceDiagnosis, colorDiagnosis, isPremium } = useDiagnosisStore();

  // View state
  const [view, setView] = useState<OutfitView>('library');

  // Data
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Generation flow
  const [selectedAnchor, setSelectedAnchor] = useState<ClosetItem | null>(null);
  const [anchorCategory, setAnchorCategory] = useState('TODO');
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [paletteScope, setPaletteScope] = useState<'complete' | 'baseOnly'>('complete');

  // Results
  const [suggestions, setSuggestions] = useState<GeneratedOutfit[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<GeneratedOutfit | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateStep, setGenerateStep] = useState(0);

  // Save form
  const [saveName, setSaveName] = useState('');
  const [saveOccasion, setSaveOccasion] = useState('');
  const [isOutfitOfTheDay, setIsOutfitOfTheDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Library filter
  const [libraryFilter, setLibraryFilter] = useState('VER TODO');

  // Detail source (from suggestions or library)
  const [detailFromLibrary, setDetailFromLibrary] = useState(false);

  // ── Load data ──────────────────────────────────────────

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      // Load closet items
      const { data: closetData } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      const itemsWithUrls = await Promise.all(
        (closetData || []).map(async (item) => ({
          ...item,
          storage_path: item.image_url,
          image_url: await getSignedUrl(item.image_url),
        }))
      );
      setClosetItems(itemsWithUrls);

      // Load saved outfits
      const { data: outfitsData } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (outfitsData && outfitsData.length > 0) {
        const hydrated = outfitsData.map((o) => {
          const allItems = itemsWithUrls;
          const anchor = allItems.find(i => i.id === o.anchor_item_id);
          const items = (o.item_ids || []).map((id: string) => allItems.find(i => i.id === id)).filter(Boolean) as ClosetItem[];
          return {
            dbId: o.id,
            tempId: o.id,
            savedName: o.name,
            name: o.name,
            occasion: o.occasion,
            savedAt: o.created_at,
            isOutfitOfTheDay: o.is_outfit_of_the_day || false,
            scheduledFor: o.scheduled_for,
            anchorItem: anchor || items[0],
            outfitItems: anchor ? [anchor, ...items.filter(i => i.id !== anchor.id)] : items,
            matchScore: o.match_score || 0,
            reasoning: o.reasoning || '',
            missingItem: o.missing_item || undefined,
          } as SavedOutfit;
        }).filter(o => o.anchorItem);
        setSavedOutfits(hydrated);
      }
    } catch (err) {
      console.error('Error loading outfits data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // ── Generation ─────────────────────────────────────────

  const handleGenerateOutfits = async () => {
    if (!selectedAnchor) return;
    setGenerating(true);
    setGenerateStep(0);
    setView('generating');

    // Animate checklist steps
    const steps = [1, 2, 3];
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 900));
      setGenerateStep(step);
    }

    try {
      const otherItems = closetItems.filter(i => i.id !== selectedAnchor.id);
      const occasionLabel = OCCASIONS.find(o => o.key === selectedOccasion)?.label || selectedOccasion;

      const rawSuggestions: OutfitSuggestion[] = await generateOutfits(
        { id: selectedAnchor.id, name: selectedAnchor.name, category: selectedAnchor.category, color: selectedAnchor.color },
        otherItems.map(i => ({ id: i.id, name: i.name, category: i.category, color: i.color })),
        occasionLabel,
        {
          faceType: faceDiagnosis?.faceType,
          colorSeason: colorDiagnosis?.season,
          palette: paletteScope === 'baseOnly' ? colorDiagnosis?.palette?.slice(0, 3) : colorDiagnosis?.palette,
        }
      );

      const generated: GeneratedOutfit[] = rawSuggestions.map((s, i) => {
        const additionalItems = s.itemIds
          .map(id => closetItems.find(ci => ci.id === id))
          .filter(Boolean) as ClosetItem[];
        return {
          tempId: `gen_${Date.now()}_${i}`,
          name: s.name,
          occasion: selectedOccasion,
          anchorItem: selectedAnchor,
          outfitItems: [selectedAnchor, ...additionalItems],
          matchScore: s.matchScore,
          reasoning: s.reasoning,
          missingItem: s.missingItem,
        };
      });

      setSuggestions(generated);
      setView('suggestions');
    } catch (err) {
      console.error('Error generating outfits:', err);
      setView('occasion');
    } finally {
      setGenerating(false);
    }
  };

  // ── Save ───────────────────────────────────────────────

  const handleSaveOutfit = async () => {
    if (!selectedSuggestion || !user) return;
    if (!isPremium && savedOutfits.length >= 5) {
      navigate('/paywall');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const itemIds = selectedSuggestion.outfitItems
        .filter(i => i.id !== selectedSuggestion.anchorItem.id)
        .map(i => i.id);

      const { data, error } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: saveName || selectedSuggestion.name,
          occasion: saveOccasion || selectedSuggestion.occasion,
          anchor_item_id: selectedSuggestion.anchorItem.id,
          item_ids: itemIds,
          reasoning: selectedSuggestion.reasoning,
          match_score: selectedSuggestion.matchScore,
          missing_item: selectedSuggestion.missingItem || null,
          is_outfit_of_the_day: isOutfitOfTheDay,
          scheduled_for: isOutfitOfTheDay ? new Date(Date.now() + 86400000).toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      const newSaved: SavedOutfit = {
        ...selectedSuggestion,
        dbId: data.id,
        savedName: saveName || selectedSuggestion.name,
        savedAt: data.created_at,
        isOutfitOfTheDay,
        scheduledFor: data.scheduled_for,
      };
      setSavedOutfits(prev => [newSaved, ...prev]);
      setView('library');
      setSelectedSuggestion(null);
      setSaveName('');
      setSaveOccasion('');
      setIsOutfitOfTheDay(false);
    } catch (err: any) {
      console.error('Error al guardar outfit:', err?.message || err);
      setSaveError('No se pudo guardar el outfit. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Start new outfit flow ──────────────────────────────

  const startFlow = () => {
    setSelectedAnchor(null);
    setAnchorCategory('TODO');
    setSelectedOccasion('');
    setPaletteScope('complete');
    setSuggestions([]);
    setSelectedSuggestion(null);
    setGenerateStep(0);
    setView('anchor');
  };

  // ── Closet categories for anchor filter ───────────────

  const closetCategories = ['TODO', ...Array.from(new Set(closetItems.map(i => i.category?.toUpperCase() || 'OTRO')))];
  const filteredAnchorItems = anchorCategory === 'TODO'
    ? closetItems
    : closetItems.filter(i => (i.category?.toUpperCase() || 'OTRO') === anchorCategory);

  // ── Library filter ─────────────────────────────────────

  const libraryOccasions = ['VER TODO', ...Array.from(new Set(savedOutfits.map(o => o.occasion.toUpperCase())))];
  const filteredSaved = libraryFilter === 'VER TODO'
    ? savedOutfits
    : savedOutfits.filter(o => o.occasion.toUpperCase() === libraryFilter);

  const outfitOfToday = savedOutfits.find(o => o.isOutfitOfTheDay);

  // ────────────────────────────────────────────────────────
  // RENDER: LIBRARY (screen 1 / screen 8)
  // ────────────────────────────────────────────────────────

  if (view === 'library') {
    if (dataLoading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <div className="w-6 h-6 border border-black border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="overline-text text-mid-gray text-[10px]">CARGANDO</p>
          </div>
        </div>
      );
    }

    // Empty state
    if (savedOutfits.length === 0) {
      return (
        <div className="pb-6 px-[18px] pt-5">
          <p className="overline-text text-mid-gray mb-2 text-[9px]">OUTFITS</p>
          <h1 className="font-display font-light text-[30px] leading-[1] text-black mb-8">
            Estrena<br />sin gastar.
          </h1>
          <div className="text-center">
            <div className="w-full aspect-[2/3] mb-4 overflow-hidden">
              <img
                src="/images/outfits-banner.png"
                alt="Outfits VaneStyle"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="font-sans text-[11px] text-dark-gray leading-relaxed mb-5">
              La IA combina lo que ya tienes<br />y crea outfits para usar hoy.
            </p>
            {closetItems.length < 3 ? (
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/closet')}
                  className="w-full border border-black py-[11px] overline-text text-[11px] text-black bg-white"
                >
                  IR A MI CLOSET
                </button>
                <p className="overline-text text-mid-gray text-[8px]">
                  NECESITAS 3+ PRENDAS EN TU CLOSET
                </p>
              </div>
            ) : (
              <button
                onClick={startFlow}
                className="w-full border border-black py-[11px] overline-text text-[11px] text-black bg-white"
              >
                CREAR PRIMER OUTFIT
              </button>
            )}
          </div>
        </div>
      );
    }

    // Library with outfits
    return (
      <div className="pb-6">
        <div className="px-[18px] pt-5">
          <div className="flex justify-between items-baseline mb-1">
            <p className="overline-text text-[9px] text-mid-gray">MIS OUTFITS</p>
            <span className="font-sans text-[9px] tracking-[1.5px] text-mid-gray uppercase">
              {savedOutfits.length} GUARDADOS
            </span>
          </div>
          <h1 className="font-display font-light text-[28px] leading-[1] text-black mb-4">
            Tu guardarropa<br />editado.
          </h1>

          {/* Category filter */}
          <div className="flex gap-4 pb-2 border-b border-light-gray overflow-x-auto no-scrollbar mb-4">
            {libraryOccasions.map(cat => (
              <button
                key={cat}
                onClick={() => setLibraryFilter(cat)}
                className={`whitespace-nowrap font-sans text-[9px] tracking-[1.5px] uppercase pb-1 transition-colors ${
                  libraryFilter === cat
                    ? 'text-black font-medium border-b border-black'
                    : 'text-mid-gray'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Outfit of the day banner */}
        {outfitOfToday && (
          <div className="relative h-[90px] bg-[#1A1A1A] flex items-end px-[18px] pb-[10px] mb-[1px]">
            <div>
              <p className="font-sans text-[7px] tracking-[2px] uppercase text-white/50 mb-[2px]">
                HOY · {new Date().toLocaleDateString('es', { weekday: 'long' }).toUpperCase()}
              </p>
              <p className="font-display font-light text-[18px] leading-[1] text-white">
                {outfitOfToday.savedName}
              </p>
            </div>
            <div className="absolute top-[10px] right-[18px]">
              <span className="font-sans text-[7px] tracking-[1.5px] uppercase text-white/60 border border-white/30 px-[6px] py-[3px]">
                OUTFIT DEL DÍA
              </span>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 gap-[1px] bg-light-gray">
          {filteredSaved.map((outfit) => (
            <div
              key={outfit.dbId}
              className="bg-white p-3 cursor-pointer"
              onClick={() => {
                setSelectedSuggestion(outfit);
                setDetailFromLibrary(true);
                setView('detail');
              }}
            >
              <div className="w-full aspect-[2/3] bg-light-gray mb-2 overflow-hidden">
                {outfit.anchorItem?.image_url && (
                  <img
                    src={outfit.anchorItem.image_url}
                    alt={outfit.savedName}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <p className="font-sans text-[8px] tracking-[1.5px] uppercase text-mid-gray mb-[2px]">
                {outfit.occasion}
              </p>
              <p className="font-display font-medium text-[13px] text-black">
                {outfit.savedName}
              </p>
            </div>
          ))}

          {/* Free tier lock */}
          {!isPremium && savedOutfits.length >= 5 && (
            <div
              className="bg-white p-3 relative cursor-pointer border border-dashed border-mid-gray flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/paywall')}
            >
              <Lock className="w-4 h-4 text-black" />
              <p className="font-sans text-[7px] tracking-[2px] uppercase text-black">PREMIUM</p>
            </div>
          )}

          {/* New outfit button */}
          {(isPremium || savedOutfits.length < 5) && (
            <div
              className="bg-white p-3 flex flex-col items-center justify-center gap-2 cursor-pointer border border-dashed border-mid-gray"
              onClick={startFlow}
            >
              <span className="font-sans text-[16px] text-mid-gray leading-[1]">+</span>
              <p className="font-sans text-[7px] tracking-[2px] uppercase text-mid-gray">NUEVO OUTFIT</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // RENDER: ANCHOR SELECTION (screen 2)
  // ────────────────────────────────────────────────────────

  if (view === 'anchor') {
    return (
      <div className="pb-6 min-h-screen bg-white">
        {/* Progress bar */}
        <div className="h-[1px] bg-light-gray">
          <div className="h-full bg-black transition-all duration-500" style={{ width: '33%' }} />
        </div>

        <div className="px-[18px] pt-[18px]">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setView('library')} aria-label="Volver" className="p-1 -ml-1">
              <ChevronLeft className="w-4 h-4 text-black" />
            </button>
            <p className="overline-text text-[9px] text-mid-gray">|01| PRENDA BASE</p>
          </div>

          <h2 className="font-display font-light text-[22px] leading-[1.2] text-black mb-1">
            ¿Con qué empezamos?
          </h2>
          <p className="font-sans text-[10px] text-dark-gray leading-relaxed mb-4">
            Elige una prenda. La IA arma el outfit alrededor de ella.
          </p>

          {/* Category filter */}
          <div className="flex gap-4 pb-2 border-b border-light-gray overflow-x-auto no-scrollbar mb-3">
            {closetCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setAnchorCategory(cat)}
                className={`whitespace-nowrap font-sans text-[9px] tracking-[1.5px] uppercase pb-1 transition-colors ${
                  anchorCategory === cat
                    ? 'text-black font-medium border-b border-black'
                    : 'text-mid-gray'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filteredAnchorItems.length === 0 ? (
          <div className="px-[18px] py-8 text-center">
            <p className="font-sans text-[11px] text-dark-gray">No hay prendas en esta categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-[1px] bg-light-gray mx-0">
            {filteredAnchorItems.map((item) => {
              const isSelected = selectedAnchor?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedAnchor(isSelected ? null : item)}
                  className={`bg-white relative aspect-[3/4] cursor-pointer overflow-hidden ${
                    isSelected ? 'outline outline-2 outline-black outline-offset-[-2px]' : ''
                  }`}
                >
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <>
                      <div className="absolute top-[6px] right-[6px] w-4 h-4 bg-black flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2 3.5-3.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black py-1 px-[6px]">
                        <p className="font-sans text-[7px] tracking-[1px] uppercase text-white">SELECCIONADA</p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="px-[18px] pt-4">
          <button
            disabled={!selectedAnchor}
            onClick={() => setView('occasion')}
            className="w-full border border-black py-[11px] overline-text text-[11px] text-black bg-white disabled:border-mid-gray disabled:text-mid-gray transition-colors"
          >
            SIGUIENTE
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // RENDER: OCCASION (screen 3)
  // ────────────────────────────────────────────────────────

  if (view === 'occasion') {
    return (
      <div className="pb-6 min-h-screen bg-white">
        {/* Progress bar */}
        <div className="h-[1px] bg-light-gray">
          <div className="h-full bg-black transition-all duration-500" style={{ width: '66%' }} />
        </div>

        <div className="px-[18px] pt-[18px]">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setView('anchor')} aria-label="Volver" className="p-1 -ml-1">
              <ChevronLeft className="w-4 h-4 text-black" />
            </button>
            <p className="overline-text text-[9px] text-mid-gray">|02| OCASIÓN</p>
          </div>

          <h2 className="font-display font-light text-[22px] leading-[1.2] text-black mb-1">
            ¿Para qué lo usarás?
          </h2>
          <p className="font-sans text-[10px] text-dark-gray leading-relaxed mb-4">
            La IA ajusta las combinaciones según el contexto.
          </p>
        </div>

        {/* Occasion options */}
        <div className="border-t border-light-gray">
          {OCCASIONS.map((occ) => (
            <button
              key={occ.key}
              onClick={() => setSelectedOccasion(occ.key)}
              className={`w-full flex items-center gap-3 px-[18px] py-[13px] border-b border-light-gray text-left transition-colors ${
                selectedOccasion === occ.key ? 'bg-off-white' : ''
              }`}
            >
              <div className={`w-[15px] h-[15px] rounded-full border flex-shrink-0 transition-all ${
                selectedOccasion === occ.key
                  ? 'border-black bg-black shadow-[inset_0_0_0_3px_white]'
                  : 'border-mid-gray'
              }`} />
              <div>
                <p className="font-sans text-[12px] text-charcoal">{occ.label}</p>
                <p className="font-sans text-[10px] text-mid-gray">{occ.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Palette toggle */}
        <div className="px-[18px] pt-4 pb-4 border-b border-light-gray">
          <p className="overline-text text-[9px] text-mid-gray mb-3">|03| PALETA</p>
          <div className="flex gap-6">
            {[
              { key: 'complete', label: 'Toda mi paleta' },
              { key: 'baseOnly', label: 'Solo base' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setPaletteScope(opt.key as 'complete' | 'baseOnly')}
                className="flex items-center gap-[6px]"
              >
                <div className={`w-[10px] h-[10px] rounded-full border transition-all ${
                  paletteScope === opt.key ? 'border-black bg-black' : 'border-mid-gray'
                }`} />
                <span className={`font-sans text-[9px] tracking-[1px] uppercase ${
                  paletteScope === opt.key ? 'text-black font-medium' : 'text-mid-gray'
                }`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-[18px] pt-4">
          <button
            disabled={!selectedOccasion}
            onClick={handleGenerateOutfits}
            className="w-full border border-black py-[11px] overline-text text-[11px] text-black bg-white disabled:border-mid-gray disabled:text-mid-gray transition-colors"
          >
            GENERAR OUTFITS
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // RENDER: GENERATING (screen 4)
  // ────────────────────────────────────────────────────────

  if (view === 'generating') {
    const occasionLabel = OCCASIONS.find(o => o.key === selectedOccasion)?.label || selectedOccasion;
    const steps = [
      { label: `${closetItems.length} prendas revisadas`, done: generateStep >= 1 },
      { label: `Paleta ${colorDiagnosis?.season || ''} aplicada`, done: generateStep >= 2 },
      { label: `Combinando para ${occasionLabel.toLowerCase()}...`, done: false, active: generateStep >= 3 && generating },
      { label: 'Generando 3 sugerencias', done: false, pending: generateStep < 3 },
    ];

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-[18px]">
        {/* Scan circle */}
        <div className="w-[110px] h-[110px] rounded-full border border-light-gray mb-7 relative overflow-hidden bg-off-white flex items-center justify-center">
          <div className="w-[72px] h-[72px] bg-light-gray flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 8a3 3 0 013 3v1l10 10H5L15 12v-1a3 3 0 013-3z" stroke="#B0B0B0" strokeWidth="1" fill="none"/>
              <path d="M18 8V5" stroke="#B0B0B0" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="animate-scan absolute left-[15%] right-[15%] h-[1px] bg-black opacity-30" />
        </div>

        <h2 className="font-display font-light text-[24px] text-black text-center leading-[1] mb-2">
          Armando<br />tu outfit
        </h2>
        <p className="font-sans text-[11px] text-dark-gray text-center leading-relaxed mb-8">
          Analizando closet, paleta<br />y ocasión seleccionada.
        </p>

        {/* Checklist */}
        <div className="w-full space-y-[14px]">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3">
              {step.done ? (
                <svg width="14" height="14" viewBox="0 0 12 12" className="flex-shrink-0">
                  <circle cx="6" cy="6" r="5" fill="none" stroke="#2D8B4E" strokeWidth="1"/>
                  <path d="M4 6l1.5 1.5L8 5" stroke="#2D8B4E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : step.active ? (
                <div className="animate-pulse-dot w-[5px] h-[5px] rounded-full bg-black flex-shrink-0" />
              ) : (
                <div className="w-[5px] h-[5px] rounded-full bg-light-gray flex-shrink-0" />
              )}
              <p className={`font-sans text-[11px] ${step.done ? 'text-charcoal' : step.active ? 'text-charcoal' : 'text-mid-gray'}`}>
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // RENDER: SUGGESTIONS (screen 5)
  // ────────────────────────────────────────────────────────

  if (view === 'suggestions') {
    const occasionLabel = OCCASIONS.find(o => o.key === selectedOccasion)?.label?.toUpperCase() || selectedOccasion.toUpperCase();

    return (
      <div className="pb-6 min-h-screen bg-white">
        <div className="px-[18px] pt-[18px]">
          <div className="flex justify-between items-baseline mb-1">
            <p className="overline-text text-[9px] text-mid-gray">{suggestions.length} OUTFITS · {occasionLabel}</p>
            <button
              onClick={handleGenerateOutfits}
              className="font-sans text-[9px] tracking-[1px] uppercase text-mid-gray underline underline-offset-[3px]"
            >
              REGENERAR
            </button>
          </div>
          <h2 className="font-display font-light text-[26px] leading-[1] text-black mb-4">
            Para esta semana.
          </h2>
        </div>

        <div className="border-t border-light-gray">
          {suggestions.map((outfit, idx) => (
            <button
              key={outfit.tempId}
              onClick={() => {
                setSelectedSuggestion(outfit);
                setDetailFromLibrary(false);
                setView('detail');
              }}
              className="w-full flex gap-[10px] px-[18px] py-[14px] border-b border-light-gray text-left hover:bg-off-white transition-colors"
            >
              {/* Outfit preview */}
              <div className="w-16 flex-shrink-0 relative" style={{ aspectRatio: '2/3' }}>
                <div className="w-full h-full bg-light-gray overflow-hidden">
                  {outfit.anchorItem?.image_url && (
                    <img
                      src={outfit.anchorItem.image_url}
                      alt={outfit.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className={`absolute top-0 left-0 px-[5px] py-[3px] ${idx === 0 ? 'bg-black' : 'bg-dark-gray'}`}>
                  <p className="font-sans text-[6px] tracking-[1px] uppercase text-white">Nº{idx + 1}</p>
                </div>
              </div>

              <div className="flex-1 pt-[2px]">
                {idx === 0 && (
                  <p className="overline-text text-[8px] text-mid-gray mb-[2px]">MEJOR MATCH</p>
                )}
                <p className="font-display font-medium text-[16px] text-black mb-1">{outfit.name}</p>
                <p className="font-sans text-[9px] text-dark-gray leading-relaxed mb-2">
                  {outfit.outfitItems.map(i => i.name).join(' · ')}
                </p>
                <p className="font-sans text-[8px] tracking-[1.5px] uppercase text-success">
                  {outfit.matchScore}% EN PALETA
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // RENDER: DETAIL (screen 6)
  // ────────────────────────────────────────────────────────

  if (view === 'detail' && selectedSuggestion) {
    const occasionLabel = OCCASIONS.find(o => o.key === selectedSuggestion.occasion)?.label || selectedSuggestion.occasion;
    const isSaved = detailFromLibrary;

    return (
      <div className="min-h-screen bg-white pb-6">
        {/* Hero image */}
        <div className="relative h-[220px] bg-light-gray overflow-hidden">
          {selectedSuggestion.anchorItem?.image_url && (
            <img
              src={selectedSuggestion.anchorItem.image_url}
              alt={selectedSuggestion.name}
              className="w-full h-full object-cover"
            />
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Back */}
          <button
            onClick={() => isSaved ? setView('library') : setView('suggestions')}
            aria-label="Volver"
            className="absolute top-[10px] left-[12px] w-7 h-7 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>

          {/* Bookmark */}
          {!isSaved && (
            <button
              onClick={() => {
                setSaveName(selectedSuggestion.name);
                setSaveOccasion(selectedSuggestion.occasion);
                setView('save');
              }}
              aria-label="Guardar outfit"
              className="absolute top-[10px] right-[12px]"
            >
              <Bookmark className="w-[18px] h-[18px] text-white" />
            </button>
          )}

          {/* Caption */}
          <div className="absolute bottom-0 left-0 right-0 px-[12px] pb-[12px]">
            <p className="font-sans text-[8px] tracking-[2px] uppercase text-white/70 mb-[2px]">
              {occasionLabel.toUpperCase()}
            </p>
            <p className="font-display font-light text-[22px] leading-[1] text-white">
              {selectedSuggestion.name}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-[18px] pt-[14px] space-y-4">
          {/* Why it works */}
          <div>
            <p className="overline-text text-[9px] text-mid-gray mb-[6px]">POR QUÉ FUNCIONA</p>
            <p className="font-sans text-[10px] text-charcoal leading-relaxed">
              {selectedSuggestion.reasoning} — <em>Vane</em>
            </p>
          </div>

          <div className="h-[0.5px] bg-light-gray" />

          {/* Prendas */}
          <div>
            <p className="overline-text text-[9px] text-mid-gray mb-3">PRENDAS</p>
            <div className="flex gap-2">
              {selectedSuggestion.outfitItems.map((item, idx) => (
                <div key={item.id} className="text-center">
                  <div className={`w-10 h-[52px] bg-light-gray mb-[3px] overflow-hidden ${
                    item.id === selectedSuggestion.anchorItem.id ? 'border-[1.5px] border-black' : ''
                  }`}>
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="font-sans text-[7px] tracking-[0.5px] uppercase text-mid-gray">
                    {idx === 0 ? 'BASE' : item.category?.toUpperCase().slice(0, 6) || 'PRENDA'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Missing item */}
          {selectedSuggestion.missingItem && (
            <div className="bg-off-white px-3 py-[10px] border-l-2 border-black">
              <p className="font-sans text-[9px] tracking-[1.5px] uppercase text-black mb-[2px]">TE FALTA</p>
              <p className="font-sans text-[10px] text-dark-gray leading-relaxed">
                {selectedSuggestion.missingItem.description}
              </p>
            </div>
          )}

          {/* Match score */}
          <p className="font-sans text-[8px] tracking-[1.5px] uppercase text-success">
            {selectedSuggestion.matchScore}% EN PALETA
          </p>

          {/* CTA */}
          {!isSaved && (
            <button
              onClick={() => {
                setSaveName(selectedSuggestion.name);
                setSaveOccasion(selectedSuggestion.occasion);
                setView('save');
              }}
              className="w-full border border-black py-[11px] overline-text text-[11px] text-black bg-white mt-2"
            >
              GUARDAR OUTFIT
            </button>
          )}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // RENDER: SAVE (screen 7)
  // ────────────────────────────────────────────────────────

  if (view === 'save' && selectedSuggestion) {
    const additionalItems = selectedSuggestion.outfitItems.filter(i => i.id !== selectedSuggestion.anchorItem.id);
    const canSave = isPremium || savedOutfits.length < 5;

    return (
      <div className="min-h-screen bg-white pb-6 px-[18px]">
        {/* Header */}
        <div className="flex items-center gap-3 pt-[18px] mb-5">
          <button onClick={() => setView('detail')} aria-label="Volver" className="p-1 -ml-1">
            <ChevronLeft className="w-4 h-4 text-black" />
          </button>
          <p className="overline-text text-[9px] text-black tracking-[2px]">GUARDAR OUTFIT</p>
        </div>

        {/* Preview */}
        <div className="flex gap-[6px] mb-5 pb-5 border-b border-light-gray">
          {/* Anchor */}
          <div className="w-11 h-14 bg-light-gray flex-shrink-0 border-[1.5px] border-black overflow-hidden">
            <img src={selectedSuggestion.anchorItem.image_url} alt="" className="w-full h-full object-cover" />
          </div>
          {/* Others */}
          {additionalItems.slice(0, 2).map(item => (
            <div key={item.id} className="w-11 h-14 bg-light-gray flex-shrink-0 overflow-hidden">
              <img src={item.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          <div className="flex-1 flex flex-col justify-end pl-1">
            <p className="font-sans text-[8px] tracking-[1.5px] uppercase text-mid-gray">
              {selectedSuggestion.outfitItems.length} prendas
            </p>
            <p className="font-sans text-[8px] tracking-[1px] uppercase text-success">
              {selectedSuggestion.matchScore}% paleta
            </p>
          </div>
        </div>

        {/* Name input */}
        <div className="mb-[18px]">
          <p className="overline-text text-[9px] text-mid-gray mb-[6px]">NOMBRE</p>
          <input
            type="text"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            placeholder={selectedSuggestion.name}
            className="w-full border-b border-black pb-[6px] font-sans text-[13px] text-charcoal bg-transparent outline-none placeholder:text-mid-gray"
          />
        </div>

        {/* Occasion tabs */}
        <div className="mb-[18px]">
          <p className="overline-text text-[9px] text-mid-gray mb-3">OCASIÓN</p>
          <div className="flex gap-3 flex-wrap">
            {OCCASIONS.map(occ => (
              <button
                key={occ.key}
                onClick={() => setSaveOccasion(occ.key)}
                className={`font-sans text-[9px] tracking-[1.5px] uppercase pb-[2px] transition-colors ${
                  saveOccasion === occ.key
                    ? 'text-black font-medium border-b border-black'
                    : 'text-mid-gray'
                }`}
              >
                {occ.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outfit of the day toggle */}
        <div className="flex items-center justify-between py-3 border-t border-b border-light-gray mb-[18px]">
          <div>
            <p className="font-sans text-[11px] text-charcoal font-medium">Outfit del día</p>
            <p className="font-sans text-[9px] text-mid-gray tracking-[0.5px] mt-[1px]">
              Programar para mañana
            </p>
          </div>
          <button
            onClick={() => setIsOutfitOfTheDay(p => !p)}
            aria-label={isOutfitOfTheDay ? 'Desactivar outfit del día' : 'Activar outfit del día'}
            className={`w-[34px] h-[18px] rounded-[9px] relative transition-colors flex-shrink-0 ${
              isOutfitOfTheDay ? 'bg-black' : 'bg-mid-gray'
            }`}
          >
            <div className={`w-[14px] h-[14px] rounded-full bg-white absolute top-[2px] transition-all ${
              isOutfitOfTheDay ? 'right-[2px]' : 'left-[2px]'
            }`} />
          </button>
        </div>

        {/* Paywall warning */}
        {!canSave && (
          <div className="mb-4 px-3 py-[10px] border border-mid-gray bg-off-white">
            <p className="font-sans text-[10px] text-dark-gray">
              Alcanzaste el límite de 5 outfits.{' '}
              <button onClick={() => navigate('/paywall')} className="underline text-black">
                Desbloquea Premium
              </button>
              {' '}para guardar ilimitados.
            </p>
          </div>
        )}

        {saveError && (
          <p className="mb-3 font-sans text-[11px] text-red-600">{saveError}</p>
        )}

        <button
          onClick={handleSaveOutfit}
          disabled={saving || !canSave}
          className="w-full border border-black py-[11px] overline-text text-[11px] text-black bg-white disabled:border-mid-gray disabled:text-mid-gray"
        >
          {saving ? 'GUARDANDO...' : 'GUARDAR EN MI BIBLIOTECA'}
        </button>
      </div>
    );
  }

  return null;
};
