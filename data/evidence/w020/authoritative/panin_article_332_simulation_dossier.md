# AUTHORITATIVE SOURCE DOSSIER: PANIN ARTICLE 332 APPORTIONMENT SPECIFICATION

**Dossier Identifier:** `DOSSIER-W020-PANIN-SIM-01`  
**Source ID:** `PANIN-SIM-01`  
**Document Date:** `2026-09-30`  
**Author / Authority:** PANIN Delimitation Research Group / Computational Modeling  
**Constitutional Principle:** Article 332, Constitution of India (Proportionality Principle for SC/ST Reservation in State Legislative Assemblies)  
**Computational Algorithm:** PANIN deterministic Hamilton / Largest Remainder allocation applied to the Article 332 proportionality principle, ensuring exact seat conservation.  
**Primary Scope:** Deterministic mathematical derivation of seat allocation for Telangana Assembly (119 seats) under Census 2011 PCA population totals.  

---

## 1. Mathematical Algorithm & Execution Sequence

The PANIN Delimitation Engine implements an 8-step deterministic execution sequence:
1. **Quota Calculation:**
   $$q_{SC} = \frac{P_{SC}}{P_{Total}} \times S_{target} = \frac{5,260,976}{34,591,425} \times 119 = 18.09859$$
   $$q_{ST} = \frac{P_{ST}}{P_{Total}} \times S_{target} = \frac{3,018,710}{34,591,425} \times 119 = 10.38484$$
2. **Integer/Base Allocation:**
   $$Base_{SC} = \lfloor q_{SC} \rfloor = 18, \quad Base_{ST} = \lfloor q_{ST} \rfloor = 10$$
3. **Remainder Computation:**
   $$Rem_{SC} = q_{SC} - Base_{SC} = 0.09859, \quad Rem_{ST} = q_{ST} - Base_{ST} = 0.38484$$
4. **Target Conservation Assertion:**
   $$S_{General} = S_{target} - (Base_{SC} + Base_{ST} + K) = 119 - (18 + 10 + 0) = 91$$
5. **Deterministic Allocation Result:**
   $$\text{Total: } 119, \quad \text{SC: } 18, \quad \text{ST: } 10, \quad \text{General: } 91$$
   $$\text{Exact Conservation: } 18 + 10 + 91 = 119 \equiv 119$$

---

## 2. Established Computational Facts

- **Output Classification:** `DETERMINISTIC_DERIVED`.
- **W012 Data Status:** `DERIVED`.
- **W014 Legal Status:** `SCENARIO_PROPOSED_REGIME`.
- **isScenario Value:** `true` (derived exclusively from `legalStatus === 'SCENARIO_PROPOSED_REGIME'`).
- **Reproducibility:** 100% byte-exact and datum-deterministic across 100+ repeated runs.

---

## 3. Strict Negative Boundaries & Prohibited Over-Claims

- **Does NOT Mandate Algorithm via Article 332:** Article 332 supplies the constitutional proportionality principle; Hamilton / Largest Remainder is PANIN's deterministic computational allocation method applied to that principle. Article 332 does NOT itself legally prescribe or mandate Hamilton.
- **NOT an Enacted Statutory Baseline:** This derivation (18 SC / 10 ST / 91 General) must **NEVER** be returned or represented as the current statutory reality of Telangana (which remains 19 SC / 12 ST / 88 General under APRA 2014).
- **NOT Official Delimitation:** Represents an academic simulation model (`Proposal 2`).
