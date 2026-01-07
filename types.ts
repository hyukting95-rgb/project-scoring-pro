
export enum DesignProjectType {
  THREE_SERIES_CMF = '3 系项目-CMF',
  THREE_SERIES_CMFP = '3 系项目-CMFP',
  FOUR_SERIES_INNOVATION = '4 系项目-创新性项目',
  FIVE_SERIES_INNOVATION = '5 系项目-开模创新性项目'
}

export enum PackageProjectType {
  BASIC = '基础型包装',
  MICRO_INNOVATION = '微创新型包装',
  INNOVATION = '创新型包装'
}

export enum ManualProjectType {
  LIGHTWEIGHT = '轻量化说明书内容制作',
  MEDIUM = '中量化说明书内容制作',
  ORIGINAL = '原创性说明书内容制作'
}

export interface AdditionalOption {
  id: string;
  label: string;
  score: number;
}

export type ProjectStatus = '进行中' | '已完成';

export type UserRole = 'admin' | 'member';

export type UserStatus = 'active' | 'pending' | 'suspended';

export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  status: UserStatus;
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
  last_active: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPermissions {
  isAdmin: boolean;
  isActive: boolean;
  role: UserRole;
  status: UserStatus;
  existsInTeam: boolean;
}

export interface ProjectRecord {
  id: string;
  projectUid?: string;
  type: string;
  content: string;
  entryTime: string;
  score: number;
  responsiblePerson: string;
  status: ProjectStatus;
  scoringParts: { label: string; value: number }[];
  totalWorkDays: number;
  // Store raw form state for restoration when editing
  rawSelections: {
    selectedDesignType: DesignProjectType | null;
    selectedPackageType: PackageProjectType | null;
    selectedManualType: ManualProjectType | null;
    cmfValue: number;
    cmfPerson: string;
    cmfpMode: 'additional' | 'none';
    cmfpPerson1: string;
    cmfpPerson2: string;
    mainCreator: string;
    isIndependent: 'yes' | 'no';
    baseScore: number;
    selectedAddons: string[];
    addonPersons: Record<string, string>;
    addonWorkDays: Record<string, number>;
    cmfpSupportWorkDays: number;
    packagePerson: string;
    manualPerson: string;
  };
}

export interface PersonnelRecord {
  id: string;
  person: string;
  projectId: string;
  projectUid?: string;
  entryTime: string;
  score: number;
  content: string;
  workDays: number;
}

export interface ScoringConfig {
  cmf: { label: string; value: number }[];
  cmfp: { mode: string; main: number; support: number }[];
  base4: { label: string; value: number }[];
  base5: { label: string; value: number }[];
  addons: AdditionalOption[];
  package: { type: PackageProjectType; score: number }[];
  manual: { type: ManualProjectType; score: number }[];
}
