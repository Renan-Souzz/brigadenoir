import React, { useState, useRef } from 'react';
import { Bell, Search, Settings, X, Info, AlertTriangle, Moon, Sun, LogOut, User, Camera, Upload, Volume2, VolumeX, Check, Package, UtensilsCrossed, ArrowRight, Ghost } from 'lucide-react';
import { type ReactNode } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation, TabId } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { supabase } from '../../lib/supabase';
import { useStations } from '../../hooks/useStations';
import Button from './Button';

interface PageHeaderProps {
  /** Content rendered in the left area (usually a title) */
  leftContent?: ReactNode;
  /** Station-specific badge text (e.g. "Saucier Station") */
  stationLabel?: string;
  /** Station badge color (e.g. "bg-primary") */
  stationColor?: string;
  /** Render a search input on the right side of the header */
  showSearch?: boolean;
  /** Placeholder text for the right-side search input */
  searchPlaceholder?: string;
  /** Callback for search input changes */
  onSearchChange?: (value: string) => void;
  /** Show a notification dot on the bell icon */
  hasNotification?: boolean;
  /** Seed string for generating the avatar via dicebear */
  avatarSeed?: string;
  /**
   * Background + blur classes for the header element.
   * Defaults to a frosted-glass surface.
   */
  bgClassName?: string;
  /** Additional Tailwind classes appended to the <header> element */
  className?: string;
}

/**
 * Unified top-bar header used across all main pages.
 *
 * Renders a flexible `leftContent` slot, an optional `stationLabel`,
 * and standardised right-side actions.
 */
