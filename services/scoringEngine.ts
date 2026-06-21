/**
 * GaucherPredict Clinical Scoring Engine
 *
 * A deterministic, rule-based risk scoring system for Gaucher Disease.
 * Each rule is anchored to a primary peer-reviewed source, listed below.
 *
 * The engine produces reproducible, auditable scores that are independent of
 * the LLM layer. The LLM (Gemini / Groq) receives these scores as input and
 * generates clinical narrative and recommendations around them — it does NOT
 * compute the score itself.
 *
 * ── References ───────────────────────────────────────────────────────────────
 * [1] Zimran A, et al. "A glucocerebrosidase gene severity scoring system for
 *     clinical purposes." Q J Med. 1992;83(305):977–981.
 *     doi:10.1093/oxfordjournals.qjmed.a068622
 *     [Original Severity Score Index (SSI) — basis for Stage 1 symptom weights]
 *
 * [2] Mistry PK, et al. "Consensus recommendations for the management of
 *     Gaucher disease." Clin Genet. 2017;93(3):418–430.
 *     doi:10.1111/cge.13025
 *     [GED-C: Gaucher Earlier Diagnosis Consensus — gating thresholds, onset
 *     age and ethnicity risk factors]
 *
 * [3] Charrow J, et al. "The Gaucher Registry: demographics and disease
 *     characteristics of 1698 patients with Gaucher disease."
 *     Arch Intern Med. 2000;160(18):2835–2843.
 *     doi:10.1001/archinte.160.18.2835
 *     [Prevalence of individual signs/symptoms at diagnosis; ethnicity data;
 *     biochemical reference ranges for the population]
 *
 * [4] Stirnemann J, et al. "A Review of Gaucher Disease Pathophysiology,
 *     Clinical Presentation and Treatments." Int J Mol Sci. 2017;18(2):441.
 *     doi:10.3390/ijms18020441
 *     [Symptom prevalence, pathophysiology of bone crisis and cytopenias]
 *
 * [5] Aerts JM, et al. "Identification of chitotriosidase as a suitable marker
 *     to assess the pathological state of macrophages in patients with Gaucher
 *     disease." Clin Chim Acta. 1996;254(1):81–92.
 *     doi:10.1016/0009-8981(96)00093-2
 *     [Chitotriosidase reference ranges and diagnostic thresholds]
 *
 * [6] Bruni S, et al. "Genotype-phenotype correlation in Gaucher disease:
 *     Insights from the International Collaborative Gaucher Group database."
 *     Blood Cells Mol Dis. 2021;86:102504.
 *     doi:10.1016/j.bcmd.2020.102504
 *     [GBA1 mutation-phenotype correlation tables — Stage 3 scoring]
 *
 * [7] Grabowski GA. "Phenotype, diagnosis, and treatment of Gaucher's disease."
 *     Lancet. 2008;372(9645):1263–1271.
 *     doi:10.1016/S0140-6736(08)61522-6
 *     [Diagnostic criteria, enzyme activity thresholds, genetic classification]
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  GaucherSymptoms,
  BiochemicalInputs,
  GeneticInputs,
  GaucherTypeSuspicion,
  RiskLevel,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Gating Thresholds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum Stage 1 score to recommend proceeding to biochemical assessment.
 * Below this value, Gaucher disease is sufficiently unlikely that routine
 * enzyme testing is not warranted as a first step. [2] GED-C
 */
export const STAGE_2_UNLOCK_THRESHOLD = 30;

/**
 * Minimum Stage 2 score to recommend proceeding to genetic panel.
 * Below this, a GBA1 sequencing panel is not the immediate priority. [2]
 */
export const STAGE_3_UNLOCK_THRESHOLD = 40;

// ─────────────────────────────────────────────────────────────────────────────
// Stage 1 — Clinical Triage Score (0–100)
// ─────────────────────────────────────────────────────────────────────────────

interface Stage1Input {
  symptoms: GaucherSymptoms;
  familyHistory: boolean;
  ethnicBackground: string;
}

/**
 * Scores the clinical presentation based on symptom flags, demographic risk
 * factors, and temporal features. Rule weights derived from [1] (SSI) and
 * [2] (GED-C) with prevalence data from [3] and [4].
 */
