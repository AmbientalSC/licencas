import React from 'react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  userEmail?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, userEmail }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'licenses', label: 'Licenças Vigentes', icon: '📄' },
    { id: 'deactivatedLicenses', label: 'Licenças Vencidas', icon: '⏰' },
    { id: 'licenseTypes', label: 'Tipos de Licença', icon: '📋' },
    { id: 'branches', label: 'Filiais', icon: '🏢' },
    { id: 'notifications', label: 'Notificações', icon: '🔔' },
  ];

  return (
    <div className="w-64 bg-gray-900 dark:bg-gray-950 text-white min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <img 
          src="/licencas/ambiental.svg" 
          alt="Ambiental Logo" 
          className="w-full h-auto max-w-[150px]"
        />
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition-colors ${
              activeView === item.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Info */}
      {userEmail && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{userEmail.split('@')[0]}</p>
              <p className="text-xs text-gray-400 truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