export default function PageHeader({
  leftContent,
  stationLabel,
  stationColor = 'bg-primary',
  showSearch = false,
  searchPlaceholder = 'Pesquisar...',
  onSearchChange,
  avatarSeed = 'chef',
  bgClassName = 'bg-surface/80 backdrop-blur-md',
  className = '',
}: PageHeaderProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const unreadNotifications = notifications.filter(n => !n.is_read);
  const { theme, toggleTheme } = useTheme();
  const { setActiveTab, searchFilter, setSearchFilter } = useNavigation();
  const { profile, updateProfile, signOut, isManagement } = useAuth();
  const { showAlert } = useModal();
  const { stations, formatStationName } = useStations();
  
  // -- Global Search Logic --
  const [localSearchTerm, setLocalSearchTerm] = useState(searchFilter);
  const [searchInsumos, setSearchInsumos] = useState<any[]>([]);
  const [searchDishes, setSearchDishes] = useState<any[]>([]);
  const [isSearchingDB, setIsSearchingDB] = useState(false);

  // Sync internal search with global search filter
  React.useEffect(() => {
    if (searchFilter !== localSearchTerm) {
      setLocalSearchTerm(searchFilter);
    }
  }, [searchFilter]);

  React.useEffect(() => {
    if (!showSearch) return;
    
    if (localSearchTerm.trim().length < 3) {
      setSearchInsumos([]);
      setSearchDishes([]);
      setIsSearchingDB(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingDB(true);
      
      const term = `%${localSearchTerm.trim()}%`;
      const [resInsumos, resDishes] = await Promise.all([
        supabase.from('insumos').select('id, name, station').ilike('name', term).limit(8),
        supabase.from('dishes').select('id, title, category').ilike('title', term).limit(8)
      ]);

      setSearchInsumos(resInsumos.data || []);
      setSearchDishes(resDishes.data || []);
      setIsSearchingDB(false);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [localSearchTerm, showSearch]);

  const handleGlobalClick = (route: TabId) => {
    setActiveTab(route);
    setLocalSearchTerm('');
    if (onSearchChange) onSearchChange('');
  };
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Auto-close menus after 8 seconds of inactivity
  React.useEffect(() => {
    if (showNotif || showSettings || showProfile) {
      const timer = setTimeout(() => {
        setShowNotif(false);
        setShowSettings(false);
        setShowProfile(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showNotif, showSettings, showProfile]);

  // Close menus when clicking outside the header
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setShowNotif(false);
        setShowSettings(false);
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState<'none' | 'name'>('none');
  const [editValue, setEditValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file || !profile) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile(profile.id, { avatar_url: publicUrl });
      showAlert('Sucesso', 'Sua foto foi atualizada!');
    } catch (error: any) {
      showAlert('Erro', `Falha no upload: ${error.message}. Certifique-se que o bucket "avatars" existe e é público.`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!profile || !editValue.trim()) {
      setEditMode('none');
      return;
    }

    try {
      if (editMode === 'name') {
        await updateProfile(profile.id, { full_name: editValue });
      }
      showAlert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      showAlert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setEditMode('none');
      setEditValue('');
    }
  };

  const startEdit = (mode: 'name', initialValue: string) => {
    setEditMode(mode);
    setEditValue(initialValue);
  };
  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-40 flex items-center justify-between w-full py-3 ${bgClassName} ${className}`}
    >
      {/* Left slot — content varies per page */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {leftContent}
        
        {stationLabel && (
          <>
            <div className="h-4 w-[1px] bg-outline-variant/30 hidden md:block"></div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-container-highest rounded-full">
              <div className={`w-2 h-2 rounded-full ${stationColor} shadow-[0_0_8px_rgba(0,0,0,0.4)]`}></div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${stationColor.replace('bg-', 'text-')}`}>
                Station: {formatStationName(profile?.station || '')}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right actions — consistent across all pages */}
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {showSearch && (
          <div className="relative hidden sm:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              size={16}
            />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={localSearchTerm}
              onChange={(e) => {
                setLocalSearchTerm(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              className="bg-surface-container border-none rounded-lg pl-10 pr-4 py-2 text-[10px] font-bold tracking-widest text-on-surface focus:ring-1 focus:ring-primary w-56 placeholder:text-outline-variant transition-all"
            />
          </div>
        )}

        {isManagement && (
          <div className="relative">
            <button
              onClick={() => {
                setShowNotif(!showNotif);
                setShowSettings(false);
                setShowProfile(false);
              }}
              aria-label="Notificações"
              className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-all ${showNotif ? 'bg-primary/20 text-primary' : 'text-outline-variant hover:bg-surface-container-highest'}`}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-4 h-4 bg-error text-[8px] font-black text-white rounded-full flex items-center justify-center border-2 border-surface"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 mt-3 sm:w-80 bg-surface-container-highest border border-outline-variant/20 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-300">
                <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface">Notificações</h4>
                  <button onClick={markAllAsRead} className="text-[9px] font-bold text-primary hover:underline uppercase">Limpar Tudo</button>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-outline-variant/5">
                  {unreadNotifications.length === 0 ? (
                    <div className="p-10 text-center">
                      <Bell size={32} className="mx-auto text-outline-variant/20 mb-3" />
                      <p className="text-[10px] uppercase tracking-widest text-outline-variant font-bold">Nenhuma notificação</p>
                    </div>
                  ) : (
                    unreadNotifications.map((n) => (
                      <div 
                        key={n.id} 
                        onClick={() => markAsRead(n.id)}
                        className="p-4 hover:bg-surface-container transition-colors cursor-pointer relative bg-primary/5"
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 ${n.type === 'error' ? 'text-error' : n.type === 'warning' ? 'text-secondary' : 'text-primary'}`}>
                            {n.type === 'error' ? <AlertTriangle size={14} /> : n.type === 'warning' ? <AlertTriangle size={14} /> : <Info size={14} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-on-surface mb-0.5">{n.title}</p>
                            <p className="text-[10px] text-on-surface-variant leading-relaxed">{n.message}</p>
                            <p className="text-[8px] text-outline font-black uppercase mt-2">{new Date(n.created_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className={`absolute top-4 right-4 w-1.5 h-1.5 rounded-full ${n.type === 'error' ? 'bg-error' : 'bg-primary'}`} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowNotif(false);
              setShowProfile(false);
            }}
            aria-label="Configurações Rápidas"
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${showSettings ? 'bg-primary/20 text-primary' : 'text-outline-variant hover:bg-surface-container-highest'}`}
          >
            <Settings size={20} />
          </button>

          {showSettings && (
            <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 mt-3 sm:w-64 bg-surface-container-highest border border-outline-variant/20 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-300">
               <div className="p-4 border-b border-outline-variant/10 bg-surface-container-low">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface">Ajustes Rápidos</h4>
              </div>
              <div className="p-3 space-y-2">
                <button 
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors uppercase"
                >
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} Tema {theme === 'dark' ? 'Claro' : 'Escuro'}
                  </div>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${theme === 'light' ? 'bg-primary' : 'bg-outline-variant'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${theme === 'light' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
                
                <button className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors uppercase opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <Volume2 size={14} /> Sons do App
                  </div>
                  <div className="w-8 h-4 rounded-full p-0.5 bg-outline-variant">
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </div>
                </button>

                <div className="h-[1px] bg-outline-variant/10 my-1" />
                
                <button 
                  onClick={() => setActiveTab('configuracoes' as TabId)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors uppercase"
                >
                  <Settings size={14} /> Ver Ajustes Completos
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative ml-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowProfile(!showProfile);
              setShowNotif(false);
              setShowSettings(false);
            }}
            className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant/20 hover:ring-2 hover:ring-primary/50 transition-all relative group"
          >
            {uploading ? (
              <div className="w-full h-full flex items-center justify-center bg-surface-container">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <img
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || 'chef'}`}
                alt="Chef"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
            <div 
              onClick={(e) => {
                if (showProfile) {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }
              }}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
            >
              <Camera size={12} className="text-white" />
            </div>
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />

          {showProfile && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 mt-3 sm:w-64 bg-surface-container-highest border border-outline-variant/20 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-300"
            >
              <div className="p-4 bg-surface-container-low border-b border-outline-variant/10 text-center relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-primary/20 text-primary rounded-full hover:bg-primary hover:text-on-primary transition-all"
                  title="Upload de Foto"
                >
                  <Upload size={12} />
                </button>
                <div className="w-16 h-16 rounded-full mx-auto border-2 border-primary overflow-hidden mb-3">
                   <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || 'chef'}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <h4 className="text-sm font-black text-on-surface uppercase tracking-tighter">{profile?.full_name || 'Chef Noir'}</h4>
                <p className="text-[10px] text-outline font-bold uppercase tracking-widest">{profile?.role || 'Staff'}</p>
              </div>
              
              <div className="p-2 space-y-1">
                {editMode === 'name' ? (
                  <div className="p-1 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                    <input 
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Novo Nome"
                      className="w-full bg-surface-container border border-primary/30 rounded-lg px-3 py-2 text-xs font-bold text-on-surface focus:ring-1 focus:ring-primary uppercase tracking-widest outline-none"
                    />
                    <div className="flex gap-1">
                      <Button 
                        variant="primary"
                        onClick={handleSaveEdit}
                        className="flex-1 py-1.5"
                        icon={<Check size={12} />}
                      >
                        Salvar
                      </Button>
                      <Button 
                        variant="error"
                        onClick={() => setEditMode('none')}
                        className="flex-1 py-1.5"
                        icon={<X size={12} />}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit('name', profile?.full_name || '');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors uppercase"
                  >
                    <User size={14} /> Editar Nome
                  </button>
                )}

                <div className="h-[1px] bg-outline-variant/10 my-1" />
                <button 
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors uppercase"
                >
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} 
                    {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                  </div>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${theme === 'light' ? 'bg-primary' : 'bg-outline-variant'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${theme === 'light' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
                <Button 
                  variant="error"
                  onClick={signOut}
                  className="w-full mt-2"
                  icon={<LogOut size={14} />}
                >
                  Sair
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GLOBAL SEARCH OVERLAY */}
      {showSearch && localSearchTerm.trim().length >= 3 && (
        <div className="absolute top-[120%] left-0 right-0 bg-surface-container shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-outline-variant/20 rounded-2xl md:rounded-3xl p-4 md:p-8 z-50 max-h-[70vh] overflow-y-auto animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-3 md:pb-4 mb-4 md:mb-6">
            <Search size={20} className="text-primary shrink-0" />
            <h2 className="text-lg md:text-3xl font-black tracking-tighter text-on-surface uppercase truncate">Resultados</h2>
            <button 
              onClick={() => { setLocalSearchTerm(''); onSearchChange?.(''); }} 
              className="ml-auto text-outline-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container-high transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {isSearchingDB ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs uppercase tracking-widest font-bold text-outline-variant">Acessando Banco de Dados...</p>
            </div>
          ) : searchInsumos.length === 0 && searchDishes.length === 0 ? (
            <div className="py-16 text-center">
              <Ghost size={48} className="mx-auto mb-4 text-outline-variant/30" />
              <p className="text-xs uppercase tracking-widest font-bold text-outline-variant">Nada encontrado para "{localSearchTerm}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* LISTAGEM DE INSUMOS E ALMOXARIFADO ENCONTRADOS */}
              {(searchInsumos.length > 0) && (
                <div className="space-y-4">
                   <h3 className="text-[10px] font-black tracking-[0.2em] text-on-surface-variant uppercase flex items-center gap-2">
                     <Package size={14} className="text-primary" /> Insumos & Almoxarifado
                   </h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {searchInsumos.map(ins => (
                        <div 
                          key={ins.id} 
                          onClick={() => handleGlobalClick('insumos')}
                          className="bg-surface rounded-2xl p-4 border border-outline-variant/10 hover:border-primary/50 hover:bg-surface-container-high transition-all cursor-pointer group shadow-sm hover:shadow-xl"
                        >
                          <p className="text-[9px] uppercase font-black tracking-wider text-outline-variant group-hover:text-primary transition-colors">Praça: {formatStationName(ins.station)}</p>
                          <p className="font-bold text-sm text-on-surface mt-1 truncate">{ins.name}</p>
                          <p className="text-[10px] text-on-surface-variant mt-2 flex justify-between items-center bg-surface-container px-2 py-1.5 rounded-lg border border-outline-variant/5">
                            Acesso Rápido <ArrowRight size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                          </p>
                        </div>
                     ))}
                   </div>
                </div>
              )}

              {/* LISTAGEM DE PRATOS DO MENU ENCONTRADOS */}
              {(searchDishes.length > 0) && (
                <div className="space-y-4">
                   <h3 className="text-[10px] font-black tracking-[0.2em] text-on-surface-variant uppercase flex items-center gap-2">
                     <UtensilsCrossed size={14} className="text-secondary" /> Pratos & Menu
                   </h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {searchDishes.map(dish => (
                        <div 
                          key={dish.id} 
                          onClick={() => handleGlobalClick('menu')}
                          className="bg-surface rounded-2xl p-4 border border-outline-variant/10 hover:border-secondary/50 hover:bg-surface-container-high transition-all cursor-pointer group shadow-sm hover:shadow-xl"
                        >
                          <p className="text-[9px] uppercase font-black tracking-wider text-outline-variant group-hover:text-secondary transition-colors">Cat: {dish.category}</p>
                          <p className="font-bold text-sm text-on-surface mt-1 truncate">{dish.title}</p>
                          <p className="text-[10px] text-on-surface-variant mt-2 flex justify-between items-center bg-surface-container px-2 py-1.5 rounded-lg border border-outline-variant/5">
                            Acesso Rápido <ArrowRight size={14} className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                          </p>
                        </div>
                     ))}
                   </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

    </header>
  );
}