export function calculateStage1Score(input: Stage1Input): {
  score: number;
  breakdown: string[];
} {
  const { symptoms, familyHistory, ethnicBackground } = input;
  let raw = 0;
  const breakdown: string[] = [];

  // ── Cardinal Visceral Signs ───────────────────────────────────────────────
  //
  // Splenomegaly: the single most common presenting feature, documented in ~94%
  // of symptomatic Type 1 patients in the Gaucher Registry [3] Table 1.
  // Assigned the highest individual symptom weight.
  if (symptoms.splenomegaly) {
    raw += 35;
    breakdown.push('Splenomegaly +35 [Charrow et al., 2000 — present in 94% of symptomatic Type 1]');
  }

  // Hepatomegaly: present in ~68% of Type 1 patients at diagnosis. [3] Table 1
  if (symptoms.hepatomegaly) {
    raw += 15;
    breakdown.push('Hepatomegaly +15 [Charrow et al., 2000 — present in 68% of Type 1]');
  }

  // ── Skeletal Involvement ──────────────────────────────────────────────────
  //
  // Bone pain / crisis: pathognomonic for skeletal Gaucher. Avascular necrosis
  // and acute bone crises are highly characteristic and specific. [4] §2.3
  if (symptoms.bonePain) {
    raw += 20;
    breakdown.push('Bone pain/crisis +20 [Stirnemann et al., 2017 — highly specific skeletal marker]');
  }

  // ── Haematological Signs ──────────────────────────────────────────────────
  //
  // Known thrombocytopenia: present in ~75% of symptomatic patients and is
  // often the first laboratory abnormality to trigger clinical investigation. [4] §2.2
  if (symptoms.thrombocytopenia) {
    raw += 20;
    breakdown.push('Known thrombocytopenia +20 [Stirnemann et al., 2017 — present in 75% of symptomatic cases]');
  }

  // Anaemia: present in ~40% of patients at diagnosis; normocytic normochromic. [3] Table 1
  if (symptoms.anaemia) {
    raw += 12;
    breakdown.push('Anaemia +12 [Charrow et al., 2000 — present in 40% at diagnosis]');
  }

  // Easy bruising: secondary manifestation of thrombocytopenia. [4] §2.2
  if (symptoms.easyBruising) {
    raw += 8;
    breakdown.push('Easy bruising +8 [Stirnemann et al., 2017 — secondary thrombocytopenic sign]');
  }

  // Fatigue: non-specific, but commonly reported in context of anaemia. [4]
  if (symptoms.fatigue) {
    raw += 8;
    breakdown.push('Chronic fatigue +8 [Stirnemann et al., 2017]');
  }

  // ── Neurological Signs ────────────────────────────────────────────────────
  //
  // Key discriminator for Type 2 (acute infantile) and Type 3 (chronic subacute
  // neuronopathic) Gaucher. Any neurological involvement significantly shifts
  // the differential. [2] §Classification
  if (symptoms.neurologicalSymptoms) {
    raw += 15;
    breakdown.push('Neurological symptoms +15 [Mistry et al., 2017 — key discriminator for Type 2/3]');
  }

  // ── Demographic Risk Factors ──────────────────────────────────────────────
  //
  // Ashkenazi Jewish background: GBA1 carrier frequency ~1 in 14 in this population
  // vs ~1 in 100–200 in others. Disease prevalence 1:450 vs 1:40,000. [3] §Demographics
  if (ethnicBackground === 'Ashkenazi Jewish') {
    raw += 20;
    breakdown.push('Ashkenazi Jewish background +20 [Charrow et al., 2000 — prevalence 1:450 vs 1:40,000]');
  }

  // First-degree family history: autosomal recessive; siblings of an affected
  // individual have a 25% probability of disease. [4] §1 Genetics
  if (familyHistory) {
    raw += 30;
    breakdown.push('First-degree family history +30 [Stirnemann et al., 2017 — autosomal recessive; 25% sibling risk]');
  }

  // ── Temporal Features ─────────────────────────────────────────────────────
  //
  // Earlier onset correlates with more severe phenotype and higher pre-test
  // probability for Gaucher disease. [2] GED-C criterion
  if (
    symptoms.onsetAge === 'Childhood (< 12 yrs)' ||
    symptoms.onsetAge === 'Adolescent (12–18 yrs)'
  ) {
    raw += 15;
    breakdown.push('Childhood/adolescent onset +15 [Mistry et al., 2017 — GED-C criterion; earlier onset = higher severity]');
  }

  // Symptom duration > 24 months: chronic presentation typical of Type 1. [4]
  if (symptoms.duration === '> 24 months') {
    raw += 5;
    breakdown.push('Duration > 24 months +5 [Stirnemann et al., 2017 — chronic course favours Type 1]');
  }

  // Cap at 100: once cardinal signs co-occur, risk is definitively elevated.
  const score = Math.min(raw, 100);
  return { score, breakdown };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 2 — Biochemical Risk Score (0–100)
// ─────────────────────────────────────────────────────────────────────────────

interface Stage2Input {
  biochemical: BiochemicalInputs;
  patientSex: string;
}

/**
 * Scores laboratory results against published reference ranges.
 * β-glucocerebrosidase activity is the primary diagnostic biomarker. [7]
 */
export function calculateStage2Score(input: Stage2Input): {
  score: number;
  breakdown: string[];
} {
  const { biochemical, patientSex } = input;
  let raw = 0;
  const breakdown: string[] = [];

  // ── β-Glucocerebrosidase Enzyme Activity ──────────────────────────────────
  //
  // Normal reference range (leucocyte DBS assay): 25–100 nmol/hr/mg protein.
  // Gaucher patients typically present with < 10–15% of mean normal activity.
  // A value < 10 nmol/hr/mg is considered diagnostic in clinical practice. [7] §Diagnosis
  // DBS threshold for newborn screening programmes: < 7.5 nmol/hr/mg. [7]
  if (biochemical.betaGlucocerebrosidase !== undefined) {
    const e = biochemical.betaGlucocerebrosidase;
    if (e < 7.5) {
      raw += 50;
      breakdown.push(`β-Glucocerebrosidase ${e} nmol/hr/mg +50 [Grabowski 2008 — < 7.5 nmol/hr/mg is diagnostic threshold]`);
    } else if (e < 15) {
      raw += 35;
      breakdown.push(`β-Glucocerebrosidase ${e} nmol/hr/mg +35 [below 60% of lower normal; highly suspicious]`);
    } else if (e < 25) {
      raw += 20;
      breakdown.push(`β-Glucocerebrosidase ${e} nmol/hr/mg +20 [below normal range (25 nmol/hr/mg); suspicious]`);
    }
    // ≥ 25 nmol/hr/mg = within normal, 0 pts
  }

  // ── Platelet Count ─────────────────────────────────────────────────────────
  //
  // Thrombocytopenia is the most common haematological finding in Type 1
  // Gaucher disease. [3] Table 3. Graded by severity:
  if (biochemical.plateletCount !== undefined) {
    const plt = biochemical.plateletCount;
    if (plt < 60) {
      raw += 25;
      breakdown.push(`Platelet count ${plt} ×10⁹/L +25 [Charrow et al., 2000 — severe thrombocytopenia, major bleeding risk]`);
    } else if (plt < 100) {
      raw += 15;
      breakdown.push(`Platelet count ${plt} ×10⁹/L +15 [Charrow et al., 2000 — moderate thrombocytopenia]`);
    } else if (plt < 150) {
      raw += 8;
      breakdown.push(`Platelet count ${plt} ×10⁹/L +8 [Charrow et al., 2000 — mild thrombocytopenia]`);
    }
    // ≥ 150 = normal, 0 pts
  }

  // ── Hemoglobin ─────────────────────────────────────────────────────────────
  //
  // Anaemia defined per WHO thresholds: Hb < 13 g/dL (males), < 12 g/dL
  // (females). Gaucher anaemia is typically normocytic normochromic. [3] Table 3
  if (biochemical.hemoglobin !== undefined) {
    const hb = biochemical.hemoglobin;
    const isFemale = patientSex === 'Female';
    if (hb < 8) {
      raw += 20;
      breakdown.push(`Hemoglobin ${hb} g/dL +20 [severe anaemia; Charrow et al., 2000]`);
    } else if (hb < 10) {
      raw += 12;
      breakdown.push(`Hemoglobin ${hb} g/dL +12 [moderate anaemia; Charrow et al., 2000]`);
    } else if (isFemale ? hb < 12 : hb < 13) {
      raw += 6;
      breakdown.push(`Hemoglobin ${hb} g/dL +6 [mild anaemia per WHO sex-specific threshold]`);
    }
  }

  // ── Chitotriosidase ─────────────────────────────────────────────────────────
  //
  // Normal plasma chitotriosidase: < 25 nmol/hr/mL.
  // Elevated in > 95% of symptomatic Type 1 patients prior to ERT. [5]
  // Levels correlate with disease burden and normalise with treatment response.
  // Note: ~6% of the population carry a homozygous duplication in the
  // chitotriosidase gene, producing no enzyme regardless of Gaucher status —
  // these patients will give a false-negative for this biomarker. [5]
  if (biochemical.chitotriosidase !== undefined) {
    const c = biochemical.chitotriosidase;
    if (c > 200) {
      raw += 30;
      breakdown.push(`Chitotriosidase ${c} nmol/hr/mL +30 [Aerts et al., 1996 — markedly elevated; strong disease burden marker]`);
    } else if (c > 100) {
      raw += 20;
      breakdown.push(`Chitotriosidase ${c} nmol/hr/mL +20 [Aerts et al., 1996 — moderately elevated]`);
    } else if (c > 25) {
      raw += 10;
      breakdown.push(`Chitotriosidase ${c} nmol/hr/mL +10 [Aerts et al., 1996 — mildly above normal (< 25 nmol/hr/mL)]`);
    }
  }

  const score = Math.min(raw, 100);
  return { score, breakdown };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 3 — Genetic Risk & Type Classification
// Based on GBA1 mutation-phenotype correlation tables [6, 7]
// ─────────────────────────────────────────────────────────────────────────────

interface Stage3Input {
  genetic: GeneticInputs;
}

interface Stage3Result {
  score: number;
  typeSuspicion: GaucherTypeSuspicion;
  mutationNotes: string;
  breakdown: string[];
}

/**
 * Classifies Gaucher disease type and assigns a genetic risk score based on
 * published mutation-phenotype correlation data [6][7].
 *
 * Key principle: N370S is "protective" against neuronopathic disease —
 * any patient with at least one N370S allele cannot have Type 2 or 3
 * Gaucher disease. [6] Table 2
 */
export function calculateStage3Score(input: Stage3Input): Stage3Result {
  const { mutation1, mutation2, neurologicalConfirmed } = input.genetic;
  const breakdown: string[] = [];
  let score = 0;
  let typeSuspicion: GaucherTypeSuspicion = 'Undetermined';
  let mutationNotes = '';

  const has = (m: string) => mutation1 === m || mutation2 === m;
  const hasN370S = has('N370S');
  const hasL444P = has('L444P');
  const hasSevere = has('84GG') || has('IVS2+1') || has('D409H');

  if (hasN370S && mutation1 === 'N370S' && mutation2 === 'N370S') {
    // Homozygous N370S: exclusively Type 1, never neuronopathic.
    // Most common genotype in Ashkenazi Jewish patients. [6] Table 2
    score = 60;
    typeSuspicion = 'Type 1';
    mutationNotes = 'Homozygous N370S: confirmed non-neuronopathic (Type 1). Neurological involvement genetically excluded.';
    breakdown.push('N370S/N370S homozygous → Type 1 definitive [Bruni et al., 2021 — N370S excludes neuronopathic phenotype]');
  } else if (hasN370S && hasL444P) {
    // N370S/L444P: most commonly Type 1 with moderate-severe visceral involvement. [6]
    score = 70;
    typeSuspicion = 'Type 1';
    mutationNotes = 'N370S/L444P compound heterozygous: most commonly presents as Type 1 with moderate-to-severe visceral and skeletal involvement.';
    breakdown.push('N370S/L444P → Type 1 moderate-severe [Bruni et al., 2021]');
  } else if (hasN370S) {
    // N370S with any other allele: Type 1 (N370S allele always prevents Type 2/3). [7]
    score = 55;
    typeSuspicion = 'Type 1';
    mutationNotes = 'N370S allele identified: any genotype containing N370S is associated exclusively with non-neuronopathic (Type 1) disease.';
    breakdown.push('N370S on ≥1 allele → Type 1 [Grabowski, 2008 — N370S is protective against neuronopathic disease]');
  } else if (hasL444P && mutation1 === 'L444P' && mutation2 === 'L444P') {
    // Homozygous L444P: strongly associated with chronic neuronopathic Type 3,
    // especially in Northern European (Norrbottnian) populations. [6] Table 2
    score = 85;
    typeSuspicion = neurologicalConfirmed ? 'Type 2' : 'Type 3';
    mutationNotes = 'Homozygous L444P: strongly associated with chronic neuronopathic Gaucher (Type 3 / Norrbottnian). Comprehensive neurological evaluation is required.';
    breakdown.push('L444P/L444P homozygous → Type 3 (Norrbottnian) [Bruni et al., 2021 — high neurological risk]');
  } else if (hasL444P && hasSevere) {
    // L444P compound with another severe allele: neuronopathic risk. [6]
    score = 80;
    typeSuspicion = 'Type 3';
    mutationNotes = 'L444P with severe null allele: associated with neuronopathic phenotype. Neurological evaluation is essential.';
    breakdown.push('L444P + severe allele → Type 3 risk [Bruni et al., 2021]');
  } else if (has('D409H')) {
    // D409H: associated with Type 3 with cardiovascular calcification. [6]
    score = 70;
    typeSuspicion = 'Type 3';
    mutationNotes = 'D409H allele identified: associated with Type 3 Gaucher, often accompanied by cardiovascular calcification (aortic and mitral valvular calcification).';
    breakdown.push('D409H → Type 3 with cardiovascular involvement [Bruni et al., 2021]');
  } else if (hasSevere) {
    // 84GG, IVS2+1: severe null mutations; phenotype depends on compound allele. [7]
    score = 65;
    typeSuspicion = 'Undetermined';
    mutationNotes = 'Severe null mutation (84GG / IVS2+1): disease severity and type depends on the compound allele. Full sequencing is recommended.';
    breakdown.push('Severe null mutation → unclassified; full sequencing needed [Grabowski, 2008]');
  } else if (has('Other known pathogenic')) {
    score = 50;
    typeSuspicion = 'Undetermined';
    mutationNotes = 'Pathogenic GBA1 variant identified. Specific genotype-phenotype correlation requires specialist review.';
    breakdown.push('Other pathogenic GBA1 variant → specialist genotyping required');
  } else {
    // Unknown or none: cannot classify genetically. Rely on clinical + biochemical stages.
    score = 15;
    typeSuspicion = 'Undetermined';
    mutationNotes = 'Genetic panel not informative. Clinical and biochemical staging should guide management.';
    breakdown.push('No informative GBA1 mutation → genetic classification not possible');
  }

  // Confirmed neurological symptoms override or refine type suspicion. [2] §Classification
  if (neurologicalConfirmed) {
    if (typeSuspicion === 'Type 1') {
      // N370S should prevent neurological disease — confirmed neurology is atypical.
      typeSuspicion = 'Undetermined';
      mutationNotes +=
        ' ⚠ Neurological symptoms reported despite N370S allele — specialist review strongly advised; consider alternative diagnoses.';
      breakdown.push('⚠ Neurological symptoms with N370S allele — unusual; specialist review required [Mistry et al., 2017]');
    } else {
      score = Math.min(score + 10, 100);
      breakdown.push('Confirmed neurological involvement → consistent with Type 2 or 3 [Mistry et al., 2017]');
    }
  }

  return {
    score: Math.min(score, 100),
    typeSuspicion,
    mutationNotes,
    breakdown,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite Scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Combines stage scores into a final composite risk score.
 *
 * Weighting rationale:
 *   Stage 1 only    → capped at 70 (symptom triage has high sensitivity,
 *                      lower specificity — biochemical confirmation needed) [2]
 *   Stages 1 + 2    → biochemical enzyme assay is the gold-standard test
 *                      and dominates the final score. [7]
 *   All 3 stages    → balanced weighting; genetic data provides type
 *                      classification, not always severity correlation. [6]
 */
export function calculateCompositeScore(
  stage1: number,
  stage2: number | null,
  stage3: number | null
): number {
  if (stage2 === null && stage3 === null) {
    return Math.min(Math.round(stage1 * 0.85), 70); // capped at 70% confidence
  }
  if (stage3 === null) {
    return Math.round(stage1 * 0.3 + stage2 * 0.7);
  }
  return Math.round(stage1 * 0.2 + stage2 * 0.4 + stage3 * 0.4);
}

/** Derives a RiskLevel from a composite score using GED-C probability bands. [2] */
export function scoreToRiskLevel(composite: number): RiskLevel {
  if (composite >= 65) return RiskLevel.HIGH;
  if (composite >= 30) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

/** Human-readable confidence label based on how many stages were completed. */
export function getConfidenceLabel(completedStages: number[]): string {
  switch (completedStages.length) {
    case 1: return 'Low — symptom screening only (biochemical confirmation recommended)';
    case 2: return 'Moderate — clinical + biochemical (genetic confirmation recommended for definitive classification)';
    case 3: return 'High — multi-stage clinical, biochemical, and genetic assessment completed';
    default: return 'Undetermined';
  }
}
