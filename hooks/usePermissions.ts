import { useMemo } from 'react';
import type { User, License, Branch, LicenseType, Credor, CredorLicense, CredorEvaluation, LaoRecord, LaoCondition, LaoInspection } from '../types';

type View =
  | 'dashboard'
  | 'licenses'
  | 'sgaLicenses'
  | 'licenseTypes'
  | 'branches'
  | 'deactivatedLicenses'
  | 'laoConditions'
  | 'credores'
  | 'users';

export function usePermissions(
  userRole: 'admin' | 'colaborador' | null,
  userProfile: User | null,
  licenses: License[],
  branches: Branch[],
  licenseTypes: LicenseType[],
  credores: Credor[],
  credorLicenses: CredorLicense[],
  credorEvaluations: CredorEvaluation[],
  laos: LaoRecord[],
  laoConditions: LaoCondition[],
  laoInspections: LaoInspection[],
) {
  const hasScreenAccess = (screen: View) => {
    if (userRole === 'admin') return true;
    return !!userProfile?.allowedScreens?.includes(screen);
  };

  const visible = useMemo(() => {
    const visibleLicenses = (userRole === 'admin' || !userProfile) ? licenses : licenses.filter(l => {
      const byBranch = !userProfile?.visibleBranchIds || userProfile.visibleBranchIds.length === 0 || userProfile.visibleBranchIds.includes(l.unitId);
      const byType = !userProfile?.visibleLicenseTypes || userProfile.visibleLicenseTypes.length === 0 || userProfile.visibleLicenseTypes.includes(l.licenseType);
      return byBranch && byType;
    });

    const visibleBranches = (userRole === 'admin' || !userProfile) ? branches : branches.filter(b => !userProfile?.visibleBranchIds || userProfile.visibleBranchIds.length === 0 || userProfile.visibleBranchIds.includes(b.id));
    const visibleLicenseTypes = (userRole === 'admin' || !userProfile) ? licenseTypes : licenseTypes.filter(lt => !userProfile?.visibleLicenseTypes || userProfile.visibleLicenseTypes.length === 0 || userProfile.visibleLicenseTypes.includes(lt.name));
    const visibleLaos = (userRole === 'admin' || !userProfile)
      ? laos
      : laos.filter(lao => {
        if (!lao.branchId) return false;
        if (!userProfile?.visibleBranchIds || userProfile.visibleBranchIds.length === 0) return true;
        return userProfile.visibleBranchIds.includes(lao.branchId);
      });
    const visibleLaoIds = new Set(visibleLaos.map(lao => lao.id));
    const visibleLaoConditions = laoConditions.filter(condition => visibleLaoIds.has(condition.laoId));
    const visibleConditionIds = new Set(visibleLaoConditions.map(condition => condition.id));
    const visibleLaoInspections = laoInspections.filter(inspection => visibleConditionIds.has(inspection.conditionId));

    return {
      licenses: visibleLicenses,
      branches: visibleBranches,
      licenseTypes: visibleLicenseTypes,
      credores,
      credorLicenses,
      credorEvaluations,
      laos: visibleLaos,
      laoConditions: visibleLaoConditions,
      laoInspections: visibleLaoInspections,
    };
  }, [userRole, userProfile, licenses, branches, licenseTypes, credores, credorLicenses, credorEvaluations, laos, laoConditions, laoInspections]);

  return { hasScreenAccess, ...visible };
}
