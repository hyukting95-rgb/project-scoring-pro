
import { 
  DesignProjectType, 
  PackageProjectType, 
  ManualProjectType, 
  ScoringConfig 
} from './types';

export const INITIAL_SCORING_CONFIG: ScoringConfig = {
  cmf: [
    { label: '有品类视觉指导', value: 0.5 },
    { label: '无品类视觉指导', value: 1.0 }
  ],
  cmfp: [
    { mode: 'additional', main: 1.0, support: 0.5 },
    { mode: 'none', main: 1.5, support: 0 }
  ],
  base4: [
    { label: '+1.0', value: 1.0 },
    { label: '+1.5', value: 1.5 }
  ],
  base5: [
    { label: '+1.5', value: 1.5 },
    { label: '+2.0', value: 2.0 }
  ],
  addons: [
    { id: 'light_illu', label: '轻量化插画制作', score: 0.5 },
    { id: 'medium_illu', label: '中量化插画制作', score: 1.0 },
    { id: 'high_illu', label: '高量化插画制作', score: 2.0 },
    { id: 'light_struct', label: '轻量化结构', score: 0.5 },
    { id: 'medium_struct', label: '中量化结构', score: 1.0 }
  ],
  package: [
    { type: PackageProjectType.BASIC, score: 0.5 },
    { type: PackageProjectType.MICRO_INNOVATION, score: 1.0 },
    { type: PackageProjectType.INNOVATION, score: 2.0 }
  ],
  manual: [
    { type: ManualProjectType.LIGHTWEIGHT, score: 0.2 },
    { type: ManualProjectType.MEDIUM, score: 0.4 },
    { type: ManualProjectType.ORIGINAL, score: 1.0 }
  ]
};
