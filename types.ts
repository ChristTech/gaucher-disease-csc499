
export enum RiskLevel {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export type Role = 'Doctor' | 'User';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  specialty?: string;
}

// ── Multi-stage types ─────────────────────────────────────────────────────────

export type GaucherTypeSuspicion = 'Type 1' | 'Type 2' | 'Type 3' | 'Undetermined';
export type EthnicBackground = 'Ashkenazi Jewish' | 'Other / Unknown';
export type SymptomOnsetAge = 'Childhood (< 12 yrs)' | 'Adolescent (12–18 yrs)' | 'Adult (> 18 yrs)';
export type SymptomDuration = '< 6 months' | '6–24 months' | '> 24 months';
export type GBA1Mutation =
  | 'N370S' | 'L444P' | '84GG' | 'IVS2+1' | 'D409H'
  | 'Other known pathogenic'
  | 'Unknown / Not tested'
  | 'None detected';

/** Structured symptom checklist used in Stage 1 */
export interface GaucherSymptoms {
  splenomegaly: boolean;
  hepatomegaly: boolean;
  bonePain: boolean;
  fatigue: boolean;
  easyBruising: boolean;
  anaemia: boolean;
  thrombocytopenia: boolean;
  neurologicalSymptoms: boolean;
  onsetAge: SymptomOnsetAge | '';
  duration: SymptomDuration | '';
}

/** Optional biochemical inputs collected in Stage 2 */
export interface BiochemicalInputs {
  betaGlucocerebrosidase?: number; // nmol/hr/mg protein
  plateletCount?: number;          // × 10⁹/L
  hemoglobin?: number;             // g/dL
  chitotriosidase?: number;        // nmol/hr/mL
}

/** Optional genetic inputs collected in Stage 3 */
export interface GeneticInputs {
  mutation1: GBA1Mutation;
  mutation2: GBA1Mutation;
  neurologicalConfirmed: boolean;
}

/** Scores produced by the deterministic scoring engine per stage */
export interface StageScores {
  stage1: number;
  stage2: number | null;
  stage3: number | null;
  composite: number;
}

export interface Prediction {
  id: string;
  userId: string;
  patientName: string;
  patientAge: string;
  patientSex: string;
  date: string;
  status: 'Pending Review' | 'Reviewed' | 'Action Required';
  riskLevel: RiskLevel;
  riskScore: number;
  reasoning: string;
  suggestedNextSteps: string[];
  reviewingDoctorId: string;
  doctorComment?: string;
  reviewedAt?: string;

  // ── Multi-stage additions (all optional — backward compatible) ─────────────
  ethnicBackground?: EthnicBackground;
  familyHistory?: boolean;
  symptoms?: GaucherSymptoms;
  biochemical?: BiochemicalInputs;
  genetic?: GeneticInputs;
  stageScores?: StageScores;
  typeSuspicion?: GaucherTypeSuspicion;
  completedStages?: (1 | 2 | 3)[];
  additionalContext?: string;
}

export interface ChartData {
  date: string;
  predictions: number;
}
