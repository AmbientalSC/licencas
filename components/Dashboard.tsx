import React from 'react';
import { License, Branch, LicenseType } from '../types';
import { LicenseIcon } from './icons/LicenseIcon';
import { ExpiredIcon } from './icons/ExpiredIcon';
import { BuildingIcon } from './icons/BuildingIcon';

interface DashboardProps {
    licenses: License[];
    branches: Branch[];
    licenseTypes: LicenseType[];
}

const Dashboard: React.FC<DashboardProps> = ({ licenses, branches, licenseTypes }) => {
    const activeLicenses = licenses.filter(l => l.active);
    const expiredLicenses = licenses.filter(l => !l.active); // Or check date? Usually 'active' flag is used, but let's check dates too for "Vencidas" status in active list

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getDaysUntilExpiry = (expiryDate: string) => {
        const expiry = new Date(expiryDate + 'T00:00:00');
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const licensesWithStatus = activeLicenses.map(l => {
        const days = getDaysUntilExpiry(l.originalExpiryDate);
        const type = licenseTypes.find(lt => lt.name === l.licenseType);
        const renewalDays = type ? (type.renewalProtocolDays || 0) + (type.processStartDays || 0) : 180;

        let status: 'ok' | 'warning' | 'expired' = 'ok';
        if (days < 0) status = 'expired';
        else if (days <= renewalDays) status = 'warning';

        return { ...l, days, status };
    });

    const totalActive = activeLicenses.length;
    const totalExpired = licensesWithStatus.filter(l => l.status === 'expired').length;
    const totalWarning = licensesWithStatus.filter(l => l.status === 'warning').length;
    const totalBranches = branches.length;

    const expiringSoon = licensesWithStatus
        .sort((a, b) => a.days - b.days)
        .slice(0, 10);

    const typeDistribution = licenseTypes.map(lt => {
        const count = activeLicenses.filter(l => l.licenseType === lt.name).length;
        return { ...lt, count };
    })
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

    // Distribuição por filial: contar licenças ativas por filial, filtrar zeros e ordenar decrescente
    const branchDistribution = branches.map(b => {
        const count = activeLicenses.filter(l => l.unitId === b.id).length;
        return { ...b, count };
    })
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

    const StatCard = ({ title, value, icon, color, bgColor }: { title: string, value: number, icon: React.ReactNode, color: string, bgColor: string }) => (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex items-center justify-between border border-gray-100 dark:border-gray-700">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{value}</p>
            </div>
            <div className={`p-3 rounded-full ${bgColor} ${color}`}>
                {icon}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Licenças Ativas"
                    value={totalActive}
                    icon={<LicenseIcon className="h-8 w-8" />}
                    color="text-blue-700"
                    bgColor="bg-blue-100 dark:bg-blue-900/20"
                />
                <StatCard
                    title="Em Alerta"
                    value={totalWarning}
                    icon={<ExpiredIcon className="h-8 w-8" />}
                    color="text-yellow-700"
                    bgColor="bg-yellow-100 dark:bg-yellow-900/20"
                />
                <StatCard
                    title="Vencidas (Ativas)"
                    value={totalExpired}
                    icon={<ExpiredIcon className="h-8 w-8" />}
                    color="text-red-700"
                    bgColor="bg-red-100 dark:bg-red-900/20"
                />
                <StatCard
                    title="Filiais"
                    value={totalBranches}
                    icon={<BuildingIcon className="h-8 w-8" />}
                    color="text-green-700"
                    bgColor="bg-green-100 dark:bg-green-900/20"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Próximos Vencimentos</h3>
                    {/* Scrollbar moved to top using rotateX trick */}
                    <div className="overflow-x-auto" style={{ transform: 'rotateX(180deg)' }}>
                        <table className="min-w-full" style={{ transform: 'rotateX(180deg)' }}>
                            <thead>
                                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                                    <th className="pb-3">Filial</th>
                                    <th className="pb-3">Licença</th>
                                    <th className="pb-3">Vencimento</th>
                                    <th className="pb-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {expiringSoon.length > 0 ? expiringSoon.map(l => (
                                    <tr key={l.id}>
                                        <td className="py-3 text-sm text-gray-700 dark:text-gray-300">{branches.find(b => b.id === l.unitId)?.name}</td>
                                        <td className="py-3 text-sm text-gray-700 dark:text-gray-300">{l.licenseType}</td>
                                        <td className="py-3 text-sm text-gray-700 dark:text-gray-300">{new Date(l.originalExpiryDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${l.status === 'expired'
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900/90 dark:text-red-200'
                                                : l.status === 'warning'
                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/90 dark:text-yellow-200'
                                                    : 'bg-green-100 text-green-800 dark:bg-green-900/90 dark:text-green-200'
                                                }`}>
                                                {l.status === 'expired' ? 'Vencida' : `${l.days} dias`}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="py-4 text-center text-gray-500 text-sm">Nenhuma licença próxima do vencimento.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Distribuições</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Por Tipo</h4>
                            <div className="space-y-4 max-h-[620px] overflow-y-auto pr-2">
                                {typeDistribution.map(lt => {
                                    const percentage = Math.round((lt.count / totalActive) * 100) || 0;
                                    return (
                                        <div key={lt.id}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-700 dark:text-gray-300">{lt.name}</span>
                                                <span className="text-gray-500 dark:text-gray-400">{lt.count} ({percentage}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-400 rounded-full h-2">
                                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Por Filial</h4>
                            <div className="space-y-4 max-h-[620px] overflow-y-auto pr-2">
                                {branchDistribution.map(b => {
                                    const percentage = Math.round((b.count / totalActive) * 100) || 0;
                                    return (
                                        <div key={b.id}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-700 dark:text-gray-300">{b.name}</span>
                                                <span className="text-gray-500 dark:text-gray-400">{b.count} ({percentage}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-400 rounded-full h-2">
                                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
